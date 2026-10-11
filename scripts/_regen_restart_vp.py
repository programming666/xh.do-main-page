"""Pull, regen Prisma client, rebuild, restart on prod, then test sign-in.

Transport is the operator's own ssh client (the same auth model as
scripts/_pi_ssh.py): the generated script is piped to the prod box on stdin. The
prod box sets `PasswordAuthentication no`, so the old paramiko + SSH_PASSWORD
version could never connect — and its default host was a decommissioned IP.
"""
import os
import subprocess
import sys
import textwrap

HOST = os.environ.get("SSH_HOST", "netcup-b")
USER = os.environ.get("SSH_USER", "root")
PORT = os.environ.get("SSH_PORT", "22")
NEW_PASSWORD = sys.argv[1] if len(sys.argv) > 1 else ""
EMAIL = sys.argv[2] if len(sys.argv) > 2 else "admin@xh.do"

SCRIPT = textwrap.dedent(f"""
    #!/bin/bash
    set +e
    APP=/opt/xhdo/app
    echo '=== git pull ==='
    su - xhdo -c "cd $APP && git pull" 2>&1 | tail -5
    echo '=== prisma generate ==='
    su - xhdo -c "cd $APP && npx prisma generate" 2>&1 | tail -5
    echo '=== build ==='
    su - xhdo -c "cd $APP && npm run build" 2>&1 | tail -25
    echo '=== restart pm2 ==='
    su - xhdo -c "cd $APP && pm2 restart xhdo" 2>&1 | tail -10
    sleep 5
    echo '=== test sign-in ==='
    curl -s -o /tmp/signin.json -w '%{{http_code}}\\n' -X POST -H 'Content-Type: application/json' \\
        -d '{{"email":"{EMAIL}","password":"{NEW_PASSWORD}"}}' \\
        'https://xh.do/api/auth/sign-in/email' -L --max-time 15
    head -c 500 /tmp/signin.json
    echo
""")
if not NEW_PASSWORD:
    print(
        "Usage: python scripts/_regen_restart_vp.py <NEW_ADMIN_PASSWORD> [EMAIL]",
        file=sys.stderr,
    )
    sys.exit(2)

REMOTE = (
    "cat > /tmp/_regen_restart.sh && chmod 755 /tmp/_regen_restart.sh "
    "&& bash /tmp/_regen_restart.sh"
)
proc = subprocess.run(
    ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=20", "-p", PORT, f"{USER}@{HOST}", REMOTE],
    input=SCRIPT.encode("utf-8"),
    capture_output=True,
    timeout=900,
)
print(proc.stdout.decode("utf-8", errors="replace"))
print("STDERR:", proc.stderr.decode("utf-8", errors="replace"))
sys.exit(proc.returncode)