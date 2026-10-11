"""Upload reset-admin-password.ts to prod and run it over SSH.

Transport is the operator's own ssh client, so auth comes from ~/.ssh/config —
the prod box sets `PasswordAuthentication no`, so the paramiko + SSH_PASSWORD
version could never connect. SSH_HOST defaults to the `netcup-b` alias.

The chown target matters: the app runs as `xhdo` (uid 124 on netcup-b). The old
code chowned to uid/gid 1000, which on this box is the unrelated `modoboa`
service account — that hands another service write access to a file this helper
later executes as `xhdo`.
"""
import os
import subprocess
import sys

TARGET_PATH = "/opt/xhdo/app/scripts/reset-admin-password.ts"


def ssh_argv() -> list[str]:
    host = os.environ.get("SSH_HOST", "netcup-b")
    user = os.environ.get("SSH_USER", "root")
    port = os.environ.get("SSH_PORT", "22")
    return ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=20", "-p", port, f"{user}@{host}"]


def main() -> int:
    new_password = sys.argv[1] if len(sys.argv) > 1 else ""
    if not new_password:
        print("Usage: python scripts/_reset_admin_vp.py <NEW_PASSWORD>", file=sys.stderr)
        return 2

    source_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "reset-admin-password.ts",
    )

    with open(source_path, "rb") as src:
        upload = subprocess.run(
            [
                *ssh_argv(),
                f"cat > {TARGET_PATH} && chown xhdo:xhdo {TARGET_PATH} "
                f"&& chmod 644 {TARGET_PATH} && ls -l {TARGET_PATH}",
            ],
            stdin=src,
            capture_output=True,
        )
    if upload.returncode != 0:
        print(upload.stderr.decode("utf-8", errors="replace"), file=sys.stderr)
        return upload.returncode
    print(f"[upload] {source_path} -> {TARGET_PATH}")
    print(upload.stdout.decode("utf-8", errors="replace").rstrip())

    cmd = (
        f"su - xhdo -c \"cd /opt/xhdo/app && "
        f"node -r dotenv/config node_modules/.bin/tsx scripts/reset-admin-password.ts "
        f"{new_password!r} 2>&1\""
    )
    print(f"[ssh] running: {cmd}")
    run = subprocess.run([*ssh_argv(), cmd], capture_output=True)
    print(run.stdout.decode("utf-8", errors="replace"))
    if run.stderr:
        print("--- stderr ---", file=sys.stderr)
        print(run.stderr.decode("utf-8", errors="replace"), file=sys.stderr)
    return run.returncode


if __name__ == "__main__":
    sys.exit(main())