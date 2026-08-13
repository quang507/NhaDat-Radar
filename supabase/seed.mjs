// Nạp tin đã crawl (Lớp A) vào Supabase. Dùng SERVICE_ROLE (bỏ qua RLS) — chạy ở máy anh, KHÔNG deploy.
//   node supabase/seed.mjs
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

const raw = JSON.parse(fs.readFileSync(new URL("./seed-listings.json", import.meta.url)));
const rows = raw.listings.map((x) => ({
  source: "crawl",
  source_site: x.source_site || "nhadat.vn",
  source_url: x.url,
  source_post_id: x.id,
  deal: x.listing_type,                 // 'ban' | 'cho_thue'
  kind: x.property_type,                // 'nha' | 'dat' | 'can_ho' | ...
  title: x.title,
  description: x.description,
  price_vnd: x.price_vnd,
  area_m2: x.area_m2,
  bedrooms: x.bedrooms, bathrooms: x.bathrooms, floors: x.floors,
  direction: x.direction, legal_status: x.legal, furnishing: x.furnishing,
  province: x.province, district: x.district,
  lat: x.lat ?? null, lng: x.lng ?? null,
  amenities: x.amenities,
  contact_phone: null,                  // ẩn SĐT ở bản tổng hợp (NĐ13)
  ai_score: x.ai_score,
  trust_score: x.price_warning ? 55 : 78,
  poster_role_guess: x.poster_role,
  price_flag: x.price_warning || null,
  dedupe_key: x.phone_hash ? `${x.phone_hash}:${x.district}:${x.price_vnd}` : null,
  status: "published",
  crawled_at: new Date().toISOString(),
  first_seen_at: new Date().toISOString(),
}));

const { data, error } = await sb.from("listings")
  .upsert(rows, { onConflict: "source_post_id", ignoreDuplicates: true })
  .select("id");
if (error) { console.error("Seed lỗi:", error.message); process.exit(1); }
console.log(`Đã nạp ${data?.length ?? 0}/${rows.length} tin crawl vào Supabase.`);
