"""
SSH helper used by the deploy / smoke scripts to drive commands on the prod box.

Transport is the operator's own `ssh` client, so authentication comes from
~/.ssh/config and the keys it points at. SSH_HOST is normally an alias from that
file (the default is `netcup-b`) but any hostname/IP works; SSH_USER and
SSH_PORT override what the config says.

Note on why there is no password path: netcup-b runs with
`PasswordAuthentication no`, so the previous paramiko + SSH_PASSWORD version —
which passed `look_for_keys=False, allow_agent=False` — could never connect at
all. Key auth is the only way in.

Usage:
    python scripts/_pi_ssh.py '[{"cmd": "hostname", "label": "probe"}, ...]'

Each entry may carry a "timeout" in seconds (default 300). Prints a JSON array
of {label, cmd, rc, out, err} and exits 1 if any step returned non-zero, so a
failing deploy step can fail the whole run.
"""

import json
import os
import subprocess
import sys

DEFAULT_HOST = "netcup-b"
DEFAULT_TIMEOUT = 300


def ssh_argv() -> list[str]:
    host = os.environ.get("SSH_HOST", DEFAULT_HOST)
    user = os.environ.get("SSH_USER", "root")
    port = os.environ.get("SSH_PORT", "22")
    return [
        "ssh",
        # Never prompt: a missing key or an unknown alias should fail fast
        # instead of hanging a deploy on an interactive password prompt.
        "-o",
        "BatchMode=yes",
        "-o",
        "ConnectTimeout=20",
        "-p",
        port,
        f"{user}@{host}",
    ]


def main() -> int:
    try:
        commands = json.loads(sys.argv[1]) if len(sys.argv) > 1 else None
    except json.JSONDecodeError as e:
        print(f"invalid commands json: {e}", file=sys.stderr)
        return 2

    if not commands:
        print(
            'usage: python scripts/_pi_ssh.py \'[{"cmd": "...", "label": "..."}, ...]\'',
            file=sys.stderr,
        )
        return 2

    target = ssh_argv()
    results = []
    failures = 0

    for entry in commands:
        cmd = entry["cmd"]
        label = entry.get("label", cmd[:40])
        timeout = entry.get("timeout", DEFAULT_TIMEOUT)
        try:
            proc = subprocess.run(target + [cmd], capture_output=True, timeout=timeout)
        except subprocess.TimeoutExpired:
            results.append(
                {
                    "label": label,
                    "cmd": cmd,
                    "rc": 124,
                    "out": "",
                    "err": f"timed out after {timeout}s",
                }
            )
            failures += 1
            continue
        except FileNotFoundError:
            print("ssh client not found on PATH", file=sys.stderr)
            return 2

        rc = proc.returncode
        if rc != 0:
            failures += 1
        results.append(
            {
                "label": label,
                "cmd": cmd,
                "rc": rc,
                "out": proc.stdout.decode("utf-8", errors="replace"),
                "err": proc.stderr.decode("utf-8", errors="replace"),
            }
        )

    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(results, indent=2, ensure_ascii=False))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
