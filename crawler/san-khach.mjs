// ĐẨY "KHÁCH TÌM PHÒNG" LÊN DB (2/10): crawler/facebook-demand.json (facebook.mjs ghi) -> bảng buyers,
// đánh dấu preferences.loai = "san_khach" để /admin?tab=san-khach hiện riêng (tab CRM không lẫn vào).
// Không cần migration: dùng bảng buyers có sẵn (025_crm_core), mọi trường nhu cầu nằm trong preferences.
//
//   node --env-file=.env.local crawler/san-khach.mjs      (daily.mjs --fb-only tự gọi sau bước Facebook)
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { PHONE_RE } from "./quality-gate.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const FILE = new URL("./facebook-demand.json", import.meta.url);
if (!fs.existsSync(FILE)) { console.log("san-khach: chưa có facebook-demand.json - bỏ qua"); process.exit(0); }
const { khach = [], crawled_at } = JSON.parse(fs.readFileSync(FILE, "utf8"));
if (!khach.length) { console.log("san-khach: 0 bài khách tìm phòng"); process.exit(0); }

const sb = createClient(url, key, { auth: { persistSession: false } });

// bài đã đưa lên (14 ngày gần nhất) -> khỏi trùng. Khoá: link bài, không có link thì 120 ký tự đầu nội dung
const khoa = (k) => k.url || String(k.text || "").slice(0, 120);
const tu = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
const daCo = new Set();
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from("buyers").select("preferences").eq("preferences->>loai", "san_khach")
    .gte("created_at", tu).order("created_at").range(from, from + 999);
  if (error) { console.error("san-khach: đọc bài cũ lỗi:", error.message); process.exit(1); }
  for (const r of data || []) daCo.add(r.preferences?.url || r.preferences?.khoa);
  if (!data || data.length < 1000) break;
}

const moi = khach.filter((k) => !daCo.has(khoa(k)));
const rows = moi.map((k) => ({
  name: k.author || "Khách Facebook",
  phone: (String(k.text || "").match(PHONE_RE)?.[0] || "").replace(/[\s.\-]/g, "") || null,
  notes: k.nc?.tom_tat || null,
  preferences: { loai: "san_khach", nguon: "facebook", url: k.url, khoa: khoa(k), noi_dung: k.text, dang_luc: k.time || crawled_at, ...k.nc },
}));
for (let i = 0; i < rows.length; i += 100) {
  const { error } = await sb.from("buyers").insert(rows.slice(i, i + 100));
  if (error) { console.error("san-khach: ghi lỗi:", error.message); process.exit(1); }
}
console.log(`✓ san-khach: ${rows.length} khách mới (bỏ ${khach.length - rows.length} bài đã có) -> /admin?tab=san-khach`);
