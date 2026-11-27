import { laRoHang } from "./ro-hang";

// Tin ĐỘC QUYỀN Radar (quyết định 21/8): tin cào từ FACEBOOK + mọi tin ZALO - các trang
// khác không có nguồn này. Chính sách: GIẤU SĐT ở mọi nơi, liên hệ đi qua Cầu Nối
// (bot Zalo / hotline) - đây là nhóm tin thu phí 1%/0.5% được vì Radar là đường liên hệ
// duy nhất. Nguồn web (chotot/mogi/batdongsan/guland...) thì thả số như cũ: số vốn công
// khai trên trang gốc, giấu chỉ mất lòng tin.
//
// BẬT/TẮT: muốn đổi nhóm nào giấu/mở thì sửa đúng hàm này - web theo tự động.
// (bot Zalo lặp lại quy tắc trong zalo-bot.mjs vì .mjs không import được .ts - đổi thì sửa cả hai.)
export function laTinDocQuyen(x: { source?: string | null; source_site?: string | null }) {
  // dựa được vào mỗi source_site (vài query không select cột source): facebook + zalo_* phủ đủ
  // 28/9: + rổ hàng Radar (EvoHome, Thiên Khôi) - hàng mình nắm, liên hệ chỉ qua Radar
  return laRoHang(x) || x.source === "zalo_oa" || x.source === "zalo_miniapp"
    || x.source_site === "facebook" || (x.source_site || "").startsWith("zalo");
}

// Che mọi dãy số giống SĐT trong văn bản hiển thị - mô tả tin FB thường chứa số ngay trong bài,
// giấu cột contact_phone mà thả số trong mô tả thì công cốc.
// 2/11 (audit pháp lý, Luật 91/2025): che cho MỌI tin, không chỉ tin độc quyền - HTML công khai được CDN
// cache và bị cào hàng loạt. Tin web vẫn xem được số thật qua nút "Xem SĐT" (đăng nhập, PhoneReveal).
export function cheSoVanBan(s: string | null | undefined, docQuyen = true) {
  const goiY = docQuyen ? "*** (liên hệ qua Radar)" : "*** (bấm Xem SĐT)";
  // Biên 2 đầu: không dính chữ số / dấu phân cách nghìn liền trước-sau, để giá "1.500.000.000"
  // không bị cắt nửa chừng (regex cũ cắt "Giá 1.500.000.000" thành "1.500.0***").
  return String(s || "").replace(/(?<!\d[.,]?)(?:\+?84|0)(?:[\s.\-]?\d){7,10}(?![.,]?\d)/g, (m) => m.slice(0, 4) + goiY);
}

// Che SỐ NHÀ của tin độc quyền, giữ tên đường (quyết định 21/8: "để tên đường thôi, số nhà
// giấu kiểu *** cho đồng bộ" - địa chỉ chính xác chỉ mở khi chốt lịch xem nhà, như spec Cầu
// Nối). Địa chỉ VN số nhà luôn đứng ĐẦU ("123/45A Lê Văn Sỹ...") nên chỉ che token đầu nếu
// nó bắt đầu bằng chữ số - "Đường Số 7", "Quốc lộ 1A", "Đường 3/2" không bị đụng.
export function cheSoNha(s: string | null | undefined) {
  return String(s || "").trim().replace(/^\d[\d/\-a-zA-Z]*\s+/, "*** ");
}

/**
 * Lọc bỏ các khối lặp lại (Chi phí dịch vụ, Điều khoản cọc/giờ giấc/thú cưng, Giá/Diện tích lặp)
 * trong phần Mô tả của rổ hàng, vì các thông tin này ĐÃ CÓ widget riêng (Bảng 5 khoản phí & Điều khoản thuê).
 * Giữ lại: đặc điểm phòng, tiện nghi nội thất, vị trí & lời mời xem phòng thực tế.
 */
export function locMoTaTrungLap(raw: string | null | undefined): string {
  if (!raw) return "";
  const lines = String(raw).split(/\r?\n/);
  const out: string[] = [];
  let skippingBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Bắt đầu khối chi phí dịch vụ hoặc điều khoản thuê (đã có bảng riêng)
    if (
      /^(?:📌|⚡|📋|📝|\p{Emoji})?\s*(?:chi phí dịch vụ|chi phí|bảng phí|điều khoản|quy định)/iu.test(trimmed)
    ) {
      skippingBlock = true;
      continue;
    }

    // Đang trong khối bị bỏ: nếu là dòng bullet hoặc dòng trống thì bỏ qua
    if (skippingBlock) {
      if (trimmed.startsWith("•") || trimmed.startsWith("-") || !trimmed) {
        continue;
      }
      // Đã sang khối nội dung khác (ví dụ ✨ TIỆN NGHI, 💬 Lời nhắn...)
      skippingBlock = false;
    }

    // Bỏ các dòng lặp lại diện tích / giá thuê ở đầu mô tả
    if (/^[•-]\s*(?:diện tích|giá thuê|giá|nhận phòng từ):/iu.test(trimmed)) {
      continue;
    }

    out.push(line);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Bản đã che SĐT (tiêu đề + mô tả) của một tin (mọi nguồn, từ 2/11). Dùng NGAY SAU truy vấn ở server
// trước khi đưa danh sách xuống client component - dữ liệu truyền xuống (RSC payload) nằm trong HTML,
// che ở chỗ hiển thị thôi là số vẫn lộ trong mã trang (audit 22/9).
export function cheSoTin<T extends { source?: string | null; source_site?: string | null; title?: string | null; description?: string | null }>(x: T): T {
  const docQuyen = laTinDocQuyen(x);
  return {
    ...x,
    ...(x.title != null ? { title: cheSoVanBan(x.title, docQuyen) } : {}),
    ...(x.description != null ? { description: cheSoVanBan(x.description, docQuyen) } : {}),
  };
}
