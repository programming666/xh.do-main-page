"""SFTP-reset helper: SCP-reset-admin-password.ts to prod then run it via SSH."""
import os
import sys
import tempfile
import paramiko


def main() -> int:
    password = os.environ.get("SSH_PASSWORD", "")
    if not password:
        print("SSH_PASSWORD env var is required", file=sys.stderr)
        return 2
    host = os.environ.get("SSH_HOST", "192.229.85.182")
    port = int(os.environ.get("SSH_PORT", "22"))
    user = os.environ.get("SSH_USER", "root")
    target_path = "/opt/xhdo/app/scripts/reset-admin-password.ts"
    source_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "reset-admin-password.ts",
    )

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=port, username=user, password=password, look_for_keys=False, allow_agent=False)
    sftp = client.open_sftp()
    sftp.put(source_path, target_path)
    sftp.chown(target_path, uid=1000, gid=1000)
    sftp.chmod(target_path, 0o644)
    sftp.close()
    print(f"[sftp] uploaded {source_path} -> {target_path}")

    new_password = sys.argv[1] if len(sys.argv) > 1 else ""
    if not new_password:
        print("Usage: python scripts/_reset_admin_vp.py <NEW_PASSWORD>", file=sys.stderr)
        client.close()
        return 2

    cmd = (
        f"su - xhdo -c \"cd /opt/xhdo/app && "
        f"node -r dotenv/config node_modules/.bin/tsx scripts/reset-admin-password.ts "
        f"{new_password!r} 2>&1\""
    )
    print(f"[ssh] running: {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    print(out)
    if err:
        print("--- stderr ---", file=sys.stderr)
        print(err, file=sys.stderr)
    rc = stdout.channel.recv_exit_status()
    client.close()
    return rc


if __name__ == "__main__":
    sys.exit(main())