"""Smoke test the deployed routes."""
import json
import os
import subprocess
import sys
import tempfile

STEPS = [
    {"label": "og under /zh", "cmd": "curl -sI -L --max-time 10 https://xh.do/zh/opengraph-image | grep -iE 'HTTP|content-type|content-length' | head -8"},
    {"label": "twitter under /zh", "cmd": "curl -sI -L --max-time 10 https://xh.do/zh/twitter-image | grep -iE 'HTTP|content-type|content-length' | head -8"},
    {"label": "apple-icon chain", "cmd": "curl -sI -L --max-time 10 https://xh.do/apple-icon | grep -iE 'HTTP|location|content-type' | head -8"},
    {"label": "manifest.webmanifest", "cmd": "curl -sI -L --max-time 10 https://xh.do/manifest.webmanifest | grep -iE 'HTTP|location|content-type' | head -8"},
    {"label": "zh/manifest.webmanifest", "cmd": "curl -sI -L --max-time 10 https://xh.do/zh/manifest.webmanifest | grep -iE 'HTTP|location|content-type' | head -8"},
    {"label": "tagged og image", "cmd": "curl -sI -L --max-time 10 'https://xh.do/zh/opengraph-image?9c5fe813bcb26d39' | grep -iE 'HTTP|content-type|content-length' | head -8"},
    {"label": "og image body length", "cmd": "curl -s -o /tmp/og.png -w 'bytes=%{size_download} type=%{content_type}\\n' https://xh.do/zh/opengraph-image"},
    {"label": "twitter image body length", "cmd": "curl -s -o /tmp/tw.png -w 'bytes=%{size_download} type=%{content_type}\\n' https://xh.do/zh/twitter-image"},
]


def main() -> int:
    password = os.environ.get("SSH_PASSWORD", "")
    if not password:
        return 2
    env = os.environ.copy()
    env["SSH_PASSWORD"] = password
    env["SSH_HOST"] = os.environ.get("SSH_HOST", "192.229.85.182")
    env["SSH_PORT"] = os.environ.get("SSH_PORT", "22")
    env["SSH_USER"] = os.environ.get("SSH_USER", "root")
    env["PYTHONIOENCODING"] = "utf-8"
    out_path = tempfile.mktemp(prefix="smoke_", suffix=".json")
    err_path = tempfile.mktemp(prefix="smoke_", suffix=".err")
    proc = subprocess.run(
        ["python", "scripts/_pi_ssh.py", json.dumps(STEPS)],
        env=env,
        stdout=open(out_path, "wb"),
        stderr=open(err_path, "wb"),
    )
    with open(out_path, "rb") as fh:
        sys.stdout.buffer.write(fh.read())
    with open(err_path, "rb") as fh:
        sys.stderr.buffer.write(fh.read())
    return proc.returncode


if __name__ == "__main__":
    sys.exit(main())