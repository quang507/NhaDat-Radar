// Khối "Tư vấn qua Radar" - SĐT của CHỦ SÀN, không phải người đăng tin.
//
// Vì sao tách khỏi phần "Người đăng": tin cào theo NĐ13 không hiện số thô của người đăng,
// khách muốn hỏi nhanh thì bấm sang bài gốc là rời web. Khối này giữ khách ở lại: gọi/Zalo
// thẳng cho Radar để được tư vấn tin này hoặc tin tương tự. PHẢI ghi rõ "không phải người
// đăng" - để khách bấm gọi biết mình đang gọi cho ai, không nhầm là chủ nhà.
//
// Hiện cho MỌI khách (kể cả chưa đăng nhập): đây là kênh nhận lead chính, chặn sau đăng nhập
// là tự bóp số cuộc gọi. Thứ bị chặn sau đăng nhập là SĐT người đăng (xem DangNhapDeXem).

import { HOTLINE, HOTLINE_ZALO } from "@/lib/hotline";
import { LinkTheoDoi } from "./TheoDoi";
import HienSoRadar from "./HienSoRadar";

export { HOTLINE, HOTLINE_ZALO };

export default function TuVanRadar({ listingId }: { listingId?: string }) {
  // có listingId (trang chi tiết tin) -> ghi sự kiện gọi/Zalo; nơi khác dùng <a> thường
  const A = ({ loai, ...p }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { loai: "goi" | "zalo" }) =>
    listingId ? <LinkTheoDoi loai={loai} listingId={listingId} {...p} /> : <a {...p} />;
  return (
    <div className="mt-3 pt-3 border-t border-[var(--line)]">
      <div className="text-xs text-[var(--ink-soft)] mb-1.5">
        Cần tư vấn nhanh tin này? Gọi <b>Radar</b> - miễn phí, không phải người đăng tin.
      </div>
      <div className="flex gap-2">
        {/* 2/10: "Bấm để hiện số" - đăng nhập hoặc để lại SĐT mới hiện số (ra lead) */}
        <HienSoRadar listingId={listingId} className="flex-1 !w-auto" />
        <A
          loai="zalo"
          href={HOTLINE_ZALO}
          target="_blank"
          rel="noopener"
          className="btn flex-1 text-center whitespace-nowrap border border-[#0068ff] text-[#0068ff] font-semibold"
        >
          Chat Zalo
        </A>
      </div>
    </div>
  );
}
