// Làm mới data 1 ngày/lần. Chạy tay: node crawler/daily.mjs  |  Tự động: GitHub Actions (.github/workflows/daily-crawl.yml)
// Nguồn chạy headless được: Chợ Tốt (API) + nhadat.vn (HTTP). Batdongsan/Facebook/dự án: cào riêng (Cloudflare/đăng nhập).
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const here = import.meta.dirname;
function step(cmd) {
  try { console.log("▶", cmd); execSync(cmd, { stdio: "inherit", cwd: here }); return true; }
  catch (e) { console.error("✗ lỗi:", cmd, e.message); return false; }
}

// 1) Crawl các nguồn headless (Chợ Tốt API + nhadat HTTP + Mogi HTML)
step("node chotot.mjs");
step("node mogi.mjs");
if (step("node crawl.js")) step("node geocode.mjs");   // nhadat -> geocode
// FB: ưu tiên Playwright (free, cần secret FB_COOKIES_JSON ghi ra fb-cookies.json) -> fallback Apify (tốn phí)
if (fs.existsSync(new URL("./fb-cookies.json", import.meta.url)) && process.env.FB_GROUP_URLS) {
  step("node facebook.mjs --playwright");
} else if (process.env.APIFY_TOKEN && process.env.FB_GROUP_URLS) {
  step("node facebook.mjs --apify-run");
}
step("node merge.mjs");                                 // gộp tất cả nguồn -> combined.json
step("node geocode-all.mjs");                           // bù toạ độ cho MỌI tin thiếu (để tin nào cũng có map)

// 2) Seed vào Supabase (thay data crawl cũ)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (đặt trong GitHub Secrets)"); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });
const now = new Date().toISOString();

const comb = JSON.parse(fs.readFileSync(new URL("./combined.json", import.meta.url)));
const rows = comb.listings.map((x) => ({
  source: "crawl", source_site: x.source_site, source_url: x.url, source_post_id: x.source_post_id || x.id,
  deal: x.listing_type, kind: x.property_type, title: x.title, description: x.description,
  price_vnd: x.price_vnd, area_m2: x.area_m2, bedrooms: x.bedrooms, bathrooms: x.bathrooms, floors: x.floors,
  direction: x.direction, legal_status: x.legal, furnishing: x.furnishing,
  province: x.province, district: x.district, ward: x.ward, lat: x.lat ?? null, lng: x.lng ?? null,
  amenities: x.amenities || [], images: x.images || [], contact_phone: null,
  ai_score: x.ai_score, trust_score: x.price_warning ? 55 : 78, poster_role_guess: x.poster_role,
  price_flag: x.price_warning || null, status: "published", crawled_at: now, first_seen_at: now,
}));
await sb.from("listings").delete().eq("source", "crawl");
const { data, error } = await sb.from("listings").insert(rows).select("id");
if (error) { console.error("Seed lỗi:", error.message); process.exit(1); }
console.log(`✅ ${now.slice(0, 10)}: làm mới ${data.length} tin (${rows.filter((r) => r.images.length).length} có ảnh).`);

// 3) Hậu xử lý: snapshot lịch sử giá + gửi email báo tin mới (đều tự bỏ qua nếu thiếu env)
step("node price-history.mjs");
step("node alerts.mjs");
step("node embed.mjs"); // embedding cho tìm kiếm ngữ nghĩa (cần migration 003 + GEMINI key)
