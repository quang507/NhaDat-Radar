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
  return x.source === "zalo_oa" || x.source === "zalo_miniapp"
    || x.source_site === "facebook" || (x.source_site || "").startsWith("zalo");
}

// Che mọi dãy số giống SĐT trong văn bản hiển thị của tin độc quyền - mô tả tin FB thường
// chứa số ngay trong bài, giấu cột contact_phone mà thả số trong mô tả thì công cốc.
export function cheSoVanBan(s: string | null | undefined) {
  return String(s || "").replace(/(\+?84|0)[\s.\-]?(\d[\s.\-]?){7,10}/g, (m) => m.slice(0, 4) + "*** (liên hệ qua Radar)");
}

// Che SỐ NHÀ của tin độc quyền, giữ tên đường (quyết định 21/8: "để tên đường thôi, số nhà
// giấu kiểu *** cho đồng bộ" - địa chỉ chính xác chỉ mở khi chốt lịch xem nhà, như spec Cầu
// Nối). Địa chỉ VN số nhà luôn đứng ĐẦU ("123/45A Lê Văn Sỹ...") nên chỉ che token đầu nếu
// nó bắt đầu bằng chữ số - "Đường Số 7", "Quốc lộ 1A", "Đường 3/2" không bị đụng.
export function cheSoNha(s: string | null | undefined) {
  return String(s || "").trim().replace(/^\d[\d/\-a-zA-Z]*\s+/, "*** ");
}
