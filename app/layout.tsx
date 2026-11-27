import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "星历 ORBIT · 每一天，都算数",
  description:
    "习惯、收支、随心记与备忘，写在同一本星历里。支持本机使用、备份与可选的云端同步。",
  applicationName: "星历 ORBIT",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "星历",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2EDE1" },
    { media: "(prefers-color-scheme: dark)", color: "#11151A" },
  ],
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-theme="night">
      <body>{children}</body>
    </html>
  );
}
