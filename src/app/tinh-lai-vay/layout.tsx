import type { Metadata } from "next";

// trang client ("use client") không tự khai báo metadata được -> layout riêng.
// Mỗi tin dẫn sang /tinh-lai-vay?price=... : canonical gom hết về một trang, khỏi thành vô số bản trùng title.
export const metadata: Metadata = {
  title: "Máy Tính Lãi Vay Mua Nhà theo Ngân Hàng | NhaDat Radar",
  description: "Tính số tiền gốc, lãi và khoản trả góp hàng tháng khi vay mua nhà theo tỷ lệ vay, lãi suất và số năm. Miễn phí, không cần đăng nhập.",
  alternates: { canonical: "/tinh-lai-vay" },
};

export default function TinhLaiVayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
