import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import Clarity from "@/components/Clarity";
import MoiDienSdt from "@/components/MoiDienSdt";
import { ldJson, SITE_URL } from "@/lib/ld";

// Body: Inter · Display: Lora (self-host qua next/font, không gọi link ngoài)
const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-inter", display: "swap" });
const lora = Lora({ subsets: ["latin", "vietnamese"], variable: "--font-lora", display: "swap", weight: ["500", "600", "700"] });

// metadataBase: thiếu nó thì mọi ảnh OG / canonical tương đối bị Next cảnh báo và Google nhận URL
// không đầy đủ. title.template để trang con chỉ cần đặt phần riêng (23/9).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NhaDat Radar - Sàn nhà đất bán & cho thuê, giá thật theo khu vực",
    template: "%s",
  },
  description: "Tổng hợp tin nhà đất bán và cho thuê từ nhiều nguồn, chuẩn hoá bằng AI, kèm giá trung vị theo quận, xu hướng giá và cảnh báo giá lệch.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website", siteName: "NhaDat Radar", locale: "vi_VN", url: SITE_URL,
    title: "NhaDat Radar - Sàn nhà đất bán & cho thuê",
    description: "Tin nhà đất nhiều nguồn, giá trung vị theo khu vực, cảnh báo giá lệch.",
  },
  robots: { index: true, follow: true },
};

// Organization + WebSite (SearchAction): khai báo một lần ở layout cho mọi trang
const LD_SITE = [
  { "@context": "https://schema.org", "@type": "Organization", name: "NhaDat Radar", url: SITE_URL,
    description: "Sàn tổng hợp tin nhà đất bán & cho thuê tại Việt Nam." },
  { "@context": "https://schema.org", "@type": "WebSite", name: "NhaDat Radar", url: SITE_URL,
    inLanguage: "vi-VN",
    potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` }, "query-input": "required name=search_term_string" } },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${lora.variable}`}>
      <body>
        <Nav />
        <main className="max-w-6xl mx-auto px-5 py-6">{children}</main>
        <Footer />
        <ChatWidget />
        <Clarity />
        {/* mời người đã đăng nhập để lại SĐT (không OTP, bỏ qua được) - hiện lại sau 7 ngày */}
        <MoiDienSdt />
        {/* JSON-LD đặt CUỐI body: để ở đầu body làm hydration hỏng trên WebKit/iOS (đo 23/9:
            trang máy tính lãi vay không phản hồi khi nhập, không có lỗi console) */}
        {LD_SITE.map((o, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(o) }} />)}
      </body>
    </html>
  );
}
