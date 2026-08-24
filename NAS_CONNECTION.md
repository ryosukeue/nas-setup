# Ubuntu Server 接続記録

## 検出結果

- Ubuntu Server: `192.168.10.125`
- SSH: TCP 22番ポートで応答
- SSHバナー: `OpenSSH_10.2p1 Ubuntu-2ubuntu3.5`

`192.168.10.116` はTP-Link機器であり、Ubuntu Serverではないことを確認。

## ログイン状況

- ユーザー: `ryo`
- ホスト名: `nas`
- このMacの公開鍵を登録済み
- パスワード不要のSSHログインを確認済み

接続コマンド:

```sh
ssh -i ~/.ssh/nas_ed25519 ryo@192.168.10.125
```

## 導入済みサービス

- OS更新: 2026-08-24 に適用済み
- Docker Engine: 29.7.2
- Tailscale: 1.102.3（初回ログイン待ち）
- Immich: v3.1.0

### Immich

- Web画面: `http://192.168.10.125:2283`
- アップロードデータ: `/srv/immich/library`
- データベース: `/srv/immich/postgres`
- 設定ファイル: `/opt/immich/.env`（秘密情報を含むためGitHubには保存しない）

### Tailscale

Tailscaleへ参加済みです。

- デバイス名: `nas`
- Tailscale IP: `100.116.147.112`
- Tailscale SSH: 有効

外部ネットワークからは、Tailscaleにログイン済みの端末で次のように接続できます。

```sh
ssh ryo@100.116.147.112
```
