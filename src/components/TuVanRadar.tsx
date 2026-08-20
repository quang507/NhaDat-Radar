// Khối "Tư vấn qua Radar" - SĐT của CHỦ SÀN, không phải người đăng tin.
//
// Vì sao tách khỏi phần "Người đăng": tin cào theo NĐ13 không hiện số thô của người đăng,
// khách muốn hỏi nhanh thì bấm sang bài gốc là rời web. Khối này giữ khách ở lại: gọi/Zalo
// thẳng cho Radar để được tư vấn tin này hoặc tin tương tự. PHẢI ghi rõ "không phải người
// đăng" - để khách bấm gọi biết mình đang gọi cho ai, không nhầm là chủ nhà.
//
// Hiện cho MỌI khách (kể cả chưa đăng nhập): đây là kênh nhận lead chính, chặn sau đăng nhập
// là tự bóp số cuộc gọi. Thứ bị chặn sau đăng nhập là SĐT người đăng (xem DangNhapDeXem).

export const HOTLINE = "0346689460";
export const HOTLINE_ZALO = `https://zalo.me/${HOTLINE}`;

export default function TuVanRadar() {
  return (
    <div className="mt-3 pt-3 border-t border-[var(--line)]">
      <div className="text-xs text-[var(--ink-soft)] mb-1.5">
        Cần tư vấn nhanh tin này? Gọi <b>Radar</b> - miễn phí, không phải người đăng tin.
      </div>
      <div className="flex gap-2">
        <a href={`tel:${HOTLINE}`} className="btn btn-primary flex-1 text-center whitespace-nowrap">
          📞 {HOTLINE}
        </a>
        <a
          href={HOTLINE_ZALO}
          target="_blank"
          rel="noopener"
          className="btn flex-1 text-center whitespace-nowrap border border-[#0068ff] text-[#0068ff] font-semibold"
        >
          Chat Zalo
        </a>
      </div>
    </div>
  );
}
