import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtPrice, PROP } from "@/lib/format";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const KEYS = [
  process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY2, process.env.GEMINI_API_KEY3,
  process.env.GEMINI_API_KEY4, process.env.GEMINI_API_KEY5,
].filter(Boolean) as string[];

type ChatMsg = { role: "user" | "bot"; text: string };
type ParsedQuery = {
  is_search: boolean;
  deal?: "ban" | "cho_thue" | null;
  kind?: string | null;
  province?: string | null;
  district?: string | null;
  price_max?: number | null;
  price_min?: number | null;
  bedrooms?: number | null;
  keyword?: string | null;
  small_talk_reply?: string | null;
};

async function gemini(prompt: string, json = true): Promise<string | null> {
  for (const key of KEYS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: json
              ? { responseMimeType: "application/json", temperature: 0 }
              : { temperature: 0.4, maxOutputTokens: 400 },
          }),
        },
      );
      if (res.status === 429) continue; // hết quota key này -> xoay key sau
      const j = await res.json();
      const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (txt) return txt;
    } catch { /* thử key tiếp theo */ }
  }
  return null;
}

const PARSE_PROMPT = `Bạn là trợ lý AI của sàn nhà đất NhaDat Radar (Việt Nam). Phân tích TIN NHẮN CUỐI của người dùng (kèm ngữ cảnh hội thoại) và trả về DUY NHẤT 1 JSON:
{
 "is_search": boolean,            // true nếu họ đang tìm/hỏi về nhà đất cụ thể (mua, thuê, giá, khu vực)
 "deal": "ban"|"cho_thue"|null,
 "kind": "nha"|"dat"|"can_ho"|"mat_bang"|"phong_tro"|null,
 "province": string|null,         // chuẩn hoá: "Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Khánh Hòa"...
 "district": string|null,
 "price_min": number|null,        // VND: "2 tỷ"=2000000000, "5tr/tháng"=5000000
 "price_max": number|null,
 "bedrooms": number|null,
 "keyword": string|null,          // từ khoá khác (tên đường, dự án)
 "small_talk_reply": string|null  // CHỈ khi is_search=false: câu trả lời thân thiện, ngắn, tiếng Việt. Có thể hướng dẫn dùng web: tìm kiếm /search, đăng tin cần đăng nhập (Google hoặc email) tại /auth, đăng tin tại /dashboard/new, tính lãi vay /tinh-lai-vay, lưu tin bằng nút ♥.
}
Không bịa. Giá quy về VND.`;

function fallbackParse(text: string): ParsedQuery {
  const t = text.toLowerCase();
  const q: ParsedQuery = { is_search: true };
  if (/(thuê|cho thue|cho thuê)/.test(t)) q.deal = "cho_thue";
  else if (/(mua|bán|ban)/.test(t)) q.deal = "ban";
  if (/căn hộ|can ho|chung cư/.test(t)) q.kind = "can_ho";
  else if (/đất|dat nen/.test(t)) q.kind = "dat";
  else if (/phòng trọ|phong tro/.test(t)) q.kind = "phong_tro";
  else if (/nhà|nha/.test(t)) q.kind = "nha";
  if (/hà nội|ha noi/.test(t)) q.province = "Hà Nội";
  else if (/hồ chí minh|ho chi minh|sài gòn|sai gon|hcm/.test(t)) q.province = "Hồ Chí Minh";
  else if (/đà nẵng|da nang/.test(t)) q.province = "Đà Nẵng";
  const ty = t.match(/dưới\s*(\d+(?:[.,]\d+)?)\s*tỷ/) || t.match(/(\d+(?:[.,]\d+)?)\s*tỷ/);
  if (ty) q.price_max = Math.round(parseFloat(ty[1].replace(",", ".")) * 1e9);
  return q;
}

