// Nguồn FACEBOOK -> listing chuẩn. Bài FB là text tự do -> để Gemini trích field + lọc rác + phân loại cò/cá nhân.
// 3 chế độ:
//   node facebook.mjs --demo                 : chạy thử trên bài mẫu (cần GEMINI_API_KEY) — KHÔNG cần FB
//   node facebook.mjs --apify apify_out.json : xử lý JSON xuất từ Apify FB Group Scraper (nhóm public: KHÔNG cần clone)
//   node facebook.mjs --playwright           : tự cào bằng Playwright + fb-cookies.json (cookies clone của bạn, chạy ở MÁY BẠN)
import fs from "node:fs";

const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Nhóm mục tiêu (từ ảnh của bạn) — dùng cho chế độ Apify/Playwright
export const GROUPS = [
  "Nhà Đất TP Hồ Chí Minh- Mua Bán", "BẤT ĐỘNG SẢN TPHCM", "MUA BÁN, CHO THUÊ NHÀ ĐẤT TPHCM ( Nhà Tốt )",
  "NHÓM MUA BÁN GIAO DỊCH BẤT ĐỘNG SẢN NHÀ PHỐ TP.HCM", "Mua Bán Nhà, Đất Gò Vấp - Q12 - Hóc Môn - Củ Chi",
  "Hội Mua Bán Nhà Đất Giá Rẻ TPHCM", "HỘI MUA BÁN CHUNG CƯ SÀI GÒN",
];

const SYS = `Bạn trích xuất & phân loại tin BĐS từ bài đăng nhóm Facebook (văn phong lộn xộn, nhiều emoji, viết tắt).
Người đăng: "moi_gioi" nếu marketing (em/mình hỗ trợ vay, quỹ căn, hoa hồng, nhiều emoji 🔥, đăng nhiều căn, "bên em");
"ca_nhan" nếu "chính chủ", giọng cá nhân, 1 BĐS; "khong_ro" nếu thiếu tín hiệu. Chỉ suy từ nội dung, không bịa.`;
const SCHEMA = `Trả về DUY NHẤT 1 JSON:
{"is_property":bool, "price_vnd":number|null, "area_m2":number|null, "bedrooms":number|null,
 "city":string|null,"district":string|null,"ward":string|null,"street":string|null,
 "legal":string|null,"listing_type":"ban"|"cho_thue"|null,
 "property_type":"nha"|"dat"|"can_ho"|"mat_bang"|"phong_tro"|"khac",
 "amenities":string[], "poster_type":"moi_gioi"|"ca_nhan"|"khong_ro","poster_reason":string,
 "scam_suspect":bool, "title_clean":string}`;

async function gemini(text) {
  if (!KEY) throw new Error("Thiếu GEMINI_API_KEY");
  const body = {
    systemInstruction: { parts: [{ text: SYS }] },
    contents: [{ parts: [{ text: SCHEMA + "\n\n--- BÀI ĐĂNG ---\n" + text }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0 },
  };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json();
  if (!res.ok) throw new Error("Gemini " + res.status + ": " + JSON.stringify(j).slice(0, 160));
  return JSON.parse(j.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
}

// post thô {text, author, url, time} -> listing chuẩn (bỏ nếu không phải BĐS)
async function toListing(post) {
  const ai = await gemini(post.text);
  if (!ai.is_property) return null;
  return {
    id: "fb-" + (post.id || Math.abs(hash(post.text)).toString(36)),
    source: "crawl", source_site: "facebook", source_url: post.url || "#", source_post_id: post.id || null,
    title: ai.title_clean || (post.text || "").slice(0, 80),
    description: (post.text || "").slice(0, 1100),
    price_vnd: ai.price_vnd ?? null, area_m2: ai.area_m2 ?? null,
    price_per_m2: ai.price_vnd && ai.area_m2 ? Math.round(ai.price_vnd / ai.area_m2) : null,
    bedrooms: ai.bedrooms ?? null, bathrooms: null, floors: null,
    direction: null, legal: ai.legal ?? null, furnishing: null,
    listing_type: ai.listing_type || "cho_thue", property_type: ai.property_type || "khac",
    province: ai.city ?? null, district: ai.district ?? null, ward: ai.ward ?? null,
    lat: null, lng: null, // FB post không có toạ độ -> geocode.mjs bù sau theo district/ward
    amenities: ai.amenities || [],
    poster_role: ai.poster_type === "ca_nhan" ? "chu_nha" : ai.poster_type === "moi_gioi" ? "moi_gioi" : "khong_ro",
    poster_name: post.author || null, poster_reason: ai.poster_reason,
    scam_suspect: !!ai.scam_suspect, ai_score: ai.scam_suspect ? 45 : 80,
    freshness_min: 30, images: post.images || [],
  };
}
function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }

// ---- Chế độ Playwright: cào bằng cookies clone (chạy ở máy bạn) ----
async function scrapePlaywright() {
  const { chromium } = await import("playwright"); // npm i playwright && npx playwright install chromium
  const cookies = JSON.parse(fs.readFileSync(new URL("./fb-cookies.json", import.meta.url))); // bạn export từ trình duyệt đã login clone
  const ctx = await (await chromium.launch({ headless: true })).newContext();
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  const groupUrls = JSON.parse(process.env.FB_GROUP_URLS || "[]"); // ["https://facebook.com/groups/xxxx", ...]
  const posts = [];
  for (const url of groupUrls) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 3000); await sleep(1800); } // cuộn như người
    const texts = await page.$$eval('div[role="article"]', (nodes) =>
      nodes.map((n) => ({ text: n.innerText || "", url: (n.querySelector('a[href*="/posts/"],a[href*="/permalink/"]') || {}).href || "" })));
    texts.filter((t) => t.text.length > 40).forEach((t) => posts.push(t));
    await sleep(2500);
  }
  await ctx.close();
  return posts;
}

