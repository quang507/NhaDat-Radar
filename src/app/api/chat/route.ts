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
import { layDuAnToaDo, duAnTrongCau, chuanTen, khoangCachKm } from "@/lib/du-an";
import { HOTLINE, HOTLINE_DISPLAY, HOTLINE_NAME } from "@/lib/hotline";

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

type ChatMsg = { role: "user" | "bot"; text: string };
type Parsed = {
  mode: "search" | "analyze" | "chat";
  deal?: "ban" | "cho_thue" | null;
  kind?: string | null;
  province?: string | null;
  district?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  bedrooms?: number | null;
  keyword?: string | null;
  small_talk_reply?: string | null;
};

const PARSE_PROMPT = `Bạn là TRỢ LÝ AI tư vấn tìm phòng & chốt lịch xem nhà của Radar Nhà Đất.
Nhiệm vụ: Tư vấn nhiệt tình, bắt đúng nhu cầu của khách tìm phòng, gửi 3-5 lựa chọn phù hợp nhất và chốt giờ dẫn đi xem trực tiếp miễn phí.
Hotline và Zalo tư vấn duy nhất của Radar: ${HOTLINE_DISPLAY} (${HOTLINE_NAME}).

[QUY TẮC PHẢN HỒI (GIỌNG TỰ NHIÊN, NHƯNG LUÔN LÀ AI)]:
0. Bạn là AI. KHÔNG BAO GIỜ tự nhận là người, nhân viên hay "bạn phụ trách". Nếu khách hỏi có phải người thật/bot không, trả lời rõ: "Dạ em là trợ lý AI của Radar" và đưa Hotline/Zalo duy nhất ${HOTLINE_DISPLAY} (${HOTLINE_NAME}) để gặp nhân viên trực tiếp.
1. KHÔNG chào hỏi vòng vo kiểu "Kính thưa quý khách", "Cảm ơn bạn đã liên hệ".
2. Vào thẳng vấn đề tự nhiên: Xưng "em - anh/chị" (hoặc "em - mình").
3. KỊCH BẢN CHỐT KHÁCH 3 BƯỚC:
   - Bước 1 (Lắng nghe & Khớp phòng): Tóm tắt lại nhu cầu (Quận, Giá, Có gác/Ban công, Nuôi thú cưng không). Khi khách hỏi theo mã phòng RHxxxxxx, tra cứu chính xác theo dữ liệu rổ hàng.
   - Bước 2 (Minh bạch chi phí): Luôn bóc tách đủ 5 khoản phí minh bạch (nói không với chi phí ẩn): 1. Tiền phòng (giá thuê), 2. Tiền điện, 3. Tiền nước, 4. Tiền gửi xe, 5. Tiền dịch vụ (phí quản lý/dịch vụ). Nhấn mạnh: "Radar dẫn xem miễn phí 100%, không thu bất kỳ phí cò nào".
   - Bước 3 (Chốt giờ xem): Mục tiêu là giải đáp nhanh và chốt lịch hẹn dẫn khách xem phòng thực tế miễn phí: "Tối nay tầm 18h30 hoặc chiều mai anh/chị tiện giờ nào hơn để em báo bạn phụ trách mở cửa sẵn đón mình qua xem thực tế ạ?"
4. MỜI ĐỂ LẠI SỐ ĐIỆN THOẠI/ZALO: Mời để lại SĐT hoặc nhắn Zalo ${HOTLINE_DISPLAY} (${HOTLINE_NAME}) để nhân viên Radar gửi vị trí Maps và video phòng thực tế.

Phân tích TIN NHẮN CUỐI của người dùng (kèm ngữ cảnh hội thoại) và trả về DUY NHẤT 1 JSON:
{
 "mode": "search"|"analyze"|"chat",
   // search: tìm tin cụ thể (mua/thuê nhà theo tiêu chí)
   // analyze: hỏi về THỊ TRƯỜNG - giá trung bình, khu nào rẻ/đắt, nên đầu tư đâu, so sánh khu vực, xu hướng
   // chat: chào hỏi, hỏi cách dùng web, khác
 "deal": "ban"|"cho_thue"|null,
 "kind": "nha"|"dat"|"can_ho"|"mat_bang"|"phong_tro"|null,
 "province": string|null,   // chuẩn hoá: "Hồ Chí Minh", "Hà Nội", "Đà Nẵng"... Mặc định ưu tiên Hồ Chí Minh nếu người dùng nhắc các quận như Tân Phú, Bình Tân, Quận 12, Gò Vấp, Tân Bình...
 "district": string|null,
 "price_min": number|null,  // VND: "2 tỷ"=2000000000, "5tr/tháng"=5000000
 "price_max": number|null,
 "bedrooms": number|null,
 "keyword": string|null,   // tên đường / dự án / địa danh nhỏ hơn quận. VIẾT CÓ DẤU CHUẨN kể cả khi người dùng gõ không dấu ("pham huu lau" -> "Phạm Hữu Lầu"); KHÔNG kèm chữ "đường", "phố", "hẻm", "gần"
 "small_talk_reply": string|null  // CHỈ khi mode=chat: trả lời tự nhiên, ngắn gọn, xưng em - anh/chị (vẫn là trợ lý AI, không tự nhận là người). Nếu khách hỏi phòng đang xem/mã phòng thì giải đáp thông tin bóc tách đủ 5 khoản phí minh bạch, nhấn mạnh "Radar dẫn xem miễn phí 100%, không thu bất kỳ phí cò nào", chốt xem tối nay 18h30 hoặc chiều mai, và xin Zalo/SĐT để gửi vị trí Maps cùng video phòng thực tế (Hotline/Zalo: ${HOTLINE_DISPLAY} - ${HOTLINE_NAME}).
}
Không bịa. Giá quy về VND.
Nếu có dòng "NGƯỜI DÙNG ĐANG XEM TIN" hoặc "NGƯỜI DÙNG ĐANG HỎI MÃ PHÒNG" và câu hỏi nói về chính tin đó ("phòng này", "căn này", "còn không", "giá bao nhiêu", "ở đâu", "phí sao") -> mode "chat", small_talk_reply trả lời đúng thông tin tin đó, bóc tách đủ 5 khoản phí minh bạch (tiền phòng, điện, nước, gửi xe, dịch vụ), nhấn mạnh dẫn xem miễn phí 100% không thu phí cò, chốt xem tối nay 18h30 hoặc chiều mai, và mời để lại Zalo/SĐT hoặc nhắn Zalo ${HOTLINE_DISPLAY} (${HOTLINE_NAME}) để gửi Maps và video phòng thực tế.`;

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
};

