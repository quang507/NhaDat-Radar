// ============================================================================
//  TƯ VẤN KHÁCH ZALO 1-1 (thiết kế lại 1/11 sau sự cố "bot chào lại khách đang hỏi phí").
//
//  Mô hình: BOT LÀ TRỢ LÝ CỦA NGƯỜI, không phải người trả lời.
//    khách nhắn -> luật cứng + AI phân loại (AI không bao giờ nói thẳng với khách)
//               -> thẻ báo admin kèm 2-3 câu nháp -> admin gõ "K1234 2" là bot gửi câu đó.
//  Bot chỉ được TỰ trả lời (cờ ZALO_AUTO_REPLY_KHACH=true) khi đủ CẢ: chưa có người nhận,
//  không có tín hiệu cần người, AI chắc chắn khách chỉ hỏi dữ kiện, và MỌI dữ kiện khách hỏi
//  có sẵn trong DB của đúng căn đó. Câu tự trả lời ráp từ DB, không do AI viết, không có giá
//  trị mặc định: thiếu một con số là chuyển người (bản cũ điền bừa "25m²", "điện 4k", "xe
//  free", "cọc 1 tháng", "khoá vân tay" cho mọi phòng).
//
//  Thành phần:
//    zalo-hoi-thoai.mjs  trạng thái hội thoại bền qua restart (bot_state)
//    zalo-gui.mjs        cổng gửi duy nhất: nhận tiếng vọng, hạn mức, giãn cách
//    file này            hàm thuần (luật, prompt, quyết định, soạn thẻ) + bộ điều phối
// ============================================================================
import { trongGioIm } from "./zalo-gui.mjs";
import { themTin, nguoiNhan, traChoBot, dangDoNguoi, maThe } from "./zalo-hoi-thoai.mjs";

// Zalo nhận thẻ báo của admin (0346689460)
export const ADMIN_ZALO_UID = process.env.ZALO_ADMIN_UID || "199426642744249709";
// Hotline và Zalo tư vấn duy nhất của Radar (docs/QUY-TRINH-PHAN-PHOI-MARKETING.md)
export const HOTLINE = "0387 365 020";
export const HOTLINE_NAME = "Lê Quang";
// Mặc định BẬT: bot tự chào khách mới và tự báo giá/phí nếu có trong DB; đặt ZALO_AUTO_REPLY_KHACH=false để tắt
export const BOT_TU_DONG_TRA_LOI_KHACH = process.env.ZALO_AUTO_REPLY_KHACH !== "false";
const SITE_URL = "https://nhadatradar.com";

const PHUT = 60_000;
const NGUONG_TIN_CAY = 0.75;
const KHAN_LAP_MS = 10 * PHUT;      // báo khẩn tối đa 1 lần / 10 phút / khách
const NGUOI_TRONG_CUOC_MS = 30 * PHUT; // người nhắn trong 30 phút gần nhất = đang theo cuộc, khỏi báo thẻ
const NHAC_SAU_MS = { bot: 5 * PHUT, nguoi: 10 * PHUT }; // khách chờ quá lâu chưa ai trả lời -> nhắc
const NHAC_TOI_DA_MS = 12 * 60 * PHUT; // tin chờ quá 12 giờ (qua đêm vẫn kịp nhắc lúc 7h) thì thôi nhắc

// ---------------------------------------------------------------------------
//  Dữ kiện phòng
// ---------------------------------------------------------------------------
export const maPhong = (id) => "RH" + String(id).replace(/-/g, "").slice(0, 6).toUpperCase();

export function fmtGia(vnd, deal = "cho_thue", isEn = false) {
  if (!vnd) return isEn ? "Negotiable" : "Thoả thuận";
  const s = deal === "cho_thue" ? (isEn ? "/month" : "/tháng") : "";
  if (isEn) {
    if (vnd >= 1e9) return `${(vnd / 1e9).toFixed(1).replace(/\.0$/, "")} billion VND${s}`;
    if (vnd >= 1e6) return `${(vnd / 1e6).toFixed(1).replace(/\.0$/, "")} million VND${s}`;
    return `${vnd.toLocaleString("en-US")} VND${s}`;
  }
  if (vnd >= 1e9) return (vnd / 1e9).toFixed(2).replace(/\.?0+$/, "") + " tỷ" + s;
  if (vnd >= 1e6) return (vnd / 1e6).toFixed(1).replace(/\.0$/, "").replace(".", ",") + " triệu" + s;
  return vnd.toLocaleString("vi-VN") + " đ" + s;
}

