import { NextRequest, NextResponse, after } from "next/server";
import { unstable_cache } from "next/cache";
import { ghiSuKien } from "@/lib/su-kien";
import { baoLeadMoi } from "@/lib/bao-lead";
import { createAnonClient, rateLimitChung } from "@/lib/supabase/anon";
import { createAdminClient } from "@/lib/supabase/admin";
import { gemini, median } from "@/lib/gemini";
import { fmtPrice, PROP } from "@/lib/format";
import { cleanImages } from "@/lib/img";
import { cauChotXemPhong, tronRoHang, laRoHang, maPhong, khoangIdTuMa } from "@/lib/ro-hang";
import { lamSachTuKhoa, cacMucNoi, type BoLoc } from "@/lib/chat-tim";
import { bocTruyVanBDS } from "@/lib/boc-truy-van";
import { layTinTuongTu } from "@/lib/tuong-tu";
import { cheSoVanBan } from "@/lib/doc-quyen";
import { layDuAnToaDo, duAnTrongCau, chuanTen, khoangCachKm, type DuAnToaDo } from "@/lib/du-an";
import { DIEM_NEO } from "@/lib/diem-neo";
import { HOTLINE, HOTLINE_DISPLAY, HOTLINE_NAME } from "@/lib/hotline";

// Điểm neo chiến lược & trường đại học có toạ độ GPS chuẩn để tìm bán kính 2-3km xuyên các lượt chat
const DIEM_NEO_TOA_DO: DuAnToaDo[] = [
  ...DIEM_NEO.map((d) => ({
    id: `neo:${d.slug}`,
    slug: d.slug,
    name: d.ten.replace(/\s*\([^)]*\)\s*/g, "").trim(),
    lat: d.lat,
    lng: d.lng,
    district: d.quanChinh.replace(/^(Thành phố|TP\.?|Quận|Huyện)\s+/i, "").trim(),
    province: "Hồ Chí Minh",
    address: null,
  })),
  { id: "neo:dh-hutech", slug: "dh-hutech", name: "ĐH Hutech", lat: 10.8016, lng: 106.7145, district: "Bình Thạnh", province: "Hồ Chí Minh", address: null },
  { id: "neo:dh-ngoai-thuong", slug: "dh-ngoai-thuong", name: "ĐH Ngoại Thương", lat: 10.8069, lng: 106.7132, district: "Bình Thạnh", province: "Hồ Chí Minh", address: null },
  { id: "neo:dh-van-lang", slug: "dh-van-lang", name: "ĐH Văn Lang", lat: 10.8275, lng: 106.7001, district: "Bình Thạnh", province: "Hồ Chí Minh", address: null },
  { id: "neo:dh-bach-khoa", slug: "dh-bach-khoa", name: "ĐH Bách Khoa", lat: 10.7726, lng: 106.6579, district: "Quận 10", province: "Hồ Chí Minh", address: null },
  { id: "neo:dh-ton-duc-thang", slug: "dh-ton-duc-thang", name: "ĐH Tôn Đức Thắng", lat: 10.7326, lng: 106.6998, district: "Quận 7", province: "Hồ Chí Minh", address: null },
  { id: "neo:dh-cong-nghiep", slug: "dh-cong-nghiep", name: "ĐH Công Nghiệp", lat: 10.8222, lng: 106.6875, district: "Gò Vấp", province: "Hồ Chí Minh", address: null },
  { id: "neo:dh-su-pham-ky-thuat", slug: "dh-su-pham-ky-thuat", name: "ĐH Sư Phạm Kỹ Thuật", lat: 10.8507, lng: 106.7719, district: "Thủ Đức", province: "Hồ Chí Minh", address: null },
  { id: "neo:lang-dai-hoc-thu-duc", slug: "lang-dai-hoc-thu-duc", name: "Làng Đại Học Thủ Đức", lat: 10.8752, lng: 106.8007, district: "Dĩ An", province: "Bình Dương", address: null },
];

// %/_ là wildcard ilike, ",()" phá cú pháp .or() - cùng luật clean của /search (soát 21/8:
// province/district/keyword từ output Gemini đi thẳng vào ilike không rửa)
const sach = (s: unknown) => String(s ?? "").replace(/[%_*,()]/g, " ").replace(/\s+/g, " ").trim();
// 2/11 (audit Q1): "Quận 1" ilike ăn cả Quận 10/11/12 -> quận số so khớp đúng tên
const LA_QUAN_SO = /^Quận \d{1,2}$/;
// 2/11 (audit Q9): bắt cả "0909 123 456", "0909.123.456", "+84 909..."; biên 2 đầu chống bắt nhầm CCCD 12 số
const SDT_TRONG_CAU = /(?<!\d)(?:\+?84|0)[\s.\-]?([35789](?:[\s.\-]?\d){8})(?![\s.\-]?\d)/;
// 2/11 (audit S6): trần Gemini toàn hệ thống / ngày (VN), dùng chung với /api/valuation
const TRAN_GEMINI_NGAY = 3000;
const ngayVN = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type ChatMsg = { role: "user" | "bot"; text: string; listingIds?: string[] };
type Parsed = {
  mode: "search" | "similar" | "project_info" | "analyze" | "chat";
  deal?: "ban" | "cho_thue" | null;
  kind?: string | null;
  province?: string | null;
  district?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  bedrooms?: number | null;
  keyword?: string | null;
  project_name?: string | null;
  target_listing_index?: number | null;
  small_talk_reply?: string | null;
  suggestions?: string[] | null;
};

