import ListingCard from "@/components/ListingCard";
import HangVuot from "@/components/HangVuot";
import { laTinDocQuyen } from "@/lib/doc-quyen";
import { laRoHang } from "@/lib/ro-hang";
import type { Listing } from "@/lib/types";
import { ShieldCheck } from "lucide-react";

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
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-xs border border-emerald-200/60 dark:border-emerald-800/40">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Tin đã xác minh
        </div>
        <span className="text-xs text-[var(--ink-soft)]">
          Thông tin và pháp lý đã được Radar kiểm tra thực tế
        </span>
      </div>
      {/* không đè thêm badge - ListingCard tự gắn tag "ĐÃ XÁC MINH" cho tin độc quyền */}
      {/* điện thoại: hàng vuốt ngang; sm+: lưới */}
      <HangVuot items={tins.map((x) => ({ key: x.id, node: <ListingCard x={x} /> }))} />
    </div>
  );
}