/** 11/11 (UX 3.4): Trả lời tức thì (<0.3s, không tốn lượt Gemini) khi khách đang xem 1 tin và hỏi trực tiếp về chính tin đó */
function traLoiNhanhTinDangXem(t: TinDangXem, cauHoi: string): { reply: string; suggestions: string[] } | null {
  if (/(tìm|kiếm|căn khác|phòng khác|tương tự|giá mềm|rẻ hơn|rẻ nhất|quận \d|bình thạnh|tân bình|gò vấp|quận 7|thủ đức)/i.test(cauHoi)) {
    return null;
  }
  const hoiTinNay = /(còn (trống|không|k|ko)|phòng này|căn này|tiền phòng|chi phí|điện|nước|gửi xe|xe|dịch vụ|quản lý|phí|bao nhiêu|giá|cọc|hợp đồng|thú cưng|nuôi|giờ|tư vấn|hẹn xem|xem (nhà|phòng)|ở đâu|địa chỉ|diện tích|nội thất|tiện ích|có gì)/i.test(cauHoi);
  if (!hoiTinNay) return null;

  const rh = laRoHang(t);
  const mp = maPhong(t.id);
  const specs = t.specs || {};
  const laySpec = (re: RegExp) => {
    const hit = Object.entries(specs).find(([k, v]) => re.test(k) && v && String(v).trim() !== "-");
    return hit ? String(hit[1]).trim() : null;
  };
  const gia = fmtPrice(t.price_vnd, t.deal);
  const addrBase = String(t.address || "");
  const addrLow = addrBase.toLowerCase();
  const khuVuc = cheSoVanBan([
    addrBase,
    t.ward && !addrLow.includes(t.ward.toLowerCase()) ? t.ward : null,
    t.district && !addrLow.includes(t.district.toLowerCase()) ? t.district : null,
    t.province && !addrLow.includes(t.province.toLowerCase()) ? t.province : null,
  ].filter(Boolean).join(", "));
  const dong: string[] = [
    rh
      ? `Dạ tin "${cheSoVanBan(t.title)}" (Mã phòng ${mp}) đang được đơn vị quản lý xác nhận còn trống ạ.`
      : `Dạ em gửi nhanh thông tin tin "${cheSoVanBan(t.title)}" anh/chị đang xem:`,
    `• Giá & diện tích: ${gia}${t.area_m2 ? ` · ${t.area_m2} m²` : ""}`,
    khuVuc ? `• Vị trí: ${khuVuc}` : "",
  ].filter(Boolean);

  if (t.deal === "cho_thue") {
    const dien = laySpec(/^(tiền )?điện/i);
    const nuoc = laySpec(/^(tiền )?nước/i);
    const xe = laySpec(/(gửi|giữ|để) xe/i);
    const dv = laySpec(/dịch vụ|quản lý|phí chung/i);
    const coc = laySpec(/cọc/i);
    const gio = laySpec(/giờ giấc/i);
    const coPhiPhu = !!(dien || nuoc || xe || dv);
    if (coPhiPhu) {
      dong.push(
        "📌 Chi phí hàng tháng:",
        `1. Tiền phòng: ${gia}`,
        `2. Điện: ${dien || "chưa ghi (nhắn Zalo để Radar hỏi tòa nhà)"}`,
        `3. Nước: ${nuoc || "chưa ghi"}`,
        `4. Gửi xe: ${xe || "chưa ghi"}`,
        `5. Dịch vụ/Quản lý: ${dv || "chưa ghi"}`,
      );
    } else if (rh) {
      dong.push(`📌 Chi phí điện, nước, gửi xe, dịch vụ chưa có bảng chi tiết trên tin này. Anh/chị nhắn Zalo ${HOTLINE_DISPLAY} để Radar hỏi tòa nhà báo trọn gói trước khi qua xem nhé.`);
    }
    if (coc || gio) {
      dong.push(`• Điều khoản: ${[coc ? `Cọc ${coc}` : "", gio ? `Giờ giấc: ${gio}` : ""].filter(Boolean).join(" · ")}`);
    }
  }

  dong.push(
    rh
      ? `Radar dẫn xem miễn phí 100%, không thu phí môi giới. Tối nay tầm 18h30 hoặc chiều mai anh/chị tiện qua xem thực tế lúc nào để em báo mở cửa ạ? Anh/chị nhắn Zalo ${HOTLINE_DISPLAY} kèm mã ${mp} hoặc để lại SĐT ngay tại đây nhé!`
      : `Anh/chị cần Radar kiểm tra tình trạng hoặc lọc thêm căn tương tự cứ để lại SĐT hoặc nhắn Zalo ${HOTLINE_DISPLAY} (${HOTLINE_NAME}) nhé.`,
  );

  return {
    reply: dong.join("\n"),
    suggestions: ["Gợi ý căn tương tự", "Xem căn giá mềm hơn", "Liên hệ Hotline hỗ trợ"],
  };
}

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
  if (/(giá trung bình|khu nào|quận nào|đầu tư|xu hướng|thị trường|so sánh|rẻ nhất|đắt nhất)/.test(t)) q.mode = "analyze";
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
    .map((m): ChatMsg => ({ role: m.role === "user" ? "user" : "bot", text: m.text.slice(0, 1000) }))
    .slice(-8);
  const last = messages.filter((m) => m.role === "user").pop()?.text?.slice(0, 1000);
  if (!last) return NextResponse.json({ reply: "Bạn muốn tìm nhà đất như thế nào ạ?" });

  // Thu thập lead tự động khi khách để lại SĐT trong chat
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
      // 2/11 (audit S3): leads không còn cho anon insert qua REST (038) -> ghi bằng service role sau khi đã kiểm SĐT
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

  // 2/11: báo widget đã lưu lead (daLuuLead) ở MỌI câu trả lời sau bước này -> widget thôi mời để lại SĐT
  const traLoi = (o: Record<string, unknown>, init?: ResponseInit) =>
    NextResponse.json(daLuuLead ? { ...o, daLuuLead: true } : o, init);

  // Nếu khách CHỈ để lại SĐT hoặc câu quá ngắn chỉ để liên hệ
  if (daLuuLead && last.length < 50 && !/(tìm|mua|thuê|cần|quận|giá|tỷ|triệu|bán)/i.test(last)) {
    return traLoi({
      reply: `Dạ em đã ghi nhận số điện thoại ${sdt} của anh/chị rồi ạ! Chuyên viên NhaDat Radar sẽ liên hệ qua Điện thoại/Zalo để tư vấn và hỗ trợ xem nhà sớm nhất nhé 🏠\n\n📞 Cần hỗ trợ gấp: ${HOTLINE} (Hotline/Zalo)`,
      listings: [],
    });
  }

  // Quy tắc bán hàng (28/9): KHÔNG nhận bớt giá / không nói thời hạn hợp đồng qua tin nhắn -> mời qua xem
  // phòng rồi thương lượng trực tiếp. Chặn trước Gemini để câu chốt luôn đúng kịch bản.
  if (/(bớt|giảm giá|bot gia|thương lượng|fix giá|hợp đồng|hop dong|mấy tháng|bao nhiêu tháng|tối thiểu.*tháng)/i.test(last)) {
    return traLoi({
      reply: `${cauChotXemPhong("như trên tin")}
📞 Hotline/Zalo: ${HOTLINE}`,
      listings: [],
    });
  }

  // 2/11 (audit S6): từ đây có thể gọi Gemini (nhúng câu, phân tích, trả lời) -> trần chung toàn hệ thống mỗi ngày
  if (!(await rateLimitChung(`gemini:ngay:${ngayVN()}`, TRAN_GEMINI_NGAY, 86_400_000))) {
    return traLoi({
      reply: `Trợ lý AI đang quá tải hôm nay, anh/chị nhắn Zalo hoặc gọi ${HOTLINE} để nhân viên Radar tìm phòng giúp mình ngay nhé.`,
      listings: [],
    }, { status: 429 });
  }

  // Tin khách đang xem (widget gửi kèm khi ở trang /listings/[id]) -> ngữ cảnh cho câu "phòng này còn không"
  let dangXem = "";
  let tinDangXemData: TinDangXem | null = null;
  if (typeof body.dangXem === "string" && /^[0-9a-f-]{36}$/i.test(body.dangXem)) {
    const { data } = await createAnonClient().from("listings")
      .select("id,title,price_vnd,deal,area_m2,bedrooms,district,province,ward,kind,address,source,source_site,specs,amenities").eq("id", body.dangXem).eq("status", "published").maybeSingle();
    if (data) {
      tinDangXemData = data as TinDangXem;
      const rh = laRoHang(data);
      // địa chỉ công khai (rổ hàng/độc quyền đã che số nhà) - không bao giờ đưa địa chỉ thật cho AI
      dangXem = `NGƯỜI DÙNG ĐANG XEM TIN: "${cheSoVanBan(data.title)}" - ${fmtPrice(data.price_vnd, data.deal)}${data.area_m2 ? `, ${data.area_m2}m²` : ""}, ${cheSoVanBan([data.address, data.district, data.province].filter(Boolean).join(", "))}${rh ? `. Đây là phòng trống rổ hàng Radar, mã phòng ${maPhong(data.id)}, bảng phí: ${JSON.stringify(data.specs || {})}, hotline/Zalo duy nhất ${HOTLINE_DISPLAY} (${HOTLINE_NAME})` : ""}.`;
    }
  }

  // Tra cứu theo mã phòng RHxxxxxx (docs/QUY-TRINH-PHAN-PHOI-MARKETING.md)
  const rhMatch = last.match(/\b(RH[0-9a-fA-F]{6})\b/i) || last.match(/(?:mã|căn|phòng)\s*:?\s*([0-9a-fA-F]{6})\b/i);
  if (rhMatch && !tinDangXemData) {
    const rawMa = rhMatch[1].toUpperCase();
    const maChuan = rawMa.startsWith("RH") ? rawMa : `RH${rawMa}`;
    const khoang = khoangIdTuMa(maChuan);
    if (khoang) {
      const { data: listingRh } = await createAnonClient()
        .from("listings")
        .select("id,title,price_vnd,deal,area_m2,bedrooms,district,province,ward,kind,address,source,source_site,specs,amenities")
        .gte("id", khoang[0])
        .lte("id", khoang[1])
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (listingRh) {
        tinDangXemData = listingRh as TinDangXem;
        dangXem = `NGƯỜI DÙNG ĐANG HỎI MÃ PHÒNG ${maChuan}: "${cheSoVanBan(listingRh.title)}" - ${fmtPrice(listingRh.price_vnd, listingRh.deal)}${listingRh.area_m2 ? `, ${listingRh.area_m2}m²` : ""}, ${cheSoVanBan([listingRh.address, listingRh.district, listingRh.province].filter(Boolean).join(", "))}. Bảng phí chi tiết (bóc tách 5 khoản minh bạch, nói không với chi phí ẩn): ${JSON.stringify(listingRh.specs || {})}. Hotline/Zalo tư vấn duy nhất của Radar: ${HOTLINE_DISPLAY} (${HOTLINE_NAME}).`;
      }
    }
  }

  // Fast-path 11/11 (UX 3.4): hỏi về chính phòng đang xem / mã RHxxxxxx -> trả lời ngay từ DB, không đợi Gemini ~14s
  if (tinDangXemData) {
    const nhanh = traLoiNhanhTinDangXem(tinDangXemData, last);
    if (nhanh) {
      after(() => ghiSuKien({ loai: "chat", listingId: tinDangXemData!.id, noiDung: last, ketQua: 1 }));
      return traLoi({ ...nhanh, listings: [] });
    }
  }

  // Khách bấm chip hoặc hỏi tìm căn tương tự / quanh đây khi đang xem một tin
  if (tinDangXemData && /(tương tự|tuong tu|giống|giong|căn khác|phòng khác|quanh đây|khu này còn không|gợi ý thêm)/i.test(last)) {
    const tuongTu = await layTinTuongTu(tinDangXemData, 4);
    if (tuongTu.length > 0) {
      return traLoi({
        reply: `Em tìm thấy ${tuongTu.length} căn cùng khu vực và tầm giá tương đương ở bên dưới nhé 🏠\n\nBạn muốn em hỗ trợ phương án nào tiếp theo?`,
        suggestions: [
          "Xem căn giá mềm hơn",
          "Xem căn có hẻm xe hơi",
          "Đặt lịch hẹn xem trực tiếp",
        ],
        listings: tuongTu.map((x) => ({
          id: x.id,
          title: x.title,
          price: fmtPrice(x.price_vnd, x.deal),
          meta: [x.lyDoGoiY, x.area_m2 ? `${x.area_m2}m²` : null, [x.ward, x.district].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
          image: cleanImages(x.images || [])[0] || null,
        })),
      });
    }
  }

  // ===== DỰ ÁN (26/10): câu có tên dự án -> tìm tin QUANH dự án theo bán kính, hoặc trả lời dự án ở đâu / có gì =====
  // Đi trước Gemini: số liệu lấy thẳng từ bảng projects + toạ độ, không để AI tự đoán vị trí dự án.
  const dsDuAn = await layDuAnToaDo().catch(() => []);
  let daTim = duAnTrongCau(dsDuAn, last);
  // Không gõ đúng tên (sai chính tả, nhớ một phần: "chung cư hà đô quận 10") -> tìm theo NGHĨA bằng vector (035).
  // Chỉ thử khi câu có dấu hiệu nói về dự án, và dự án tìm được phải có ít nhất 1 từ riêng xuất hiện trong câu -
  // tránh "căn hộ gần quận 7" bị gán đại vào một dự án nào đó.
  let vecCau: number[] | null = null;
  const cnCau = ` ${chuanTen(last)} `;
  if (!daTim && dsDuAn.length && /\s(du an|khu do thi|kdt|khu dan cu|kdc|chung cu|can ho|toa nha|gan|quanh|canh)\s/.test(cnCau)) {
    vecCau = await nhungCau(last);
    if (vecCau) {
      // Top 5 thường sát điểm nhau ("chung cư hà đô quận 10": Đào Duy Từ Q10 .741 · HaDo Centrosa Q10 .739 ·
      // Z751 Hà Đô Gò Vấp .735) -> chỉ nhận dự án có từ riêng nằm trong câu (so cả dạng viết liền: "ha do" ~ "HaDo"),
      // cộng điểm khi quận của dự án trùng quận khách nhắc, rồi lấy điểm cao nhất.
      const { data: khop } = await createAnonClient().rpc("match_projects", { query_embedding: vecCau, match_count: 5 });
      // dạng viết liền CHỈ từ 2 từ đứng cạnh nhau ("ha do" -> "hado"); so chuỗi con tự do từng làm
      // "canh" (Mỹ Cảnh) lọt trong "canho" (căn hộ) -> "căn hộ 2PN quận 7" bị gán nhầm dự án
      const tuCau = cnCau.trim().split(" ");
      const ghep2 = new Set(tuCau.slice(1).map((w, i) => tuCau[i] + w));
      let tot = 0;
      for (const k of (khop ?? []) as { id: string; similarity: number }[]) {
        if (k.similarity < 0.7) break;
        const p = dsDuAn.find((x) => x.id === k.id);
        if (!p) continue;
        const tuRieng = chuanTen(p.name).split(" ").filter((w) => w.length >= 2 && !TU_CHUNG_DU_AN.has(w));
        const coTen = tuRieng.some((w) => cnCau.includes(` ${w} `) || ghep2.has(w));
        if (!coTen) continue;
        const quan = p.district ? chuanTen(p.district.replace(/\(.*\)/, "")) : "";
        const diem = k.similarity + (quan && cnCau.includes(` ${quan} `) ? 0.05 : 0);
        if (diem > tot) { tot = diem; daTim = p; }
      }
    }
  }
  const da = daTim;
  if (da) {
    const cn = ` ${chuanTen(last)} `;
    const hoiQuanh = /\s(gan|quanh|canh|sat|ke ben|xung quanh|lan can|loanh quanh)\s/.test(cn);
    const hoiThongTin = /\s(o dau|cho nao|vi tri|dia chi|chu dau tu|cdt|ban giao|tien ich|thong tin|review|co gi|phap ly|nam o)\s/.test(cn);
    const hoiTin = hoiQuanh || (!hoiThongTin && /\s(tro|phong|thue|mua|can ho|nha|tim)\s/.test(cn));
    if (hoiTin) {
      const loc = bocTruyVanBDS(last).loc;
      const deal = loc.deal || (/\s(tro|phong|thue)\s/.test(cn) ? "cho_thue" : null);
      const tim = async (km: number) => {
        const dLat = km / 111.32, dLng = km / (111.32 * Math.cos((da.lat * Math.PI) / 180));
        let q = createAnonClient().from("listings")
          .select("id,title,price_vnd,area_m2,bedrooms,district,province,deal,kind,source,lat,lng") // 2/11 (audit P5): bỏ images của 600 dòng
          .eq("status", "published")
          .gte("lat", da.lat - dLat).lte("lat", da.lat + dLat).gte("lng", da.lng - dLng).lte("lng", da.lng + dLng);
        if (deal) q = q.eq("deal", deal);
        if (loc.kind && PROP[loc.kind]) q = q.eq("kind", loc.kind);
        if (loc.price_max) q = q.lte("price_vnd", loc.price_max);
        if (loc.price_min) q = q.gte("price_vnd", loc.price_min);
        if (loc.bedrooms) q = q.gte("bedrooms", loc.bedrooms);
        // lỗi thoáng qua của Supabase từng bị hiểu là "không có tin" -> nới bán kính oan; thử lại 1 lần.
        // 600: khu trung tâm 2 km có thể vượt 300 tin, cắt bớt thì câu "có N tin" báo thiếu
        let { data, error } = await q.limit(600);
        if (error) ({ data, error } = await q.limit(600));
        if (error) console.error("chat quanh du an:", error.message);
        return (data ?? [])
          .map((x) => ({ ...x, km: khoangCachKm(da, { lat: Number(x.lat), lng: Number(x.lng) }) }))
          .filter((x) => x.km <= km).sort((a, b) => a.km - b.km);
      };
      // ít quá thì nới bán kính 2 -> 3 km, nói rõ cho khách
      let km = 2, gan = await tim(km);
      if (gan.length < 3) { km = 3; gan = await tim(km); }
      const viTri = [da.district, da.province].filter(Boolean).join(", ");
      const loai = deal === "cho_thue" ? "tin cho thuê" : deal === "ban" ? "tin bán" : "tin";
      const href = `/search?${new URLSearchParams({ ...(deal ? { deal } : {}), ...(loc.price_max ? { priceMax: String(loc.price_max) } : {}), gan: `${da.lat.toFixed(6)},${da.lng.toFixed(6)}`, bk: String(km), gan_ten: da.name })}`;
      // chỉ lấy ảnh cho 5 tin gửi về
      const top5 = gan.slice(0, 5);
      const anh = new Map<string, string[] | null>();
      if (top5.length) {
        const { data: dsAnh } = await createAnonClient().from("listings").select("id,images").in("id", top5.map((x) => x.id));
        for (const r of dsAnh ?? []) anh.set(r.id as string, (r.images as string[] | null) ?? null);
      }
      after(() => ghiSuKien({ loai: "chat", listingId: null, noiDung: last, ketQua: gan.length }));
      return traLoi({
        reply: gan.length
          ? `Quanh ${da.name} (${viTri}), trong bán kính ${km} km Radar đang có ${gan.length} ${loai} phù hợp. Em gửi ${Math.min(5, gan.length)} tin gần dự án nhất bên dưới - tin đầu tiên cách khoảng ${gan[0].km < 1 ? Math.round(gan[0].km * 1000) + " m" : gan[0].km.toFixed(1) + " km"}.`
          : `Trong bán kính ${km} km quanh ${da.name} (${viTri}) hiện chưa có ${loai} khớp yêu cầu. Anh/chị để lại SĐT hoặc nhắn Zalo ${HOTLINE}, Radar tìm thêm phòng quanh dự án giúp mình nhé.`,
        link: gan.length ? { href, label: `Xem cả ${gan.length} tin quanh ${da.name} trên bản đồ` } : null,
        suggestions: [`${da.name} ở đâu, có gì?`, deal === "cho_thue" ? `Phòng dưới 4 triệu gần ${da.name}` : `Phòng trọ gần ${da.name}`, "Đặt lịch hẹn xem phòng"],
        listings: top5.map((x) => ({
          id: x.id, title: cheSoVanBan(x.title), price: fmtPrice(x.price_vnd, x.deal),
          meta: [`cách ${x.km < 1 ? Math.round(x.km * 1000) + " m" : x.km.toFixed(1) + " km"}`, x.area_m2 ? `${x.area_m2}m²` : null, x.district].filter(Boolean).join(" · "),
          image: cleanImages(anh.get(x.id) || [])[0] || null,
        })),
      });
    }
    // Hỏi thông tin dự án: trả lời từ dữ liệu thật, không qua AI (tránh bịa giá / tiện ích)
    const { data: p } = await createAnonClient().from("projects")
      .select("name,investor,address,district,province,price_min,price_max,handover,amenities,specs").eq("id", da.id).maybeSingle();
    if (p) {
      const gia = p.price_min ? `Giá tham khảo từ ${fmtPrice(p.price_min, "ban")}${p.price_max ? ` - ${fmtPrice(p.price_max, "ban")}` : ""}.` : "Giá: chưa có số liệu công khai.";
      const tienIch = ((p.amenities as string[] | null) || []).slice(0, 4);
      const phapLy = (p.specs as Record<string, string> | null)?.["Pháp lý"];
      after(() => ghiSuKien({ loai: "chat", listingId: null, noiDung: last, ketQua: 1 }));
      return traLoi({
        reply: [
          `${p.name}${p.investor ? ` - chủ đầu tư ${p.investor}` : ""}.`,
          `Vị trí: ${p.address || [p.district, p.province].filter(Boolean).join(", ")}.`,
          gia,
          p.handover ? `Bàn giao: ${p.handover}.` : null,
          phapLy ? `Pháp lý: ${phapLy}.` : null,
          tienIch.length ? `Tiện ích, kết nối nổi bật:\n• ${tienIch.join("\n• ")}` : null,
          `(Thông tin tổng hợp từ nguồn công khai, chỉ để tham khảo.)`,
        ].filter(Boolean).join("\n"),
        link: { href: `/projects/${da.id}`, label: `Xem trang dự án ${p.name}` },
        suggestions: [`Phòng trọ gần ${p.name}`, `Căn hộ bán quanh ${p.name}`, "Đặt lịch tư vấn"],
        listings: [],
      });
    }
  }

  const convo = (dangXem ? dangXem + "\n" : "") + messages.map((m) => `${m.role === "user" ? "Người dùng" : "Trợ lý"}: ${m.text}`).join("\n");

  const fastParsed = fallbackParse(last);
  // Nối ngữ cảnh tin đang xem khi khách bấm chip "Xem căn giá mềm hơn"
  if (tinDangXemData && /(giá mềm|rẻ hơn|rẻ nhất|thấp hơn)/i.test(last)) {
    fastParsed.mode = "search";
    fastParsed.deal ||= (tinDangXemData.deal === "ban" ? "ban" : "cho_thue");
    fastParsed.kind ||= tinDangXemData.kind;
    fastParsed.province ||= tinDangXemData.province;
    fastParsed.district ||= tinDangXemData.district;
    if (tinDangXemData.price_vnd && !fastParsed.price_max) {
      fastParsed.price_max = Math.round(tinDangXemData.price_vnd * 0.9);
    }
  }
  const boLocNhanh = (!dangXem || (tinDangXemData && /(giá mềm|rẻ hơn)/i.test(last))) && fastParsed.mode === "search" && Boolean(fastParsed.district || ((fastParsed.price_max || fastParsed.price_min || fastParsed.bedrooms) && fastParsed.kind));

  let parsed: Parsed | null = boLocNhanh ? fastParsed : null;
  if (!parsed) {
    const raw = await gemini(`${PARSE_PROMPT}\n\n--- HỘI THOẠI ---\n${convo}`);
    if (raw) { try { parsed = JSON.parse(raw) as Parsed; } catch { /* fallback */ } }
    parsed ??= fastParsed;
  }

  // Kế thừa parser tiếng Việt: bổ sung nếu Gemini bỏ sót giá hoặc quận/loại hình
  const tuLuat = bocTruyVanBDS(last);
  if (tuLuat.coKetQua) {
    if (tuLuat.loc.deal && !parsed.deal) parsed.deal = tuLuat.loc.deal;
    if (tuLuat.loc.kind && !parsed.kind) parsed.kind = tuLuat.loc.kind;
    if (tuLuat.loc.district && !parsed.district) parsed.district = tuLuat.loc.district;
    if (tuLuat.loc.province && !parsed.province) parsed.province = tuLuat.loc.province;
    if (tuLuat.loc.price_max && !parsed.price_max) parsed.price_max = tuLuat.loc.price_max;
    if (tuLuat.loc.price_min && !parsed.price_min) parsed.price_min = tuLuat.loc.price_min;
    if (tuLuat.loc.bedrooms && !parsed.bedrooms) parsed.bedrooms = tuLuat.loc.bedrooms;
    if (tuLuat.loc.keyword && !parsed.keyword) parsed.keyword = tuLuat.loc.keyword;
    if (parsed.mode === "chat" && (tuLuat.loc.price_max || tuLuat.loc.district || tuLuat.loc.kind)) {
      parsed.mode = "search";
    }
  }

  // ===== Chat thường =====
  if (parsed.mode === "chat") {
    return traLoi({
      reply: parsed.small_talk_reply ||
        "Xin chào! Mình là trợ lý NhaDat Radar 🏠 Hỏi mình kiểu: “căn hộ 2PN dưới 3 tỷ ở Hà Nội”, hoặc “quận nào ở Hà Nội đáng đầu tư?”",
      listings: [],
    });
  }

  // ===== Phân tích thị trường bằng số liệu thật =====
  if (parsed.mode === "analyze") {
    const stats = await marketStats(parsed.province || null);
    if (!stats.length) {
      return traLoi({ reply: "Chưa đủ dữ liệu cho khu vực này. Bạn thử hỏi về Hà Nội, Hồ Chí Minh hoặc Đà Nẵng nhé.", listings: [] });
    }
    const fm = (v: number | null) => (v ? (v >= 1e6 ? (v / 1e6).toFixed(1) + "tr" : Math.round(v / 1e3) + "k") : "-");
    const table = stats
      .map((s) => `${s.district} (${s.province}): bán ${fm(s.ban_ppm2)}/m² · thuê ${fm(s.thue_ppm2)}/m²/th · yield ${s.yield_pct ?? "-"}%/năm · ${s.n} tin`)
      .join("\n");
    const reply = await gemini(
      `Bạn là chuyên gia phân tích BĐS Việt Nam của NhaDat Radar. Người dùng hỏi: "${last}"
SỐ LIỆU THẬT từ tin rao đang hiển thị trên sàn (giá/m² trung vị theo quận; yield = tỷ suất cho thuê gộp/năm):
${table}

Trả lời tiếng Việt 3-5 câu, TRÍCH SỐ LIỆU CỤ THỂ ở trên (không bịa số khác), nêu 2-3 khu vực đáng chú ý phù hợp câu hỏi, kết bằng 1 lưu ý ngắn (dữ liệu từ tin rao, chỉ tham khảo).`,
      { json: false },
    );
    return traLoi({
      reply: reply || "Số liệu hiện có:\n" + table + "\n(Dữ liệu từ tin rao, chỉ mang tính tham khảo.)",
      listings: [],
    });
  }

  // ===== Tìm tin =====
  const supabase = createAnonClient();
  // builder bị mutate khi gọi filter -> dựng mới cho mỗi truy vấn
  const taoQ = (b: BoLoc) => {
    let q = supabase
      .from("listings")
      .select("id,title,price_vnd,area_m2,bedrooms,district,province,deal,kind,images,source")
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
    // 30/9: từ khoá (tên đường/dự án) tìm cả tiêu đề + địa chỉ + phường + quận như trang /search -
    // trước chỉ tìm tiêu đề nên "Phạm Hữu Lầu" trong địa chỉ bị bỏ sót
    if (b.keyword) q = q.or(`title.ilike.%${b.keyword}%,address.ilike.%${b.keyword}%,ward.ilike.%${b.keyword}%,district.ilike.%${b.keyword}%`);
    return q;
  };
  // Nới dần bộ lọc (bỏ giá -> bỏ loại -> bỏ từ khoá) trước khi dùng tìm ngữ nghĩa, và NÓI THẬT với khách
  // là đang đưa tin gần đúng (lib/chat-tim). Rổ hàng Radar ưu tiên (3 rổ hàng : 2 tin khác trong 5 thẻ).
  type TinChat = { id: string; title: string; price_vnd: number | null; area_m2: number | null; bedrooms: number | null; district: string | null; province: string | null; deal: string; kind: string; images: string[] | null; source: string | null };
  let found: TinChat[] = [];
  let ghiChuNoi: string | null = null;
  for (const { loc, ghiChu } of cacMucNoi({ ...parsed, keyword: lamSachTuKhoa(parsed.keyword) || null })) {
    const [{ data: rh }, { data }] = await Promise.all([
      taoQ(loc).eq("source", "ro_hang").order("first_seen_at", { ascending: false }).limit(3),
      taoQ(loc).neq("source", "ro_hang").order("ai_score", { ascending: false, nullsFirst: false }).limit(5),
    ]);
    found = tronRoHang(rh ?? [], data ?? [], 3).slice(0, 5);
    if (found.length) { ghiChuNoi = ghiChu; break; }
  }

  // Không có kết quả -> thử tìm NGỮ NGHĨA bằng pgvector (cần migration 003 + embed.mjs đã chạy)
  if (!found.length) {
    try {
      // dùng lại vector đã nhúng ở bước dự án (nếu có) - khỏi tốn thêm 1 lượt Gemini
      const vec = vecCau ?? await nhungCau(last);
      if (vec) {
        const { data: matches } = await supabase.rpc("match_listings", { query_embedding: vec, match_count: 5 });
        const ids = (matches ?? []).filter((m: { similarity: number }) => m.similarity > 0.5).map((m: { id: string }) => m.id);
        if (ids.length) {
          const { data: sem } = await supabase
            .from("listings").select("id,title,price_vnd,area_m2,bedrooms,district,province,deal,kind,images,source")
            .in("id", ids);
          found = sem ?? [];
          if (found.length) ghiChuNoi = "không có tin khớp đúng từ khoá - đây là các tin có nội dung gần giống";
        }
      }
    } catch { /* chưa có pgvector/embedding - bỏ qua */ }
  }

  let reply: string | null = null;
  const suggestions: string[] = [];
  if (found.length) {
    const summary = found
      .map((x, i) => `${i + 1}. ${x.title} - ${fmtPrice(x.price_vnd, x.deal)}${x.area_m2 ? `, ${x.area_m2}m²` : ""} (${[x.district, x.province].filter(Boolean).join(", ")})`)
      .join("\n");
    // 30/9: nói RÕ cho AI kết quả khớp đúng hay là tin gần đúng (đã nới lọc) - bản cũ để AI tự đoán nên
    // có lúc đưa 5 phòng đúng đường mà vẫn trả lời "chưa có phòng trên đường này"
    if (!boLocNhanh) {
      reply = await gemini(
        `Bạn là Trợ lý Tư vấn Tìm phòng & Chốt lịch xem nhà của Radar Nhà Đất. Người dùng hỏi: "${last}".
Kết quả rổ hàng tìm được:
${summary}

${ghiChuNoi ? `LƯU Ý: kết quả gần đúng - ${ghiChuNoi}.` : "Kết quả khớp đúng yêu cầu."}

QUY TẮC PHẢN HỒI (TRỢ LÝ AI RADAR - MINH BẠCH THEO LUẬT AI):
- Xưng "em - anh/chị" thân thiện, tự nhiên, nhưng LUÔN giữ vai trò Trợ lý AI Radar (không bao giờ nhận là nhân viên hay môi giới thật).
- Độ dài vừa phải (2-3 câu).
- Tóm tắt nhanh rổ hàng tìm được, nhấn mạnh: "Radar dẫn xem miễn phí 100%, không thu phí môi giới".
- Gợi ý khung giờ xem (tối nay 18h30 hoặc chiều mai) và xin Zalo/SĐT nếu khách muốn nhận định vị Maps, video phòng thực tế (hoặc gặp nhân viên qua Hotline/Zalo ${HOTLINE_DISPLAY} - ${HOTLINE_NAME}).
- KHÔNG liệt kê lại danh sách tên nhà hay giá (vì các thẻ bên dưới đã hiển thị sẵn).`,
        { json: false },
      );
    }
    reply ||= ghiChuNoi
      ? `Dạ em gửi anh/chị ${found.length} căn gần đúng tiêu chí (${ghiChuNoi}) ở bên dưới nhé. Radar dẫn xem miễn phí 100%, không thu phí môi giới. Anh/chị muốn xem căn nào cứ để lại SĐT/Zalo ngay tại đây để em gửi video thực tế & vị trí Maps liền ạ!`
      : `Dạ em vừa lọc được ${found.length} căn trống khớp yêu cầu của mình ở bên dưới! Radar dẫn xem miễn phí 100%, không thu phí môi giới. Anh/chị thích căn nào cứ bấm xem chi tiết hoặc nhắn lại SĐT/Zalo để em gửi video thực tế và hẹn lịch xem nhé!`;
    if (parsed?.district) {
      suggestions.push(`Căn rẻ hơn ở ${parsed.district}`);
      suggestions.push(`Hẻm xe hơi ở ${parsed.district}`);
    } else {
      suggestions.push("Xem căn giá mềm hơn");
      suggestions.push("Xem căn hẻm xe hơi");
    }
    suggestions.push("Đặt lịch hẹn xem nhà");
  } else {
    reply = "Dạ hiện tại bên em chưa có căn khớp đúng 100% mức này 😥 Anh/chị cho em xin Zalo hoặc SĐT để em theo dõi rổ hàng 1.400+ căn trống, có phòng mới bung em gửi video và định vị Maps qua liền cho mình nha! Hoặc anh/chị thử chọn nới khoảng tìm kiếm dưới đây giúp em nhé:";
    if (parsed?.district) {
      suggestions.push(`Tất cả tin tại ${parsed.district}`);
      suggestions.push(`Nới giá tại ${parsed.district}`);
    } else {
      suggestions.push("Nới rộng mức giá");
      suggestions.push("Tìm khu vực lân cận");
    }
  }

  // log câu hỏi + số kết quả (bảng su_kien, loai='chat') -> tab "Quan tâm" liệt kê câu bot trả lời hụt
  after(() => ghiSuKien({ loai: "chat", listingId: typeof body.dangXem === "string" ? body.dangXem : null, noiDung: last, ketQua: found.length }));
  return traLoi({
    reply,
    suggestions,
    listings: found.map((x) => ({
      id: x.id, title: x.title, price: fmtPrice(x.price_vnd, x.deal),
      meta: [x.area_m2 ? `${x.area_m2}m²` : null, x.bedrooms ? `${x.bedrooms}PN` : null, [x.district, x.province].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
      // cleanImages như mọi surface khác: bỏ link album facebook (không phải file ảnh, thẻ chat hiện ảnh vỡ) + nâng hi-res
      image: cleanImages(x.images || [])[0] || null,
    })),
  });
}
