# 友人向け写真NAS

Ubuntu Serverを、CLI不要で使える写真NASとして引き渡すための構成と実装記録です。

## 利用者の入口

- 初期設定・管理: `http://nas.local`
- 写真閲覧: `http://nas.local:2283`
- Windows写真共有: `\\nas.local\Photos`

初回ウィザードで所有者名、メールアドレス、パスワードを入力すると、Windows共有、Immich管理者、PC写真の読み取り専用外部ライブラリ、ntfy通知先をまとめて作成します。その後、画面からWindows接続ツール、ntfy、所有者のTailscaleを設定できます。

## 構成

- 2TB HDD 2台のmdadm RAID1 (`/dev/md0`, `[UU]`)
- RAID上のBtrfsへImmichとPC写真を保存
- Avahi/mDNSによる `nas.local`
- Samba/SMB3とWS-DiscoveryによるWindows共有
- Immich v3.1.0
- Tailscaleと写真権限を持たない保守専用ユーザー
- 1時間ごとのRAID/物理HDD/SMART総合判定
- アカウント不要のntfy通知

秘密情報と利用者データはGitHubへ保存しません。実機の状態は `IMPLEMENTATION_STATUS.md`、接続履歴は `NAS_CONNECTION.md`、設計判断は `NAS_PRODUCT_DESIGN.md` に記録します。