/** Link web / uuid / mã RHxxxxxx / mã nguồn HiFriendz trong tin nhắn */
export function trichXuatDinhDanh(text) {
  if (!text) return null;
  const s = String(text).trim();
  const url = s.match(/nhadatradar\.com\/listings\/([0-9a-fA-F-]{36})/i);
  if (url) return { kieu: "uuid", giaTri: url[1].toLowerCase() };
  const uuid = s.match(/\b([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\b/);
  if (uuid) return { kieu: "uuid", giaTri: uuid[1].toLowerCase() };
  const rh = s.match(/\b(RH[0-9a-fA-F]{6})\b/i) || s.match(/(?:mã|căn|phòng)\s*:?\s*([0-9a-fA-F]{6})\b/i);
  if (rh) {
    const code = rh[1].toUpperCase();
    return { kieu: "ma_rh", giaTri: code.startsWith("RH") ? code : `RH${code}` };
  }
  const lst = s.match(/\b(LST-[a-zA-Z0-9_-]{10,})\b/);
  if (lst) return { kieu: "source_id", giaTri: lst[1] };
  return null;
}

export async function traCuuPhong(sb, dinhDanh) {
  if (!dinhDanh) return null;
  let q = sb.from("listings").select("id, title, price_vnd, area_m2, kind, deal, status, address, ward, district, province, specs, amenities, source");
  if (dinhDanh.kieu === "uuid") q = q.eq("id", dinhDanh.giaTri);
  else if (dinhDanh.kieu === "source_id") q = q.eq("source_post_id", dinhDanh.giaTri);
  else {
    const p = dinhDanh.giaTri.toLowerCase().replace(/^rh/, "");
    q = q.gte("id", `${p}00-0000-0000-0000-000000000000`).lte("id", `${p}ff-ffff-ffff-ffff-ffffffffffff`);
  }
  // mã 6 ký tự có thể trùng (~6%): ưu tiên tin còn đăng
  const { data, error } = await q.limit(5);
  if (error || !data?.length) return null;
  const tin = data.find((x) => x.status === "published") || data[0];
  const { data: roHang } = await sb.from("listing_ro_hang")
    .select("partner, unit_code, exact_address, commission, raw").eq("listing_id", tin.id).maybeSingle();
  return { tin, roHang: roHang || null };
}

export const TIEN_ICH = { dieu_hoa: "máy lạnh", may_giat: "máy giặt", tu_lanh: "tủ lạnh", ke_bep: "kệ bếp", giuong: "giường",
  cua_so: "cửa sổ", an_ninh: "an ninh", thang_may: "thang máy", nuoc_nong: "nước nóng", tu_quan_ao: "tủ quần áo",
  ban_cong: "ban công", gac_lung: "gác lửng", tivi: "tivi", san_phoi: "sân phơi", bon_rua: "bồn rửa", de_xe: "chỗ để xe",
  ac: "máy lạnh", parking: "chỗ để xe", elevator: "thang máy", security: "an ninh", pet: "nuôi thú cưng" };

// Chỉ những nhãn này được đọc từ specs - "Hoa hồng", "Số phòng", "Mã toà" không bao giờ tới khách
const NHAN_SPECS = {
  loai_phong: ["Loại phòng"], noi_that: ["Nội thất"], dien: ["Điện"], nuoc: ["Nước"],
  phi_quan_ly: ["Phí quản lý", "Phí dịch vụ"], gui_xe: ["Gửi xe", "Tiền xe", "Giữ xe"], coc: ["Tiền cọc", "Cọc"],
};
const coGiaTri = (v) => v != null && String(v).trim() !== "" && !/^[-–—?.\s]+$/.test(String(v));

/**
 * Bảng dữ kiện CÔNG KHAI của 1 phòng - nguồn duy nhất cho câu tự trả lời và cho prompt AI.
 * Địa chỉ chỉ tới phường/quận (số nhà, số phòng, đối tác, hoa hồng là dữ liệu nội bộ).
 */
export function factsTuTin(tin, roHang) {
  const f = { id: tin.id, ma: maPhong(tin.id) };
  const nguon = [tin.specs || {}, roHang?.raw?.specs || {}];
  for (const [k, nhan] of Object.entries(NHAN_SPECS))
    for (const s of nguon) {
      const v = nhan.map((n) => s[n]).find(coGiaTri);
      if (v) { f[k] = String(v).trim(); break; }
    }
  if (tin.price_vnd) { f.gia = fmtGia(tin.price_vnd, tin.deal); f.gia_en = fmtGia(tin.price_vnd, tin.deal, true); }
  if (tin.area_m2) f.dien_tich = `${tin.area_m2} m²`;
  const kv = [tin.ward, tin.district].filter(Boolean).join(", ");
  if (kv) f.khu_vuc = kv;
  const ti = [...new Set((tin.amenities || []).map((a) => TIEN_ICH[a]).filter(Boolean))];
  if (ti.length) f.tien_ich = ti.join(", ");
  return f;
}

// ---------------------------------------------------------------------------
//  Lớp 1: luật cứng - chạy cả khi AI sập, chỉ được NÂNG mức cần người, không bao giờ hạ
// ---------------------------------------------------------------------------
export const boDau = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

const LUAT_CUNG = [
  { ly_do: "nghi_bot", khan: true, bo_dau: /(tu dong|may tra loi|nguoi that|\bauto\b|\bchatbot\b)/ },
  { ly_do: "hen_xem", khan: true, bo_dau: /((xem|coi|ghe)\s*(phong|tro|nha|can)?\s*(luon|lien|ngay|lien luon)\b|(xem|coi)\s*(phong|tro|nha|can)?\s*(duoc|dc)\s*(khong|ko|k|hong|hem)?\b|qua (xem|coi)|dang o gan|o gan (do|day)|\bgan do\b|toi noi|den noi|dang dung (o|truoc)|hen (xem|coi|gio)|may gio (xem|coi|qua))/ },
  { ly_do: "phan_nan", khan: true, bo_dau: /(lua dao|lua dao|\bscam\b|te qua|buc minh|chan qua|sao (khong|ko|k) (tra loi|rep)|tra loi (di|giup)|im luon)/ },
  { ly_do: "goi_nguoi", khan: true, bo_dau: /^(alo+|a lo|(anh|chi|ad|admin|ban|em) (oi|oi oi)|oi|co ai (khong|ko|k)|alo (anh|chi|ad|ban|em)( oi)?)[\s?!.]*$/ },
  { ly_do: "mac_ca", khan: false, bo_dau: /(bot (gia|duoc|cho|xiu|it|chut)|giam (gia|duoc|xiu)|thuong luong|bot loc|fix gia|co bot|deal (gia|duoc))/ },
  { ly_do: "dat_coc_hop_dong", khan: false, bo_dau: /(hop dong|\bhd\b|dat coc|coc giu|giu phong|ky hd)/ },
];

/** kieu: "chu" | "anh" | "sticker" | "giong_noi" | "cuoc_goi" | ... - mọi thứ không phải chữ */
export function tinHieuCung(text, kieu = "chu") {
  const ly_do = [];
  let khan = false;
  if (kieu !== "chu") {
    ly_do.push(`gui_${kieu}`);
    if (kieu === "cuoc_goi") khan = true;
  }
  const khongDau = boDau(String(text || "").trim());
  for (const l of LUAT_CUNG)
    if (l.bo_dau.test(khongDau)) {
      ly_do.push(l.ly_do);
      if (l.khan) khan = true;
    }
  // "bot" trơ là tín hiệu yếu: gõ không dấu thì "bớt giá" cũng thành "bot gia" -> chỉ tính khi không phải mặc cả
  if (/\bbot\b/.test(khongDau) && !ly_do.includes("nghi_bot") && !ly_do.includes("mac_ca")) { ly_do.unshift("nghi_bot"); khan = true; }
  return { can_nguoi: ly_do.length > 0, khan, ly_do };
}

// ---------------------------------------------------------------------------
//  Lớp 2: AI phân loại + viết nháp cho NGƯỜI duyệt
// ---------------------------------------------------------------------------
export const Y_DINH = ["nghi_bot", "phan_nan", "hen_xem", "dat_coc_hop_dong", "mac_ca", "goi_nguoi",
  "hoi_thong_tin", "tim_phong", "chao_hoi", "cam_on_ket_thuc", "khac"];
const Y_DINH_KHAN = new Set(["nghi_bot", "phan_nan", "hen_xem", "goi_nguoi"]);
const Y_DINH_CAN_NGUOI = new Set(["nghi_bot", "phan_nan", "hen_xem", "dat_coc_hop_dong", "mac_ca", "goi_nguoi", "khac"]);
// khoá trả được từ bảng dữ kiện / khoá luôn cần người hỏi lại chủ
const HOI_VE_DU_KIEN = ["gia", "dien_tich", "loai_phong", "noi_that", "tien_ich", "khu_vuc", "dien", "nuoc", "phi_quan_ly", "gui_xe", "coc", "chi_phi"];
const HOI_VE_CAN_NGUOI = ["con_trong", "dia_chi", "gio_giac", "thu_cung", "so_nguoi", "khac"];
export const HOI_VE = [...HOI_VE_DU_KIEN, ...HOI_VE_CAN_NGUOI];

export const PROMPT_PHAN_LOAI = `Bạn là bộ PHÂN LOẠI tin nhắn cho đội tư vấn thuê phòng của NhaDat Radar. Bạn KHÔNG nói chuyện với khách. Câu bạn soạn chỉ là BẢN NHÁP để nhân viên đọc, sửa rồi mới gửi.

ĐẦU VÀO
- LỊCH SỬ: các tin gần nhất theo thời gian, mỗi dòng có vai: [Khách], [Radar-người] (nhân viên nhắn tay), [Radar-bot].
- PHÒNG ĐANG NÓI: bảng dữ kiện đã xác minh của căn khách đang hỏi, hoặc "chưa xác định".
- TIN MỚI: tin khách vừa gửi, là thứ cần phân loại. Đọc nó TRONG NGỮ CẢNH lịch sử. Ví dụ nhân viên vừa báo "4tr2 bạn ạ" rồi khách hỏi "phí khác bao nhiêu" nghĩa là hỏi các khoản ngoài tiền phòng của đúng căn đó, không phải câu chào mới.

TRẢ VỀ DUY NHẤT 1 JSON:
{"y_dinh": string, "hoi_ve": string[], "khan": boolean, "ngon_ngu": "vi"|"en", "do_tin_cay": number, "tom_tat": string, "goi_y": string[]}

y_dinh: chọn MỘT. Khớp nhiều nhóm thì lấy nhóm đứng TRƯỚC trong danh sách:
- nghi_bot: khách hỏi hoặc nghi đang nói chuyện với máy ("tin nhắn tự động à", "bot hả", "có người thật không").
- phan_nan: bực bội, chê, nghi lừa, trách trả lời chậm hoặc trả lời không đúng câu hỏi.
- hen_xem: muốn đi xem tận nơi, hỏi giờ xem, báo đang ở gần / đang tới / đã tới ("xem luôn được không", "mình ở gần đó", "chiều qua coi").
- dat_coc_hop_dong: hỏi thủ tục cọc giữ phòng, ký hợp đồng, thời hạn hợp đồng, giấy tờ.
- mac_ca: xin bớt, giảm, thương lượng giá.
- goi_nguoi: chỉ gọi hoặc giục, không hỏi gì cụ thể ("alo", "anh ơi", "alo anh ới?", "có ai không").
- hoi_thong_tin: hỏi dữ kiện của căn đang nói (giá, các khoản phí, cọc bao nhiêu, diện tích, nội thất, tiện ích, khu vực, còn trống không, giờ giấc, thú cưng...).
- tim_phong: tả nhu cầu tìm phòng (khu vực, ngân sách, loại phòng) mà chưa chỉ một căn cụ thể.
- chao_hoi: chỉ chào, chưa có nội dung.
- cam_on_ket_thuc: cảm ơn, "ok", "dạ", báo sẽ suy nghĩ thêm. Không cần trả lời.
- khac: không thuộc nhóm nào, hoặc không chắc.

hoi_ve: chỉ điền khi y_dinh = "hoi_thong_tin". Liệt kê MỌI dữ kiện khách hỏi, chỉ dùng các khoá:
gia, dien_tich, loai_phong, noi_that, tien_ich, khu_vuc, dien, nuoc, phi_quan_ly, gui_xe, coc,
chi_phi (hỏi chung các khoản phí ngoài tiền phòng: "phí khác", "chi phí sao", "mỗi tháng tổng bao nhiêu"),
con_trong (còn phòng không), dia_chi (xin địa chỉ cụ thể, số nhà), gio_giac, thu_cung, so_nguoi (ở mấy người được), khac (thứ không có khoá).

khan = true khi khách đang chờ người thật NGAY: y_dinh là nghi_bot, phan_nan, hen_xem, goi_nguoi, hoặc khách hỏi lại / giục lần thứ hai.

do_tin_cay: 0 đến 1, độ chắc của y_dinh và hoi_ve. Tin cụt, tiếng lóng, không dấu mà lịch sử không làm rõ thì tối đa 0.6.

tom_tat: một câu ngắn cho nhân viên, nói khách muốn gì và đang ở bước nào. Ví dụ: "Hỏi phí ngoài tiền phòng của RH1A2B3C, đã được báo giá 4tr2".

ngon_ngu: ngôn ngữ của TIN MỚI (không phải của lịch sử).

goi_y: 2 hoặc 3 bản nháp trả lời KHÁC NHAU để nhân viên chọn. Giọng nhân viên tư vấn: nhiệt tình, tự nhiên, xưng "mình", gọi "bạn", tối đa 2 câu, chuẩn kịch bản chống mùi robot:
- Hotline và Zalo tư vấn duy nhất của Radar: 0387 365 020 (Lê Quang).
- Khi khách hỏi phòng / phí: Luôn bóc tách đủ 5 khoản phí minh bạch (nói không với chi phí ẩn): 1. Tiền phòng (giá thuê), 2. Điện, 3. Nước, 4. Gửi xe, 5. Dịch vụ (phí quản lý). Nhấn mạnh: "Radar dẫn xem miễn phí 100%, không thu bất kỳ phí cò nào".
- Khi chốt giờ xem: Mục tiêu là giải đáp nhanh và chốt lịch hẹn dẫn khách xem phòng thực tế miễn phí ("Tối nay tầm 18h30 hoặc chiều mai bạn tiện giờ nào hơn để mình báo mở cửa sẵn đón qua xem thực tế nha?").
Khi y_dinh = cam_on_ket_thuc thì goi_y = [].
LUẬT CỨNG cho goi_y (vi phạm là bản nháp bị loại):
1. Chỉ dùng dữ kiện có trong PHÒNG ĐANG NÓI và LỊCH SỬ. Thứ không có thì KHÔNG đoán, để chỗ trống trong ngoặc vuông cho nhân viên điền, ví dụ "[còn/hết phòng]", "[được/không được nuôi mèo]", "[cần hỏi chủ nhà]".
2. Bảng dữ kiện KHÔNG có tình trạng còn phòng: không bao giờ viết "phòng vẫn còn", "còn trống" khi chưa có trong LỊCH SỬ; dùng "[còn/hết phòng]".
3. Không quyết thay nhân viên: không nhận lời hẹn ("được bạn qua liền"), không tự đặt giờ, không hứa bớt giá. Hỏi lại thông tin để nhân viên chốt, ví dụ "Bạn đang ở đoạn nào, khoảng mấy giờ qua được để mình [sắp xếp người mở cửa]?".
4. Không bịa người hay hoàn cảnh: không "quản lý đón", "chủ nhà bảo", "đang chạy xe", "đang ở toà", không nhận là chủ nhà.
5. Khách hỏi có phải bot không thì nói thật. LỊCH SỬ có [Radar-bot] thì thừa nhận tin trước là tin tự động và giờ nhân viên trực tiếp hỗ trợ; không viết "không phải bot".
6. Không nêu số điện thoại lạ (ngoài Hotline/Zalo duy nhất 0387 365 020), không nêu số nhà, số phòng, tên đối tác, hoa hồng.
7. ngon_ngu = "en" thì goi_y viết HOÀN TOÀN bằng tiếng Anh, xưng "I/we", gọi "you".`;

const NHAN_VAI = { khach: "Khách", nguoi: "Radar-người", bot: "Radar-bot" };
const NHAN_KIEU = { anh: "[ảnh]", sticker: "[sticker]", giong_noi: "[tin thoại]", tep: "[tệp]", vi_tri: "[vị trí]", cuoc_goi: "[cuộc gọi nhỡ]" };
export const moTaTin = (chu, kieu) => (chu && String(chu).trim()) || NHAN_KIEU[kieu] || `[${kieu}]`;

const NHAN = { gia: "Tiền phòng", dien_tich: "Diện tích", loai_phong: "Loại phòng", noi_that: "Nội thất", tien_ich: "Tiện ích",
  khu_vuc: "Khu vực", dien: "Điện", nuoc: "Nước", phi_quan_ly: "Dịch vụ (Phí quản lý)", gui_xe: "Gửi xe", coc: "Tiền cọc" };
const NHAN_EN = { gia: "Rent", dien_tich: "Area", loai_phong: "Room type", noi_that: "Furniture", tien_ich: "Amenities",
  khu_vuc: "Area/district", dien: "Electricity", nuoc: "Water", phi_quan_ly: "Service fee", gui_xe: "Parking", coc: "Deposit" };

export function taoPromptPhanLoai({ tin = [], facts = null, tinMoi }) {
  const lichSu = tin.slice(-11, -1).map((x) => `[${NHAN_VAI[x.vai] || x.vai}] ${moTaTin(x.chu, x.kieu)}`).join("\n") || "(chưa có)";
  const bang = facts
    ? [`Mã phòng: ${facts.ma}`, ...Object.keys(NHAN).filter((k) => facts[k]).map((k) => `${NHAN[k]}: ${facts[k]}`)].join("\n")
    : "chưa xác định";
  return `${PROMPT_PHAN_LOAI}\n\n--- LỊCH SỬ ---\n${lichSu}\n\n--- PHÒNG ĐANG NÓI ---\n${bang}\n\n--- TIN MỚI ---\n${tinMoi}`;
}

const SDT_RE = /(\+?84|0)[\s.\-]?\d([\s.\-]?\d){7,9}/;
const laSdtLa = (s) => {
  const clean = String(s || "").replace(/0387\s*365\s*020/g, "").replace(/0387365020/g, "");
  return SDT_RE.test(clean);
};
// Lưới an toàn cho luật 2 của prompt: DB không có tình trạng còn phòng, nháp nào khẳng định là bỏ
const KHANG_DINH_CON_PHONG = /(vẫn còn|còn trống|còn phòng|vẫn trống|still available|is available)/i;

/** Kiểm định đầu ra AI: sai khuôn thì coi như AI không trả lời (null) - mọi thứ rơi về người */
export function chuanHoaPhanLoai(raw) {
  if (!raw || typeof raw !== "object" || !Y_DINH.includes(raw.y_dinh)) return null;
  const hoi_ve = Array.isArray(raw.hoi_ve) ? [...new Set(raw.hoi_ve.filter((k) => HOI_VE.includes(k)))] : [];
  const tc = Number(raw.do_tin_cay);
  return {
    y_dinh: raw.y_dinh,
    hoi_ve: raw.y_dinh === "hoi_thong_tin" ? hoi_ve : [],
    khan: raw.khan === true,
    ngon_ngu: raw.ngon_ngu === "en" ? "en" : "vi",
    do_tin_cay: Number.isFinite(tc) ? Math.min(1, Math.max(0, tc)) : 0,
    tom_tat: typeof raw.tom_tat === "string" ? raw.tom_tat.trim().slice(0, 200) : "",
    goi_y: (Array.isArray(raw.goi_y) ? raw.goi_y : [])
      .filter((s) => typeof s === "string" && s.trim() && !laSdtLa(s) && !KHANG_DINH_CON_PHONG.test(s.replace(/\[[^\]]*\]/g, "")))
      .map((s) => s.trim().slice(0, 400)).slice(0, 3),
  };
}

/** Luật 5 của prompt, chặn bằng code: hội thoại đã có tin bot thì nháp không được chối là bot */
const CHOI_BOT = /^(dạ\s*,?\s*)?(không|ko)\b|không phải (là )?(bot|máy|tin tự động)|\bnot a bot\b|^no\b/i;
export function locNhapTheoNguCanh(goiY, pl, h) {
  if (pl?.y_dinh !== "nghi_bot" || !h.tin.some((t) => t.vai === "bot")) return goiY;
  return goiY.filter((g) => !CHOI_BOT.test(g.trim()));
}

// ---------------------------------------------------------------------------
//  Câu bot được phép tự gửi: chỉ ráp từ dữ kiện thật, thiếu là trả null
// ---------------------------------------------------------------------------
const CHI_PHI_BAT_BUOC = ["dien", "nuoc", "phi_quan_ly"];

export function soanTraLoiTuFacts(hoiVe, f, isEn = false) {
  if (!f || !hoiVe?.length || hoiVe.some((k) => !HOI_VE_DU_KIEN.includes(k))) return null;
  const can = [], them = [];
  for (const k of hoiVe) {
    if (k === "chi_phi") { can.push(...CHI_PHI_BAT_BUOC); them.push("gui_xe"); them.push("gia"); }
    else can.push(k);
  }
  if (can.some((k) => !f[k])) return null;
  const khoa = [...new Set([...can, ...them.filter((k) => f[k])])];
  const nhan = isEn ? NHAN_EN : NHAN;
  const dong = khoa.map((k) => `${nhan[k]}: ${k === "gia" && isEn ? f.gia_en : f[k]}`);
  return isEn
    ? `Room ${f.ma} fee details:\n\n${dong.join("\n\n")}\n\nViewing is 100% free with no brokerage fees. Zalo/Hotline: 0387 365 020 (Quang).`
    : `Phòng ${f.ma} bên mình tính phí rõ ràng từ đầu như này nha:\n\n${dong.join("\n\n")}\n\nBên mình dẫn coi phòng miễn phí hết, không thu phí dịch vụ gì đâu. Tối nay tầm 6h30 hoặc chiều mai bạn rảnh giờ nào nhắn mình hoặc Zalo 0387 365 020 (Quang) để mình hẹn mở cửa nha.`;
}

/** Câu chào chuẩn kịch bản của Radar Nhà Đất - ngắn gọn, xưng 'mình - bạn' đỡ nhầm */
export const cauChao = (isEn, facts = null) => {
  if (isEn) {
    if (facts?.ma) return `Hi! Are you interested in unit ${facts.ma}? Would you like more details or to schedule a viewing?`;
    return "Hi there! Which area are you looking for a room in and what is your approximate budget? Let me know so I can help!";
  }
  if (facts?.ma) {
    return `Dạ chào bạn! Bạn đang quan tâm căn ${facts.ma} đúng không nè? Bạn cần mình gửi thêm chi tiết hay hẹn giờ qua xem thực tế ạ?`;
  }
  return "Dạ chào bạn! Bạn đang tìm phòng khu vực nào, ngân sách tầm bao nhiêu để mình lọc rổ hàng 1.400+ căn gửi bạn liền nha?";
};

/** Phản hồi các sự kiện phi ngôn ngữ (cuộc gọi nhỡ, sticker/icon, tin nhắn thoại, ảnh) */
export function cauPhanHoiPhiNgonNgu({ kieu, facts, isEn = false }) {
  if (kieu === "cuoc_goi") {
    return isEn
      ? "Hi there! I missed your call because I was busy showing a room to a tenant. Could you please text me your rental requirements (district, budget) so I can assist you right away?"
      : "Dạ chào bạn! Mình vừa lỡ cuộc gọi do đang bận dẫn khách xem phòng một xíu. Bạn đang quan tâm phòng khu vực nào nhắn mình nhu cầu để mình kiểm tra và gửi qua liền nha!";
  }
  if (kieu === "sticker") {
    if (facts) {
      return isEn
        ? `Hi! Are you interested in unit ${facts.ma}? Would you like more information or would you like to schedule a viewing?`
        : `Dạ bạn đang quan tâm căn ${facts.ma} đúng không nè? Bạn cần mình hỗ trợ thêm thông tin gì hay muốn hẹn giờ qua xem thực tế ạ?`;
    }
    return cauChao(isEn, facts);
  }
  if (kieu === "giong_noi") {
    return isEn
      ? "Hi there! I'm outside and it's quite noisy so I couldn't listen to your voice message clearly. Please text me your room requirements so I can assist you right away!"
      : "Dạ mình đang ở ngoài đường hơi ồn nên chưa nghe rõ tin nhắn thoại á. Bạn nhắn tin chữ giúp mình nhu cầu tìm phòng (khu vực, ngân sách) để mình hỗ trợ liền nha!";
  }
  if (kieu === "anh") {
    return isEn
      ? "I received your photo! Could you please share the room code or your requirements so I can check it for you?"
      : "Dạ mình nhận được hình ảnh bạn gửi rồi ạ. Bạn gửi mình xin thêm mã phòng hoặc nhu cầu chi tiết để mình kiểm tra ngay nha!";
  }
  return null;
}

export function goiYPhiNgonNgu({ kieu, facts, isEn = false }) {
  const c1 = cauPhanHoiPhiNgonNgu({ kieu, facts, isEn });
  if (kieu === "cuoc_goi") {
    return [
      c1,
      "Dạ em chào anh/chị, em vừa thấy cuộc gọi nhỡ từ mình. Mình đang cần xem phòng gấp hay cần tư vấn khu vực nào nhắn em gọi lại ngay nhé ạ!",
    ].filter(Boolean);
  }
  if (kieu === "sticker") {
    return [
      c1,
      "Dạ em chào anh/chị, Radar có thể hỗ trợ gì cho mình về tìm phòng trọ/căn hộ hôm nay ạ?",
    ].filter(Boolean);
  }
  if (kieu === "giong_noi") {
    return [
      c1,
      "Dạ em vừa nhận tin nhắn thoại của mình. Anh/chị gửi lại bằng tin nhắn chữ giúp em để em tra cứu phòng nhanh nhất nhé ạ!",
    ].filter(Boolean);
  }
  if (kieu === "anh") {
    return [
      c1,
      "Dạ căn phòng trong ảnh anh/chị muốn xem thực tế hay cần em check giá và các chi phí cụ thể ạ?",
    ].filter(Boolean);
  }
  return [c1].filter(Boolean);
}

// ---------------------------------------------------------------------------
//  Chính sách: hàm thuần, mọi nhánh có test
// ---------------------------------------------------------------------------
/**
 * h: hội thoại (đã ghi tin mới) · pl: phân loại AI đã chuẩn hoá hoặc null · cung: tinHieuCung
 * cuaSoMoi: tin này mở một lượt chờ mới (trước đó không có tin khách nào đang chờ)
 * doiCan: khách vừa chuyển sang hỏi căn khác
 */
export function quyetDinh({ h, pl, cung, facts, luc, tuDong, cuaSoMoi = false, doiCan = false, kieu = "chu" }) {
  const nguoi = dangDoNguoi(h, luc);
  const nguoiTrongCuoc = nguoi && luc - h.nguoi_luc < NGUOI_TRONG_CUOC_MS;
  const khan = cung.khan || !!pl?.khan || Y_DINH_KHAN.has(pl?.y_dinh);
  const canNguoi = cung.can_nguoi || !pl || Y_DINH_CAN_NGUOI.has(pl.y_dinh) || pl.do_tin_cay < NGUONG_TIN_CAY;
  const isEn = pl?.ngon_ngu === "en";

  let tuTraLoi = null, laChao = false;
  if (!nguoi && tuDong) {
    if (!canNguoi) {
      if (pl.y_dinh === "hoi_thong_tin") tuTraLoi = soanTraLoiTuFacts(pl.hoi_ve, facts, isEn);
      else if (!h.da_chao && (pl.y_dinh === "chao_hoi" || pl.y_dinh === "tim_phong")) { tuTraLoi = cauChao(isEn, facts); laChao = true; }
    } else if (["cuoc_goi", "sticker", "giong_noi"].includes(kieu)) {
      if (kieu === "cuoc_goi" && !h.da_chao_cuoc_goi) {
        tuTraLoi = cauPhanHoiPhiNgonNgu({ kieu, facts, isEn });
        h.da_chao_cuoc_goi = true;
      } else if (kieu === "sticker" && !h.da_chao) {
        tuTraLoi = cauPhanHoiPhiNgonNgu({ kieu, facts, isEn });
        laChao = true;
      } else if (kieu === "giong_noi") {
        tuTraLoi = cauPhanHoiPhiNgonNgu({ kieu, facts, isEn });
      }
    } else if (!h.da_chao && kieu === "chu" && (pl?.y_dinh === "chao_hoi" || pl?.y_dinh === "tim_phong")) {
      tuTraLoi = cauChao(isEn, facts);
      laChao = true;
    }
  }

  const ketThuc = pl?.y_dinh === "cam_on_ket_thuc" && !cung.can_nguoi;
  const leadMoi = !!facts && !h.lead_bao?.[facts.id];
  let baoAdmin = null;

  // QUY TẮC CỨNG: Người thật đã tiếp nhận -> Tuyệt đối không gửi bất kỳ thẻ báo nào về số chính nữa
  if (nguoi) {
    baoAdmin = null;
  } else if (khan && !(h.khan_luc && luc - h.khan_luc < KHAN_LAP_MS)) {
    baoAdmin = "khan";
  } else if (ketThuc) {
    baoAdmin = null;
  } else if (["cuoc_goi", "giong_noi", "anh"].includes(kieu)) {
    baoAdmin = khan ? "khan" : "thuong";
  } else if (laChao) {
    // VỪA CHÀO VỪA BÁO ADMIN (ngay khi bot chào khách thì cũng bắn thẻ báo cho anh)
    baoAdmin = khan ? "khan" : "thuong";
  } else if (tuTraLoi) {
    baoAdmin = leadMoi ? "thuong" : null;
  } else if (cuaSoMoi || doiCan || leadMoi || kieu === "sticker") {
    baoAdmin = "thuong";
  }

  return { tuTraLoi, laChao, baoAdmin, khan, canNguoi, ketThuc };
}

// ---------------------------------------------------------------------------
//  Thẻ cho admin + lệnh admin
// ---------------------------------------------------------------------------
const LY_DO_DOC = { nghi_bot: "khách nghi đang nói với bot", hen_xem: "khách muốn xem phòng / đang ở gần",
  phan_nan: "khách đang bực", goi_nguoi: "khách đang gọi người", mac_ca: "khách mặc cả",
  dat_coc_hop_dong: "khách hỏi cọc / hợp đồng", gui_anh: "khách gửi ảnh",
  gui_giong_noi: "khách gửi tin thoại", gui_sticker: "khách gửi sticker/icon",
  gui_cuoc_goi: "khách vừa gọi điện / lỡ cuộc gọi" };

export function soanThe({ h, phong, facts, pl, cung, muc, luc, botDaTraLoi = null }) {
  const ma = maThe(h.uid);
  const dau = muc === "khan" ? "🚨" : "💬";
  const dong = [`${dau} ${ma} · ${h.ten || "Khách Zalo"}`];
  const lyDo = [...(cung?.ly_do || []).map((x) => LY_DO_DOC[x] || x), pl?.tom_tat].filter(Boolean);
  if (lyDo.length) dong.push(`Tình hình: ${lyDo.join(" · ")}`);
  if (facts && phong) {
    const t = phong.tin;
    dong.push(`Căn đang hỏi: ${facts.ma} · ${(t.title || "").slice(0, 50)} · ${facts.gia || ""}`);
  }
  const choTra = [];
  for (let i = h.tin.length - 1; i >= 0 && h.tin[i].vai === "khach" && choTra.length < 3; i--) {
    choTra.unshift(moTaTin(h.tin[i].chu, h.tin[i].kieu));
  }
  if (choTra.length) dong.push("Khách:", ...choTra.map((c) => `  "${c.slice(0, 200)}"`));
  if (botDaTraLoi) {
    dong.push(`Em đã nhắn lại: "${botDaTraLoi.slice(0, 250)}"`);
    dong.push(`Anh tiếp quản tiếp nhé!`);
  } else {
    dong.push(`Anh tiếp quản tiếp nhé!`);
  }
  if (h.goi_y?.length) dong.push("Gợi ý:", ...h.goi_y.slice(0, 2).map((g, i) => `${i + 1}. ${g}`));
  dong.push(`Gõ "${ma} <câu>" để nhắn khách · "${ma} 1" gửi gợi ý 1 · "${ma} nhận" để ngắt bot`);
  return dong.join("\n");
}

/** "K1234 2" | "K1234 bot" | "K1234 im" | "K1234 nhận" | "K1234 ok" | "K1234 <câu>" */
export function docLenhAdmin(text) {
  const m = String(text || "").trim().match(/^k(\d{4,})\b\s*([\s\S]*)$/i);
  if (!m) return null;
  const ma = "K" + m[1], phan = m[2].trim();
  if (!phan) return { ma, lenh: "thieu" };
  if (/^[1-9]$/.test(phan)) return { ma, lenh: "chon", so: Number(phan) };
  if (/^bot$/i.test(phan)) return { ma, lenh: "bot" };
  if (/^(im|nguoi|người|ok|nhan|nhận|tiep nhan|tiếp nhận|da nhan|đã nhận)$/i.test(phan)) return { ma, lenh: "im" };
  return { ma, lenh: "gui", noiDung: phan };
}

const HUONG_DAN = `Lệnh: "K1234 nhận" hoặc chat tay để bot không báo thẻ · "K1234 1" gửi gợi ý 1 · "K1234 <câu>" gửi câu đó cho khách · "K1234 bot" giao lại cho bot.`;

// ---------------------------------------------------------------------------
//  Bộ điều phối
// ---------------------------------------------------------------------------
/**
 * sb: Supabase service role · kho: taoKhoHoiThoai · cong: taoCongGui
 * goiAI(prompt) -> Promise<object|null>
 */
export function taoTuVan({ sb, kho, cong, goiAI, adminUid = ADMIN_ZALO_UID, tuDong = BOT_TU_DONG_TRA_LOI_KHACH, now = () => Date.now(), log = console }) {
  adminUid = String(adminUid);

  const baoAdmin = (text) => cong.gui(adminUid, text, { loai: "admin" })
    .then((r) => { if (!r.ok) log.error(`[tư vấn] thẻ admin không gửi được: ${r.lyDo}`); return r; });

  async function phongCua(h, chu) {
    const dd = trichXuatDinhDanh(chu);
    if (dd) {
      const p = await traCuuPhong(sb, dd).catch(() => null);
      if (p) return { phong: p, doiCan: h.listing_id !== p.tin.id };
    }
    if (h.listing_id) return { phong: await traCuuPhong(sb, { kieu: "uuid", giaTri: h.listing_id }).catch(() => null), doiCan: false };
    return { phong: null, doiCan: false };
  }

  async function khachNhan({ uid, ten, chu, kieu = "chu" }) {
    if (!uid || String(uid) === adminUid) return;
    const luc = now();
    const h = await kho.lay(uid);
    if (ten) h.ten = ten;
    const cuaSoMoi = h.cho_tu == null;
    themTin(h, "khach", chu, kieu, luc);

    const { phong, doiCan } = await phongCua(h, chu);
    if (phong) h.listing_id = phong.tin.id;
    const facts = phong ? factsTuTin(phong.tin, phong.roHang) : null;
    const cung = tinHieuCung(chu, kieu);
    // người đang theo cuộc thì khỏi tốn lượt AI (bot im, thẻ không gửi); khách gửi ảnh/sticker không có chữ cũng vậy
    const nguoiTrongCuoc = dangDoNguoi(h, luc) && luc - h.nguoi_luc < NGUOI_TRONG_CUOC_MS;
    const pl = !nguoiTrongCuoc && chu
      ? chuanHoaPhanLoai(await goiAI(taoPromptPhanLoai({ tin: h.tin, facts, tinMoi: chu })).catch(() => null))
      : null;

    const qd = quyetDinh({ h, pl, cung, facts, luc, tuDong, cuaSoMoi, doiCan, kieu });
    log.log(`[tư vấn] ${maThe(uid)} ${pl?.y_dinh || "-"}${pl ? ` (${pl.do_tin_cay})` : ""} luật:[${cung.ly_do}] -> ${qd.tuTraLoi ? "bot trả lời" : "bot im"}, thẻ ${qd.baoAdmin || "không"}`);

    if (qd.ketThuc) { h.cho_tu = null; h.nhac_luc = null; }
    if (qd.tuTraLoi) {
      if (qd.laChao) h.da_chao = true;
      // không await: gửi có giãn cách gõ phím, hàng đợi sự kiện listener không phải chờ
      cong.gui(uid, qd.tuTraLoi, { loai: "khach_tu_dong" }).then(async (r) => {
        if (!r.ok) { log.error(`[tư vấn] tự trả lời ${maThe(uid)} bị chặn: ${r.lyDo}`); return; }
        themTin(h, "bot", qd.tuTraLoi, "chu", luc); // mốc quyết định, xem themTin
        await kho.luu(h);
      });
    }
    const nhap = facts && pl?.y_dinh === "hoi_thong_tin" ? soanTraLoiTuFacts(pl.hoi_ve, facts, pl.ngon_ngu === "en") : null;
    let danhSachGoiY = [...new Set([nhap, ...locNhapTheoNguCanh(pl?.goi_y || [], pl, h)].filter(Boolean))];
    if (!danhSachGoiY.length && kieu !== "chu") {
      danhSachGoiY = goiYPhiNgonNgu({ kieu, facts, isEn: pl?.ngon_ngu === "en" });
    }
    h.goi_y = danhSachGoiY.slice(0, 3);

    if (qd.baoAdmin) {
      if (qd.baoAdmin === "khan") h.khan_luc = luc; else h.the_luc = luc;
      if (facts) h.lead_bao = { ...h.lead_bao, [facts.id]: luc };
      baoAdmin(soanThe({ h, phong, facts, pl, cung, muc: qd.baoAdmin, luc, botDaTraLoi: qd.tuTraLoi }));
    }
    await kho.luu(h);
  }

  /** Tin tài khoản bot tự gửi trong chat 1-1: tiếng vọng của bot, hoặc người thật chat tay */
  async function tuGuiNhan({ uid, chu, kieu = "chu" }) {
    if (!uid || String(uid) === adminUid) return;
    if (kieu === "chu" && cong.laTiengVong(uid, chu)) return;
    const luc = now();
    const h = await kho.lay(uid);
    themTin(h, "nguoi", chu, kieu, luc);
    nguoiNhan(h, luc);
    log.log(`[tư vấn] ${maThe(uid)} người thật nhận cuộc chat: "${moTaTin(chu, kieu).slice(0, 60)}"`);
    await kho.luu(h);
  }

  /** Tin từ Zalo admin gửi tới tài khoản bot */
  async function adminNhan({ chu }) {
    const lenh = docLenhAdmin(chu);
    if (!lenh) return; // admin nói chuyện thường, không phải lệnh
    if (lenh.lenh === "thieu") return void baoAdmin(HUONG_DAN);
    const uids = await kho.timTheoMa(lenh.ma);
    if (!uids.length) return void baoAdmin(`Không thấy hội thoại ${lenh.ma}.`);
    if (uids.length > 1) return void baoAdmin(`${lenh.ma} trùng ${uids.length} khách, gõ thêm số cuối: ${uids.map((u) => "K" + u.slice(-7)).join(", ")}`);
    const h = await kho.lay(uids[0]);
    const luc = now();

    if (lenh.lenh === "bot") { traChoBot(h); await kho.luu(h); return void baoAdmin(`✓ ${lenh.ma} giao lại cho bot.`); }
    if (lenh.lenh === "im") { nguoiNhan(h, luc); await kho.luu(h); return void baoAdmin(`✓ ${lenh.ma} đã chuyển sang người thật tiếp nhận, bot sẽ không gửi báo về số chính nữa.`); }

    let noiDung = lenh.noiDung;
    if (lenh.lenh === "chon") {
      noiDung = h.goi_y?.[lenh.so - 1];
      if (!noiDung) return void baoAdmin(`${lenh.ma} không có gợi ý số ${lenh.so}.`);
      if (/\[[^\]]+\]/.test(noiDung)) return void baoAdmin(`Gợi ý ${lenh.so} còn chỗ trống [..]. Gõ "${lenh.ma} <câu đầy đủ>" để gửi.`);
    }
    const r = await cong.gui(h.uid, noiDung, { loai: "khach_admin" });
    if (!r.ok) return void baoAdmin(`✗ ${lenh.ma} chưa gửi được (${r.lyDo}).`);
    themTin(h, "nguoi", noiDung, "chu", now());
    nguoiNhan(h, now());
    await kho.luu(h);
    baoAdmin(`✓ Đã gửi ${lenh.ma}.`);
  }

  /** ĐÃ TẮT thông báo nhắc việc theo yêu cầu user (chỉ báo 1 tin duy nhất lúc khách nhắn, không báo thời gian, không spam thẻ) */
  async function nhacViec() {
    return;
  }

  return { khachNhan, tuGuiNhan, adminNhan, nhacViec };
}