// Trích xuất nguyên bản từ AI Ơi Nhà Đất (mua_co_dinh_13-11-2026.docx + Tinh-cach-bot_13-11-2026.docx + prompts-AOND_16-11-2026_sau-SRS509.md)
const KHOI_NHAN_VAT_VA_GIONG_AOND = `NHÂN VẬT: em là Trợ lý AI của NhaDat Radar (nhadatradar.com · Hotline/Zalo: ${HOTLINE_DISPLAY} - ${HOTLINE_NAME}), đang trò chuyện với khách tìm mua / thuê nhà đất. Điều quan trọng nhất của em là THẤU HIỂU và CHĂM SÓC khách như chăm người quen:
- Nghe kỹ điều khách nói và đọc ra mong muốn, nỗi lo đằng sau (gấp hay thong thả, đang phân vân điều gì) — chỉ từ chính lời khách, không đoán thêm chi tiết khách chưa kể.
- Đáp vào điều khách đang quan tâm trước, rồi mới tới việc của em; điều khách đã kể ở các tin trước thì dùng lại tự nhiên khi hợp, không nói ra là em đang nhớ.
- Khách bận, do dự hay không vui thì nhẹ nhàng, không ép, không giục. Nếu khách hỏi là người thật hay máy: nói thật "Em là trợ lý AI của Radar Nhà Đất" trong 1 câu rồi tiếp việc khách hỏi.

GIỌNG (chung cho mọi lượt):
- SIÊU NGẮN GỌN (1-2 CÂU): Khách đọc trên điện thoại nên em nhắn cực ngắn, vào thẳng trọng tâm, KHÔNG viết bài văn thuyết minh, KHÔNG mở bài thân bài kết bài.
- DỄ THƯƠNG & TỰ NHIÊN: Văn nói tự nhiên của người thật Sài Gòn ("dạ", "nè", "nha", "á bạn", "nghía thử"), vui vẻ, gần gũi như bạn bè gợi ý cho nhau. TUYỆT ĐỐI CẤM văn mẫu AI sến súa ("viên ngọc quý", "thiên đường an cư", "không chỉ... mà còn...", "lựa chọn hoàn hảo").
- TRẢ LỜI THẲNG TRỌNG TÂM: Khách hỏi gì đáp nấy bằng dữ liệu thật trong DB:
  • Khách hỏi loại hình (chung cư hay khu xây cho thuê): Nói thẳng là căn hộ dịch vụ xây riêng cho thuê / căn hộ mini, nêu ưu điểm thực tế (mới tinh, có thang máy, giờ tự do, an ninh khóa vân tay, không chung chủ, chi phí minh bạch).
  • Khách hỏi số tầng / view: Báo số tầng, khen thực tế (tầng cao thoáng mát, đón gió, ban công rộng).
  • Cuối câu rủ xem phòng nhẹ nhàng hoặc hỏi mở 1 câu ngắn: "Chiều nay hay mai bạn tiện ghé nghía thử phòng nha", "Nhìn ngoài ưng mắt hơn trên hình á!".
- Mỗi lượt một vẻ, không lặp lại câu/ý đã nói ở lượt trước. Gọi khách (anh/chị hoặc bạn) tự nhiên, không gắn vào mọi câu.

BỐI CẢNH TƯ VẤN KHÁCH MUA / THUÊ & THU THẬP NHU CẦU (HỎI NHỎ GIỌT):
- Mục tiêu: hiểu rõ chân dung & tiêu chí tìm kiếm của khách, lấy dữ liệu thật từ DB để khớp căn chính xác nhất và hỗ trợ khách hẹn đi xem nhà thực tế (hoặc lưu SĐT/Zalo của khách để chuyên viên gửi video thực tế & vị trí Maps).
- HỎI NHỎ GIỌT (Tối đa MỘT câu hỏi mỗi lượt, bằng MỘT câu ngắn):
  • Tầng 1 (Cốt lõi): Khu vực / Quận mong muốn, Tầm tài chính / Ngân sách dự kiến, Loại BĐS tìm kiếm.
  • Đủ ba ý cốt lõi và có căn trong DB thì GỢI Ý CĂN TRƯỚC, câu hỏi mở (như đi làm/đi học ở đoạn nào, mấy người ở, khi nào tiện qua xem, hoặc xin SĐT/Zalo để gửi định vị Maps & video phòng) nằm ở CUỐI tin.
  • Chưa đủ khu vực hoặc ngân sách thì gợi ý nhanh 2 mốc giá hoặc 2-3 khu vực điển hình rồi hỏi mở 1 câu ngắn.
- QUY TẮC DỮ LIỆU DB:
  • Tuyệt đối không bịa đặt căn ảo hoặc con số không có trong dữ liệu DB được cung cấp. Thứ trong DB của căn chưa ghi (ví dụ chưa ghi giá nước) thì nói thật là trên tin chưa ghi để bên em hỏi lại tòa nhà/chủ nhà.
  • Khi khách xin bớt giá hoặc hỏi thời hạn hợp đồng ngắn hạn: giải thích nhẹ nhàng là giá niêm yết trên tin, khi đi xem thực tế ưng phòng bên em sẽ hỗ trợ thương lượng trực tiếp với chủ nhà.
  • Nhấn mạnh tự nhiên khi hợp ngữ cảnh: "Radar dẫn xem miễn phí 100%, không thu phí môi giới".

HIỂU TIẾNG NGHỀ & ĐỊA DANH (hiểu luôn, không hỏi lại nghĩa):
- Tiền: tỏi = tỷ, củ = triệu, xị = trăm nghìn, 5t5 = 5,5 tỷ, 4tr5 = 4,5 triệu; TL / bớt lộc = thương lượng.
- Địa chỉ & đường: dấu "/" (100/9, 12/5A) là số nhà trong hẻm (KHÔNG phải diện tích); 1 xuyệt / 2 xuyệt = hẻm rẽ 1-2 lần; MT = mặt tiền, HXH = hẻm xe hơi, CHDV = căn hộ dịch vụ, stu = studio.
- Tên khu dân gian:
  • Bcons City, đường Thống Nhất, Đông Hòa, Tân Lập, Làng Đại học Quốc gia (ĐHQG) = TP. Dĩ An, Bình Dương (giáp Thủ Đức).
  • Bàu Cát, K300, Bảy Hiền, Lăng Cha Cả, Bà Quẹo = Tân Bình; cư xá Bắc Hải = Quận 10; Bàn Cờ, Đô Thành = Quận 3; Lữ Gia, Bình Thới = Quận 11; Phan Xích Long = Phú Nhuận.
  • Bà Chiểu, Hàng Xanh, Thị Nghè, Văn Thánh, Thanh Đa, Miếu Nổi, đường D2 (Nguyễn Gia Trí) = Bình Thạnh; Đa Kao, Tân Định = Quận 1; Xóm Chiếu = Quận 4; Chợ Lớn = Quận 5; Phú Lâm, Bình Phú = Quận 6.
  • Phú Mỹ Hưng, Him Lam, Kiều Đàm = Quận 7; Xóm Củi = Quận 8; Tên Lửa, An Lạc = Bình Tân; Cityland, Hạnh Thông Tây = Gò Vấp; Thảo Điền, An Phú, Sala, Vạn Phúc, Bình Triệu, Hiệp Bình = Thủ Đức; Trung Sơn = Bình Chánh; Ngã tư Ga, An Sương = Quận 12.
- Kiến thức nghề: ô tô con cần hẻm >= 3-3.5m; diện tích chung cư trên sổ là thông thủy; nhà phố 4x16 = 64m² đất.`;

