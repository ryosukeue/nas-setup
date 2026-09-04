#!/usr/bin/env bash
set -euo pipefail

source_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  samba avahi-daemon wsdd-server smartmontools qrencode nginx gunicorn python3-flask

install -d -m 0755 /opt/nas-admin-service
install -m 0755 "$source_dir/app.py" /opt/nas-admin-service/app.py
install -m 0755 "$source_dir/disk_monitor.py" /opt/nas-admin-service/disk_monitor.py
install -d -m 0700 /var/lib/nas-admin

getent group photos >/dev/null || groupadd --system photos
install -d -o root -g photos -m 2770 /srv/photos/pc

install -m 0644 "$source_dir/deploy/nas-admin.smb.conf" /etc/samba/nas-admin.conf
if ! grep -qF 'include = /etc/samba/nas-admin.conf' /etc/samba/smb.conf; then
  sed -i '$a\
include = /etc/samba/nas-admin.conf' /etc/samba/smb.conf
fi

install -m 0644 "$source_dir/deploy/nas-admin.avahi.service" /etc/avahi/services/nas-admin.service
install -m 0644 "$source_dir/deploy/nas-admin.nginx" /etc/nginx/sites-available/nas-admin
ln -sfn /etc/nginx/sites-available/nas-admin /etc/nginx/sites-enabled/nas-admin
rm -f /etc/nginx/sites-enabled/default

install -m 0644 "$source_dir/deploy/immich-compose.override.yml" /opt/immich/docker-compose.override.yml

rm -f /usr/local/bin/nas-support /usr/local/bin/nas-maint /etc/sudoers.d/nas-admin
if id support >/dev/null 2>&1; then
  pkill -KILL -u support 2>/dev/null || true
  userdel --remove support
fi

install -m 0644 "$source_dir/deploy/nas-admin.service" /etc/systemd/system/nas-admin.service
install -m 0644 "$source_dir/deploy/nas-disk-monitor.service" /etc/systemd/system/nas-disk-monitor.service
install -m 0644 "$source_dir/deploy/nas-disk-monitor.timer" /etc/systemd/system/nas-disk-monitor.timer

testparm -s >/dev/null
nginx -t
cd /opt/immich
docker compose up -d

systemctl daemon-reload
systemctl enable --now smbd avahi-daemon wsdd-server smartmontools nas-admin nas-disk-monitor.timer nginx
systemctl start nas-disk-monitor.service

echo "Photo NAS services installed."
