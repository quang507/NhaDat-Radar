import Link from "next/link";
import ListingCard from "@/components/ListingCard";
import HangVuot from "@/components/HangVuot";
import { laTinDocQuyen } from "@/lib/doc-quyen";
import { laRoHang } from "@/lib/ro-hang";
import type { Listing } from "@/lib/types";
import { ShieldCheck, ArrowRight } from "lucide-react";

// Dải "Tin đã xác minh" - FB + Zalo, đứng ĐẦU mọi trang danh sách (21/8).
// Trong dải, tin ZALO (khách nhắn thẳng cho Radar) xếp TRƯỚC tin FB: đó là tin mình cam kết
// chăm ("cứ để căn này Radar lo") nên phải luôn thấy được, không để FB đông hơn chiếm hết
// chỗ - đây chính là lý do "lúc thấy lúc không" trước đây.
export function locDocQuyen(listings: Listing[], toiDa = 6) {
  // 28/9: rổ hàng Radar (EvoHome/Thiên Khôi) đứng sau Zalo, trước FB
  const uuTien = (x: Listing) =>
    x.source === "zalo_oa" || x.source === "zalo_miniapp" || (x.source_site || "").startsWith("zalo") ? 0 : laRoHang(x) ? 1 : 2;
  return listings.filter(laTinDocQuyen).sort((a, b) => uuTien(a) - uuTien(b)).slice(0, toiDa);
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
            title="Xem tất cả tin đã xác minh thực tế"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-brand hover:bg-brand-ink text-white font-bold text-xs shadow-xs tracking-wide uppercase transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Tin đã xác minh</span>
          </Link>
          {/* điện thoại: câu mô tả rớt 2 dòng đẩy tin xuống - nhãn "Tin đã xác minh" đã đủ nghĩa */}
          <span className="hidden sm:inline text-xs font-medium text-[var(--ink-soft)]">
            Thông tin, hình ảnh và giá thuê/bán đã được đội ngũ Radar kiểm tra thực tế
          </span>
        </div>
        <div className="flex items-center gap-2.5 ml-auto">
          <span className="hidden md:inline-flex items-center gap-1.5 text-overline font-bold text-accent bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/50 px-2 py-0.5 rounded-sm">
            ★ Ưu tiên hiển thị
          </span>
          <Link
            href="/search?own=1"
            className="group text-xs text-brand font-bold inline-flex items-center gap-1 hover:text-brand-ink transition-colors"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
      {/* không đè thêm badge - ListingCard tự gắn tag "ĐÃ XÁC MINH" cho tin độc quyền */}
      {/* điện thoại: hàng vuốt ngang; sm+: lưới */}
      <HangVuot motHang items={tins.map((x) => ({ key: x.id, node: <ListingCard x={x} /> }))} />
    </section>
  );
}
