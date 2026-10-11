"""Production deploy helper: pulls master, runs migrations + build, restarts pm2.

Prod layout (netcup-b, 159.195.244.144): stunnel4 terminates TLS on :3000 and
forwards to the Next server on :3001. Cloudflare only ever reaches :3000 — the
CFONLY iptables chain drops everything except Cloudflare to ports :3000-:3004
and :8089. So the app must bind :3001; pointing it at :3000 collides with
stunnel and the app never starts.

Host and credentials come from the operator's SSH setup (see scripts/_pi_ssh.py):
SSH_HOST defaults to the `netcup-b` alias in ~/.ssh/config and that entry's key
is used. There is no password path — the box sets `PasswordAuthentication no`.
"""
import base64
import json
import os
import subprocess
import sys
import tempfile

ECOSYSTEM_CONFIG = """module.exports = {
  apps: [{
    name: 'xhdo',
    script: 'node_modules/next/dist/bin/next',
    // :3001 is the app. Port :3000 belongs to stunnel4, which terminates TLS in
    // front of this app and is what Cloudflare connects to — binding here to
    // :3000 makes `next start` die with EADDRINUSE and takes the site down.
    args: 'start -p 3001',
    cwd: '/opt/xhdo/app',
    env: {
      NODE_ENV: 'production',
      PORT: '3001',
    },
    max_memory_restart: '512M',
  }],
};
"""

ECOSYSTEM_B64 = base64.b64encode(ECOSYSTEM_CONFIG.encode("utf-8")).decode("ascii")

HEALTH_CHECK_CMD = (
    "for i in $(seq 1 30); do "
    "code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:3001/zh); "
    "if [ \"$code\" = \"200\" ]; then echo \"app is up on :3001 (HTTP $code, attempt $i)\"; exit 0; fi; "
    "sleep 1; "
    "done; "
    "echo \"FAILED: nothing answered 200 on :3001 within 30s (last code ${code:-none})\"; exit 1"
)

DEPLOY_STEPS = [
    {
        "label": "git pull on prod",
        "cmd": "su - xhdo -c \"cd /opt/xhdo/app && git pull 2>&1 | tail -8 && echo --- && git log --oneline -3\"",
    },
    {
        "label": "npm install",
        "cmd": "su - xhdo -c \"cd /opt/xhdo/app && npm install --legacy-peer-deps 2>&1 | tail -8\"",
        "timeout": 240,
    },
    {
        "label": "prisma migrate deploy",
        "cmd": "su - xhdo -c \"cd /opt/xhdo/app && npx prisma migrate deploy 2>&1 | tail -10\"",
    },
    {
        "label": "npm run build",
        "cmd": "su - xhdo -c \"cd /opt/xhdo/app && npm run build 2>&1 | tail -20\"",
        "timeout": 240,
    },
    {
        "label": "ensure ecosystem.config.cjs",
        "cmd": (
            f"echo '{ECOSYSTEM_B64}' | base64 -d > /opt/xhdo/app/ecosystem.config.cjs "
            f"&& chown xhdo:xhdo /opt/xhdo/app/ecosystem.config.cjs"
        ),
    },
    {
        "label": "pm2 restart",
        "cmd": "su - xhdo -c \"cd /opt/xhdo/app && pm2 restart ecosystem.config.cjs 2>&1 | tail -10\"",
    },
    {
        "label": "wait for the app on :3001",
        # A flat `sleep 4` is not enough for a cold `next start` on netcup-b
        # (~20s here), so the old check reported a false failure on a perfectly
        # good deploy. Poll until it answers instead.
        "timeout": 60,
        "cmd": HEALTH_CHECK_CMD,
    },
    {
        "label": "smoke routes",
        # og/twitter images only exist under /[locale]/, so the old root-level
        # /opengraph-image and /twitter-image entries 404ed on every run.
        "cmd": "for u in / /zh /en /zh/friends /en/friends /zh/admin/login /zh/admin/dashboard /icon /apple-icon /zh/opengraph-image /zh/twitter-image /sitemap.xml /robots.txt /manifest.webmanifest /.well-known/security.txt; do code=$(curl -s -o /dev/null -w \"%{http_code}\" -L --max-time 10 \"https://xh.do$u\"); echo \"$code $u\"; done",
    },
    {
        "label": "og image under /zh",
        "cmd": "curl -sI -L --max-time 10 https://xh.do/zh/opengraph-image | grep -iE 'HTTP|content-type|content-length' | head -4",
    },
    {
        "label": "twitter image under /zh",
        "cmd": "curl -sI -L --max-time 10 https://xh.do/zh/twitter-image | grep -iE 'HTTP|content-type|content-length' | head -4",
    },
    {
        "label": "apple-icon direct",
        "cmd": "curl -sI -L --max-time 10 https://xh.do/apple-icon | grep -iE 'HTTP|content-type' | head -4",
    },
    {
        "label": "manifest.webmanifest direct",
        "cmd": "curl -sI -L --max-time 10 https://xh.do/manifest.webmanifest | grep -iE 'HTTP|content-type' | head -4",
    },
    {
        "label": "manifest body",
        "cmd": "curl -s https://xh.do/manifest.webmanifest | head -20",
    },
    {
        # Makes an edge-level regression visible in the deploy log — this is the
        # check that would have shown the Cloudflare zone pinning
        # `Strict-Transport-Security: max-age=0` over the origin's 24-month value.
        "label": "security headers (live)",
        "cmd": "curl -sI -L --max-time 10 https://xh.do/zh | grep -iE 'strict-transport-security|content-security-policy|x-frame-options|x-content-type-options|referrer-policy|permissions-policy|cross-origin-opener-policy'",
    },
]


def main() -> int:
    # Host + auth come from the operator's SSH setup; see scripts/_pi_ssh.py.
    # SSH_HOST (default: the `netcup-b` alias), SSH_USER and SSH_PORT can still
    # be overridden through the environment.
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    out_path = tempfile.mktemp(prefix="deploy_", suffix=".json")
    err_path = tempfile.mktemp(prefix="deploy_", suffix=".err")
    proc = subprocess.run(
        ["python", "scripts/_pi_ssh.py", json.dumps(DEPLOY_STEPS)],
        env=env,
        stdout=open(out_path, "wb"),
        stderr=open(err_path, "wb"),
    )
    rc = proc.returncode
    with open(out_path, "rb") as fh:
        sys.stdout.buffer.write(fh.read())
    with open(err_path, "rb") as fh:
        sys.stderr.buffer.write(fh.read())
    return rc


if __name__ == "__main__":
    sys.exit(main())