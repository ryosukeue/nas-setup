# Photo NAS local management service

This root-owned local service exposes a narrow API for the `nas.local` owner dashboard.

It provisions the Windows SMB share, creates the first Immich admin and read-only external library, generates an anonymous ntfy topic, monitors the two physical RAID1 members, and brokers time-limited support operations without granting a general root shell.

Secrets and runtime state live in `/var/lib/nas-admin/state.db` and are never committed.

The service is installed as root because initial provisioning must create the Samba user and configure Immich. After setup, owner-only endpoints require the local dashboard session cookie.

The `support` Linux user is not in the photo group. Its convenience commands internally use two narrowly allow-listed root programs:

```sh
nas-support request "点検内容"
nas-maint status
nas-maint restart immich
nas-maint check-disks
```

`nas-maint` checks the latest approval and refuses every operation unless its one-hour expiry is still valid. It does not expose an arbitrary shell or accept arbitrary service names.
