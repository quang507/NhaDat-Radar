import { NextRequest, NextResponse } from "next/server";
import { createAnonClient, rateLimitChung } from "@/lib/supabase/anon";
import { gemini, median, percentile } from "@/lib/gemini";
import { PROP } from "@/lib/format";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type ValuationInput = {
  deal: "ban" | "cho_thue";
  kind: string;
  province: string;
  district?: string;
  area_m2: number;
  bedrooms?: number;
  floors?: number;
  legal?: string;
  note?: string;
};

// output LLM là dữ liệu KHÔNG TIN ĐƯỢC: số có thể là chuỗi ("1.2 tỷ"), thiếu key, NaN -> mọi trường là unknown
type AiOut = {
  estimate_vnd?: unknown;
  low_vnd?: unknown;
  high_vnd?: unknown;
  confidence?: unknown;
  reasoning?: unknown;
  forecast_pct?: { y1?: unknown; y3?: unknown; y5?: unknown } | null;
};

// 2/11 (audit Q10): ép số an toàn - chuỗi số / số thật thì nhận, còn lại (NaN, "1.2 tỷ", <= 0) -> null
const soDuong = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && /^\s*\d+(\.\d+)?\s*$/.test(v) ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};
const soPhanTram = (v: unknown, macDinh: number): number => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > -50 && n < 200 ? Math.round(n * 10) / 10 : macDinh;
};
// 2/11 (audit S6): trần Gemini toàn hệ thống / ngày, cùng khoá với /api/chat
const TRAN_GEMINI_NGAY = 3000;
const ngayVN = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

