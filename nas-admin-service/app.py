#!/usr/bin/env python3
"""Local owner dashboard API for the friend-ready photo NAS."""

from __future__ import annotations

import functools
import io
import json
import os
import re
import secrets
import shutil
import sqlite3
import subprocess
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

from flask import Flask, Response, jsonify, request, send_file, session
from werkzeug.security import check_password_hash, generate_password_hash


STATE_DIR = Path(os.environ.get("NAS_ADMIN_STATE_DIR", "/var/lib/nas-admin"))
DB_PATH = STATE_DIR / "state.db"
IMMICH_URL = os.environ.get("IMMICH_URL", "http://127.0.0.1:2283/api")
PHOTOS_PATH = Path("/srv/photos/pc")
SMB_USER = "nasowner"
RAID_DEVICE = "/dev/md0"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso(value: datetime | None = None) -> str:
    return (value or utcnow()).isoformat(timespec="seconds")


def db() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    os.chmod(STATE_DIR, 0o700)
    with db() as connection:
        connection.execute("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
        connection.execute(
            """CREATE TABLE IF NOT EXISTS audit (
                id INTEGER PRIMARY KEY,
                created_at TEXT NOT NULL,
                actor TEXT NOT NULL,
                action TEXT NOT NULL,
                detail TEXT NOT NULL DEFAULT ''
            )"""
        )
        connection.execute(
            """CREATE TABLE IF NOT EXISTS support_requests (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                requested_by TEXT NOT NULL,
                reason TEXT NOT NULL,
                status TEXT NOT NULL,
                approved_at TEXT,
                expires_at TEXT
            )"""
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests(status, created_at DESC)"
        )
        connection.execute("CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit(created_at DESC)")
        connection.execute("PRAGMA optimize")


def setting(key: str, default=None):
    with db() as connection:
        row = connection.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return json.loads(row["value"]) if row else default


def set_setting(key: str, value) -> None:
    with db() as connection:
        connection.execute(
            "INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, json.dumps(value, ensure_ascii=False)),
        )


def audit(actor: str, action: str, detail: str = "") -> None:
    with db() as connection:
        connection.execute(
            "INSERT INTO audit(created_at, actor, action, detail) VALUES (?, ?, ?, ?)",
            (iso(), actor[:80], action[:120], detail[:1000]),
        )


def run(args: list[str], *, input_text: str | None = None, timeout: int = 60, check: bool = True):
    return subprocess.run(
        args,
        input=input_text,
        text=True,
        capture_output=True,
        timeout=timeout,
        check=check,
    )


def api_json(path: str, method: str = "GET", payload=None, token: str | None = None):
    body = None if payload is None else json.dumps(payload).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{IMMICH_URL}{path}", data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as result:
            data = result.read()
            return json.loads(data) if data else None
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")
        raise RuntimeError(f"Immich API {error.code}: {detail[:500]}") from error


def disk_status() -> dict:
    mdstat = Path("/proc/mdstat").read_text(errors="replace")
    match = re.search(r"md0\s*:.*?\[(\d+)/(\d+)\]\s*\[([U_]+)\]", mdstat, re.S)
    raid = {
        "healthy": bool(match and "_" not in match.group(3)),
        "active": int(match.group(1)) if match else 0,
        "expected": int(match.group(2)) if match else 2,
        "members": match.group(3) if match else "??",
    }
    disks = []
    for device in ("/dev/sda", "/dev/sdb"):
        entry = {"device": device, "present": Path(device).exists(), "smartPassed": None}
        if entry["present"] and shutil.which("smartctl"):
            result = run(["smartctl", "-H", "-j", device], check=False)
            try:
                report = json.loads(result.stdout)
                entry["model"] = report.get("model_name", "")
                entry["serialSuffix"] = report.get("serial_number", "")[-4:]
                entry["smartPassed"] = report.get("smart_status", {}).get("passed")
            except json.JSONDecodeError:
                entry["smartPassed"] = None
        disks.append(entry)
    usage = shutil.disk_usage("/")
    return {
        "raid": raid,
        "disks": disks,
        "storage": {"total": usage.total, "used": usage.used, "free": usage.free},
    }


def service_active(name: str) -> bool:
    return run(["systemctl", "is-active", "--quiet", name], check=False).returncode == 0


def immich_state() -> dict:
    try:
        config = api_json("/server/config")
        return {"online": True, "initialized": bool(config.get("isInitialized"))}
    except Exception:
        return {"online": False, "initialized": False}


def send_ntfy(message: str, *, title: str = "写真NAS", priority: str = "default", click: str | None = None):
    topic = setting("ntfy_topic")
    if not topic:
        return False
    headers = {"Title": title, "Priority": priority, "Tags": "floppy_disk"}
    if click:
        headers["Click"] = click
    req = urllib.request.Request(
        f"https://ntfy.sh/{topic}", data=message.encode(), headers=headers, method="POST"
    )
    with urllib.request.urlopen(req, timeout=15):
        return True


def owner_required(function):
    @functools.wraps(function)
    def wrapped(*args, **kwargs):
        if not session.get("owner"):
            return jsonify({"error": "ログインが必要です"}), 401
        return function(*args, **kwargs)

    return wrapped


def ensure_samba(password: str) -> None:
    run(["getent", "group", "photos"], check=False)
    if run(["getent", "group", "photos"], check=False).returncode != 0:
        run(["groupadd", "--system", "photos"])
    if run(["id", SMB_USER], check=False).returncode != 0:
        run([
            "useradd", "--system", "--no-create-home", "--home-dir", "/nonexistent",
            "--shell", "/usr/sbin/nologin", "--gid", "photos", SMB_USER,
        ])
    PHOTOS_PATH.mkdir(parents=True, exist_ok=True)
    shutil.chown(PHOTOS_PATH, user=SMB_USER, group="photos")
    os.chmod(PHOTOS_PATH, 0o2770)
    run(["smbpasswd", "-s", "-a", SMB_USER], input_text=f"{password}\n{password}\n")
    run(["smbcontrol", "all", "reload-config"], check=False)


def ensure_immich(name: str, email: str, password: str) -> str:
    config = api_json("/server/config")
    if not config.get("isInitialized"):
        api_json("/auth/admin-sign-up", "POST", {"name": name, "email": email, "password": password})
    login = api_json("/auth/login", "POST", {"email": email, "password": password})
    token = login["accessToken"]
    owner_id = login["userId"]
    libraries = api_json("/libraries", token=token)
    existing = next((item for item in libraries if "/mnt/external/pc" in item.get("importPaths", [])), None)
    if existing:
        library = existing
    else:
        library = api_json(
            "/libraries", "POST",
            {"ownerId": owner_id, "name": "PC Photos", "importPaths": ["/mnt/external/pc"]},
            token,
        )
    api_json(f"/libraries/{library['id']}/scan", "POST", token=token)
    return library["id"]


app = Flask(__name__)
init_db()
secret = setting("flask_secret")
if not secret:
    secret = secrets.token_hex(32)
    set_setting("flask_secret", secret)
app.secret_key = secret
app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Strict", PERMANENT_SESSION_LIFETIME=3600)


@app.after_request
def security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/api/status")
def status():
    initialized = bool(setting("initialized", False))
    result = {
        "initialized": initialized,
        "authenticated": bool(session.get("owner")),
        "hostname": os.uname().nodename,
        "disk": disk_status(),
        "immich": immich_state(),
    }
    if session.get("owner"):
        result.update({
            "ownerName": setting("owner_name", ""),
            "share": f"\\\\{os.uname().nodename}.local\\Photos",
            "ntfyConfigured": bool(setting("ntfy_topic")),
            "tailscale": service_active("tailscaled"),
        })
    return jsonify(result)


@app.post("/api/setup")
def setup():
    if setting("initialized", False):
        return jsonify({"error": "初期設定は完了しています"}), 409
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    owner_password = str(data.get("ownerPassword", ""))
    immich_password = str(data.get("immichPassword", owner_password))
    smb_password = str(data.get("smbPassword", owner_password))
    if len(name) < 1 or "@" not in email:
        return jsonify({"error": "名前とメールアドレスを確認してください"}), 400
    if min(map(len, (owner_password, immich_password, smb_password))) < 8:
        return jsonify({"error": "パスワードは8文字以上にしてください"}), 400
    if any("\n" in item or "\r" in item for item in (owner_password, immich_password, smb_password)):
        return jsonify({"error": "パスワードに改行は使用できません"}), 400
    try:
        ensure_samba(smb_password)
        library_id = ensure_immich(name, email, immich_password)
        topic = secrets.token_urlsafe(32).replace("_", "").replace("-", "")
        set_setting("ntfy_topic", topic)
        set_setting("owner_name", name)
        set_setting("owner_email", email)
        set_setting("owner_password_hash", generate_password_hash(owner_password, method="scrypt"))
        set_setting("immich_library_id", library_id)
        set_setting("initialized", True)
        session.clear()
        session["owner"] = True
        session.permanent = True
        audit("owner", "setup.complete", "SMB, Immich external library, ntfy topic")
        return jsonify({"ok": True})
    except Exception as error:
        audit("setup", "setup.failed", str(error))
        return jsonify({"error": str(error)}), 500


@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    password_hash = setting("owner_password_hash", "")
    if not password_hash or not check_password_hash(password_hash, str(data.get("password", ""))):
        audit("unknown", "login.failed", request.remote_addr or "")
        return jsonify({"error": "パスワードが違います"}), 401
    session.clear()
    session["owner"] = True
    session.permanent = True
    audit("owner", "login.success")
    return jsonify({"ok": True})


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.get("/api/notifications")
@owner_required
def notifications():
    topic = setting("ntfy_topic")
    return jsonify({
        "subscribeUrl": f"ntfy://ntfy.sh/{topic}?display=Photo+NAS",
        "webUrl": f"https://ntfy.sh/{topic}",
    })


@app.get("/api/notifications/qr.png")
@owner_required
def notification_qr():
    topic = setting("ntfy_topic")
    url = f"ntfy://ntfy.sh/{topic}?display=Photo+NAS"
    result = subprocess.run(
        ["qrencode", "-t", "PNG", "-o", "-", "-s", "8", url],
        capture_output=True,
        check=True,
    )
    return send_file(io.BytesIO(result.stdout), mimetype="image/png")


@app.post("/api/notifications/test")
@owner_required
def notification_test():
    send_ntfy("通知の設定が完了しました。HDDに異常があればここへお知らせします。", title="写真NAS 接続テスト")
    audit("owner", "notification.test")
    return jsonify({"ok": True})


@app.get("/api/windows-connect.cmd")
@owner_required
def windows_connect():
    script = "@echo off\r\nchcp 65001 >nul\r\necho 写真NASをPドライブへ接続します。\r\nnet use P: \\\\nas.local\\Photos /user:nasowner * /persistent:yes\r\npause\r\n"
    return Response(script, mimetype="application/octet-stream", headers={"Content-Disposition": "attachment; filename=connect-photo-nas.cmd"})


@app.get("/api/support/requests")
@owner_required
def support_requests():
    with db() as connection:
        rows = connection.execute("SELECT * FROM support_requests ORDER BY created_at DESC LIMIT 20").fetchall()
    return jsonify([dict(row) for row in rows])


@app.post("/api/support/requests/<request_id>/<decision>")
@owner_required
def support_decision(request_id: str, decision: str):
    if decision not in {"approve", "deny"}:
        return jsonify({"error": "不正な操作です"}), 400
    now = utcnow()
    with db() as connection:
        row = connection.execute("SELECT * FROM support_requests WHERE id = ?", (request_id,)).fetchone()
        if not row or row["status"] != "pending":
            return jsonify({"error": "申請が見つからないか処理済みです"}), 404
        if decision == "approve":
            expires = now + timedelta(hours=1)
            connection.execute(
                "UPDATE support_requests SET status='approved', approved_at=?, expires_at=? WHERE id=?",
                (iso(now), iso(expires), request_id),
            )
        else:
            connection.execute("UPDATE support_requests SET status='denied' WHERE id=?", (request_id,))
    audit("owner", f"support.{decision}", request_id)
    send_ntfy("保守申請を1時間許可しました。" if decision == "approve" else "保守申請を拒否しました。")
    return jsonify({"ok": True})


@app.get("/api/audit")
@owner_required
def audit_log():
    with db() as connection:
        rows = connection.execute("SELECT * FROM audit ORDER BY created_at DESC LIMIT 100").fetchall()
    return jsonify([dict(row) for row in rows])


@app.post("/api/tailscale/start")
@owner_required
def tailscale_start():
    run(["tailscale", "logout"], check=False)
    result = run(["tailscale", "up", "--ssh", "--hostname", "nas", "--timeout=15s"], check=False, timeout=25)
    output = result.stdout + "\n" + result.stderr
    match = re.search(r"https://login\.tailscale\.com/\S+", output)
    audit("owner", "tailscale.reenroll")
    return jsonify({"ok": result.returncode == 0, "authUrl": match.group(0) if match else None})


@app.get("/healthz")
def healthz():
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8787)
