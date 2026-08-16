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
//    `node daily.mjs --seed-only`: bỏ qua cào, chỉ merge + seed từ file đang có (test nhanh trên máy)
const SEED_ONLY = process.argv.includes("--seed-only");
if (!SEED_ONLY) {
  step("node chotot.mjs");
  step("node mogi.mjs");
  step("node extra-sites.mjs");                          // batdongsantoanquoc + bannhadat123 + sosanhnha
  step("node batdongsan.mjs");                           // Cloudflare -> cần Playwright (devDep + npx playwright install chromium);
                                                         // bị chặn thì giữ file cũ, merge tự bỏ qua file quá 2 ngày
  // nhadat.vn: domain đã về VNNIC (tên miền hết hạn, cert *.vnnic.vn — kiểm chứng 16/8/2026) -> nguồn CHẾT, bỏ khỏi pipeline.
  // Giữ crawl.js/geocode.mjs trong repo phòng khi họ hồi sinh: chạy tay `node crawl.js && node geocode.mjs`.
  // FB: IP GitHub Actions bị Facebook chặn (kiểm chứng 14/8: 13 nhóm đều trả trang login,
  // 0 bài, tốn ~9 phút/run) -> CI BỎ QUA FB hẳn. Chạy máy nhà (IP dân cư) vẫn cào bình thường.
  if (process.env.GITHUB_ACTIONS) {
    console.log("↷ Bỏ qua Facebook trên CI (IP datacenter bị chặn) — chạy crawl-local.bat trên máy nhà để lấy tin FB.");
  } else if (fs.existsSync(new URL("./fb-cookies.json", import.meta.url)) && process.env.FB_GROUP_URLS) {
    step("node facebook.mjs --playwright");
  } else if (process.env.APIFY_TOKEN && process.env.FB_GROUP_URLS) {
    step("node facebook.mjs --apify-run");
  }
}
step("node merge.mjs");                                 // gộp tất cả nguồn -> combined.json
if (!SEED_ONLY) step("node geocode-all.mjs");           // bù toạ độ cho MỌI tin thiếu (để tin nào cũng có map)

// 2) Seed vào Supabase (thay data crawl cũ)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (đặt trong GitHub Secrets)"); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });
const now = new Date().toISOString();

const comb = JSON.parse(fs.readFileSync(new URL("./combined.json", import.meta.url)));

// Vòng đời tin (học Homigo: firstSeenAt/lastSeenAt/crawlCount): KHÔNG xoá-chèn nữa.
// - Tin đã có (cùng source_site + source_post_id) -> UPDATE theo id: giữ first_seen_at, giữ embedding, crawl_count+1, last_seen_at=now
// - Tin mới -> INSERT với first_seen_at=now  ("Radar thấy tin X trước" vẫn TRUNG THỰC)
// - Tin không còn thấy ≥ 36h (≈2 lần cào ngày) -> status 'gone' (ẩn khỏi tìm kiếm, chi tiết vẫn mở kèm nhãn) — không biến mất im lặng
// PostgREST cắt 1000 dòng/lần -> phải phân trang, không thì tin cũ ngoài 1000 bị coi là mới -> insert đụng
// unique index uq_listings_source_post (migration 001) và seed thất bại.
const oldRows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from("listings")
    .select("id,source_site,source_post_id,first_seen_at,crawl_count").eq("source", "crawl").not("source_post_id", "is", null)
    .order("id").range(from, from + 999);
  if (error) { console.error("Đọc tin cũ lỗi:", error.message); process.exit(1); }
  oldRows.push(...(data || []));
  if (!data || data.length < 1000) break;
}
const oldMap = new Map(oldRows.map((r) => [r.source_site + "|" + r.source_post_id, r]));
console.log(`(DB đang có ${oldRows.length} tin crawl)`);

// Độ tin cậy: heuristic có phổ theo dữ liệu thật (trước đây gán cứng 78 cho mọi tin).
function trustScore(x) {
  let s = 58;
  const imgs = (x.images || []).length;
  if (imgs >= 3) s += 9; else if (imgs) s += 4;
  if (x.legal) s += 8;
  if (x.phone_hash) s += 5;
  if ((x.description || "").length > 300) s += 5;
  if (x.poster_role === "chu_nha") s += 6;
  if (x.price_vnd && x.area_m2) s += 4;
  if (x.price_warning) s -= 20;
  return Math.max(35, Math.min(95, s));
}

