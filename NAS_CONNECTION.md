# Ubuntu Server 接続・導入記録

更新日: 2026-09-04

## 検出結果

- Ubuntu Server: `192.168.10.125`（設置時LAN。DHCPのため引き渡し先では変わる）
- ホスト名: `nas`
- LAN用URL: `http://nas.local`
- Tailscale IP: `100.116.147.112`（販売者Tailnet上の仮登録）

`192.168.10.116` はTP-Link機器であり、Ubuntu Serverではないことを確認した。

## 実機へ導入済み

- OS更新: 2026-08-24適用
- Docker Engine: 29.7.2
- Immich: v3.1.0、`http://nas.local:2283`
- Tailscale: 1.102.3
- nginx + 写真NAS管理API: `http://nas.local`
- Samba/SMB: `\\nas.local\Photos`
- Avahi/mDNS: `nas.local`
- WS-Discovery: Windowsネットワーク検出
- mdadm RAID1: `/dev/md0`、2/2台、`[UU]`
- 物理HDD/RAID監視: 起動時と1時間ごと

## 保存先

- Immichアップロード: `/srv/immich/library`
- Immichデータベース: `/srv/immich/postgres`
- Windows PC写真: `/srv/photos/pc`
- 管理サービス: `/opt/nas-admin-service`
- 管理画面: `/opt/nas-admin-ui-static`
- 利用者設定・秘密情報: `/var/lib/nas-admin/state.db`

## 引き渡しとSSH

引き渡し時、所有者が管理画面から自分のTailnetへNASを再登録する。外出先からImmichを開けることを確認して「引き渡しを完了する」を押すと、構築用 `ryo` のSSH鍵、パスワード、sudo所属、ログインシェルを停止する。

販売者用の `support` アカウント、遠隔保守申請、一時管理権限は廃止した。販売者Tailnet上のIPと `ryo` SSH経路は引き渡し前の構築専用であり、引き渡し後に販売者がSSH接続する経路は残さない。
