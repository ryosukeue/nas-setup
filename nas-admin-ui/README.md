# 写真NAS 管理画面

`http://nas.local` で配信する、所有者向けの初期設定・管理画面です。外部のWebホスティングは使わず、NAS上のnginxから静的ファイルとして配信します。

## 主な機能

- RAID、物理HDD、空き容量、Immich、Tailscaleの状態表示
- 所有者、Windows共有、Immich管理者、PC写真外部ライブラリの一括作成
- Windowsの `P:` ドライブ接続ツール
- ntfyのスマホ用QRとPCブラウザ用URL
- 所有者TailnetへのTailscale再登録
- 所有者のTailnet内で使う外出先Immichの設定

販売者用の遠隔保守画面や一時権限機能はありません。

## ビルド

```bash
pnpm install
pnpm run lint
pnpm run build
pnpm run start -- --port 3001
pnpm run export:nas
```

`export:nas` は本番レンダリング結果とクライアント資産を `nas-static/` にまとめます。この生成物をNASの `/opt/nas-admin-ui-static` へ配置します。
