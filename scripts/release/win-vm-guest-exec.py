#!/usr/bin/env python3
"""Run one command inside the ct18 win11 guest through the QEMU guest agent.

Used by `win-vm-guard.sh` (scp'd to the hypervisor, invoked over SSH). Prints the
guest stdout/stderr and exits non-zero when the guest command exits non-zero.

    python3 win-vm-guest-exec.py --name win11 -- "cmd /c node -v"

Runs as SYSTEM (the guest agent's service account). No credentials are involved.
"""
import argparse
import base64
import json
import subprocess
import sys
import time

POLL_INTERVAL = 0.3
POLL_LIMIT = 200  # ~60 s


def agent(vm: str, payload: dict) -> dict:
    proc = subprocess.run(
        ["sudo", "-n", "virsh", "qemu-agent-command", vm, json.dumps(payload)],
        capture_output=True,
        text=True,
    )
    body = proc.stdout.strip() or "{}"
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        return {"error": {"desc": body or proc.stderr.strip()}}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", default="win11")
    parser.add_argument("command")
    args = parser.parse_args()

    started = agent(
        args.name,
        {
            "execute": "guest-exec",
            "arguments": {
                "path": "C:\\Windows\\System32\\cmd.exe",
                "arg": ["/c", args.command],
                "capture-output": True,
            },
        },
    )
    pid = started.get("return", {}).get("pid")
    if pid is None:
        print(f"guest-exec failed: {started.get('error', started)}", file=sys.stderr)
        return 2

    for _ in range(POLL_LIMIT):
        status = agent(args.name, {"execute": "guest-exec-status", "arguments": {"pid": pid}})
        info = status.get("return", {})
        if info.get("exited"):
            out = base64.b64decode(info.get("out-data") or "").decode("utf-8", "replace")
            err = base64.b64decode(info.get("err-data") or "").decode("utf-8", "replace")
            if out:
                sys.stdout.write(out)
            if err:
                sys.stderr.write(err)
            return int(info.get("exitcode", 0))
        time.sleep(POLL_INTERVAL)

    print("guest-exec timed out", file=sys.stderr)
    return 124


if __name__ == "__main__":
    raise SystemExit(main())
