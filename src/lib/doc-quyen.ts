// Tin ĐỘC QUYỀN Radar (quyết định 21/8): tin cào từ FACEBOOK + mọi tin ZALO - các trang
// khác không có nguồn này. Chính sách: GIẤU SĐT ở mọi nơi, liên hệ đi qua Cầu Nối
// (bot Zalo / hotline) - đây là nhóm tin thu phí 1%/0.5% được vì Radar là đường liên hệ
// duy nhất. Nguồn web (chotot/mogi/batdongsan/guland...) thì thả số như cũ: số vốn công
// khai trên trang gốc, giấu chỉ mất lòng tin.
//
// BẬT/TẮT: muốn đổi nhóm nào giấu/mở thì sửa đúng hàm này - web theo tự động.
// (bot Zalo lặp lại quy tắc trong zalo-bot.mjs vì .mjs không import được .ts - đổi thì sửa cả hai.)
export function laTinDocQuyen(x: { source?: string | null; source_site?: string | null }) {
  return x.source === "zalo_oa" || x.source === "zalo_miniapp"
    || x.source_site === "facebook" || x.source_site === "zalo_group" || x.source_site === "zalo_bot";
}

// Che mọi dãy số giống SĐT trong văn bản hiển thị của tin độc quyền - mô tả tin FB thường
// chứa số ngay trong bài, giấu cột contact_phone mà thả số trong mô tả thì công cốc.
export function cheSoVanBan(s: string | null | undefined) {
  return String(s || "").replace(/(\+?84|0)[\s.\-]?(\d[\s.\-]?){7,10}/g, (m) => m.slice(0, 4) + "*** (liên hệ qua Radar)");
}
