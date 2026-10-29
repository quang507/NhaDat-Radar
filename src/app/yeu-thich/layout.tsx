import type { Metadata } from "next";

// trang client ("use client") không tự khai báo metadata được -> layout riêng.
// Danh sách tin đã lưu là của từng người, không có gì để Google lập chỉ mục.
export const metadata: Metadata = {
  title: "Tin đã lưu - NhaDat Radar",
  alternates: { canonical: "/yeu-thich" },
  robots: { index: false, follow: true },
};

export default function YeuThichLayout({ children }: { children: React.ReactNode }) {
  return children;
}
