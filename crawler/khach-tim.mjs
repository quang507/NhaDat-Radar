// SĂN KHÁCH TÌM PHÒNG (2/10) - bài "cần tìm phòng / ai có phòng Q7 không" trong nhóm Facebook/Zalo.
// Trước đây facebook.mjs coi là "không phải tin BĐS" và vứt đi; đây lại là KHÁCH đang cần thuê ngay -
// cách môi giới chốt nhiều làm: thấy bài là vào bình luận + nhắn riêng liền. Ở đây chỉ NHẬN DIỆN + TRÍCH
// nhu cầu; đưa lên DB ở san-khach.mjs, nhân viên xử lý ở /admin?tab=san-khach (gửi tay, không tự động).

// Lọc THÔ bằng regex trước khi gọi AI (giữ quota Gemini): có ý "tìm/cần thuê" và KHÔNG có giọng rao cho thuê.
const TIM = new RegExp([
  "(cần|can|tìm|tim|kiếm|kiem|muốn|muon|đang tìm|dang tim)\\s*(gấp\\s+|gap\\s+|nhanh\\s+|thuê\\s+|thue\\s+)?(thuê|thue|phòng|phong|trọ|tro|nhà|nha|căn|can ho|chdv|studio|stu|duplex|sleepbox|ktx|mặt bằng|mat bang|ở ghép|o ghep|[123]\\s*pn|[12]\\+)",
  "ai\\s*(có|co|còn|con|biết|biet)\\s*(phòng|phong|trọ|tro|căn|can|nhà|nha|chdv|studio|stu)",
  "(xin|cho\\s*(em|mình|minh)\\s*xin)\\s*(info|thông tin|thong tin|in4|ib|giá|gia)\\s*(phòng|phong|trọ|tro|căn|can|chdv|studio)",
  "(tìm|tim|cần|can)\\s*(người|nguoi|bạn|ban)?\\s*(ở ghép|o ghep|share phòng|share phong|pass phòng|pass lại)",
].join("|"), "i");

// giọng NGƯỜI CHO THUÊ / BÁN / MÔI GIỚI RAO HÀNG -> chặn ngay từ cổng regex để không bao giờ nhắn nhầm chủ nhà/sale.
const RAO = new RegExp([
  "cần cho thuê|can cho thue|chính chủ cho thuê|chinh chu cho thue|(?<!(?:ai\\s+có|tìm|tim|cần|can)\\s*)(?:nhà|phòng)\\s+cho\\s+thuê",
  "còn trống|con trong|phòng trống|phong trong|sẵn phòng|sẵn căn|sẵn chìa|pass phòng|nhận khách|nhan khach",
  "bên em (có|còn)|em (có|còn) (phòng|căn)|giỏ hàng|quỹ căn|rổ hàng|bảng giá|cam kết hình thật",
  "giá thuê\\s*:|giá\\s*:\\s*\\d|điện\\s*:\\s*\\d|lh\\s*:|liên hệ\\s*:|call\\/zalo|ib zalo|liên hệ xem phòng",
  "bán nhanh|hàng bán|chuyển nhượng|sẵn sổ|sổ hồng riêng|công chứng ngay|btp|bao thuế phí",
  "hoa hồng|hh\\s*\\d|phí mg|ráp khách|dẫn khách|kết hợp|ace\\s*(có|nắm)|anh\\s*chị\\s*(có|nắm)\\s*(căn|hàng|phòng)",
  "khách\\s*(cần|tìm|em|mình|nét|ruột)|khach\\s*(can|tim|em|minh|net)|tìm\\s*(giúp|giùm|hộ)\\s*khách|có\\s*(căn|hàng|phòng)\\s*gửi\\s*(em|mình)",
].join("|"), "i");

