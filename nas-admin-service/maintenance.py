#!/usr/bin/env python3
"""Root-owned maintenance broker; never grants a general root shell."""

import argparse
import subprocess
from datetime import datetime, timezone

from app import audit, db


SERVICES = {
    "immich": ["docker", "compose", "-f", "/opt/immich/docker-compose.yml", "restart"],
    "samba": ["systemctl", "restart", "smbd"],
    "tailscale": ["systemctl", "restart", "tailscaled"],
    "dashboard": ["systemctl", "restart", "nas-admin", "nginx"],
}


def approved() -> bool:
    with db() as connection:
        row = connection.execute(
            "SELECT expires_at FROM support_requests WHERE status='approved' ORDER BY approved_at DESC LIMIT 1"
        ).fetchone()
    if not row or not row["expires_at"]:
        return False
    expiry = datetime.fromisoformat(row["expires_at"])
    return expiry > datetime.now(timezone.utc)


def main() -> None:
    parser = argparse.ArgumentParser(description="写真NAS 保守操作")
    sub = parser.add_subparsers(dest="action", required=True)
    sub.add_parser("status")
    restart = sub.add_parser("restart")
    restart.add_argument("service", choices=sorted(SERVICES))
    sub.add_parser("check-disks")
    args = parser.parse_args()

    if not approved():
        raise SystemExit("保守権限がありません。nas-support request で所有者へ申請してください。")

    if args.action == "status":
        subprocess.run(["cat", "/proc/mdstat"], check=False)
        subprocess.run(["systemctl", "--no-pager", "--plain", "status", "nas-admin", "smbd", "tailscaled"], check=False)
    elif args.action == "restart":
        subprocess.run(SERVICES[args.service], check=True, cwd="/opt/immich" if args.service == "immich" else None)
    elif args.action == "check-disks":
        subprocess.run(["/opt/nas-admin-service/disk_monitor.py", "--force"], check=True)
    audit("support", f"maintenance.{args.action}", getattr(args, "service", ""))


if __name__ == "__main__":
    main()
