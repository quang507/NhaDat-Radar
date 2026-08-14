// Tạo embedding (Gemini text-embedding-004, free) cho tin chưa có -> cột listings.embedding (pgvector).
// Chạy sau seed trong daily.mjs (cần migration 003). Thiếu GEMINI key -> bỏ qua êm.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KEYS = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY2, process.env.GEMINI_API_KEY3,
  process.env.GEMINI_API_KEY4, process.env.GEMINI_API_KEY5].filter(Boolean);
if (!url || !key) { console.error("embed: thiếu SUPABASE env"); process.exit(0); }
if (!KEYS.length) { console.log("embed: chưa có GEMINI_API_KEY -> bỏ qua."); process.exit(0); }

const sb = createClient(url, key, { auth: { persistSession: false } });

async function embed(text) {
  for (const k of KEYS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${k}`,
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: { parts: [{ text: text.slice(0, 1500) }] } }) },
      );
      if (res.status === 429) continue;
      const j = await res.json();
      if (j?.embedding?.values) return j.embedding.values;
    } catch { /* xoay key */ }
  }
  return null;
}

const { data, error } = await sb.from("listings")
  .select("id,title,description,district,province,kind,deal")
  .eq("status", "published").is("embedding", null).limit(300);
if (error) { console.error("embed:", error.message, "(đã chạy migration 003 chưa?)"); process.exit(0); }

let done = 0;
for (const l of data ?? []) {
  const text = [l.title, l.description, l.kind, l.deal, l.district, l.province].filter(Boolean).join(" · ");
  const v = await embed(text);
  if (!v) break; // hết quota mọi key -> dừng, mai chạy tiếp
  await sb.from("listings").update({ embedding: v }).eq("id", l.id);
  done++;
}
console.log(`embed: đã tạo embedding cho ${done}/${data?.length ?? 0} tin.`);