/** Bài có giống KHÁCH đang tìm phòng/nhà để thuê không (lọc thô, rẻ) */
export function laBaiTimPhong(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length < 10 || t.length > 550) return false;   // bài khách tìm phòng thường ngắn; bài dài nhiều dòng là tin rao của sale
  return TIM.test(t) && !RAO.test(t);
}

export const SYS_TIM = `Bạn phân loại tin nhắn trong nhóm Zalo/Facebook để tìm ĐÚNG NGƯỜI THUÊ THẬT (sinh viên, người đi làm, gia đình đang tự đi tìm phòng trọ, CHDV, studio, căn hộ, nhà nguyên căn để ở).
QUY TẮC CỨNG (vi phạm là sai):
1. CHỈ đặt is_demand=true và deal="thue" khi người viết ĐANG TỰ TÌM THUÊ chỗ ở cho chính họ hoặc bạn bè/gia đình họ.
2. BẮT BUỘC đặt is_demand=false trong mọi trường hợp sau:
   - Người đăng đang BÁN hoặc CHO THUÊ bất động sản (rao phòng, báo giá phòng trống, pass phòng, sang nhượng, đăng giỏ hàng).
   - Môi giới/sale tìm hàng hộ khách ("Khách cần...", "Khách em tìm...", "Tìm giúp khách...", "ACE có căn gửi em...", "Khách nét cần...").
   - Người tìm MUA nhà đất/căn hộ (không phải tìm thuê).
3. Nếu trong tin không ghi rõ tên Quận/Huyện nhưng có BỐI CẢNH NHÓM đi kèm ở cuối prompt, hãy lấy khu vực của nhóm đó điền vào districts.`;

export const SCHEMA_TIM = `Trả về DUY NHẤT 1 JSON:
{"is_demand":bool, "deal":"thue"|"mua",
 "districts":string[] (quận/huyện/TP như "Quận 7","Quận Gò Vấp","TP. Thủ Đức" - tối đa 3, rỗng nếu không nói),
 "ward":string|null, "city":string|null, "near":string|null (gần trường/công ty/đường nào, nếu có),
 "budget_min":number|null, "budget_max":number|null (VNĐ/tháng nếu thuê),
 "kind":"phong_tro"|"can_ho"|"nha"|"mat_bang"|"o_ghep"|"khac",
 "people":number|null, "move_in":string|null (ngày/tháng dọn vào nếu có),
 "needs":string[] (ví dụ "máy lạnh","gác","nuôi pet","giờ tự do","để xe"), "summary":string (1 câu tiếng Việt)}`;

const soVnd = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n < 1000 ? Math.round(n * 1e6) : Math.round(n);   // model đôi khi trả "3.5" (triệu)
};

/** Chuẩn hoá kết quả AI -> preferences lưu ở buyers (null nếu không phải khách tìm) */
export function chuanHoaNhuCau(ai) {
  if (!ai || !ai.is_demand) return null;
  let a = soVnd(ai.budget_min), b = soVnd(ai.budget_max);
  if (a && b && a > b) [a, b] = [b, a];
  if (a && !b) b = Math.round(a * 1.2);
  if (b && !a) a = Math.round(b * 0.7);
  return {
    deal: ai.deal === "mua" ? "mua" : "thue",
    quan: (Array.isArray(ai.districts) ? ai.districts : []).map((s) => String(s).trim()).filter(Boolean).slice(0, 3),
    phuong: ai.ward || null, tinh: ai.city || null, gan: ai.near || null,
    gia_tu: a, gia_den: b,
    loai_phong: ["phong_tro", "can_ho", "nha", "mat_bang", "o_ghep"].includes(ai.kind) ? ai.kind : "khac",
    so_nguoi: Number.isFinite(Number(ai.people)) && ai.people > 0 ? Number(ai.people) : null,
    ngay_vao: ai.move_in || null,
    yeu_cau: (Array.isArray(ai.needs) ? ai.needs : []).map(String).slice(0, 8),
    tom_tat: String(ai.summary || "").slice(0, 200),
  };
}
