import { NextRequest, NextResponse } from "next/server";
import { createAnonClient, rateLimit } from "@/lib/supabase/anon";
import { gemini, median } from "@/lib/gemini";
import { fmtPrice, PROP } from "@/lib/format";
import { cleanImages } from "@/lib/img";

// %/_ là wildcard ilike, ",()" phá cú pháp .or() - cùng luật clean của /search (soát 21/8:
// province/district/keyword từ output Gemini đi thẳng vào ilike không rửa)
const sach = (s: unknown) => String(s ?? "").replace(/[%_*,()]/g, " ").replace(/\s+/g, " ").trim();

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

const PARSE_PROMPT = `Bạn là trợ lý AI của sàn nhà đất NhaDat Radar (Việt Nam). Phân tích TIN NHẮN CUỐI của người dùng (kèm ngữ cảnh hội thoại) và trả về DUY NHẤT 1 JSON:
{
 "mode": "search"|"analyze"|"chat",
   // search: tìm tin cụ thể (mua/thuê nhà theo tiêu chí)
   // analyze: hỏi về THỊ TRƯỜNG - giá trung bình, khu nào rẻ/đắt, nên đầu tư đâu, so sánh khu vực, xu hướng
   // chat: chào hỏi, hỏi cách dùng web, khác
 "deal": "ban"|"cho_thue"|null,
 "kind": "nha"|"dat"|"can_ho"|"mat_bang"|"phong_tro"|null,
 "province": string|null,   // chuẩn hoá: "Hà Nội", "Hồ Chí Minh", "Đà Nẵng"...
 "district": string|null,
 "price_min": number|null,  // VND: "2 tỷ"=2000000000, "5tr/tháng"=5000000
 "price_max": number|null,
 "bedrooms": number|null,
 "keyword": string|null,
 "small_talk_reply": string|null  // CHỈ khi mode=chat: trả lời thân thiện ngắn tiếng Việt. Gợi ý được: tìm kiếm /search, AI định giá /dinh-gia, tính lãi vay /tinh-lai-vay, đăng tin cần đăng nhập /auth rồi vào /dashboard/new, lưu tin bằng nút ♥.
}
Không bịa. Giá quy về VND.`;