/** Soạn nội dung rep nhóm + tin riêng 1-1 khi săn được khách tìm phòng trong group */
function gonDiaDanh(s) {
  return String(s || "")
    .replace(/^(Thành phố|TP\.?)\s+/i, "")
    .replace(/^Phường\s+(\d+)$/i, "P$1")
    .replace(/^Phường\s+/i, "")
    .replace(/^Quận\s+(\d+)$/i, "Q$1")
    .replace(/^(Quận|Huyện)\s+/i, "")
    .trim();
}

function giaChat(vnd) {
  if (!vnd) return "giá thương lượng";
  const tr = Math.round(vnd / 1e5) / 10;
  const nguyen = Math.floor(tr);
  const le = Math.round((tr - nguyen) * 10);
  return le ? `${nguyen}tr${le}` : `${nguyen}tr`;
}

function moTaMotCan(c) {
  const kv = [gonDiaDanh(c.ward), gonDiaDanh(c.district)].filter(Boolean).join(" ");
  const gia = giaChat(c.price_vnd);
  const ti = [...new Set((c.amenities || []).map((a) => TIEN_ICH[a] || a).filter(Boolean))].slice(0, 3).join(", ");
  const dt = c.area_m2 ? ` ${Math.round(c.area_m2)}m²` : "";
  const loai = c.specs?.["Loại phòng"] ? ` (${c.specs["Loại phòng"]})` : "";
  const ma = c.id ? ` [${maPhong(c.id)}]` : "";
  const link = c.id ? `\nnhadatradar.com/listings/${c.id}` : "";
  return `một căn${ma}${loai}${dt} ở ${kv} giá ${gia}${ti ? ` có sẵn ${ti}` : ""}${link}`;
}

