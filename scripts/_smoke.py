"""Smoke test the deployed routes.

The curl checks below run **on the prod box** (through scripts/_pi_ssh.py, key
auth), so they exercise the real edge path plus the origin's own local view.
Auth/host come from ~/.ssh/config; SSH_HOST defaults to the `netcup-b` alias.
"""
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
    # `/zh/manifest.webmanifest` used to be checked here. The route only exists at
    # /manifest.webmanifest (src/app/manifest.ts) and the page links exactly that,
    # so the locale-prefixed URL is a 404 by design — the old step reported a
    # failure on every run.
    {"label": "tagged og image", "cmd": "curl -sI -L --max-time 10 'https://xh.do/zh/opengraph-image?9c5fe813bcb26d39' | grep -iE 'HTTP|content-type|content-length' | head -8"},
    {"label": "og image body length", "cmd": "curl -s -o /tmp/og.png -w 'bytes=%{size_download} type=%{content_type}\\n' https://xh.do/zh/opengraph-image"},
    {"label": "twitter image body length", "cmd": "curl -s -o /tmp/tw.png -w 'bytes=%{size_download} type=%{content_type}\\n' https://xh.do/zh/twitter-image"},
    {"label": "security headers (xh.do/zh)", "cmd": "curl -sI -L --max-time 10 https://xh.do/zh | grep -iE 'strict-transport-security|content-security-policy|x-frame-options|x-content-type-options|referrer-policy|permissions-policy|cross-origin-opener-policy'"},
    {"label": "security.txt", "cmd": "curl -sI --max-time 10 https://xh.do/.well-known/security.txt | grep -iE 'HTTP|content-type'"},
]


def main() -> int:
    # Host + auth come from the operator's SSH setup; see scripts/_pi_ssh.py.
    env = os.environ.copy()
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