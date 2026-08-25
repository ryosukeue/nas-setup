#!/usr/bin/env python3
"""Detect physical HDD/RAID failure and notify the owner without noisy alerts."""

import argparse
import hashlib
import json
from datetime import datetime, timedelta, timezone

from app import audit, disk_status, send_ntfy, setting, set_setting


def problems(report: dict) -> list[str]:
    found = []
    raid = report["raid"]
    if not raid["healthy"]:
        found.append(f"RAID1の稼働HDDが {raid['active']}/{raid['expected']} 台です ({raid['members']})")
    for index, disk in enumerate(report["disks"], 1):
        if not disk["present"]:
            found.append(f"HDD {index} ({disk['device']}) が認識されていません")
        elif disk["smartPassed"] is False:
            label = disk.get("model") or disk["device"]
            found.append(f"HDD {index} ({label}) のSMART総合判定が異常です")
    return found


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    report = disk_status()
    issues = problems(report)
    fingerprint = hashlib.sha256(json.dumps(issues, ensure_ascii=False).encode()).hexdigest() if issues else "healthy"
    previous = setting("disk_alert_fingerprint", "")
    last_sent_raw = setting("disk_alert_sent_at")
    last_sent = datetime.fromisoformat(last_sent_raw) if last_sent_raw else None
    due = not last_sent or datetime.now(timezone.utc) - last_sent >= timedelta(hours=24)

    if issues and (args.force or fingerprint != previous or due):
        send_ntfy("\n".join(issues) + "\n写真は現在利用できても、早めの点検・交換を推奨します。", title="写真NAS HDD異常", priority="urgent")
        set_setting("disk_alert_sent_at", datetime.now(timezone.utc).isoformat())
        audit("monitor", "disk.alert", "; ".join(issues))
    elif not issues and previous and previous != "healthy":
        send_ntfy("HDDとRAIDが正常な状態へ戻りました。", title="写真NAS HDD復旧")
        audit("monitor", "disk.recovered")
    set_setting("disk_alert_fingerprint", fingerprint)


if __name__ == "__main__":
    main()