/**
 * Tự tra cứu Database Supabase tìm các căn rổ hàng phù hợp với nhu cầu khách
 */
export async function timPhongPhuHop({ sb, nhuCau, limit = 2 }) {
  if (!sb) return [];
  try {
    const quanList = (nhuCau?.quan || []).filter(Boolean);
    const giaDen = nhuCau?.gia_den ? Number(nhuCau.gia_den) : null;
    const giaTu = nhuCau?.gia_tu ? Number(nhuCau.gia_tu) : null;
    const tomTat = `${nhuCau?.tom_tat || ""} ${(nhuCau?.yeu_cau || []).join(" ")}`.toLowerCase();
    const loaiPhong = nhuCau?.loai_phong || "";

    // Nhận diện từ khoá đặc thù
    const is1PN = /1\s*pn|1\s*phòng\s*ngủ|1\s*bed/i.test(tomTat);
    const is2PN = /2\s*pn|2\s*phòng\s*ngủ|2\s*bed/i.test(tomTat);
    const isStudio = /studio|stu/i.test(tomTat);
    const isGac = /gác|duplex/i.test(tomTat);
    const isVP = /văn\s*phòng|van\s*phong|mặt\s*bằng|mat\s*bang|nhà\s*phố|nguyên\s*căn/i.test(tomTat) || loaiPhong === "mat_bang" || loaiPhong === "nha";

    // Hàm thực hiện query với các tiêu chí
    const buildQuery = ({ dungQuan = true, dungLoai = true, dungGia = true } = {}) => {
      let q = sb.from("listings").select("id, title, price_vnd, area_m2, kind, address, ward, district, specs, amenities")
        .eq("source", "ro_hang")
        .eq("deal", "cho_thue")
        .eq("status", "published");

      if (dungQuan && quanList.length > 0) {
        const qClean = quanList[0].replace(/^(Quận|Huyện|Thành phố|TP\.?)\s+/i, "").trim();
        q = q.ilike("district", `%${qClean}%`);
      }

      if (dungGia) {
        if (giaDen) {
          q = q.lte("price_vnd", Math.round(giaDen * 1.15));
          q = q.gte("price_vnd", Math.round((giaTu || giaDen * 0.7) * 0.85));
        } else if (giaTu) {
          q = q.gte("price_vnd", Math.round(giaTu * 0.85));
          q = q.lte("price_vnd", Math.round(giaTu * 1.6));
        }
      }

      if (dungLoai) {
        if (is1PN) {
          q = q.or("title.ilike.%1PN%,title.ilike.%1 phòng ngủ%,specs->>Loại phòng.ilike.%1 Phòng ngủ%");
        } else if (is2PN) {
          q = q.or("title.ilike.%2PN%,title.ilike.%2 phòng ngủ%,specs->>Loại phòng.ilike.%2 Phòng ngủ%");
        } else if (isStudio) {
          q = q.or("title.ilike.%studio%,specs->>Loại phòng.ilike.%Studio%");
        } else if (isGac) {
          q = q.or("title.ilike.%gác%,title.ilike.%duplex%,specs->>Loại phòng.ilike.%Gác lửng%,specs->>Loại phòng.ilike.%Duplex%");
        } else if (isVP) {
          q = q.or("title.ilike.%mặt bằng%,title.ilike.%văn phòng%,title.ilike.%nhà nguyên căn%,specs->>Loại phòng.ilike.%Mặt bằng%,specs->>Loại phòng.ilike.%Nhà nguyên căn%");
        }
      }

      return q;
    };

    // Chiến lược khớp tầng (Cascade):
    // 1. Thử khớp đầy đủ: Loại phòng + Quận + Giá
    let { data } = await buildQuery({ dungQuan: true, dungLoai: true, dungGia: true }).order("first_seen_at", { ascending: false }).limit(20);

    // 2. Nếu không ra căn nào và có lọc loại phòng: giữ loại phòng, nới quận
    if (!data?.length && (is1PN || is2PN || isStudio || isGac || isVP)) {
      const res = await buildQuery({ dungQuan: false, dungLoai: true, dungGia: !!giaDen || !!giaTu }).order("first_seen_at", { ascending: false }).limit(20);
      data = res.data;
    }

    // 3. Nếu vẫn không ra: nới loại phòng, giữ quận và giá
    if (!data?.length && quanList.length > 0) {
      const res = await buildQuery({ dungQuan: true, dungLoai: false, dungGia: true }).order("first_seen_at", { ascending: false }).limit(20);
      data = res.data;
    }

    // 4. Nếu vẫn không ra: lấy các căn rổ hàng mới nhất trong tầm giá
    if (!data?.length) {
      const res = await buildQuery({ dungQuan: false, dungLoai: false, dungGia: true }).order("first_seen_at", { ascending: false }).limit(20);
      data = res.data;
    }

    // 5. Fallback cuối cùng: lấy 2 căn rổ hàng hot nhất đang published
    if (!data?.length) {
      const res = await sb.from("listings").select("id, title, price_vnd, area_m2, kind, address, ward, district, specs, amenities")
        .eq("source", "ro_hang")
        .eq("deal", "cho_thue")
        .eq("status", "published")
        .order("first_seen_at", { ascending: false })
        .limit(10);
      data = res.data;
    }

    if (!Array.isArray(data) || !data.length) return [];

    // Sắp xếp ưu tiên căn sát mức giá mục tiêu
    const mucTieu = giaDen || giaTu || 5_000_000;
    const sorted = [...data].sort((a, b) => Math.abs((a.price_vnd || 0) - mucTieu) - Math.abs((b.price_vnd || 0) - mucTieu));
    return sorted.slice(0, limit);
  } catch (err) {
    console.error("[timPhongPhuHop] Lỗi tra cứu DB:", err.message);
    return [];
  }
}

