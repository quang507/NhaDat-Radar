// Snapshot giá/m² trung vị theo (tỉnh, quận, loại, deal) mỗi ngày -> bảng price_history.
// Chạy sau seed trong daily.mjs. Vài tuần tích luỹ là vẽ được biểu đồ "giá khu vực X tăng Y%".
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("price-history: thiếu SUPABASE env"); process.exit(0); }
const sb = createClient(url, key, { auth: { persistSession: false } });

const { data } = await sb.from("listings")
  .select("province,district,kind,deal,price_per_m2")
  .eq("status", "published").not("price_per_m2", "is", null).gt("price_per_m2", 0).limit(5000);

const groups = new Map();
for (const r of data ?? []) {
  if (!r.province) continue;
  const k = [r.province, r.district || "", r.kind, r.deal].join("|");
  (groups.get(k) ?? groups.set(k, []).get(k)).push(Number(r.price_per_m2));
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };

const day = new Date().toISOString().slice(0, 10);
const rows = [...groups.entries()]
  .filter(([, v]) => v.length >= 3)
  .map(([k, v]) => {
    const [province, district, kind, deal] = k.split("|");
    return { day, province, district, kind, deal, median_ppm2: median(v), n: v.length };
  });

// Thêm dòng tổng hợp toàn tỉnh (district='', kind='all') cho biểu đồ xu hướng ở /thong-ke
const provGroups = new Map();
for (const r of data ?? []) {
  if (!r.province) continue;
  const k = [r.province, r.deal].join("|");
  (provGroups.get(k) ?? provGroups.set(k, []).get(k)).push(Number(r.price_per_m2));
}
for (const [k, v] of provGroups) {
  if (v.length < 5) continue;
  const [province, deal] = k.split("|");
  rows.push({ day, province, district: "", kind: "all", deal, median_ppm2: median(v), n: v.length });
}

if (rows.length) {
  const { error } = await sb.from("price_history").upsert(rows);
  if (error) console.error("price-history lỗi:", error.message);
  else console.log(`price-history: lưu ${rows.length} nhóm khu vực cho ${day}.`);
} else console.log("price-history: chưa đủ dữ liệu.");