export async function POST(req: NextRequest) {
  // chặn spam: 10 request/phút mỗi IP (endpoint công khai + tốn quota Gemini)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?";
  if (!(await rateLimitChung(`valuation:${ip}`, 10, 60_000))) {
    return NextResponse.json({ error: "Bạn thao tác hơi nhanh, chờ một phút rồi thử lại." }, { status: 429 });
  }
  if (!(await rateLimitChung(`gemini:ngay:${ngayVN()}`, TRAN_GEMINI_NGAY, 86_400_000))) {
    return NextResponse.json({ error: "Công cụ định giá đang quá tải hôm nay. Anh/chị nhắn Zalo hoặc gọi hotline Radar để được định giá giúp nhé." }, { status: 429 });
  }
  let b: ValuationInput;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const area = Number(b.area_m2);
  if (!b.province || !b.kind || !area || area <= 0 || area > 100000) {
    return NextResponse.json({ error: "Cần ít nhất: loại BĐS, tỉnh/thành và diện tích hợp lệ" }, { status: 400 });
  }
  // kind là ENUM trong DB - giá trị lạ ("biet_thu") làm Postgres 22P02, lỗi bị nuốt thành
  // "chưa đủ dữ liệu so sánh" (sai bản chất). Chặn từ cổng như /api/chat vẫn làm.
  if (!PROP[b.kind]) {
    return NextResponse.json({ error: "Loại BĐS không hợp lệ" }, { status: 400 });
  }
  // %/_ là wildcard của ilike - không rửa thì province="%" so sánh với cả nước (cùng luật clean của /search)
  const clean = (s: string) => s.replace(/[%_*,()]/g, " ").replace(/\s+/g, " ").trim();
  b.province = clean(String(b.province));
  b.district = b.district ? clean(String(b.district)) : b.district;
  const deal = b.deal === "cho_thue" ? "cho_thue" : "ban";

  // Lấy tin so sánh (comps) từ DB: cùng loại + khu vực, có giá/m²
  const supabase = createAnonClient();
  const base = () =>
    supabase
      .from("listings")
      .select("price_per_m2,price_vnd,area_m2,district")
      .eq("status", "published").eq("deal", deal).eq("kind", b.kind)
      .ilike("province", `%${b.province}%`)
      .not("price_per_m2", "is", null).gt("price_per_m2", 0)
      .limit(500);

  let scope = `${b.district}, ${b.province}`;
  // 2/11 (audit Q1): "Quận 1" ilike ăn cả Quận 10/11/12 -> quận số so khớp đúng tên
  const r1 = !b.district ? await base()
    : /^Quận \d{1,2}$/.test(b.district) ? await base().eq("district", b.district)
    : await base().ilike("district", `%${b.district}%`);
  let comps = r1.data;
  if (r1.error) console.error("valuation comps:", r1.error.message); // đừng nuốt lỗi DB thành "chưa đủ dữ liệu"
  if (!comps || comps.length < 5) {
    const r2 = await base(); // ít tin quá -> nới ra toàn tỉnh
    comps = r2.data;
    if (r2.error) console.error("valuation comps (tỉnh):", r2.error.message);
    scope = b.province;
  }
  comps ??= [];
  const ppm2 = comps.map((c) => Number(c.price_per_m2)).filter((v) => v > 0);
  const med = median(ppm2), p25 = percentile(ppm2, 25), p75 = percentile(ppm2, 75);

  if (!med) {
    return NextResponse.json({
      error: `Chưa đủ dữ liệu so sánh cho ${PROP[b.kind] || b.kind} tại ${scope}. Thử đổi khu vực hoặc loại BĐS.`,
    }, { status: 422 });
  }

  // Ước tính thống kê thuần (fallback + neo cho AI)
  const statEstimate = Math.round(med * area);
  const statLow = Math.round((p25 ?? med * 0.8) * area);
  const statHigh = Math.round((p75 ?? med * 1.2) * area);

  const unit = deal === "cho_thue" ? "VND/tháng" : "VND";
  const prompt = `Bạn là chuyên gia định giá bất động sản Việt Nam. Định giá dựa CHỦ YẾU trên dữ liệu so sánh thật dưới đây, tinh chỉnh theo đặc điểm tài sản. Trả về DUY NHẤT 1 JSON:
{"estimate_vnd": number, "low_vnd": number, "high_vnd": number, "confidence": "thap"|"trung_binh"|"cao", "reasoning": string, "forecast_pct": {"y1": number, "y3": number, "y5": number}}

DỮ LIỆU SO SÁNH (${comps.length} tin ${deal === "ban" ? "bán" : "cho thuê"} cùng loại tại ${scope}):
- Giá/m² trung vị: ${med.toLocaleString("vi-VN")} ${unit}/m² · khoảng phổ biến (P25-P75): ${p25?.toLocaleString("vi-VN")} - ${p75?.toLocaleString("vi-VN")}
- Ước tính thống kê cho ${area}m²: ${statEstimate.toLocaleString("vi-VN")} ${unit} (khoảng ${statLow.toLocaleString("vi-VN")} - ${statHigh.toLocaleString("vi-VN")})

TÀI SẢN CẦN ĐỊNH GIÁ: ${PROP[b.kind] || b.kind} ${deal === "ban" ? "bán" : "cho thuê"} tại ${b.district ? b.district + ", " : ""}${b.province}, ${area}m²${b.bedrooms ? `, ${b.bedrooms} phòng ngủ` : ""}${b.floors ? `, ${b.floors} tầng` : ""}${b.legal ? `, pháp lý: ${b.legal}` : ""}${b.note ? `. Ghi chú: ${String(b.note).slice(0, 300)}` : ""}

Quy tắc: estimate_vnd phải nằm gần khoảng thống kê (lệch tối đa ±20% trừ khi có lý do mạnh); confidence="cao" chỉ khi >=20 tin so sánh cùng quận; reasoning 2-3 câu tiếng Việt nêu rõ căn cứ; forecast_pct là % tăng giá dự kiến sau 1/3/5 năm (thị trường VN thường 3-10%/năm tùy khu vực, cho thuê thì thấp hơn).`;

  let ai: AiOut | null = null;
  const raw = await gemini(prompt);
  if (raw) { try { const j = JSON.parse(raw); ai = j && typeof j === "object" ? (j as AiOut) : null; } catch { /* dùng fallback thống kê */ } }

  // Chặn AI "bay" quá xa dữ liệu thật. 2/11 (audit Q10): ép số trước, kẹp lại, giữ low <= estimate <= high
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const aiEst = soDuong(ai?.estimate_vnd), aiLow = soDuong(ai?.low_vnd), aiHigh = soDuong(ai?.high_vnd);
  const estLo = statLow * 0.7, estHi = statHigh * 1.3;
  const estimate = aiEst !== null ? clamp(aiEst, estLo, estHi) : statEstimate;
  // AI bị kẹp (lệch xa dữ liệu) thì lời giải thích của nó không còn khớp số -> dùng câu thống kê
  const biKep = aiEst === null || aiEst < estLo || aiEst > estHi;
  let low = aiLow !== null ? clamp(aiLow, statLow * 0.6, estimate) : Math.min(statLow, estimate);
  let high = aiHigh !== null ? clamp(aiHigh, estimate, statHigh * 1.4) : Math.max(statHigh, estimate);
  if (!(low <= estimate)) low = estimate;
  if (!(high >= estimate)) high = estimate;
  const lyDoThongKe = `Ước tính theo giá/m² trung vị của ${comps.length} tin ${deal === "ban" ? "bán" : "cho thuê"} cùng loại tại ${scope}.`;
  const lyDoAi = typeof ai?.reasoning === "string" ? ai.reasoning.trim().slice(0, 800) : "";
  // "cao" chỉ khi đủ >= 20 tin so sánh, bất kể AI nói gì
  const confAi = ai?.confidence === "cao" || ai?.confidence === "trung_binh" || ai?.confidence === "thap" ? ai.confidence : null;
  const confidence = confAi === "cao" && comps.length < 20 ? "trung_binh" : confAi ?? (comps.length >= 20 ? "trung_binh" : "thap");

  return NextResponse.json({
    estimate_vnd: Math.round(estimate),
    low_vnd: Math.round(low),
    high_vnd: Math.round(high),
    // output LLM là dữ liệu KHÔNG TIN ĐƯỢC: "trung bình"/"Cao"/"medium" thay vì đúng enum là
    // client tra CONF[x] ra undefined -> crash trắng trang dù số liệu đã tính đúng
    confidence,
    reasoning: !biKep && lyDoAi ? lyDoAi : lyDoThongKe,
    // từng key một: LLM trả thiếu y3/y5 thì object truthy vẫn qua "||" rồi client in "+undefined%"
    forecast_pct: {
      y1: soPhanTram(ai?.forecast_pct?.y1, 5),
      y3: soPhanTram(ai?.forecast_pct?.y3, 16),
      y5: soPhanTram(ai?.forecast_pct?.y5, 30),
    },
    comps: { count: comps.length, scope, median_ppm2: med, p25_ppm2: p25, p75_ppm2: p75 },
    deal,
  });
}
