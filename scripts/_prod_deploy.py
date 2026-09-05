"""Production deploy helper: pulls master, runs migrations + build, restarts pm2."""
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
    args: 'start -p 3000',
    cwd: '/opt/xhdo/app',
    env: {
      NODE_ENV: 'production',
      PORT: '3000',
    },
    max_memory_restart: '512M',
  }],
};
"""

ECOSYSTEM_B64 = base64.b64encode(ECOSYSTEM_CONFIG.encode("utf-8")).decode("ascii")

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
        "label": "gen hero inline avif",
        "cmd": "su - xhdo -c \"cd /opt/xhdo/app && python3 scripts/gen_hero_inline.py 2>&1 | tail -3\"",
        "timeout": 60,
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
        "label": "wait + local check",
        "cmd": "sleep 4 && curl -s -o /dev/null -w \"%{http_code}\\n\" http://localhost:3000/zh",
    },
    {
        "label": "smoke routes",
        "cmd": "for u in / /zh /en /zh/friends /zh/admin/login /zh/admin/dashboard /icon /apple-icon /opengraph-image /twitter-image /sitemap.xml /robots.txt /manifest.webmanifest; do code=$(curl -s -o /dev/null -w \"%{http_code}\" -L --max-time 10 \"https://xh.do$u\"); echo \"$code $u\"; done",
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
]


def main() -> int:
    password = os.environ.get("SSH_PASSWORD", "")
    if not password:
        print("SSH_PASSWORD env var is required", file=sys.stderr)
        return 2
    env = os.environ.copy()
    env["SSH_PASSWORD"] = password
    env["SSH_HOST"] = os.environ.get("SSH_HOST", "192.229.85.182")
    env["SSH_PORT"] = os.environ.get("SSH_PORT", "22")
    env["SSH_USER"] = os.environ.get("SSH_USER", "root")
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