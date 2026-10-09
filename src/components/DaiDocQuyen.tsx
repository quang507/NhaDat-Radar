import ListingCard from "@/components/ListingCard";
import HangVuot from "@/components/HangVuot";
import { laTinDocQuyen } from "@/lib/doc-quyen";
import { laRoHang } from "@/lib/ro-hang";
import type { Listing } from "@/lib/types";

// Dải "⭐ Tin độc quyền Radar" - FB + Zalo, đứng ĐẦU mọi trang danh sách (21/8).
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
    <div className="mb-5">
      <div className="flex items-baseline gap-2 mb-2 flex-wrap">
        <h2 className="font-bold text-emerald-700 flex items-center gap-1.5"><span>✓</span> Tin đã xác minh</h2>
        <span className="text-xs text-[var(--ink-soft)]">thông tin & pháp lý đã được Radar xác minh thực tế</span>
      </div>
      {/* không đè thêm badge - ListingCard tự gắn tag "✓ XÁC THỰC" cho tin độc quyền */}
      {/* điện thoại: hàng vuốt ngang (thay 6 thẻ xếp dọc ~6 màn); sm+: lưới */}
      <HangVuot items={tins.map((x) => ({ key: x.id, node: <ListingCard x={x} /> }))} />
    </div>
  );
}
