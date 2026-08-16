// Tạo embedding (Gemini gemini-embedding-001 @768, free) cho tin chưa có -> cột listings.embedding (pgvector).
// Chạy sau seed trong daily.mjs (cần migration 003). Thiếu GEMINI key -> bỏ qua êm.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KEYS = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY2, process.env.GEMINI_API_KEY3,
  process.env.GEMINI_API_KEY4, process.env.GEMINI_API_KEY5].filter(Boolean);
if (!url || !key) { console.error("embed: thiếu SUPABASE env"); process.exit(0); }
if (!KEYS.length) { console.log("embed: chưa có GEMINI_API_KEY -> bỏ qua."); process.exit(0); }

const sb = createClient(url, key, { auth: { persistSession: false } });

// text-embedding-004 đã bị Google gỡ (404 từ 14/8/2026) -> chỉ dùng gemini-embedding-001 ép 768 chiều
// (khớp cột vector(768) của migration 003). PHẢI trùng danh sách trong src/app/api/chat/route.ts.
const MODELS = ["gemini-embedding-001"];
let loggedErr = false; // in lỗi thật 1 lần để chẩn đoán qua log CI

async function embed(text) {
  for (const model of MODELS) {
    for (const k of KEYS) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      try {
        const body = { content: { parts: [{ text: text.slice(0, 1500) }] } };
        if (model === "gemini-embedding-001") body.outputDimensionality = 768;
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${k}`,
          { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body), signal: ctrl.signal },
        );
        if (res.status === 429) continue;
        const j = await res.json();
        if (j?.embedding?.values) return j.embedding.values;
        if (!loggedErr) {
          loggedErr = true;
          console.error(`embed: ${model} -> HTTP ${res.status}:`, JSON.stringify(j?.error || j).slice(0, 300));
        }
        if (res.status === 404) break; // model không tồn tại -> thử model kế
        continue; // lỗi key (400 API_KEY_INVALID/403...) -> thử KEY kế (run 22:26: key 1 hỏng làm rớt cả 4 key)
      } catch { /* timeout/mạng -> xoay key */ }
      finally { clearTimeout(timer); }
    }
  }
  return null;
}

// Trần thời gian toàn bộ embed: 6 phút -> không kéo dài workflow
const EMBED_DEADLINE = Date.now() + 6 * 60 * 1000;

const { data, error } = await sb.from("listings")
  .select("id,title,description,district,province,kind,deal")
  .eq("status", "published").is("embedding", null).limit(300);
if (error) { console.error("embed:", error.message, "(đã chạy migration 003 chưa?)"); process.exit(0); }

// Chạy theo lô 5 song song (audit 16/8: tuần tự + N+1 update -> không bao giờ hết 300 tin trong 6'); 1 tin lỗi không chặn cả batch
let done = 0, failed = 0, waited = false;
const rows = data ?? [];
for (let i = 0; i < rows.length; i += 5) {
  if (Date.now() > EMBED_DEADLINE) { console.log("embed: hết ngân sách thời gian, dừng (mai chạy tiếp)."); break; }
  // Cả lô rớt vì 429 = thường là giới hạn/phút (kiểm chứng 16/8: 205/300 rồi rớt, 3' sau gọi lại 200 OK) -> nghỉ 61s thử lại 1 lần
  // trước khi kết luận hết quota ngày.
  const attempt = async () => Promise.all(rows.slice(i, i + 5).map(async (l) => {
    const text = [l.title, l.description, l.kind, l.deal, l.district, l.province].filter(Boolean).join(" · ");
    const v = await embed(text);
    if (!v) return false;
    await sb.from("listings").update({ embedding: v }).eq("id", l.id);
    return true;
  }));
  let res = await attempt();
  if (res.every((r) => !r) && !waited && Date.now() + 61000 < EMBED_DEADLINE) {
    waited = true; console.log("embed: cả lô 429 -> nghỉ 61s (giới hạn/phút) rồi thử lại...");
    await new Promise((r) => setTimeout(r, 61000));
    res = await attempt();
  }
  done += res.filter(Boolean).length; failed += res.filter((r) => !r).length;
  if (res.every((r) => !r)) { console.log("embed: cả lô thất bại sau khi chờ (hết quota ngày mọi key?) -> dừng, mai chạy tiếp."); break; }
  if (res.some(Boolean)) waited = false; // có lô thành công thì cho phép nghỉ lại lần sau
}
if (failed) console.log(`embed: ${failed} tin lỗi (bỏ qua, mai thử lại).`);
console.log(`embed: đã tạo embedding cho ${done}/${data?.length ?? 0} tin.`);
