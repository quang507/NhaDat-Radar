import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import Clarity from "@/components/Clarity";

// Body: Inter · Display: Lora (self-host qua next/font, không gọi link ngoài)
const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-inter", display: "swap" });
const lora = Lora({ subsets: ["latin", "vietnamese"], variable: "--font-lora", display: "swap", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "NhaDat Radar - Sàn nhà đất bán & cho thuê",
  description: "Tổng hợp tin nhà đất từ nhiều nguồn, AI chuẩn hoá & chấm điểm.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${lora.variable}`}>
      <body>
        <Nav />
        <main className="max-w-6xl mx-auto px-5 py-6">{children}</main>
        <Footer />
        <ChatWidget />
        <Clarity />
      </body>
    </html>
  );
}
