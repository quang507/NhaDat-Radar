import Link from "next/link";
import { Phone, Mail, Clock, ShieldCheck, Compass } from "lucide-react";
import { DON_VI } from "@/lib/don-vi";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--line)] bg-[var(--surface)]">
      <div className="max-w-6xl mx-auto px-5 py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div>
          <div className="flex items-center gap-2 font-extrabold tracking-tight mb-3">
            <span className="w-7 h-7 rounded-lg grid place-items-center text-white text-xs bg-brand shadow-sm font-black">
              RD
            </span>
            NhaDat<span className="text-brand">Radar</span>
          </div>
          <p className="text-[var(--ink-soft)] leading-relaxed">
            Sàn tổng hợp phòng trọ và nhà đất xác minh tại TP.HCM. Cập nhật phòng trống liên tục mỗi ngày, đúng giá chủ nhà và hỗ trợ dẫn xem phòng miễn phí.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Dữ liệu xác minh &amp; cập nhật liên tục</span>
          </div>
        </div>

        <div>
          <div className="font-bold mb-3">Khám phá</div>
          <ul className="space-y-2 text-[var(--ink-soft)]">
            <li><Link className="hover:text-brand transition-colors" href="/nha-dat-cho-thue/ho-chi-minh/phong-tro">Phòng trọ TP.HCM</Link></li>
            <li><Link className="hover:text-brand transition-colors text-brand font-medium" href="/phong-tro-gan-truong-dai-hoc">Phòng trọ gần Đại học TP.HCM</Link></li>
            <li><Link className="hover:text-brand transition-colors text-xs text-[var(--ink-faint)]" href="/phong-tro-duoi-3-trieu">Phòng trọ dưới 3 triệu</Link> · <Link className="hover:text-brand transition-colors text-xs text-[var(--ink-faint)]" href="/phong-tro-co-gac-lung">Có gác lửng</Link> · <Link className="hover:text-brand transition-colors text-xs text-[var(--ink-faint)]" href="/can-ho-mini-full-noi-that">CHDV Studio</Link></li>
            <li>
              <div className="text-xs text-[var(--ink-faint)] leading-relaxed">
                <span>Phòng trọ gần: </span>
                <Link className="hover:text-brand transition-colors" href="/phong-tro-gan/etown-cong-hoa">Etown</Link> ·{" "}
                <Link className="hover:text-brand transition-colors" href="/phong-tro-gan/san-bay-tan-son-nhat">Sân bay</Link> ·{" "}
                <Link className="hover:text-brand transition-colors" href="/phong-tro-gan/ga-metro-van-thanh">Metro</Link> ·{" "}
                <Link className="hover:text-brand transition-colors" href="/phong-tro-gan/benh-vien-ung-buou">Ung Bướu</Link> ·{" "}
                <Link className="hover:text-brand transition-colors" href="/phong-tro-gan/benh-vien-cho-ray">Chợ Rẫy</Link> ·{" "}
                <Link className="hover:text-brand transition-colors" href="/phong-tro-gan/khu-che-xuat-tan-thuan">KCX Tân Thuận</Link>
              </div>
            </li>
            <li><Link className="hover:text-brand transition-colors" href="/nha-dat-ban">Nhà đất bán</Link></li>
            <li><Link className="hover:text-brand transition-colors" href="/nha-dat-cho-thue">Nhà đất cho thuê</Link></li>
            <li><Link className="hover:text-brand transition-colors" href="/projects">Dự án nổi bật</Link></li>
            <li><Link className="hover:text-brand transition-colors" href="/thong-ke">Bản đồ giá thị trường</Link></li>
            <li><Link className="hover:text-brand transition-colors" href="/tin-tuc">Tin tức &amp; xu hướng</Link></li>
          </ul>
        </div>

        <div>
          <div className="font-bold mb-3">Công cụ &amp; Hướng dẫn</div>
          <ul className="space-y-2 text-[var(--ink-soft)]">
            <li><Link className="hover:text-brand transition-colors" href="/dinh-gia">Định giá bất động sản theo m²</Link></li>
            <li><Link className="hover:text-brand transition-colors" href="/tinh-lai-vay">Máy tính lãi vay ngân hàng</Link></li>
            <li><Link className="hover:text-brand transition-colors" href="/thue-hay-mua">So sánh Thuê hay Mua</Link></li>
            <li><Link className="hover:text-brand transition-colors" href="/huong-dan/mua">Kinh nghiệm mua &amp; thuê</Link></li>
            <li><Link className="hover:text-brand transition-colors" href="/huong-dan/ban">Kinh nghiệm bán nhà</Link></li>
            <li><Link className="hover:text-brand transition-colors font-semibold" href="/lap-phong">Chủ trọ: dịch vụ lấp phòng</Link></li>
            <li><Link className="hover:text-brand transition-colors" href="/agents">Mạng lưới môi giới uy tín</Link></li>
          </ul>
        </div>

        <div>
          <div className="font-bold mb-3 text-brand">Trung tâm tư vấn</div>
          <div className="space-y-3 text-[var(--ink-soft)]">
            <div>
              <span className="text-xs text-[var(--ink-faint)] block mb-0.5">Hotline hỗ trợ (8:00 - 21:00):</span>
              <a href="tel:0387365020" className="inline-flex items-center gap-2 text-base font-extrabold text-brand hover:underline">
                <Phone className="w-4 h-4" />
                0387 365 020
              </a>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-4 h-4 text-[var(--ink-faint)] shrink-0" />
              <span>Hỗ trợ các ngày trong tuần (T2 - CN)</span>
            </div>
            <p className="text-xs text-[var(--ink-faint)] leading-relaxed pt-1 border-t border-[var(--line)]">
              Tư vấn kiểm tra pháp lý, quy hoạch, thẩm định giá và đặt lịch dẫn xem nhà thực tế miễn phí.
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--line)] py-5 text-center text-xs text-[var(--ink-faint)] space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-medium">
          <Link href="/gioi-thieu" className="hover:text-brand transition-colors">Giới thiệu</Link>
          <Link href="/lien-he" className="hover:text-brand transition-colors">Liên hệ</Link>
          <Link href="/chinh-sach-bao-mat" className="hover:text-brand transition-colors">Chính sách bảo mật</Link>
          <Link href="/dieu-khoan-su-dung" className="hover:text-brand transition-colors">Điều khoản sử dụng</Link>
        </div>
        <div>
          © {new Date().getFullYear()} NhaDat Radar. Dữ liệu tổng hợp từ các nguồn công khai, chỉ mang tính chất tham khảo.
        </div>
        {/* Thông tin chủ quản (Luật TMĐT 122/2025) - điền ở lib/don-vi.ts, ô rỗng thì ẩn */}
        <div className="px-4 leading-relaxed">
          {(DON_VI.ten || DON_VI.maSoThue) && (
            <div>
              {DON_VI.ten && <>Đơn vị chủ quản: {DON_VI.ten}</>}
              {DON_VI.maSoThue && <> · MST/ĐKKD: {DON_VI.maSoThue}{DON_VI.ngayCap && ` cấp ngày ${DON_VI.ngayCap}`}{DON_VI.noiCap && ` tại ${DON_VI.noiCap}`}</>}
            </div>
          )}
          {DON_VI.diaChi && <div>Địa chỉ: {DON_VI.diaChi}</div>}
          <div>Email: <a href={`mailto:${DON_VI.email}`} className="hover:text-brand">{DON_VI.email}</a> · Hotline: {DON_VI.hotline}</div>
        </div>
        {DON_VI.boCongThuong && (
          <a href={DON_VI.boCongThuong} target="_blank" rel="noopener noreferrer" className="inline-block hover:text-brand underline">
            Đã thông báo/đăng ký với Bộ Công Thương
          </a>
        )}
      </div>
    </footer>
  );
}