export function soanTinSanKhach({ senderName, nhuCau, canKhop = [] }) {
  const ten = senderName || "bạn";
  const coQuan = Array.isArray(nhuCau?.quan) && nhuCau.quan.length > 0;
  const quanText = coQuan ? gonDiaDanh(nhuCau.quan[0]) : "";
  const coCan = Array.isArray(canKhop) && canKhop.length > 0;

  const noiKhuVuc = quanText ? `bên ${quanText}` : "phù hợp";
  const mauRep = [
    `@${ten} mình có sẵn phòng ${noiKhuVuc} đúng tầm giá này, mới nhắn qua Zalo riêng bạn coi hình thử nha`,
    `@${ten} check tin nhắn chờ Zalo giúp mình nha, mình vừa gửi hình phòng đang trống ${noiKhuVuc} cho bạn coi thử á`,
  ];
  const repNhom = coCan
    ? mauRep[canKhop[0]?.id ? canKhop[0].id.charCodeAt(0) % mauRep.length : 0]
    : `@${ten} bạn check tin nhắn chờ Zalo nha, mình hỏi thêm chút để gửi căn ${noiKhuVuc} cho bạn`;

  const chaoTen = ten && ten !== "bạn" ? `${ten} ơi, ` : "Bạn ơi, ";
  if (!coCan) {
    return {
      repNhom,
      tinRieng:
        `${chaoTen}nãy thấy bạn tìm phòng ${noiKhuVuc}.\n\n` +
        `Bạn cần phòng khu vực nào, tầm mấy người ở với ngân sách khoảng bao nhiêu để mình gửi hình mấy căn đang trống qua bạn coi thử nha.`,
    };
  }

  let doanCan = "";
  if (canKhop.length === 1) {
    doanCan = `Mình đang có sẵn ${moTaMotCan(canKhop[0])}`;
  } else {
    doanCan = `Mình đang có ${moTaMotCan(canKhop[0])}\n\nvới thêm ${moTaMotCan(canKhop[1])}`;
  }

  const doanKhuVucHoi = !coQuan
    ? `Bạn đang ưu tiên tìm phòng/nhà quanh khu vực quận nào để mình lọc thêm các căn sát vị trí nhất cho bạn nha.\n\n`
    : "";

  const tinRieng =
    `${chaoTen}nãy thấy bạn tìm phòng ${noiKhuVuc}.\n\n` +
    `${doanCan}\n\n` +
    doanKhuVucHoi +
    `Hình trên link là hình chụp thực tế tại phòng với có ghi đủ giá điện nước luôn á.\n\n` +
    `Bạn ưng căn nào nhắn mình hoặc kết bạn Zalo 0387 365 020 (Lê Quang) mình hẹn mở cửa coi phòng nha.`;

  return { repNhom, tinRieng };
}
