import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "写真NAS セットアップ",
  description: "写真NASの初期設定と管理",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
