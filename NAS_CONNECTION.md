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
