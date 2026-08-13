import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "NhaDat Radar — Sàn nhà đất bán & cho thuê",
  description: "Tổng hợp tin nhà đất từ nhiều nguồn, AI chuẩn hoá & chấm điểm.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        {/* Prata cho tiêu đề (tuỳ chọn, fallback serif nếu chặn) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Prata&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Nav />
        <main className="max-w-6xl mx-auto px-5 py-6">{children}</main>
      </body>
    </html>
  );
}
