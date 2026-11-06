import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "拾光 · 素材创作",
  description: "浏览模板，上传素材，轻松完成视觉创作。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
