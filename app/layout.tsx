import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Discord Knowledge Hub — Prototype CP2",
  description: "Tìm và duyệt tài liệu đã chia sẻ trong khóa học.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="vi"><body>{children}</body></html>;
}