const PARSE_PROMPT = `${KHOI_NHAN_VAT_VA_GIONG_AOND}

=== BƯỚC 1: ĐỌC Ý KHÁCH THEO NGỮ CẢNH TOÀN CUỘC TRÒ CHUYỆN ===
Đọc TIN NHẮN CUỐI của người dùng trong TOÀN BỘ NGỮ CẢNH HỘI THOẠI (nhớ mọi tiêu chí khu vực, đường, dự án, tầm giá, loại phòng khách đã nói ở các lượt trước cho đến khi khách đổi sang ý khác) và trả về DUY NHẤT 1 JSON:
{
  "mode": "search"|"similar"|"project_info"|"analyze"|"chat",
    // search: khách tìm căn / lọc phòng theo khu vực, đường, dự án, tầm giá, loại phòng, hoặc đổi/bổ sung tiêu chí từ lượt trước ("Khu Bcons City đường Thống Nhất có căn nào dưới 8tr ko", "dưới 4 triệu thì sao", "có phòng gác lửng không", "còn bên Bình Thạnh thì sao")
    // similar: khách đang xem 1 căn và muốn tìm các căn tương tự / giống căn này quanh đó ("gợi ý căn tương tự", "có căn nào giống vậy không")
    // project_info: khách CHỈ hỏi thông tin giới thiệu về một dự án BĐS (chủ đầu tư, pháp lý, bàn giao, quy mô dự án) mà KHÔNG hỏi tìm căn/phòng hay mức giá thuê/mua
    // analyze: hỏi thống kê giá trung bình thị trường, so sánh giá/m² các quận, tỷ suất cho thuê
    // chat: hỏi chi tiết về CĂN ĐANG XEM hoặc CÁC CĂN VỪA GỢI Ý ("căn này có gần Bcons không", "căn đầu điện nước sao", "so sánh căn 1 và căn 2", "căn này còn trống không", "bớt giá được không"), để lại SĐT/hẹn lịch xem, hỏi kiến thức pháp lý/thủ tục, hoặc chào hỏi
  "deal": "ban"|"cho_thue"|null,
  "kind": "nha"|"dat"|"can_ho"|"mat_bang"|"phong_tro"|null,
  "province": string|null,   // chuẩn hoá: "Hồ Chí Minh", "Bình Dương", "Đồng Nai", "Hà Nội", "Đà Nẵng"... (Dĩ An / Thuận An -> "Bình Dương")
  "district": string|null,   // chuẩn hoá: "Dĩ An", "Bình Thạnh", "Quận 7", "Thủ Đức"... Kế thừa từ lượt trước nếu lượt này khách chỉ đổi giá/loại phòng
  "price_min": number|null,  // VND: "2 tỷ"=2000000000, "5tr"=5000000. Kế thừa từ lượt trước nếu lượt này khách chỉ đổi khu vực
  "price_max": number|null,
  "bedrooms": number|null,
  "keyword": string|null,    // tên đường / địa danh nhỏ hơn quận (CÓ DẤU CHUẨN, KHÔNG kèm chữ "đường", "phố", "hẻm", "gần", "khu")
  "project_name": string|null, // tên dự án / chung cư cụ thể nếu khách đang tìm quanh dự án đó hoặc hỏi về dự án đó (vd "Bcons City", "Vinhomes Grand Park"). Kế thừa từ lượt trước nếu khách đang hỏi tiếp về khu dự án đó
  "target_listing_index": number|null, // số thứ tự căn (1..5) trong CÁC CĂN VỪA GỢI Ý nếu khách hỏi về căn đó ("căn đầu"=1, "căn số 2"=2, "căn cuối"=5)
  "small_talk_reply": string|null, // KHI mode="chat": viết câu trả lời tự nhiên theo đúng NHÂN VẬT & GIỌNG ở trên, lấy dữ liệu thật từ NGƯỜI DÙNG ĐANG XEM / CÁC CĂN VỪA GỢI Ý / KHOẢNG CÁCH DỰ ÁN / KIẾN THỨC NGHỀ để giải đáp trọn câu hỏi của khách, kèm tối đa 1 câu hỏi mở hoặc mời hẹn xem / để lại SĐT-Zalo nhận video & vị trí Maps.
  "suggestions": string[]|null // 2-3 gợi ý câu hỏi ngắn gọn tiếp theo hợp ngữ cảnh
}`;

type TinDangXem = {
  id: string;
  title: string;
  price_vnd: number | null;
  deal: string;
  area_m2: number | null;
  bedrooms: number | null;
  district: string | null;
  province: string | null;
  ward: string | null;
  kind: string;
  address: string | null;
  source: string | null;
  source_site: string | null;
  specs: Record<string, string> | null;
  amenities: string[] | null;
  lat?: number | null;
  lng?: number | null;
};

// Nhúng câu hỏi thành vector 768 chiều (gemini-embedding-001 - cùng model với listings.embedding và
// projects.embedding chép từ kho AI Ơi). Xoay key khi 429. null nếu hết key / lỗi.
async function nhungCau(text: string): Promise<number[] | null> {
  const KEYS = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY2, process.env.GEMINI_API_KEY3,
    process.env.GEMINI_API_KEY4, process.env.GEMINI_API_KEY5].filter(Boolean) as string[];
  for (const k of KEYS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${k}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(12_000), // 2/11 (audit Q11): không treo cả route khi Gemini chậm
        body: JSON.stringify({ content: { parts: [{ text: text.slice(0, 1000) }] }, outputDimensionality: 768 }),
      });
      if (res.status === 429) continue;
      const j = await res.json();
      if (j?.embedding?.values) return j.embedding.values;
    } catch (e) {
      const ten = (e as { name?: string } | null)?.name;
      if (ten === "TimeoutError" || ten === "AbortError") return null; // chậm do Gemini, đổi key vô ích
      /* lỗi mạng khác: thử key kế */
    }
  }
  return null;
}

// từ chung trong tên dự án - không tính là "khách có nhắc tên dự án" (cùng danh sách match_projects bên kho AI Ơi)
const TU_CHUNG_DU_AN = new Set(["the", "khu", "can", "ho", "nha", "pho", "dat", "nen", "city", "garden", "residence", "apartment",
  "tower", "block", "phan", "du", "an", "project", "eco", "new", "and", "chung", "cu", "biet", "thu", "villa", "shophouse", "do", "thi", "kdt", "plaza", "center", "home", "homes"]);

function fallbackParse(text: string): Parsed {
  const t = text.toLowerCase();
  const q: Parsed = { mode: "search" };
  if (/(giá trung bình|khu nào rẻ|quận nào rẻ|đầu tư đâu|xu hướng thị trường|tỷ suất cho thuê)/.test(t)) q.mode = "analyze";
  const b = bocTruyVanBDS(text);
  if (b.coKetQua) {
    if (b.loc.deal) q.deal = b.loc.deal;
    if (b.loc.kind) q.kind = b.loc.kind;
    if (b.loc.province) q.province = b.loc.province;
    if (b.loc.district) q.district = b.loc.district;
    if (b.loc.price_min) q.price_min = b.loc.price_min;
    if (b.loc.price_max) q.price_max = b.loc.price_max;
    else if (b.loc.price_approx) q.price_max = Math.round(b.loc.price_approx * 1.15);
    if (b.loc.bedrooms) q.bedrooms = b.loc.bedrooms;
    if (b.loc.keyword || b.loc.street) q.keyword = b.loc.keyword || b.loc.street;
  }
  return q;
}

