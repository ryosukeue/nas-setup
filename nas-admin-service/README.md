# Photo NAS local management service

This root-owned local service exposes a narrow API for the `nas.local` owner dashboard.

It provisions the Windows SMB share, creates the first Immich admin and read-only external library, generates an anonymous ntfy topic, and monitors the two physical RAID1 members.

Secrets and runtime state live in `/var/lib/nas-admin/state.db` and are never committed.

The service is installed as root because initial provisioning must create the Samba user and configure Immich. After setup, owner-only endpoints require the local dashboard session cookie. There is no seller support account or temporary privilege-granting API.
