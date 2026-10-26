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
import { NutZalo } from "./TheoDoi";
import HienSoRadar from "./HienSoRadar";
import { MessageCircle } from "lucide-react";
import { maPhong } from "@/lib/ro-hang";

export { HOTLINE, HOTLINE_ZALO };

export default function TuVanRadar({ listingId }: { listingId?: string }) {
  const tinNhanZalo = `Chào Radar, mình đang cần tư vấn căn này (Mã: ${listingId ? maPhong(listingId) : ""}) trên website, tư vấn giúp mình nhé!`;

  return (
    <div className="mt-3 pt-3 border-t border-[var(--line)]">
      <div className="text-xs text-[var(--ink-soft)] mb-2">
        Cần tư vấn nhanh tin này? Gọi <b>Radar</b> - miễn phí, không phải người đăng tin.
      </div>
      <div className="flex flex-col gap-2">
        {/* Nút Gọi Hotline trực tiếp */}
        <HienSoRadar listingId={listingId} className="w-full justify-center" />

        {/* Nút Chat Zalo: dùng NutZalo tự động chép mã phòng + link để khách Dán vào Zalo */}
        {listingId ? (
          <NutZalo
            listingId={listingId}
            tinNhan={tinNhanZalo}
            href={HOTLINE_ZALO}
            target="_blank"
            rel="noopener"
            className="btn w-full text-center border border-[#0068ff] text-[#0068ff] hover:bg-[#0068ff]/5 font-semibold flex items-center justify-center gap-2 py-2.5 rounded-lg shadow-2xs"
          >
            <MessageCircle className="w-4 h-4 text-[#0068ff] shrink-0" />
            <span>Chat Zalo tư vấn miễn phí</span>
          </NutZalo>
        ) : (
          <a
            href={HOTLINE_ZALO}
            target="_blank"
            rel="noopener"
            className="btn w-full text-center border border-[#0068ff] text-[#0068ff] hover:bg-[#0068ff]/5 font-semibold flex items-center justify-center gap-2 py-2.5 rounded-lg shadow-2xs"
          >
            <MessageCircle className="w-4 h-4 text-[#0068ff] shrink-0" />
            <span>Chat Zalo tư vấn</span>
          </a>
        )}
      </div>
    </div>
  );
}
