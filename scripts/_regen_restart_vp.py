"""Pull, regen Prisma client, rebuild, restart on prod, test sign-in."""
import os, sys, textwrap
import paramiko
HOST = os.environ.get("SSH_HOST", "192.229.85.182")
PORT = int(os.environ.get("SSH_PORT", "22"))
USER = os.environ.get("SSH_USER", "root")
PASSWORD = os.environ["SSH_PASSWORD"]
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
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=PORT, username=USER, password=PASSWORD, look_for_keys=False, allow_agent=False)
sftp = c.open_sftp()
with sftp.file("/tmp/_regen_restart.sh", "w") as f:
    f.write(SCRIPT)
sftp.chmod("/tmp/_regen_restart.sh", 0o755)
sftp.close()
stdin, stdout, stderr = c.exec_command("bash /tmp/_regen_restart.sh", timeout=240)
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
print(out)
print("STDERR:", err)
c.close()