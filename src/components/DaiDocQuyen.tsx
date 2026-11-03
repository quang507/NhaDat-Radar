import Link from "next/link";
import ListingCard from "@/components/ListingCard";
import HangVuot from "@/components/HangVuot";
import { laRoHang } from "@/lib/ro-hang";
import { boTinTrung } from "@/lib/tin-trung";
import type { Listing } from "@/lib/types";
import { ShieldCheck, ArrowRight } from "lucide-react";

// Dải "Tin đã xác minh", đứng ĐẦU mọi trang danh sách (21/8).
// 3/11 (UX audit): chỉ còn RỔ HÀNG (đơn vị quản lý xác nhận còn trống). Bản cũ lấy mọi tin độc quyền và xếp
// tin nhóm Zalo trước -> dải "xác minh" đầu trang chủ toàn giỏ hàng môi giới "Thoả thuận", căn bán 58 tỷ lặp 2 lần.
// Tin Zalo/FB vẫn giấu SĐT như cũ (laTinDocQuyen), chỉ không được gọi là "xác minh" nữa.
export function locDocQuyen(listings: Listing[], toiDa = 6) {
  return boTinTrung(listings.filter((x) => laRoHang(x) && !!x.price_vnd)).slice(0, toiDa);
}

export default function DaiDocQuyen({ listings, toiDa = 6 }: { listings: Listing[]; toiDa?: number }) {
  const tins = locDocQuyen(listings, toiDa);
  if (!tins.length) return null;
  return (
    <section className="band-spotlight p-3 sm:p-4 lg:px-3.5 mb-6">
      <div className="flex items-center justify-between gap-2 mb-3.5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/search?own=1"
            title="Xem tất cả phòng đã được đơn vị quản lý xác nhận còn trống"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-brand hover:bg-brand-ink text-white font-bold text-xs shadow-xs tracking-wide uppercase transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Tin đã xác minh</span>
          </Link>
          {/* điện thoại: câu mô tả rớt 2 dòng đẩy tin xuống - nhãn "Tin đã xác minh" đã đủ nghĩa */}
          <span className="hidden sm:inline text-xs font-medium text-[var(--ink-soft)]">
            Phòng trống do đơn vị quản lý xác nhận, cập nhật nhiều lần mỗi ngày
          </span>
        </div>
        <div className="flex items-center gap-2.5 ml-auto">
          <Link
            href="/search?own=1"
            className="group text-xs text-brand font-bold inline-flex items-center gap-1 hover:text-brand-ink transition-colors"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
      {/* không đè thêm badge - ListingCard tự gắn tag "XÁC MINH" cho rổ hàng */}
      {/* điện thoại: hàng vuốt ngang; sm+: lưới */}
      <HangVuot motHang items={tins.map((x) => ({ key: x.id, node: <ListingCard x={x} /> }))} />
    </section>
  );
}
