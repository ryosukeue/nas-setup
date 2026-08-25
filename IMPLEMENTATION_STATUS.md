# 実装・実機確認記録

更新日: 2026-08-25

## 完了済み

- Ubuntu Server `nas` は家庭ルーターのDHCPでIPを取得する
- Avahiが `nas.local` を広告する
- `http://nas.local` で日本語の初期設定画面を配信する
- mdadm RAID1 `/dev/md0` は2台中2台稼働 (`[UU]`)
- RAID上のBtrfsは約2TBで、実機確認時の空きは約1.98TB
- Sambaの `Photos` 共有を `/srv/photos/pc` に構成した
- WS-DiscoveryでWindowsの「ネットワーク」へNASを表示する
- Immich v3.1.0を稼働させ、PC写真を `/mnt/external/pc:ro` でコンテナへ渡した
- 初回ウィザードがImmich管理者と `PC Photos` 外部ライブラリを作り、初回スキャンを開始する
- Windows用接続ツールが `\\nas.local\Photos` を `P:` ドライブへ登録する
- 長いランダムなntfyトピックを初回に生成し、スマホ用QR、PC用Web URL、テスト通知を表示する
- RAIDメンバーの消失と各物理HDDのSMART総合判定を起動時・1時間ごとに確認する
- 異常通知は同じ内容を連投せず、状態変化時と24時間後に再通知する
- 写真グループに属さない `support` ユーザーと固定保守コマンドを構成した
- 保守申請、所有者の許可・拒否、1時間の期限、監査ログをSQLiteへ保存する
- 未許可時は保守操作を拒否し、許可時だけ固定の状態確認・サービス再起動・ディスク確認を実行することを実機で確認した
- nginx、管理API、Samba、Avahi、WS-Discovery、Immich、Tailscale、監視timerの自動起動を確認した
- Tailscale IP経由でも管理画面と管理APIを実ブラウザで確認した

## 引き渡し時に所有者が行う操作

1. NASをLANへ接続し、PCまたはスマホで `http://nas.local` を開く
2. 所有者名、メールアドレス、パスワードを登録する
3. Windowsの場合は接続ツールを実行して `P:` ドライブを追加する
4. Androidへntfyをインストールし、画面のQRを読む（ログイン・APIキー不要）
5. 「所有者のTailscaleへ接続」を押し、所有者本人のアカウントで認証する
6. Immichアプリへ `http://nas.local:2283` と登録したメール・パスワードでログインする

ブラウザからWindowsのネットワークドライブを無確認で追加することはOSの安全制限上できないため、接続ツール実行とパスワード入力だけは利用者の操作が必要です。

## データと秘密情報

- PC写真: `/srv/photos/pc`
- Immichデータ: `/srv/immich`
- 管理状態・通知トピック・パスワードハッシュ: `/var/lib/nas-admin/state.db`
- 上記の利用者データと秘密情報はGitHubへ保存しない
- `support` ユーザーは写真グループに入れず、一般的なrootシェルも与えない

RAID1はディスク1台の故障に耐える冗長化であり、バックアップではありません。大切な写真には別のUSBディスクまたは別拠点へのバックアップを追加してください。
