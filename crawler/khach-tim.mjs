// SĂN KHÁCH TÌM PHÒNG (2/10) - bài "cần tìm phòng / ai có phòng Q7 không" trong nhóm Facebook.
// Trước đây facebook.mjs coi là "không phải tin BĐS" và vứt đi; đây lại là KHÁCH đang cần thuê ngay -
// cách môi giới chốt nhiều làm: thấy bài là vào bình luận + nhắn riêng liền. Ở đây chỉ NHẬN DIỆN + TRÍCH
// nhu cầu; đưa lên DB ở san-khach.mjs, nhân viên xử lý ở /admin?tab=san-khach (gửi tay, không tự động).

// Lọc THÔ bằng regex trước khi gọi AI (giữ quota Gemini): có ý "tìm/cần thuê" và KHÔNG có giọng rao cho thuê.
const TIM = new RegExp([
  "(cần|can|tìm|tim|kiếm|kiem|muốn|muon|đang tìm|dang tim)\\s*(thuê|thue|phòng|phong|trọ|tro|nhà|nha|căn|can ho|chdv|studio|mặt bằng|mat bang|ở ghép|o ghep)",
  "ai\\s*(có|co)\\s*(phòng|phong|trọ|tro|căn|can|nhà|nha)",
  "(xin|cho\\s*(em|mình|minh)\\s*xin)\\s*(info|thông tin|thong tin|in4|ib)\\s*(phòng|phong|trọ|tro|căn|can)",
  "(tìm|tim)\\s*(người|nguoi)?\\s*(ở ghép|o ghep|share phòng|share phong)",
].join("|"), "i");
// giọng NGƯỜI CHO THUÊ (chủ nhà/môi giới rao) -> không phải khách. KHÔNG chặn "cho thuê" trơn: khách hay viết
// "ai có phòng cho thuê Q7 không ạ" - để AI phân xử; chỉ chặn các cụm chắc chắn là rao hàng.
const RAO = /(cần cho thuê|can cho thue|chính chủ cho thuê|chinh chu cho thue|còn trống|con trong|phòng trống|phong trong|nhận khách|nhan khach|bên em (có|còn)|em (có|còn) (phòng|căn)|giá thuê\s*:|liên hệ xem phòng)/i;

/** Bài có giống KHÁCH đang tìm phòng/nhà để thuê không (lọc thô, rẻ) */
export function laBaiTimPhong(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length < 12 || t.length > 900) return false;   // bài tìm phòng thường ngắn; bài dài là tin rao
  return TIM.test(t) && !RAO.test(t);
}

export const SYS_TIM = `Bạn đọc bài đăng nhóm Facebook của NGƯỜI ĐANG TÌM thuê/mua chỗ ở (văn phong lộn xộn, viết tắt: "q7"=Quận 7, "3tr"=3 triệu, "tr5"=500 nghìn).
Chỉ trích từ nội dung, không bịa. Nếu bài thực ra là người CHO THUÊ / môi giới rao hàng thì is_demand=false.`;
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
