// Nguồn FACEBOOK -> listing chuẩn. Bài FB là text tự do -> để Gemini trích field + lọc rác + phân loại cò/cá nhân.
// 3 chế độ:
//   node facebook.mjs --demo                 : chạy thử trên bài mẫu (cần GEMINI_API_KEY) — KHÔNG cần FB
//   node facebook.mjs --apify apify_out.json : xử lý JSON xuất từ Apify FB Group Scraper (nhóm public: KHÔNG cần clone)
//   node facebook.mjs --playwright           : tự cào bằng Playwright + fb-cookies.json (cookies clone của bạn, chạy ở MÁY BẠN)
import fs from "node:fs";

// Xoay nhiều key Gemini (từ nhiều PROJECT/acc) để né 429. Cũng nhận GEMINI_API_KEYS="k1,k2,k3".
const KEYS = [
  ...(process.env.GEMINI_API_KEYS || "").split(",").map((s) => s.trim()),
  process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY2, process.env.GEMINI_API_KEY3,
  process.env.GEMINI_API_KEY4, process.env.GEMINI_API_KEY5,
].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
let _ki = 0;
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
  if (!KEYS.length) throw new Error("Thiếu GEMINI_API_KEY");
  const body = {
    systemInstruction: { parts: [{ text: SYS }] },
    contents: [{ parts: [{ text: SCHEMA + "\n\n--- BÀI ĐĂNG ---\n" + text }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0 },
  };
  for (let attempt = 0; attempt < KEYS.length; attempt++) {
    const key = KEYS[_ki % KEYS.length];
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.status === 429) { _ki++; continue; }   // key hết quota -> xoay sang key khác
    const j = await res.json();
    if (!res.ok) throw new Error("Gemini " + res.status + ": " + JSON.stringify(j).slice(0, 160));
    const raw = j.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    // Gemini thỉnh thoảng trả escape hỏng ("\u" cụt, emoji) -> "Bad Unicode escape" làm mất tin; vá nhẹ rồi parse lại
    try { return JSON.parse(raw); }
    catch { return JSON.parse(raw.replace(/\\u(?![0-9a-fA-F]{4})/g, "\\\\u").replace(/[\x00-\x1f]/g, "")); }
  }
  throw new Error("Tất cả " + KEYS.length + " key Gemini đều 429 (hết quota) - cần thêm key project khác hoặc bật trả phí");
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

// Chuẩn hoá cookie export (Cookie-Editor / EditThisCookie) -> đúng schema Playwright cần.
// Cookie-Editor dùng expirationDate + sameSite "no_restriction"/"lax"; Playwright cần expires + "None"/"Lax"/"Strict".
function normalizeCookies(raw) {
  const ss = { no_restriction: "None", lax: "Lax", strict: "Strict", none: "None" };
  return raw
    .filter((c) => c && c.name && c.value)
    .map((c) => {
      const out = {
        name: c.name,
        value: c.value,
        domain: c.domain || ".facebook.com",
        path: c.path || "/",
        secure: c.secure !== false,
        httpOnly: !!c.httpOnly,
      };
      const sameSite = ss[String(c.sameSite || "").toLowerCase()];
      if (sameSite) out.sameSite = sameSite;
      const exp = c.expires ?? c.expirationDate;
      if (exp && !c.session) out.expires = Math.round(exp);
      return out;
    });
}

// ---- Chế độ Playwright: cào bằng cookies clone ----
async function scrapePlaywright() {
  const { chromium } = await import("playwright");
  const raw = JSON.parse(fs.readFileSync(new URL("./fb-cookies.json", import.meta.url)));
  const cookies = normalizeCookies(raw);
  console.error(`FB: nạp ${cookies.length} cookie`);
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled", "--disable-dev-shm-usage", "--lang=vi-VN"],
  });
  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 900 },
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    deviceScaleFactor: 1,
  });
  // Ẩn dấu hiệu automation (navigator.webdriver, languages, plugins) — giảm bị FB chặn headless
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "languages", { get: () => ["vi-VN", "vi", "en-US"] });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
  });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();

  await page.goto("https://www.facebook.com/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(4000);
  // Kiểm tra THẬT: FB xoá cookie xs/c_user ngay khi phiên không hợp lệ (trang chủ khi đó hiện màn "Tiếp tục / Dùng trang
  // cá nhân khác" — KHÔNG có ô mật khẩu, nên check cũ báo "đăng nhập OK" giả và các nhóm chỉ ra 1-3 bài công khai, 16/8).
  const alive = (await ctx.cookies("https://www.facebook.com")).some((c) => c.name === "c_user");
  if (!alive || page.url().includes("/login") || (await page.$('input[name="pass"]'))) {
    console.error("⚠ FB: phiên cookie KHÔNG hợp lệ (FB đã xoá c_user/xs) -> đăng nhập lại acc clone trên Chrome rồi Export cookie mới bằng Cookie-Editor.");
    await browser.close();
    return [];
  }
  console.error("FB: đăng nhập OK (c_user còn sống)");

  const groupUrls = JSON.parse(process.env.FB_GROUP_URLS || "[]");
  const posts = [];
  // Nhiều selector cho bài viết (FB đổi DOM liên tục + nhóm mua/bán layout khác)
  const POST_SEL = 'div[role="article"], div[role="feed"] > div, div[data-pagelet^="GroupFeed"] > div, div[aria-posinset]';
  for (const raw0 of groupUrls) {
    const url = raw0.replace(/\/$/, "") + "/";
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      // FB ẢO HOÁ feed: chỉ giữ ~3 bài trong DOM, cuộn xuống là bài cũ bị gỡ -> phải GOM SAU MỖI LẦN CUỘN
      // (bản cũ chỉ bốc 1 lần cuối -> mãi 3 bài/nhóm, kiểm chứng 16/8). Khử trùng theo link/text; dừng khi đủ
      // FB_POSTS (mặc định 30) hoặc 4 lần cuộn liên tiếp không thêm bài mới.
      const WANT = Number(process.env.FB_POSTS || 30);
      const seen = new Map(); // key -> {text,url}
      let stale = 0;
      for (let i = 0; i < 40 && seen.size < WANT; i++) {
        const batch = await page.$$eval(POST_SEL, (nodes) =>
          nodes.map((n) => ({
            text: n.innerText || "",
            url: (n.querySelector('a[href*="/posts/"],a[href*="/permalink/"],a[href*="/groups/"][href*="/posts"]') || {}).href || "",
          }))).catch(() => []);
        const before = seen.size;
        for (const t of batch) {
          if (t.text.length <= 40) continue;
          const key = (t.url && t.url.replace(/[?#].*$/, "")) || t.text.slice(0, 120);
          if (!seen.has(key)) seen.set(key, t);
        }
        if (seen.size === before) { if (++stale >= 4 && seen.size > 0) break; } else stale = 0;
        await page.mouse.wheel(0, 2500);
        await sleep(2200);
      }
      const kept = [...seen.values()];
      if (!kept.length) {
        // Chẩn đoán: FB trả về gì? (login wall / checkpoint / trang rỗng do chặn headless)
        const title = await page.title().catch(() => "");
        const bodyLen = await page.$eval("body", (b) => (b.innerText || "").length).catch(() => 0);
        const snippet = await page.$eval("body", (b) => (b.innerText || "").replace(/\s+/g, " ").slice(0, 140)).catch(() => "");
        console.error(`⚠ FB: nhóm ${raw0} -> 0 bài | title="${title}" | body ${bodyLen} ký tự | "${snippet}"`);
      } else {
        console.error(`FB: nhóm ${raw0} -> ${kept.length} bài`);
        kept.forEach((t) => posts.push(t));
      }
      await sleep(2500);
    } catch (e) {
      console.error(`⚠ FB: lỗi nhóm ${raw0}:`, e.message);
    }
  }
  await browser.close();
  console.error(`FB: tổng thu được ${posts.length} bài thô`);
  return posts;
}

// --- Chế độ Apify API: gọi actor facebook-groups-scraper, lấy bài -> xử lý (dùng trong daily) ---
async function apifyRun() {
  const token = process.env.APIFY_TOKEN;
  const groups = JSON.parse(process.env.FB_GROUP_URLS || "[]");
  if (!token || !groups.length) { console.error("Thiếu APIFY_TOKEN / FB_GROUP_URLS"); return []; }
  const input = {
    startUrls: groups.map((u) => ({ url: u })),
    resultsLimit: Number(process.env.FB_POSTS || 30),
  };
  const res = await fetch(`https://api.apify.com/v2/acts/apify~facebook-groups-scraper/run-sync-get-dataset-items?token=${token}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!res.ok) { console.error("Apify lỗi", res.status, (await res.text()).slice(0, 200)); return []; }
  const items = await res.json();
  return (Array.isArray(items) ? items : []).map((p) => ({
    id: p.postId || p.id || p.legacyId,
    text: p.text || p.postText || p.message || p.content || "",
    author: p.user?.name || p.authorName || p.author?.name || null,
    url: p.url || p.postUrl || p.facebookUrl || p.permalink || "#",
    images: (p.media || p.attachments || p.images || []).map?.((m) => m?.url || m?.image || m).filter(Boolean) || [],
  })).filter((p) => (p.text || "").length > 30);
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
  } else if (arg === "--apify-run") posts = await apifyRun();
  else if (arg === "--playwright") posts = await scrapePlaywright();
  else { console.error("Dùng: --demo | --apify <file.json> | --apify-run | --playwright"); process.exit(1); }

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
