import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import Clarity from "@/components/Clarity";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import GoogleAdSense from "@/components/GoogleAdSense";
import MoiDienSdt from "@/components/MoiDienSdt";
import DongYCookie from "@/components/DongYCookie";
import DangKySW from "@/components/DangKySW";
import ThanhTai from "@/components/ThanhTai";
import { ldJson, SITE_URL } from "@/lib/ld";

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Inter self-host qua next/font, không gọi link ngoài. 2/11 (audit P9): bỏ Lora - không chỗ nào dùng font-serif
const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-inter", display: "swap" });

// metadataBase: thiếu nó thì mọi ảnh OG / canonical tương đối bị Next cảnh báo và Google nhận URL
// không đầy đủ. title.template để trang con chỉ cần đặt phần riêng (23/9).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NhaDat Radar - Sàn nhà đất bán & cho thuê, giá thật theo khu vực",
    template: "%s",
  },
  description: "Tổng hợp tin nhà đất bán và cho thuê từ nhiều nguồn, chuẩn hoá bằng AI, kèm giá trung vị theo quận, xu hướng giá và cảnh báo giá lệch.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Radar Nhà Đất",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website", siteName: "NhaDat Radar", locale: "vi_VN", url: SITE_URL,
    title: "NhaDat Radar - Sàn nhà đất bán & cho thuê",
    description: "Tin nhà đất nhiều nguồn, giá trung vị theo khu vực, cảnh báo giá lệch.",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "NhaDat Radar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NhaDat Radar - Sàn nhà đất bán & cho thuê",
    description: "Tin nhà đất nhiều nguồn, giá trung vị theo khu vực, cảnh báo giá lệch.",
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  other: {
    "google-adsense-account": "ca-pub-8747500665166380",
  },
};

// Organization + WebSite: chuẩn hoá thực thể schema.org có logo, hotline và @id định danh
const LD_SITE = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#org`,
    name: "NhaDat Radar",
    alternateName: "Radar Nhà Đất",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/icon-512.png`,
      width: 512,
      height: 512,
    },
    description: "Sàn tổng hợp tin nhà đất bán & cho thuê, rổ hàng phòng trọ đã xác minh tại TP.HCM.",
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+84-387-365-020",
        contactType: "customer service",
        areaServed: "VN",
        availableLanguage: ["vi"],
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#web`,
    name: "NhaDat Radar",
    url: SITE_URL,
    inLanguage: "vi-VN",
    publisher: { "@id": `${SITE_URL}/#org` },
  },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={inter.variable} suppressHydrationWarning>
      <head>
        <meta name="google-adsense-account" content="ca-pub-8747500665166380" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.add('light')}}catch(e){}})()`,
          }}
        />
        {/* Consent Mode v2 (audit pháp lý 2/11): mặc định TỪ CHỐI, đặt trước khi GA/AdSense nạp. Đã bấm "Đồng ý"
            ở banner (components/DongYCookie.tsx) thì mở lại ngay từ lượt tải này. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});try{if(localStorage.getItem('radar-dong-y-cookie')==='co')gtag('consent','update',{analytics_storage:'granted',ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'})}catch(e){}`,
          }}
        />
      </head>
      <body>
        <ThanhTai />
        <Nav />
        <main className="max-w-6xl mx-auto px-4 sm:px-5 py-4 sm:py-6">{children}</main>
        <Footer />
        <ChatWidget />
        <Clarity />
        <GoogleAnalytics />
        <GoogleAdSense />
        <DongYCookie />
        {/* 2/11 (audit 🔴8): service worker chỉ trả trang offline khi mất mạng, không cache HTML */}
        <DangKySW />
        {/* mời người đã đăng nhập để lại SĐT (không OTP, bỏ qua được) - hiện lại sau 7 ngày */}
        <MoiDienSdt />
        {/* JSON-LD đặt CUỐI body: để ở đầu body làm hydration hỏng trên WebKit/iOS (đo 23/9:
            trang máy tính lãi vay không phản hồi khi nhập, không có lỗi console) */}
        {LD_SITE.map((o, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(o) }} />)}
      </body>
    </html>
  );
}