const seenKey = new Set();
const rows = [];
for (const x of comb.listings) {
  const key = x.source_site + "|" + (x.source_post_id || x.id);
  if (seenKey.has(key)) continue; seenKey.add(key);
  const old = oldMap.get(key);
  rows.push({
    ...(old ? { id: old.id } : {}),
    source: "crawl", source_site: x.source_site, source_url: x.url, source_post_id: x.source_post_id || x.id,
    deal: x.listing_type, kind: x.property_type, title: x.title, description: x.description,
    price_vnd: x.price_vnd, area_m2: x.area_m2, bedrooms: x.bedrooms, bathrooms: x.bathrooms, floors: x.floors,
    direction: x.direction, legal_status: x.legal, furnishing: x.furnishing,
    province: x.province, district: x.district, ward: x.ward, lat: x.lat ?? null, lng: x.lng ?? null,
    amenities: x.amenities || [], images: x.images || [],
    contact_phone: null,                                   // NĐ13: không lưu SĐT thô của tin cào
    phone_masked: x.phone_masked ?? null,                  // đã che 4 số -> hiển thị được (giống Homigo)
    ai_score: x.ai_score, trust_score: trustScore(x), poster_role_guess: x.poster_role,
    poster_listing_count: x.poster_listing_count ?? null, poster_reasons: x.poster_reasons || [],
    price_flag: x.price_warning || null,
    source_count: x.source_count || 1, source_sites: x.source_sites || [x.source_site],
    posted_at: x.posted_at ?? null,                        // đăng trên nguồn lúc (nếu nguồn có)
    status: "published", crawled_at: now, last_seen_at: now,
    first_seen_at: (old && old.first_seen_at) || now,
    crawl_count: old ? (old.crawl_count || 1) + 1 : 1,
  });
}
const updates = rows.filter((r) => r.id), inserts = rows.filter((r) => !r.id);
const CHUNK = 200;
for (let i = 0; i < updates.length; i += CHUNK) {
  const { error } = await sb.from("listings").upsert(updates.slice(i, i + CHUNK), { onConflict: "id" });
  if (error) { console.error("Seed (update) lỗi:", error.message); process.exit(1); }
}
for (let i = 0; i < inserts.length; i += CHUNK) {
  const { error } = await sb.from("listings").insert(inserts.slice(i, i + CHUNK));
  if (error) { console.error("Seed (insert) lỗi:", error.message); process.exit(1); }
}
// Tin crawl không thấy lại ≥36h -> gone; nguồn chỉ cào được ở máy nhà (FB, batdongsan qua Playwright) cho 7 ngày
// vì máy nhà không chạy mỗi ngày; gone quá 30 ngày -> xoá hẳn (giữ DB gọn)
const HOME_ONLY = ["facebook.com", "facebook", "batdongsan.com.vn"];
// Hàng cũ chưa có last_seen_at (seed đời cũ / chèn tay) -> coi lần thấy = lúc cào/thấy lần đầu, để không "sống mãi" vì NULL lọt lưới
{
  const { data: nulls } = await sb.from("listings").select("id,crawled_at,first_seen_at,created_at").eq("source", "crawl").is("last_seen_at", null).limit(5000);
  for (let i = 0; i < (nulls || []).length; i += 20)
    await Promise.all(nulls.slice(i, i + 20).map((r) => sb.from("listings").update({ last_seen_at: r.crawled_at || r.first_seen_at || r.created_at }).eq("id", r.id)));
  if (nulls?.length) console.log(`(backfill last_seen_at cho ${nulls.length} tin cũ thiếu mốc)`);
}
const goneCutoff = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
const goneCutoffHome = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
const { count: goneN1 } = await sb.from("listings").update({ status: "gone" }, { count: "exact" })
  .eq("source", "crawl").eq("status", "published").not("source_site", "in", `(${HOME_ONLY.map((s) => `"${s}"`).join(",")})`).lt("last_seen_at", goneCutoff);
const { count: goneN2 } = await sb.from("listings").update({ status: "gone" }, { count: "exact" })
  .eq("source", "crawl").eq("status", "published").in("source_site", HOME_ONLY).lt("last_seen_at", goneCutoffHome);
const goneN = (goneN1 || 0) + (goneN2 || 0);
const purgeCutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
const { count: purgedN } = await sb.from("listings").delete({ count: "exact" })
  .eq("source", "crawl").eq("status", "gone").lt("last_seen_at", purgeCutoff);
console.log(`✅ ${now.slice(0, 10)}: ${inserts.length} tin mới · ${updates.length} tin còn sống (cập nhật) · ${goneN || 0} tin vừa gỡ (gone) · ${purgedN || 0} gone cũ xoá · ${rows.filter((r) => r.images.length).length} có ảnh · ${rows.filter((r) => r.source_count > 1).length} tin ≥2 nguồn · ${rows.filter((r) => r.price_flag).length} tin cờ giá.`);

// 2b) Dọn tin bóc từ group Zalo quá 1 NĂM (giữ lâu hơn tin crawl vì group không re-seed;
// tin DM tự đăng (zalo_bot) và tin user coi như tin người dùng — KHÔNG tự xóa)
const zaloCutoff = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
const { count: zaloDeleted, error: zaloErr } = await sb.from("listings")
  .delete({ count: "exact" }).eq("source_site", "zalo_group").lt("created_at", zaloCutoff);
if (zaloErr) console.error("Dọn tin zalo_group lỗi:", zaloErr.message);
else if (zaloDeleted) console.log(`🧹 Xóa ${zaloDeleted} tin zalo_group quá 1 năm.`);

// 3) Hậu xử lý: snapshot lịch sử giá + gửi email báo tin mới (đều tự bỏ qua nếu thiếu env)
if (!SEED_ONLY) {
  step("node price-history.mjs");
  step("node alerts.mjs");
  step("node embed.mjs"); // embedding cho tìm kiếm ngữ nghĩa (cần migration 003 + GEMINI key) — giờ upsert nên embedding cũ được giữ, chỉ embed tin mới
}
