#!/usr/bin/env python3
"""Create a time-limited maintenance request from the support SSH account."""

import argparse
import secrets

from app import db, iso, send_ntfy, setting


def main() -> None:
    parser = argparse.ArgumentParser(description="写真NASの保守権限を申請します")
    parser.add_argument("reason", nargs="*", help="作業内容")
    args = parser.parse_args()
    reason_parts = args.reason[1:] if args.reason[:1] == ["request"] else args.reason
    reason = " ".join(reason_parts).strip() or "NASの点検・保守"
    request_id = secrets.token_urlsafe(12)
    with db() as connection:
        connection.execute(
            "INSERT INTO support_requests(id, created_at, requested_by, reason, status) VALUES (?, ?, ?, ?, 'pending')",
            (request_id, iso(), "support", reason[:500]),
        )
    send_ntfy(
        "保守担当者から作業申請があります。NASの管理画面で内容を確認してください。",
        title="写真NAS 保守申請",
        priority="high",
        click=f"{setting('admin_external_url', 'http://nas.local')}/#support",
    )
    print(f"申請しました。申請ID: {request_id}")
    print("所有者が承認すると、1時間だけ保守操作が可能になります。")


if __name__ == "__main__":
    main()
