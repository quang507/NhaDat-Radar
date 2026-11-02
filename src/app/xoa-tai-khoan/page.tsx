import type { Metadata } from "next";
import Link from "next/link";
import { DON_VI } from "@/lib/don-vi";

// 2/11 (audit 🔴4): URL xoá tài khoản khai cho Play Console (https://nhadatradar.com/xoa-tai-khoan).
// Trang tĩnh - không cookies/searchParams.
export const metadata: Metadata = {
  title: "Xoá tài khoản & dữ liệu | NhaDat Radar",
  description: "Cách xoá tài khoản NhaDat Radar và dữ liệu cá nhân - ngay trong ứng dụng/website hoặc qua email.",
  alternates: { canonical: "/xoa-tai-khoan" },
};

export default function XoaTaiKhoanPage() {
  const mail = `mailto:${DON_VI.email}?subject=${encodeURIComponent("Yêu cầu xoá tài khoản")}`;
  return (
    <article className="max-w-2xl mx-auto py-8 flex flex-col gap-5 text-sm text-[var(--ink-soft)]">
      <h1 className="text-2xl font-bold text-[var(--ink)]">Xoá tài khoản NhaDat Radar</h1>
      <section className="card rounded-sm p-5">
        <h2 className="font-bold text-[var(--ink)] mb-2">Cách 1 - Ngay trong ứng dụng / website</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Đăng nhập, mở <Link href="/account" className="text-brand underline">Tài khoản của tôi</Link>.</li>
          <li>Cuối trang, bấm <b>Tôi muốn xoá tài khoản</b>, gõ XOA TAI KHOAN rồi bấm <b>Xoá vĩnh viễn</b>.</li>
        </ol>
      </section>
      <section className="card rounded-sm p-5">
        <h2 className="font-bold text-[var(--ink)] mb-2">Cách 2 - Không đăng nhập được</h2>
        <p>
          Gửi email từ địa chỉ đã đăng ký tới <a className="text-brand underline" href={mail}>{DON_VI.email}</a> hoặc dùng{" "}
          <Link href="/lien-he" className="text-brand underline">form Liên hệ</Link>. Radar xử lý trong 20 ngày.
        </p>
        <a href={mail} className="btn btn-primary min-h-12 mt-3 w-full sm:w-auto">Gửi yêu cầu qua email</a>
      </section>
      <section className="card rounded-sm p-5">
        <h2 className="font-bold text-[var(--ink)] mb-2">Dữ liệu bị xoá / được giữ lại</h2>
        <p><b>Xoá:</b> tài khoản, hồ sơ, SĐT, tin đã đăng, tin đã lưu, tìm kiếm đã lưu, tin nhắn, lịch hẹn, nhật ký xem SĐT, ảnh đã tải lên.</p>
        <p className="mt-2"><b>Giữ lại (ẩn danh, không gắn với bạn):</b> báo cáo tin, thống kê lượt xem, hồ sơ giao dịch pháp luật bắt buộc lưu.</p>
      </section>
    </article>
  );
}