/** Cộng dồn ngữ cảnh tìm kiếm xuyên suốt các lượt chat của khách (nhớ "tìm gần chỗ nào" + "với tầm giá nào" qua nhiều lượt cho đến khi khách đổi sang khu/ý khác) */
function gopNguCanhHoiThoai(
  messages: ChatMsg[],
  tinDangXem: TinDangXem | null,
  dsCanDaGui: TinDangXem[] = [],
  dsDuAnVaNeo: DuAnToaDo[] = [],
): { gop: Parsed; daTim: DuAnToaDo | null } {
  const gop: Parsed = { mode: "search" };
  let daTim: DuAnToaDo | null = null;
  if (tinDangXem) {
    gop.deal = tinDangXem.deal === "ban" ? "ban" : "cho_thue";
  } else if (dsCanDaGui.length > 0) {
    gop.deal = dsCanDaGui[0].deal === "ban" ? "ban" : "cho_thue";
  }

  for (const m of messages) {
    if (m.role !== "user") continue;
    const daTrongLuot = dsDuAnVaNeo.length ? duAnTrongCau(dsDuAnVaNeo, m.text) : null;
    const b = bocTruyVanBDS(m.text);

    if (daTrongLuot) {
      daTim = daTrongLuot;
      if (daTrongLuot.district) {
        const dChuan = daTrongLuot.district.replace(/^(Thành phố|TP\.?|Quận|Huyện|Thị xã)\s+/i, "").trim();
        if (gop.district && gop.district !== dChuan) gop.keyword = null;
        gop.district = dChuan;
      }
      if (daTrongLuot.province) gop.province = daTrongLuot.province;
    }

    if (!b.coKetQua) continue;
    if (b.loc.deal) gop.deal = b.loc.deal;
    if (b.loc.kind) gop.kind = b.loc.kind;
    if (b.loc.province) gop.province = b.loc.province;
    if (b.loc.district) {
      if (gop.district && gop.district !== b.loc.district) {
        gop.keyword = null; // Đổi sang quận mới thì xoá tên đường của quận cũ
      }
      if (daTim && daTim.district && !daTrongLuot) {
        const qDa = chuanTen(daTim.district.replace(/^(thanh pho|tp|quan|huyen|thi xa)\s+/i, ""));
        const qMoi = chuanTen(b.loc.district.replace(/^(thanh pho|tp|quan|huyen|thi xa)\s+/i, ""));
        if (qDa && qMoi && !qDa.includes(qMoi) && !qMoi.includes(qDa)) {
          daTim = null; // Đổi sang quận khác thì bỏ mốc dự án/điểm neo cũ
        }
      }
      gop.district = b.loc.district;
    }
    if (b.loc.price_min !== undefined || b.loc.price_max !== undefined || b.loc.price_approx !== undefined) {
      gop.price_min = b.loc.price_min ?? null;
      gop.price_max = b.loc.price_max ?? (b.loc.price_approx ? Math.round(b.loc.price_approx * 1.15) : null);
    }
    if (b.loc.bedrooms) gop.bedrooms = b.loc.bedrooms;
    if (b.loc.keyword || b.loc.street) gop.keyword = b.loc.keyword || b.loc.street || null;
  }

  // Nếu các lượt trước đã gợi ý danh sách căn ở một quận cụ thể mà lượt này khách chỉ đổi giá ("dưới 5tr", "rẻ hơn")
  if (!gop.district && dsCanDaGui.length > 0 && dsCanDaGui[0].district) {
    gop.district = dsCanDaGui[0].district.replace(/^(Thành phố|TP\.?|Quận|Huyện|Thị xã)\s+/i, "").trim();
    gop.province ||= dsCanDaGui[0].province;
  }

  const lastText = messages.filter((m) => m.role === "user").pop()?.text || "";
  const refTin = tinDangXem || dsCanDaGui[0] || null;
  if (refTin && /(quanh đây|gần đây|khu này|cùng khu|giá mềm|rẻ hơn|rẻ nhất|thấp hơn)/i.test(lastText)) {
    gop.deal ||= refTin.deal === "ban" ? "ban" : "cho_thue";
    gop.kind ||= refTin.kind;
    gop.province ||= refTin.province;
    gop.district ||= refTin.district;
    if (/(giá mềm|rẻ hơn|rẻ nhất|thấp hơn)/i.test(lastText) && !bocTruyVanBDS(lastText).loc.price_max) {
      const basePrice = gop.price_max || refTin.price_vnd;
      if (basePrice) gop.price_max = Math.round(basePrice * 0.88);
    }
  }
  if (/(giá trung bình|khu nào rẻ|quận nào rẻ|đầu tư đâu|xu hướng thị trường|tỷ suất cho thuê)/i.test(lastText)) {
    gop.mode = "analyze";
  }
  return { gop, daTim };
}

// Thống kê thị trường theo quận từ data thật (giá/m² trung vị bán & thuê + tỷ suất cho thuê)
async function tinhMarketStats(province: string | null) {
  const supabase = createAnonClient();
  let q = supabase
    .from("listings")
    .select("district,province,deal,price_per_m2")
    .eq("status", "published").not("price_per_m2", "is", null).gt("price_per_m2", 0)
    .limit(2000);
  if (province && sach(province)) q = q.ilike("province", `%${sach(province)}%`);
  const { data } = await q;
  const byDistrict = new Map<string, { ban: number[]; thue: number[]; province: string }>();
  for (const r of data ?? []) {
    const d = (r.district || "").trim();
    if (!d) continue;
    const e = byDistrict.get(d) || { ban: [], thue: [], province: r.province || "" };
    (r.deal === "ban" ? e.ban : e.thue).push(Number(r.price_per_m2));
    byDistrict.set(d, e);
  }
  return [...byDistrict.entries()]
    .map(([district, e]) => {
      const banMed = median(e.ban), thueMed = median(e.thue);
      return {
        district, province: e.province,
        n: e.ban.length + e.thue.length,
        ban_ppm2: banMed, thue_ppm2: thueMed,
        // gross yield %/năm = (thuê/m²/tháng * 12) / (giá bán/m²)
        yield_pct: banMed && thueMed ? Math.round(((thueMed * 12) / banMed) * 1000) / 10 : null,
      };
    })
    .filter((x) => x.n >= 3)
    .sort((a, b) => b.n - a.n)
    .slice(0, 15);
}
// 2/11 (audit P5): trước mỗi câu "khu nào rẻ" đọc lại 2.000 dòng -> cache 30 phút theo tỉnh (tham số nằm trong khoá cache)
const marketStatsCache = unstable_cache(tinhMarketStats, ["chat-market-stats-v1"], { revalidate: 1800, tags: ["listings"] });
const marketStats = (province: string | null) => marketStatsCache(sach(province) || null);

