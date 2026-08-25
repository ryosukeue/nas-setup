# Photo NAS local management service

This root-owned local service exposes a narrow API for the `nas.local` owner dashboard.

It provisions the Windows SMB share, creates the first Immich admin and read-only external library, generates an anonymous ntfy topic, monitors the two physical RAID1 members, and brokers time-limited support operations without granting a general root shell.

Secrets and runtime state live in `/var/lib/nas-admin/state.db` and are never committed.
