# 実装・実機確認記録

更新日: 2026-08-31

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
- Windows用接続ツールが空いているドライブ文字を選び、`\\nas.local\Photos` の資格情報と永続マッピングを保存する
- Windows共有パスワード変更と接続解除ツールを管理画面に用意した
- 長いランダムなntfyトピックを初回に生成し、スマホ用QR、PC用Web URL、テスト通知を表示する
- RAIDメンバーの消失と各物理HDDのSMART総合判定を起動時・1時間ごとに確認する
- 異常通知は同じ内容を連投せず、状態変化時と24時間後に再通知する
- 写真グループに属さない `support` ユーザーと固定保守コマンドを構成した
- 保守申請、所有者の許可・拒否、1時間の期限、監査ログをSQLiteへ保存する
- 未許可時は保守操作を拒否し、許可時だけ固定の状態確認・サービス再起動・ディスク確認を実行することを実機で確認した
- nginx、管理API、Samba、Avahi、WS-Discovery、Immich、Tailscale、監視timerの自動起動を確認した
- Tailscale IP経由でも管理画面と管理APIを実ブラウザで確認した
- 所有者Tailnetへの再登録後、「引き渡しを完了する」で構築用 `ryo` の鍵・パスワード・sudo・ログインシェルを停止する
- Tailscale ServeでImmichをHTTPS :443、NAS管理画面をHTTPS :8443へTailnet内限定で公開する
- Immich外出先URL、スマホ登録用QR、Androidアプリ導線を管理画面に表示する
- 外出先HTTPS設定が完了するまで、構築用ログインの停止操作を拒否する

## 2026-08-31 実機反映・確認

- GitHub `main` の `3267770` までを実機へ反映した
- RAID再同期を継続したまま、管理APIと静的画面だけを更新した。NAS本体とImmichは再起動していない
- `nas-admin` と `nginx` が更新後もactive、`http://nas.local` と `/healthz` がHTTP 200であることを確認した
- Immich `/api/server/ping` がHTTP 200、初期所有者は未登録のままであることを確認した
- 未認証では所有者専用APIがHTTP 401になることを確認した
- 隔離したテスト用状態DBで、Tailscale Serveの :443/:8443設定、HTTPS許可URL検出、設定前の引き渡し拒否を確認した
- Windows接続ツールに永続マッピングと資格情報保存が含まれることを確認した
- 更新時点のRAIDは2台とも稼働する `[UU]` で再同期中。再同期完了後の再起動復帰確認は未実施

## 2026-08-31 試用後リセット

- 所有者ウィザードの試用後、NAS管理状態DB、Immich所有者・データベース・画像領域、Samba認証を削除した
- PC写真共有は0件であることを確認し、`/srv/photos/pc` とRAID構成は変更していない
- Tailscaleは構築用Tailnetのままで、Serve公開設定が空であることを確認した
- リセット後、NAS管理画面とImmichの双方が未登録、Immich全コンテナが正常、RAIDが2台稼働 `[UU]` であることを確認した
- 一時退避した試用データは確認後に削除し、利用者の試用メール・パスワード・通知トピックはGitHubへ保存していない

## 2026-09-04 RAID再同期完了確認

- `/dev/md0` は2台中2台が稼働するRAID1 `[UU]`
- `sync_action` は `idle`、`array_state` は `clean`、degradedデバイス数は0
- `/dev/sda` と `/dev/sdb` は両方存在し、管理APIによるSMART総合判定は両方とも正常
- 利用可能容量は約1.98TBで、Immichと初期設定画面も稼働中

## 引き渡し時に所有者が行う操作

1. NASをLANへ接続し、PCまたはスマホで `http://nas.local` を開く
2. 所有者名、メールアドレス、パスワードを登録する
3. Windowsの場合は接続ツールを実行し、共有パスワードを一度入力してネットワークドライブを追加する
4. Androidへntfyをインストールし、画面のQRを読む（ログイン・APIキー不要）
5. 「所有者のTailscaleへ接続」を押し、所有者本人のアカウントで認証する
6. NAS管理画面へ戻り「外出先アクセスを設定」を押す。初回だけTailscaleのHTTPS許可が表示された場合は許可して再実行する
7. スマホにもTailscaleとImmichを入れ、表示されたHTTPS URLをImmichのサーバーURLに登録する
8. Wi-Fiを切った状態でもImmichが開くことを確認し、「引き渡しを完了する」で構築用ログインを停止する

ブラウザからWindowsのネットワークドライブを無確認で追加することはOSの安全制限上できないため、接続ツール実行とパスワード入力だけは利用者の操作が必要です。保存後はWindows再起動時にも同じドライブへ再接続します。

## データと秘密情報

- PC写真: `/srv/photos/pc`
- Immichデータ: `/srv/immich`
- 管理状態・通知トピック・パスワードハッシュ: `/var/lib/nas-admin/state.db`
- 上記の利用者データと秘密情報はGitHubへ保存しない
- `support` ユーザーは写真グループに入れず、一般的なrootシェルも与えない

RAID1はディスク1台の故障に耐える冗長化であり、バックアップではありません。大切な写真には別のUSBディスクまたは別拠点へのバックアップを追加してください。