export async function POST(req: NextRequest) {
  let body: { messages?: ChatMsg[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ reply: "Yêu cầu không hợp lệ." }, { status: 400 });
  }
  const messages = (body.messages || []).slice(-8);
  const last = messages.filter((m) => m.role === "user").pop()?.text?.slice(0, 1000);
  if (!last) return NextResponse.json({ reply: "Bạn muốn tìm nhà đất như thế nào ạ?" });

  const convo = messages.map((m) => `${m.role === "user" ? "Người dùng" : "Trợ lý"}: ${m.text}`).join("\n");

  let parsed: ParsedQuery | null = null;
  const raw = await gemini(`${PARSE_PROMPT}\n\n--- HỘI THOẠI ---\n${convo}`);
  if (raw) { try { parsed = JSON.parse(raw) as ParsedQuery; } catch { /* fallback bên dưới */ } }
  if (!parsed) parsed = fallbackParse(last);

  if (!parsed.is_search) {
    return NextResponse.json({
      reply: parsed.small_talk_reply ||
        "Xin chào! Mình là trợ lý NhaDat Radar 🏠 Bạn có thể hỏi kiểu: “căn hộ 2 phòng ngủ dưới 3 tỷ ở Hà Nội” hoặc “nhà cho thuê Đà Nẵng”.",
      listings: [],
    });
  }

  // Truy vấn tin phù hợp
  const supabase = createAdminClient();
  let q = supabase
    .from("listings")
    .select("id,title,price_vnd,area_m2,bedrooms,district,province,deal,kind,images")
    .eq("status", "published");
  if (parsed.deal) q = q.eq("deal", parsed.deal);
  if (parsed.kind && PROP[parsed.kind]) q = q.eq("kind", parsed.kind);
  if (parsed.province) q = q.ilike("province", `%${parsed.province}%`);
  if (parsed.district) q = q.ilike("district", `%${parsed.district}%`);
  if (parsed.price_min) q = q.gte("price_vnd", parsed.price_min);
  if (parsed.price_max) q = q.lte("price_vnd", parsed.price_max);
  if (parsed.bedrooms) q = q.gte("bedrooms", parsed.bedrooms);
  if (parsed.keyword) q = q.ilike("title", `%${parsed.keyword}%`);
  const { data } = await q.order("ai_score", { ascending: false, nullsFirst: false }).limit(5);
  const found = data ?? [];

  const summary = found
    .map((x, i) => `${i + 1}. ${x.title} — ${fmtPrice(x.price_vnd, x.deal)}${x.area_m2 ? `, ${x.area_m2}m²` : ""}${x.bedrooms ? `, ${x.bedrooms}PN` : ""} (${[x.district, x.province].filter(Boolean).join(", ")})`)
    .join("\n");

  let reply: string | null = null;
  if (found.length) {
    reply = await gemini(
      `Bạn là trợ lý sàn nhà đất NhaDat Radar. Người dùng hỏi: "${last}".\nHệ thống tìm được các tin sau:\n${summary}\n\nViết 1-2 câu tiếng Việt thân thiện giới thiệu kết quả (KHÔNG liệt kê lại từng tin — web đã hiển thị thẻ tin bên dưới). Nếu phù hợp, gợi ý tinh chỉnh thêm (khu vực, giá).`,
      false,
    );
    reply ||= `Mình tìm được ${found.length} tin phù hợp, bạn xem bên dưới nhé! Có thể bấm ♥ để lưu tin.`;
  } else {
    reply = "Hiện chưa có tin nào khớp yêu cầu 😥 Bạn thử nới giá hoặc đổi khu vực xem sao, hoặc dùng bộ lọc chi tiết ở trang Tìm kiếm nhé.";
  }

  return NextResponse.json({
    reply,
    listings: found.map((x) => ({
      id: x.id, title: x.title, price: fmtPrice(x.price_vnd, x.deal),
      meta: [x.area_m2 ? `${x.area_m2}m²` : null, x.bedrooms ? `${x.bedrooms}PN` : null, [x.district, x.province].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
      image: x.images?.[0] || null,
    })),
  });
}