const DEMO = [
  { author: "Minh Trọ", text: "Cho thuê phòng trọ mới xây Bình Thạnh, đường Điện Biên Phủ, phường 15. DT 25m2 có gác lửng, máy lạnh, wifi, giờ giấc tự do. Giá 3tr8/tháng. Chính chủ cho thuê không qua trung gian nhé. LH 090xxxxxxx" },
  { author: "Hùng BĐS", text: "🔥🔥 BÁN GẤP nhà hẻm xe hơi Gò Vấp 📍 4x15m, 1 trệt 2 lầu, sổ hồng riêng chính chủ. Giá chỉ 5.6 tỷ TL mạnh. Em Hùng hỗ trợ vay 70% ngân hàng, bên em còn nhiều căn khu vực Gò Vấp - Q12. Call/Zalo 0908xxxxxx 📞📞" },
  { author: "Shop Nội Thất", text: "Thanh lý bàn ghế văn phòng cũ, tủ hồ sơ, giá rẻ như cho. Nhận ký gửi thanh lý nội thất. Ai cần ib mình nha 093xxxxxxx" },
  { author: "Lan Anh", text: "Cần cho thuê căn hộ 2PN 2WC Vinhomes Grand Park Quận 9, 68m2 full nội thất cao cấp, view sông thoáng mát. 12 triệu/tháng bao phí quản lý. Ưu tiên khách ở lâu dài, dọn vào ở ngay." },
];

async function run() {
  const arg = process.argv[2];
  let posts = [];
  if (arg === "--demo") posts = DEMO;
  else if (arg === "--apify") {
    // Nhận output từ nhiều actor Apify khác nhau (tên field khác nhau -> map linh hoạt)
    const raw = JSON.parse(fs.readFileSync(process.argv[3]));
    const arr = Array.isArray(raw) ? raw : raw.items || raw.posts || [];
    posts = arr.map((p) => ({
      id: p.postId || p.id || p.legacyId || p.topLevelUrl,
      text: p.text || p.postText || p.message || p.content || p.caption || "",
      author: p.user?.name || p.authorName || p.author?.name || p.ownerName || p.pageName || null,
      url: p.url || p.postUrl || p.facebookUrl || p.permalink || p.topLevelUrl || "#",
      time: p.time || p.date || p.timestamp || p.publishTime || null,
      images: (p.media || p.attachments || p.images || []).map?.((m) => m?.url || m?.image || m?.src || m).filter(Boolean) || [],
    })).filter((p) => (p.text || "").length > 30);
  } else if (arg === "--playwright") posts = await scrapePlaywright();
  else { console.error("Dùng: --demo | --apify <file.json> | --playwright"); process.exit(1); }

  const out = [];
  for (const p of posts) {
    try {
      const l = await toListing(p);
      if (arg === "--demo") {
        console.error("\n■", (p.text || "").slice(0, 60).replace(/\n/g, " "));
        console.error(l ? `  → ${l.property_type}/${l.listing_type} · giá ${l.price_vnd} · ${l.area_m2}m² · ${l.ward || l.district} · ${l.poster_role} (scam:${l.scam_suspect})` : "  → BỎ (không phải tin BĐS)");
        if (l) console.error("    lý do phân loại:", l.poster_reason);
      }
      if (l) out.push(l);
    } catch (e) { console.error("  lỗi:", e.message); }
    await sleep(1100);
  }
  fs.writeFileSync(new URL("./facebook.json", import.meta.url), JSON.stringify({ summary: { source: "facebook", total: out.length }, listings: out }, null, 0));
  console.error(`\nGiữ ${out.length}/${posts.length} bài là tin BĐS -> facebook.json (đã lọc rác + phân loại)`);
}
run();