function fallbackParse(text: string): Parsed {
  const t = text.toLowerCase();
  const q: Parsed = { mode: "search" };
  if (/(giá trung bình|khu nào|quận nào|đầu tư|xu hướng|thị trường|so sánh|rẻ nhất|đắt nhất)/.test(t)) q.mode = "analyze";
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

// Thống kê thị trường theo quận từ data thật (giá/m² trung vị bán & thuê + tỷ suất cho thuê)
async function marketStats(province: string | null) {
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

export async function POST(req: NextRequest) {
  // chặn spam: 20 request/phút mỗi IP (endpoint công khai + tốn quota Gemini)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?";
  if (!rateLimit(`chat:${ip}`, 20, 60_000)) {
    return NextResponse.json({ reply: "Bạn thao tác hơi nhanh, chờ một phút rồi thử lại nhé." }, { status: 429 });
  }
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

  let parsed: Parsed | null = null;
  const raw = await gemini(`${PARSE_PROMPT}\n\n--- HỘI THOẠI ---\n${convo}`);
  if (raw) { try { parsed = JSON.parse(raw) as Parsed; } catch { /* fallback */ } }
  parsed ??= fallbackParse(last);

  // ===== Chat thường =====
  if (parsed.mode === "chat") {
    return NextResponse.json({
      reply: parsed.small_talk_reply ||
        "Xin chào! Mình là trợ lý NhaDat Radar 🏠 Hỏi mình kiểu: “căn hộ 2PN dưới 3 tỷ ở Hà Nội”, hoặc “quận nào ở Hà Nội đáng đầu tư?”",
      listings: [],
    });
  }

  // ===== Phân tích thị trường bằng số liệu thật =====
  if (parsed.mode === "analyze") {
    const stats = await marketStats(parsed.province || null);
    if (!stats.length) {
      return NextResponse.json({ reply: "Chưa đủ dữ liệu cho khu vực này. Bạn thử hỏi về Hà Nội, Hồ Chí Minh hoặc Đà Nẵng nhé.", listings: [] });
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
    return NextResponse.json({
      reply: reply || "Số liệu hiện có:\n" + table + "\n(Dữ liệu từ tin rao, chỉ mang tính tham khảo.)",
      listings: [],
    });
  }

  // ===== Tìm tin =====
  const supabase = createAnonClient();
  let q = supabase
    .from("listings")
    .select("id,title,price_vnd,area_m2,bedrooms,district,province,deal,kind,images")
    .eq("status", "published");
  if (parsed.deal) q = q.eq("deal", parsed.deal);
  if (parsed.kind && PROP[parsed.kind]) q = q.eq("kind", parsed.kind);
  if (parsed.province && sach(parsed.province)) q = q.ilike("province", `%${sach(parsed.province)}%`);
  if (parsed.district && sach(parsed.district)) q = q.ilike("district", `%${sach(parsed.district)}%`);
  if (parsed.price_min) q = q.gte("price_vnd", parsed.price_min);
  if (parsed.price_max) q = q.lte("price_vnd", parsed.price_max);
  if (parsed.bedrooms) q = q.gte("bedrooms", parsed.bedrooms);
  if (parsed.keyword && sach(parsed.keyword)) q = q.ilike("title", `%${sach(parsed.keyword)}%`);
  const { data } = await q.order("ai_score", { ascending: false, nullsFirst: false }).limit(5);
  let found = data ?? [];

  // Không có kết quả -> thử tìm NGỮ NGHĨA bằng pgvector (cần migration 003 + embed.mjs đã chạy)
  if (!found.length) {
    try {
      const KEYS = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY2, process.env.GEMINI_API_KEY3,
        process.env.GEMINI_API_KEY4, process.env.GEMINI_API_KEY5].filter(Boolean) as string[];
      // Cùng danh sách model với crawler/embed.mjs (vector câu hỏi phải cùng model với vector đã lưu)
      let vec: number[] | null = null;
      outer: for (const model of ["gemini-embedding-001"]) { // text-embedding-004 đã bị gỡ (404) - giữ đồng bộ với crawler/embed.mjs
        for (const k of KEYS) {
          const body: Record<string, unknown> = { content: { parts: [{ text: last.slice(0, 1000) }] } };
          if (model === "gemini-embedding-001") body.outputDimensionality = 768;
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${k}`,
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
          );
          if (res.status === 429) continue;
          const j = await res.json();
          if (j?.embedding?.values) { vec = j.embedding.values; break outer; }
          if (res.status === 404) break; // model không tồn tại -> đổi model
          continue; // lỗi key -> thử key kế
        }
      }
      if (vec) {
        const { data: matches } = await supabase.rpc("match_listings", { query_embedding: vec, match_count: 5 });
        const ids = (matches ?? []).filter((m: { similarity: number }) => m.similarity > 0.5).map((m: { id: string }) => m.id);
        if (ids.length) {
          const { data: sem } = await supabase
            .from("listings").select("id,title,price_vnd,area_m2,bedrooms,district,province,deal,kind,images")
            .in("id", ids);
          found = sem ?? [];
        }
      }
    } catch { /* chưa có pgvector/embedding - bỏ qua */ }
  }

  let reply: string | null = null;
  if (found.length) {
    const summary = found
      .map((x, i) => `${i + 1}. ${x.title} - ${fmtPrice(x.price_vnd, x.deal)}${x.area_m2 ? `, ${x.area_m2}m²` : ""} (${[x.district, x.province].filter(Boolean).join(", ")})`)
      .join("\n");
    reply = await gemini(
      `Bạn là trợ lý sàn nhà đất NhaDat Radar. Người dùng hỏi: "${last}".\nHệ thống tìm được:\n${summary}\n\nViết 1-2 câu tiếng Việt thân thiện giới thiệu kết quả (KHÔNG liệt kê lại - web đã hiển thị thẻ tin). Gợi ý tinh chỉnh nếu phù hợp.`,
      { json: false },
    );
    reply ||= `Mình tìm được ${found.length} tin phù hợp, bạn xem bên dưới nhé! Bấm ♥ để lưu tin.`;
  } else {
    reply = "Hiện chưa có tin nào khớp yêu cầu 😥 Bạn thử nới giá hoặc đổi khu vực, hoặc dùng bộ lọc ở trang Tìm kiếm nhé.";
  }

  return NextResponse.json({
    reply,
    listings: found.map((x) => ({
      id: x.id, title: x.title, price: fmtPrice(x.price_vnd, x.deal),
      meta: [x.area_m2 ? `${x.area_m2}m²` : null, x.bedrooms ? `${x.bedrooms}PN` : null, [x.district, x.province].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
      // cleanImages như mọi surface khác: bỏ link album facebook (không phải file ảnh, thẻ chat hiện ảnh vỡ) + nâng hi-res
      image: cleanImages(x.images || [])[0] || null,
    })),
  });
}