export async function POST(req: NextRequest) {
  // chặn spam: 20 request/phút mỗi IP (endpoint công khai + tốn quota Gemini)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?";
  if (!(await rateLimitChung(`chat:${ip}`, 20, 60_000))) {
    return NextResponse.json({ reply: "Bạn thao tác hơi nhanh, chờ một phút rồi thử lại nhé." }, { status: 429 });
  }
  let body: { messages?: ChatMsg[]; dangXem?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ reply: "Yêu cầu không hợp lệ." }, { status: 400 });
  }
  // chỉ nhận mảng {role,text:string}; mỗi lượt cắt 1000 ký tự (trước: messages không phải mảng -> 500,
  // lịch sử không giới hạn độ dài -> đốt token Gemini)
  const messages: ChatMsg[] = (Array.isArray(body?.messages) ? body.messages : [])
    .filter((m) => !!m && typeof m === "object" && typeof m.text === "string")
    .map((m): ChatMsg => ({
      role: m.role === "user" ? "user" : "bot",
      text: m.text.slice(0, 1000),
      ...(Array.isArray(m.listingIds)
        ? { listingIds: m.listingIds.filter((id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)).slice(0, 5) }
        : {}),
    }))
    .slice(-10);
  const last = messages.filter((m) => m.role === "user").pop()?.text?.slice(0, 1000);
  if (!last) return NextResponse.json({ reply: "Bạn muốn tìm nhà đất như thế nào ạ?" });

  // Thu thập lead tự động khi khách chủ động để lại SĐT trong chat
  const phoneMatch = last.match(SDT_TRONG_CAU);
  const sdt = phoneMatch ? "0" + phoneMatch[1].replace(/\D/g, "") : null;
  let daLuuLead = false;
  if (sdt) {
    const lid = typeof body.dangXem === "string" && /^[0-9a-f-]{36}$/i.test(body.dangXem) ? body.dangXem : null;
    const leadRow = {
      listing_id: lid,
      name: "Khách chat Web AI",
      phone: sdt,
      message: `[AI Chat] "${last}"`,
    };
    try {
      const { error: errLead } = await createAdminClient().from("leads").insert(leadRow);
      if (!errLead) {
        daLuuLead = true;
        after(() => baoLeadMoi({ listing_id: lid, name: leadRow.name, phone: sdt, message: leadRow.message }));
        after(() => ghiSuKien({ loai: "dat_lich", listingId: lid }));
      }
    } catch (err) {
      console.error("Loi luu lead tu chat:", err);
    }
  }

  const traLoi = (o: Record<string, unknown>, init?: ResponseInit) =>
    NextResponse.json(daLuuLead ? { ...o, daLuuLead: true } : o, init);

  if (!(await rateLimitChung(`gemini:ngay:${ngayVN()}`, TRAN_GEMINI_NGAY, 86_400_000))) {
    return traLoi({
      reply: `Trợ lý AI đang quá tải hôm nay, anh/chị nhắn Zalo hoặc gọi ${HOTLINE} để nhân viên Radar tìm phòng giúp mình ngay nhé.`,
      listings: [],
    }, { status: 429 });
  }

  // 1. Nhớ danh sách căn vừa gửi ở các lượt trước (dsCanDaGui) để khách hỏi tiếp ("căn đầu", "căn số 2", "căn đó điện nước sao") vẫn trả lời được từ DB
  const lastBotWithListings = [...messages].reverse().find((m) => m.role === "bot" && m.listingIds && m.listingIds.length > 0);
  let dsCanDaGui: TinDangXem[] = [];
  if (lastBotWithListings?.listingIds?.length) {
    const { data: rowsDaGui } = await createAnonClient()
      .from("listings")
      .select("id,title,price_vnd,deal,area_m2,bedrooms,district,province,ward,kind,address,source,source_site,specs,amenities,lat,lng")
      .in("id", lastBotWithListings.listingIds);
    if (rowsDaGui?.length) {
      const mapById = new Map(rowsDaGui.map((r) => [r.id as string, r as TinDangXem]));
      dsCanDaGui = lastBotWithListings.listingIds.map((id) => mapById.get(id)).filter((x): x is TinDangXem => !!x);
    }
  }

  // 2. Nạp dữ liệu căn khách đang xem từ DB (từ trang /listings/[id], link dán trong chat, hoặc mã RHxxxxxx)
  let dangXem = "";
  let tinDangXemData: TinDangXem | null = null;
  const linkListingMatch = last.match(/\/listings\/([0-9a-f-]{36})/i);
  const idDangXem = linkListingMatch ? linkListingMatch[1] : (typeof body.dangXem === "string" && /^[0-9a-f-]{36}$/i.test(body.dangXem) ? body.dangXem : null);

  if (idDangXem) {
    const { data } = await createAnonClient().from("listings")
      .select("id,title,price_vnd,deal,area_m2,bedrooms,district,province,ward,kind,address,source,source_site,specs,amenities,lat,lng").eq("id", idDangXem).eq("status", "published").maybeSingle();
    if (data) tinDangXemData = data as TinDangXem;
  }

  const rhMatch = last.match(/\b(RH[0-9a-fA-F]{6})\b/i) || last.match(/(?:mã|căn|phòng)\s*:?\s*([0-9a-fA-F]{6})\b/i);
  if (rhMatch && (!tinDangXemData || maPhong(tinDangXemData.id) !== (rhMatch[1].toUpperCase().startsWith("RH") ? rhMatch[1].toUpperCase() : `RH${rhMatch[1].toUpperCase()}`))) {
    const rawMa = rhMatch[1].toUpperCase();
    const maChuan = rawMa.startsWith("RH") ? rawMa : `RH${rawMa}`;
    const khoang = khoangIdTuMa(maChuan);
    if (khoang) {
      const { data: listingRh } = await createAnonClient()
        .from("listings")
        .select("id,title,price_vnd,deal,area_m2,bedrooms,district,province,ward,kind,address,source,source_site,specs,amenities,lat,lng")
        .gte("id", khoang[0])
        .lte("id", khoang[1])
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (listingRh) tinDangXemData = listingRh as TinDangXem;
    }
  }

  // 3. Nạp toạ độ dự án & điểm neo chiến lược + cộng dồn ngữ cảnh xuyên suốt các lượt chat ("gần chỗ nào" + "tầm giá nào")
  const dsDuAn = await layDuAnToaDo().catch(() => []);
  const dsDuAnVaNeo = [...dsDuAn, ...DIEM_NEO_TOA_DO];
  const { gop: nguCanhGop, daTim: daTimGop } = gopNguCanhHoiThoai(messages, tinDangXemData, dsCanDaGui, dsDuAnVaNeo);
  let daTim = daTimGop;

  if (tinDangXemData) {
    const rh = laRoHang(tinDangXemData);
    dangXem = `NGƯỜI DÙNG ĐANG XEM CĂN: "${cheSoVanBan(tinDangXemData.title)}" (Mã ${maPhong(tinDangXemData.id)}) - ${fmtPrice(tinDangXemData.price_vnd, tinDangXemData.deal)}${tinDangXemData.area_m2 ? `, ${tinDangXemData.area_m2}m²` : ""}, vị trí: ${cheSoVanBan([tinDangXemData.address, tinDangXemData.ward, tinDangXemData.district, tinDangXemData.province].filter(Boolean).join(", "))}${rh ? `, thuộc rổ hàng Radar đang trống` : ""}, chi tiết/bảng phí trong DB: ${JSON.stringify(tinDangXemData.specs || {})}, tiện ích: ${JSON.stringify(tinDangXemData.amenities || [])}.`;
    if (daTim && tinDangXemData.lat && tinDangXemData.lng && daTim.lat && daTim.lng) {
      const kmDa = khoangCachKm(daTim, { lat: Number(tinDangXemData.lat), lng: Number(tinDangXemData.lng) });
      dangXem += ` Khoảng cách thực tế từ căn đang xem tới ${daTim.name} (${[daTim.district, daTim.province].filter(Boolean).join(", ")}) là khoảng ${kmDa < 1 ? Math.round(kmDa * 1000) + " m" : kmDa.toFixed(1) + " km"}.`;
    }
  }
  if (dsCanDaGui.length > 0) {
    const tómTắtĐãGửi = dsCanDaGui.map((c, idx) =>
      `Căn số ${idx + 1} (${maPhong(c.id)}): "${cheSoVanBan(c.title)}" - ${fmtPrice(c.price_vnd, c.deal)}${c.area_m2 ? `, ${c.area_m2}m²` : ""}, vị trí: ${cheSoVanBan([c.address, c.ward, c.district, c.province].filter(Boolean).join(", "))}, phí/specs: ${JSON.stringify(c.specs || {})}, tiện ích: ${JSON.stringify(c.amenities || [])}`
    ).join("\n");
    dangXem += (dangXem ? "\n" : "") + `CÁC CĂN VỪA GỢI Ý Ở LƯỢT TRƯỚC:\n${tómTắtĐãGửi}`;
  }
  const tieuChiTichLuy = [
    daTim ? `gần ${daTim.name}` : null,
    nguCanhGop.keyword ? `đường/khu ${nguCanhGop.keyword}` : null,
    nguCanhGop.district ? `quận/TP ${nguCanhGop.district}` : null,
    nguCanhGop.province ? `tỉnh ${nguCanhGop.province}` : null,
    nguCanhGop.deal ? (nguCanhGop.deal === "ban" ? "mua bán" : "thuê") : null,
    nguCanhGop.kind ? `loại ${nguCanhGop.kind}` : null,
    nguCanhGop.price_min ? `từ ${fmtPrice(nguCanhGop.price_min, nguCanhGop.deal || "cho_thue")}` : null,
    nguCanhGop.price_max ? `tối đa ${fmtPrice(nguCanhGop.price_max, nguCanhGop.deal || "cho_thue")}` : null,
  ].filter(Boolean).join(" · ");
  if (tieuChiTichLuy) {
    dangXem += (dangXem ? "\n" : "") + `TIÊU CHÍ ĐANG LỌC TÍCH LŨY QUA CÁC LƯỢT: ${tieuChiTichLuy}`;
  }
  if (daLuuLead && sdt) {
    dangXem += (dangXem ? "\n" : "") + `HỆ THỐNG ĐÃ LƯU SỐ ĐIỆN THOẠI CỦA KHÁCH: ${sdt} (cảm ơn khách tự nhiên, báo chuyên viên Radar sẽ liên hệ qua Zalo/SĐT ${sdt} sớm nhất).`;
  }

  // ===== BƯỚC 1: AI ĐỌC Ý KHÁCH & BÓC TÁCH NGỮ CẢNH TOÀN CUỘC TRÒ CHUYỆN =====
  const convo = (dangXem ? dangXem + "\n\n" : "") + messages.map((m) => `${m.role === "user" ? "Khách" : "Trợ lý"}: ${m.text}`).join("\n");

  let parsed: Parsed | null = null;
  const raw = await gemini(`${PARSE_PROMPT}\n\n--- HỘI THOẠI ---\n${convo}`);
  if (raw) { try { parsed = JSON.parse(raw) as Parsed; } catch { /* fallback */ } }
  parsed ??= { ...nguCanhGop };

  // Nếu AI chỉ định khách đang hỏi căn thứ mấy trong dsCanDaGui (1..5)
  if (parsed.target_listing_index && dsCanDaGui[parsed.target_listing_index - 1]) {
    tinDangXemData = dsCanDaGui[parsed.target_listing_index - 1];
  }

  // Bổ sung dự phòng từ ngữ cảnh đã cộng dồn nếu AI bỏ trống trường lọc
  if (nguCanhGop.deal && !parsed.deal) parsed.deal = nguCanhGop.deal;
  if (nguCanhGop.kind && !parsed.kind) parsed.kind = nguCanhGop.kind;
  if (nguCanhGop.district && !parsed.district) parsed.district = nguCanhGop.district;
  if (nguCanhGop.province && !parsed.province) parsed.province = nguCanhGop.province;
  if (nguCanhGop.price_max && !parsed.price_max) parsed.price_max = nguCanhGop.price_max;
  if (nguCanhGop.price_min && !parsed.price_min) parsed.price_min = nguCanhGop.price_min;
  if (nguCanhGop.bedrooms && !parsed.bedrooms) parsed.bedrooms = nguCanhGop.bedrooms;
  if (nguCanhGop.keyword && !parsed.keyword) parsed.keyword = nguCanhGop.keyword;

  // Nếu AI nhận diện tên dự án/điểm neo mới trong parsed.project_name
  if (parsed.project_name && dsDuAnVaNeo.length) {
    const daTuAI = duAnTrongCau(dsDuAnVaNeo, parsed.project_name);
    if (daTuAI) daTim = daTuAI;
  }

  // ===== BƯỚC 2A: KHI MODE = "chat" (Trả lời chi tiết căn đang xem / căn vừa gửi / chào hỏi / đã lưu SĐT) =====
  if (parsed.mode === "chat" && parsed.small_talk_reply) {
    after(() => ghiSuKien({ loai: "chat", listingId: tinDangXemData?.id ?? null, noiDung: last, ketQua: 1 }));
    return traLoi({
      reply: parsed.small_talk_reply,
      suggestions: Array.isArray(parsed.suggestions) && parsed.suggestions.length
        ? parsed.suggestions.slice(0, 3)
        : ["Gợi ý căn tương tự", "Xem căn giá mềm hơn", "Đặt lịch hẹn xem nhà"],
      listings: [],
    });
  }

  // ===== BƯỚC 2B: KHI MODE = "project_info" (Hỏi thông tin dự án mà chưa lọc theo giá) =====
  if (parsed.mode === "project_info" && daTim && !daTim.id.startsWith("neo:") && !parsed.price_max && !parsed.price_min) {
    const { data: p } = await createAnonClient().from("projects")
      .select("name,investor,address,district,province,price_min,price_max,handover,amenities,specs").eq("id", daTim.id).maybeSingle();
    if (p) {
      const duLieuDuAn = JSON.stringify({
        ten_du_an: p.name,
        chu_dau_tu: p.investor,
        vi_tri: p.address || [p.district, p.province].filter(Boolean).join(", "),
        gia_tham_khao: p.price_min ? `${fmtPrice(p.price_min, "ban")}${p.price_max ? ` - ${fmtPrice(p.price_max, "ban")}` : ""}` : "chưa có số liệu công khai",
        ban_giao: p.handover,
        phap_ly: (p.specs as Record<string, string> | null)?.["Pháp lý"],
        tien_ich: ((p.amenities as string[] | null) || []).slice(0, 6),
      });
      const aiReply = await gemini(
        `${KHOI_NHAN_VAT_VA_GIONG_AOND}\n\n--- HỘI THOẠI ---\n${convo}\n\n--- DỮ LIỆU DỰ ÁN TRONG DB ---\n${duLieuDuAn}\n\nHãy viết lời trả lời tự nhiên cho câu hỏi mới nhất của khách dựa trên dữ liệu dự án ở trên (không bịa số liệu), rồi hỏi nhẹ xem khách đang tìm mua hay thuê căn ở khu vực này tầm giá bao nhiêu để em lọc căn đang mở cho khách xem.`,
        { json: false },
      );
      after(() => ghiSuKien({ loai: "chat", listingId: null, noiDung: last, ketQua: 1 }));
      return traLoi({
        reply: aiReply || `${p.name}${p.investor ? ` (Chủ đầu tư: ${p.investor})` : ""} nằm tại ${p.address || [p.district, p.province].filter(Boolean).join(", ")}. Bạn đang tìm mua hay thuê căn quanh dự án này tầm giá bao nhiêu để mình lọc căn cho bạn xem nha?`,
        link: { href: `/projects/${daTim.id}`, label: `Xem trang dự án ${p.name}` },
        suggestions: [`Phòng trọ gần ${p.name}`, `Căn dưới 7 triệu gần ${p.name}`, "Đặt lịch tư vấn"],
        listings: [],
      });
    }
  }

  // ===== BƯỚC 2C: KHI MODE = "analyze" (Phân tích thống kê thị trường từ DB thật) =====
  if (parsed.mode === "analyze") {
    const stats = await marketStats(parsed.province || null);
    if (!stats.length) {
      return traLoi({ reply: "Chưa đủ dữ liệu thống kê cho khu vực này. Bạn thử hỏi về Hồ Chí Minh, Bình Dương, Hà Nội hoặc Đà Nẵng nhé.", listings: [] });
    }
    const fm = (v: number | null) => (v ? (v >= 1e6 ? (v / 1e6).toFixed(1) + "tr" : Math.round(v / 1e3) + "k") : "-");
    const table = stats
      .map((s) => `${s.district} (${s.province}): bán ${fm(s.ban_ppm2)}/m² · thuê ${fm(s.thue_ppm2)}/m²/th · yield ${s.yield_pct ?? "-"}%/năm · ${s.n} tin`)
      .join("\n");
    const reply = await gemini(
      `${KHOI_NHAN_VAT_VA_GIONG_AOND}\n\n--- HỘI THOẠI ---\n${convo}\n\n--- SỐ LIỆU THỊ TRƯỜNG THẬT TỪ DB ---\n${table}\n\nTrả lời tiếng Việt 3-4 câu tự nhiên, TRÍCH SỐ LIỆU CỤ THỂ ở trên (không bịa số khác), nêu 2-3 khu vực đáng chú ý phù hợp câu hỏi của khách, rồi hỏi mở xem khách đang nhắm tìm căn ở quận nào để em lọc căn thực tế cho xem.`,
      { json: false },
    );
    return traLoi({
      reply: reply || "Số liệu hiện có:\n" + table,
      listings: [],
    });
  }

  // ===== BƯỚC 2D: KHI MODE = "similar" HOẶC "search" (Truy vấn DB tìm căn khớp ngữ cảnh) =====
  type TinChat = { id: string; title: string; price_vnd: number | null; area_m2: number | null; bedrooms: number | null; district: string | null; province: string | null; ward?: string | null; address?: string | null; deal: string; kind: string; images: string[] | null; source: string | null; specs?: Record<string, string> | null; km?: number; lyDoGoiY?: string };
  let found: TinChat[] = [];
  let ghiChuNoi: string | null = null;
  let linkBanDo: { href: string; label: string } | null = null;
  const supabase = createAnonClient();

  // Nhánh 1: Tìm căn tương tự căn đang xem
  if (parsed.mode === "similar" && tinDangXemData) {
    const tuongTu = await layTinTuongTu(tinDangXemData, 4);
    found = tuongTu as unknown as TinChat[];
  }

  // Nhánh 2: Nếu khách tìm quanh một dự án có toạ độ (daTim) và chưa đổi sang quận khác
  const quanDuAn = daTim?.district ? chuanTen(daTim.district.replace(/^(thanh pho|tp|quan|huyen|thi xa)\s+/i, "")) : "";
  const quanParsed = parsed.district ? chuanTen(parsed.district.replace(/^(thanh pho|tp|quan|huyen|thi xa)\s+/i, "")) : "";
  const cungKhuDuAn = Boolean(daTim && (!quanParsed || !quanDuAn || quanDuAn.includes(quanParsed) || quanParsed.includes(quanDuAn)));

  if (!found.length && daTim && cungKhuDuAn) {
    const deal = parsed.deal || (parsed.price_max && parsed.price_max < 100_000_000 ? "cho_thue" : null);
    const timQuanhDuAn = async (km: number, boLoai = false) => {
      const dLat = km / 111.32, dLng = km / (111.32 * Math.cos((daTim!.lat * Math.PI) / 180));
      let q = supabase.from("listings")
        .select("id,title,price_vnd,area_m2,bedrooms,district,province,ward,address,deal,kind,source,specs,lat,lng")
        .eq("status", "published")
        .gte("lat", daTim!.lat - dLat).lte("lat", daTim!.lat + dLat).gte("lng", daTim!.lng - dLng).lte("lng", daTim!.lng + dLng);
      if (deal) q = q.eq("deal", deal);
      if (!boLoai && parsed.kind && PROP[parsed.kind]) q = q.eq("kind", parsed.kind);
      if (parsed.price_max) q = q.lte("price_vnd", parsed.price_max);
      if (parsed.price_min) q = q.gte("price_vnd", parsed.price_min);
      if (parsed.bedrooms) q = q.gte("bedrooms", parsed.bedrooms);
      let { data, error } = await q.limit(600);
      if (error) ({ data, error } = await q.limit(600));
      return (data ?? [])
        .map((x) => ({ ...x, images: null as string[] | null, km: khoangCachKm(daTim!, { lat: Number(x.lat), lng: Number(x.lng) }) }))
        .filter((x) => x.km <= km).sort((a, b) => a.km - b.km);
    };
    let km = 2, gan = await timQuanhDuAn(km);
    if (gan.length < 3) { km = 3; gan = await timQuanhDuAn(km); }
    if (gan.length === 0 && parsed.kind) { gan = await timQuanhDuAn(3, true); }
    if (gan.length > 0) {
      const top5 = gan.slice(0, 5);
      const { data: dsAnh } = await supabase.from("listings").select("id,images").in("id", top5.map((x) => x.id));
      const anhMap = new Map<string, string[] | null>();
      for (const r of dsAnh ?? []) anhMap.set(r.id as string, (r.images as string[] | null) ?? null);
      found = top5.map((x) => ({ ...x, images: anhMap.get(x.id) || null }));
      const href = `/search?${new URLSearchParams({ ...(deal ? { deal } : {}), ...(parsed.price_max ? { priceMax: String(parsed.price_max) } : {}), gan: `${daTim.lat.toFixed(6)},${daTim.lng.toFixed(6)}`, bk: String(km), gan_ten: daTim.name })}`;
      linkBanDo = { href, label: `Xem cả ${gan.length} căn quanh ${daTim.name} trên bản đồ` };
    } else {
      if (daTim.district && !parsed.district) parsed.district = daTim.district.replace(/^(Thành phố|TP\.?|Quận|Huyện|Thị xã)\s+/i, "").trim();
      if (daTim.province && !parsed.province) parsed.province = daTim.province;
    }
  }

  // Nhánh 3: Tìm theo bộ lọc khu vực / từ khoá / mức giá trong DB (nới dần qua cacMucNoi)
  if (!found.length) {
    const taoQ = (b: BoLoc) => {
      let q = supabase
        .from("listings")
        .select("id,title,price_vnd,area_m2,bedrooms,district,province,ward,address,deal,kind,images,source,specs")
        .eq("status", "published");
      if (b.deal) q = q.eq("deal", b.deal);
      if (b.kind && PROP[b.kind]) q = q.eq("kind", b.kind);
      if (b.province && sach(b.province)) q = q.ilike("province", `%${sach(b.province)}%`);
      if (b.district && sach(b.district)) {
        const d = sach(b.district);
        q = LA_QUAN_SO.test(d) ? q.eq("district", d) : q.ilike("district", `%${d}%`);
      }
      if (b.price_min) q = q.gte("price_vnd", b.price_min);
      if (b.price_max) q = q.lte("price_vnd", b.price_max);
      if (b.bedrooms) q = q.gte("bedrooms", b.bedrooms);
      if (b.keyword) q = q.or(`title.ilike.%${b.keyword}%,address.ilike.%${b.keyword}%,ward.ilike.%${b.keyword}%,district.ilike.%${b.keyword}%`);
      return q;
    };
    for (const { loc, ghiChu } of cacMucNoi({ ...parsed, keyword: lamSachTuKhoa(parsed.keyword) || null })) {
      const [{ data: rh }, { data }] = await Promise.all([
        taoQ(loc).eq("source", "ro_hang").order("first_seen_at", { ascending: false }).limit(10),
        taoQ(loc).neq("source", "ro_hang").order("ai_score", { ascending: false, nullsFirst: false }).limit(10),
      ]);

      // Khử trùng lặp theo tòa nhà / địa chỉ để tránh lặp nhiều phòng cùng 1 tòa (vd: 3 phòng cùng ở Lê Tuấn Mậu)
      const locTrungToa = (ds: TinChat[]) => {
        const seen = new Set<string>();
        const out: TinChat[] = [];
        for (const c of ds) {
          const diaChi = [c.address, c.ward, c.district].filter(Boolean).join(" ").toLowerCase().replace(/\s+/g, " ");
          const tieuDe = (c.title || "").toLowerCase().replace(/^(studio|gác lửng|duplex|1 phòng ngủ|2 phòng ngủ|\d+m²|\d+\s*m2)\s*[-–—]?\s*/gi, "").trim();
          const k = diaChi.length > 5 ? diaChi : tieuDe;
          if (k && seen.has(k)) continue;
          if (k) seen.add(k);
          out.push(c);
        }
        return out;
      };

      // Sắp xếp ưu tiên: nếu khách tìm mức giá tối đa (price_max), ưu tiên căn diện tích lớn và giá sát ngân sách
      const sapXepUuTien = (ds: TinChat[]) => {
        if (!loc.price_max) return ds;
        return [...ds].sort((a, b) => {
          const dtA = a.area_m2 || 0, dtB = b.area_m2 || 0;
          if (Math.abs(dtA - dtB) >= 10) return dtB - dtA; // Ưu tiên căn rộng hơn
          const diffA = Math.abs((a.price_vnd || 0) - loc.price_max!);
          const diffB = Math.abs((b.price_vnd || 0) - loc.price_max!);
          return diffA - diffB;
        });
      };

      const roHangLoc = locTrungToa(sapXepUuTien((rh ?? []) as TinChat[]));
      const thuongLoc = locTrungToa(sapXepUuTien((data ?? []) as TinChat[]));
      found = tronRoHang(roHangLoc, thuongLoc, 3).slice(0, 5);
      if (found.length) { ghiChuNoi = ghiChu; break; }
    }
  }

  // Nhánh 4: Không có kết quả -> thử tìm NGỮ NGHĨA bằng pgvector
  if (!found.length) {
    try {
      const vec = await nhungCau(last);
      if (vec) {
        const { data: matches } = await supabase.rpc("match_listings", { query_embedding: vec, match_count: 5 });
        const ids = (matches ?? []).filter((m: { similarity: number }) => m.similarity > 0.5).map((m: { id: string }) => m.id);
        if (ids.length) {
          const { data: sem } = await supabase
            .from("listings").select("id,title,price_vnd,area_m2,bedrooms,district,province,ward,address,deal,kind,images,source,specs")
            .in("id", ids);
          found = (sem ?? []) as TinChat[];
          if (found.length) ghiChuNoi = "chưa có căn khớp đúng 100% tiêu chí, đây là các căn gần giống nhất trong kho";
        }
      }
    } catch { /* bỏ qua */ }
  }

  // ===== BƯỚC 3: AI VIẾT LỜI TƯ VẤN GỬI KHÁCH TỪ KẾT QUẢ DB THẬT (AOND mua_co_dinh + GIỌNG) =====
  const tomTatKetQuaDB = found.length
    ? found.map((x, i) => {
        const kc = x.km !== undefined ? `, cách ${daTim?.name || "dự án"} ${x.km < 1 ? Math.round(x.km * 1000) + "m" : x.km.toFixed(1) + "km"}` : "";
        return `Căn ${i + 1} (${maPhong(x.id)}): "${cheSoVanBan(x.title)}" - ${fmtPrice(x.price_vnd, x.deal)}${x.area_m2 ? `, ${x.area_m2}m²` : ""} tại ${cheSoVanBan([x.address, x.ward, x.district, x.province].filter(Boolean).join(", "))}${kc}${x.specs ? `, phí/specs: ${JSON.stringify(x.specs)}` : ""}`;
      }).join("\n")
    : "KHÔNG TÌM THẤY CĂN NÀO KHỚP TRONG KHO DB.";

  const promptVietLoi = `${KHOI_NHAN_VAT_VA_GIONG_AOND}

--- HỘI THOẠI ---
${convo}

--- KẾT QUẢ TÌM TRONG KHO DB LƯỢT NÀY ---
${ghiChuNoi ? `(Lưu ý độ khớp: ${ghiChuNoi})\n` : ""}${tomTatKetQuaDB}

=== NHIỆM VỤ BƯỚC 2: VIẾT LỜI GỬI KHÁCH ===
Dựa trên KẾT QUẢ TÌM TRONG KHO DB LƯỢT NÀY và ngữ cảnh hội thoại, hãy trả về DUY NHẤT 1 JSON:
{
  "reply": string, // Lời tư vấn tự nhiên, dễ thương (CHỈ 1-2 CÂU NGẮN GỌN): trả lời thẳng vào yêu cầu của khách bằng kết quả DB vừa tìm được (chỉ nhắc ngắn 1-2 căn kèm ưu điểm thực tế như vị trí/giá, không liệt kê lại vì thẻ phòng đã hiện bên dưới), cuối câu rủ khách ghé xem phòng hoặc hỏi 1 câu mở nhẹ nhàng. Tuyệt đối không dài dòng sến súa, không dùng văn mẫu AI.
  "suggestions": string[] // 3 gợi ý câu hỏi ngắn gọn tiếp theo hợp với kết quả vừa tìm được
}`;

  let reply: string | null = null;
  let suggestions: string[] = [];
  const rawViet = await gemini(promptVietLoi);
  if (rawViet) {
    try {
      const jViet = JSON.parse(rawViet) as { reply?: string; suggestions?: string[] };
      if (jViet.reply) reply = jViet.reply;
      if (Array.isArray(jViet.suggestions) && jViet.suggestions.length) {
        suggestions = jViet.suggestions.slice(0, 3);
      }
    } catch { /* fallback nếu lỗi parse */ }
  }

  if (!reply) {
    reply = found.length
      ? `Em vừa lọc được ${found.length} căn trong kho${ghiChuNoi ? ` (${ghiChuNoi})` : ""} ở bên dưới. Anh/chị xem thử ưng căn số mấy nhắn em kiểm tra chi tiết điện nước hoặc gửi video thực tế qua Zalo nhé!`
      : `Hiện trong kho chưa có căn trống khớp sát mức này. Anh/chị đang ưu tiên đi làm/đi học ở đoạn đường nào hoặc có thể nới nhẹ ngân sách lên khoảng bao nhiêu để em lọc lại liền nha?`;
  }
  if (!suggestions.length) {
    if (found.length) {
      suggestions = ["Chi phí điện nước căn số 1", "So sánh căn 1 và căn 2", "Xem căn giá mềm hơn"];
    } else {
      suggestions = ["Nới rộng mức giá", "Tìm khu vực lân cận", "Liên hệ Hotline hỗ trợ"];
    }
  }

  after(() => ghiSuKien({ loai: "chat", listingId: typeof body.dangXem === "string" ? body.dangXem : null, noiDung: last, ketQua: found.length }));
  return traLoi({
    reply,
    suggestions,
    ...(linkBanDo ? { link: linkBanDo } : {}),
    listings: found.map((x) => ({
      id: x.id,
      title: cheSoVanBan(x.title),
      price: fmtPrice(x.price_vnd, x.deal),
      meta: [
        x.km !== undefined ? `cách ${x.km < 1 ? Math.round(x.km * 1000) + " m" : x.km.toFixed(1) + " km"}` : x.lyDoGoiY || null,
        x.area_m2 ? `${x.area_m2}m²` : null,
        x.bedrooms ? `${x.bedrooms}PN` : null,
        [x.ward, x.district].filter(Boolean).join(", ") || [x.district, x.province].filter(Boolean).join(", "),
      ].filter(Boolean).join(" · "),
      image: cleanImages(x.images || [])[0] || null,
    })),
  });
}
