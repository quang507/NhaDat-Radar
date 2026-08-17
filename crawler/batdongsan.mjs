// Crawler BATDONGSAN.COM.VN — Cloudflare nên fetch bằng Playwright (fallback plain fetch cho quy mô nhỏ).
// Parser tách từ HTML trang kết quả (SRP). Test parser: node batdongsan.mjs --test bds.html
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// === BỘ LỌC (xem xét): đường dẫn SRP theo bán/thuê + loại + thành phố, phân trang /p{n} ===
const CITY = { "ha-noi": "Hà Nội", "tp-hcm": "Hồ Chí Minh", "da-nang": "Đà Nẵng", "binh-duong": "Bình Dương", "dong-nai": "Đồng Nai", "can-tho": "Cần Thơ", "ba-ria-vung-tau": "Bà Rịa - Vũng Tàu" };
// ví dụ: /nha-dat-ban-ha-noi  /nha-dat-cho-thue-tp-hcm  /ban-can-ho-chung-cu-tp-hcm  /cho-thue-nha-rieng-ha-noi
function srpUrl(pathBase, page) {
  return `https://batdongsan.com.vn/${pathBase}${page > 1 ? "/p" + page : ""}`;
}
const SEEDS = [
  // ưu tiên miền Nam: HCM + Bình Dương + Đồng Nai + Cần Thơ + Vũng Tàu
  "nha-dat-ban-tp-hcm", "nha-dat-cho-thue-tp-hcm",
  "nha-dat-ban-binh-duong", "nha-dat-ban-dong-nai",
  "nha-dat-ban-can-tho", "nha-dat-ban-ba-ria-vung-tau",
  "nha-dat-ban-ha-noi", "nha-dat-cho-thue-ha-noi", "nha-dat-ban-da-nang",
];
const PAGES = Number(process.env.BDS_PAGES || 2);

const clean = (s) => (s || "").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/&amp;/g, "&").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function pick(block, cls) {
  const m = block.match(new RegExp(cls + '[^>]*>([\\s\\S]{0,160}?)<\\/', "i"));
  return m ? clean(m[1]) : null;
}
function pickLoc(block) {
  const seg = (block.match(/re__card-location[\s\S]{0,300}/) || [])[0] || "";
  const spans = [...seg.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)].map((m) => clean(m[1])).filter((t) => /[a-zà-ỹ]/i.test(t));
  return spans[spans.length - 1] || null;
}
function num(s) { if (!s) return null; const m = s.replace(/\./g, "").match(/[\d,]+/); return m ? parseFloat(m[0].replace(",", ".")) : null; }
function parsePrice(s) {
  if (!s) return null; const t = s.toLowerCase();
  if (/thỏa thuận|liên hệ/.test(t)) return null;
  const n = num(t); if (!n) return null;
  if (/tỷ/.test(t)) return Math.round(n * 1e9);
  if (/triệu\/th|triệu/.test(t)) return Math.round(n * 1e6);
  return Math.round(n);
}
// Bán/thuê + loại lấy từ ĐOẠN ĐẦU đường dẫn (/ban-can-ho-chung-cu-.../, /cho-thue-nha-rieng-.../),
// KHÔNG quét cả URL: slug tiêu đề hay chứa "…nhan-nha-cho-thue-ngay…" -> từng gán tin bán 2,2 tỷ thành "cho thuê" (audit 16/8).
function firstSeg(url) { return (url.replace(/^https?:\/\/[^/]+/, "").split("/").filter(Boolean)[0] || "").toLowerCase(); }
function dealType(url) { return /^(cho-thue|thue)-/.test(firstSeg(url)) ? "cho_thue" : "ban"; }
function propType(url) {
  const s = firstSeg(url);
  if (/can-ho|chung-cu|condotel|officetel/.test(s)) return "can_ho";
  if (/nha-rieng|nha-mat-pho|nha-biet-thu|nha-pho|biet-thu|lien-ke|nha-ngo|nha-hem/.test(s)) return "nha";
  if (/(^|-)dat(-|$)|dat-nen|trang-trai/.test(s)) return "dat";
  if (/van-phong|mat-bang|kho-|nha-xuong|shophouse|cua-hang/.test(s)) return "mat_bang";
  if (/phong-tro|nha-tro/.test(s)) return "phong_tro";
  return "khac";
}

export function parseBatdongsan(html, cityName) {
  const anchors = [...html.matchAll(/data-product-id="(\d+)"[^>]*href="([^"]+)"/g)];
  const out = [];
  const seen = new Set();
  for (let i = 0; i < anchors.length; i++) {
    const id = anchors[i][1], href = anchors[i][2];
    if (!/-pr\d+/.test(href)) continue; // chỉ link tin
    if (seen.has(id)) continue; seen.add(id); // mỗi card có 2 anchor (ảnh + tiêu đề) -> khử trùng
    const start = anchors[i].index;
    const end = i + 1 < anchors.length ? anchors[i + 1].index : Math.min(html.length, start + 3500);
    const block = html.slice(start, end);
    const title = pick(block, "re__card-title") || clean((block.match(/title="([^"]+)"/) || [])[1]);
    const priceStr = pick(block, "re__card-config-price");
    const areaStr = pick(block, "re__card-config-area");
    const url = href.startsWith("http") ? href : "https://batdongsan.com.vn" + href;
    out.push({
      id: "bds-" + id, source: "crawl", source_site: "batdongsan.com.vn",
      source_url: url, source_post_id: id,
      title: title || "", price_vnd: parsePrice(priceStr), price_raw: priceStr,
      area_m2: num(areaStr),
      bedrooms: num(pick(block, "re__card-config-bedroom")),
      bathrooms: num(pick(block, "re__card-config-toilet")),
      listing_type: dealType(url), property_type: propType(url),
      province: cityName || null, district: pickLoc(block),
      lat: null, lng: null, amenities: [],
      poster_role: "khong_ro", ai_score: null,
      images: [...block.matchAll(/data-(?:img|src)="(https:\/\/file\d*\.batdongsan\.com\.vn\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/g)]
        .map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5),
    });
  }
  return out;
}

// --- Fetch: Playwright (chống Cloudflare) hoặc plain fetch (quy mô nhỏ) ---
// Audit 16/8: bản cũ launch chromium MỚI cho từng URL (18 lần) và không close khi goto ném -> rò tiến trình + chậm.
// Giờ 1 browser dùng chung cho cả run (getBrowser), mỗi URL 1 context; đóng ở finally của main().
let _browser = null;
async function getBrowser() {
  if (_browser) return _browser;
  const { chromium } = await import("playwright"); // devDependency; browser: npx playwright install chromium
  _browser = await chromium.launch({ headless: true, args: ["--disable-blink-features=AutomationControlled"] });
  return _browser;
}
async function fetchSRP(url) {
  let ctx = null;
  try {
    const browser = await getBrowser();
    ctx = await browser.newContext({ userAgent: UA, locale: "vi-VN", viewport: { width: 1366, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    // Cloudflare cần vài giây để qua challenge; chờ tới khi có card (tối đa ~20s)
    let html = "";
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(4000);
      html = await page.content();
      if (/data-product-id="\d+"/.test(html)) break;
    }
    return html;
  } catch (e) {
    console.error("  playwright lỗi:", e.message.slice(0, 120), "-> thử fetch thẳng");
    // fallback: plain fetch (đôi khi Cloudflare cho qua ở IP dân cư)
    try { const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "vi" } }); return res.ok ? await res.text() : ""; }
    catch { return ""; }
  } finally {
    if (ctx) await ctx.close().catch(() => {});
  }
}

// ---- Trang CHI TIẾT: lấy các trường trang danh sách không có ----
// 17/8: trang danh sách chỉ cho giá/DT/PN/WC/ảnh. Đo trên tin thật thì trang chi tiết còn có
// hướng nhà, hướng ban công, pháp lý, số tầng, ngày đăng, phường, và TOẠ ĐỘ THẬT trong iframe
// bản đồ — trước giờ phải geocode bù theo tên quận nên pin chỉ nằm giữa quận.
// Bắt buộc dùng Playwright: fetch thẳng trang chi tiết trả HTTP 403 (Cloudflare) — đã kiểm chứng.
const decD = (s) => (s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export function parseDetail(html) {
  const specs = {};
  for (const m of html.matchAll(/re__pr-specs-content-item-title"[^>]*>([\s\S]*?)<\/span>[\s\S]*?re__pr-specs-content-item-value"[^>]*>([\s\S]*?)<\/span>/g)) {
    const k = decD(m[1]), v = decD(m[2]); if (k && v) specs[k] = v;
  }
  const info = {};
  for (const m of html.matchAll(/re__pr-short-info-item[^"]*"[\s\S]{0,400}?class="title"[^>]*>([\s\S]*?)<\/span>[\s\S]{0,200}?class="value"[^>]*>([\s\S]*?)<\/span>/g)) {
    const k = decD(m[1]), v = decD(m[2]); if (k && v) info[k] = v;
  }
  // Toạ độ: iframe Google Maps (?q=lat,lng) hoặc JSON latitude/longitude nhúng trong trang
  const g = html.match(/maps[^"']*?q=(-?\d+\.\d+)[,%C2\s]+(-?\d+\.\d+)/)
    || html.match(/"latitude"\s*:\s*"?(-?\d+\.\d+)"?[\s\S]{0,80}?"longitude"\s*:\s*"?(-?\d+\.\d+)/);
  const lat = g ? Number(g[1]) : null, lng = g ? Number(g[2]) : null;
  const trongVN = lat != null && lat > 8 && lat < 24 && lng > 102 && lng < 110;

  // Breadcrumb: "Bán > Hồ Chí Minh > Quận 7 > <dự án>" -> phần tử áp chót thường là quận/phường
  const bread = [...html.matchAll(/re__link-se[^>]*>([^<]+)</g)].map((m) => m[1].trim()).filter(Boolean);

  const soTang = specs["Số tầng"] || specs["Số tầng, lầu"];
  const ngayDang = info["Ngày đăng"];   // "14/08/2026"
  const iso = ngayDang?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return {
    direction: specs["Hướng nhà"] || null,
    balcony_direction: specs["Hướng ban công"] || null,
    legal: specs["Pháp lý"] || specs["Giấy tờ pháp lý"] || null,
    furnishing: specs["Nội thất"] || null,
    floors: soTang ? Number(String(soTang).replace(/\D/g, "")) || null : null,
    lat: trongVN ? lat : null,
    lng: trongVN ? lng : null,
    posted_at: iso ? `${iso[3]}-${iso[2]}-${iso[1]}` : null,
    // Breadcrumb phần tử thứ 4 KHÔNG phải lúc nào cũng là phường — thường là tên dự án
    // ("Căn hộ chung cư tại Vlasta Premier Phú Thuận"). Chỉ nhận khi đúng dạng phường/xã,
    // không thì để null. Gán bừa tên dự án vào ward là kiểu lỗi đã phải sửa cả buổi 17/8.
    ward: bread.slice(1).find((b) => /^(Phường|Xã|Thị trấn|P\.\s*\d)/i.test(b)) || null,
    breadcrumb: bread.slice(0, 5),
  };
}

async function fetchDetail(url) {
  let ctx = null;
  try {
    const browser = await getBrowser();
    ctx = await browser.newContext({ userAgent: UA, locale: "vi-VN", viewport: { width: 1366, height: 800 } });
    const page = await ctx.newPage();
    // chặn ảnh/font/media: chỉ cần HTML, tải nhẹ đi nhiều lần
    await ctx.route("**/*", (r) => {
      const t = r.request().resourceType();
      return t === "image" || t === "media" || t === "font" ? r.abort() : r.continue();
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2500);
    return await page.content();
  } catch (e) {
    console.error("  chi tiết lỗi:", e.message.slice(0, 90));
    return "";
  } finally { if (ctx) await ctx.close().catch(() => {}); }
}

// Chỉ lấy chi tiết cho tin MỚI (id chưa có trong batdongsan.json lần trước) — mỗi ngày vài chục tin
// thay vì 433, nên chỉ tốn vài phút. Giãn nhịp DETAIL_GAP_MS: bài học 17/8 từ mogi — cào dày quá
// thì bị chặn và nhận về dữ liệu rác mà không hề biết.
const DETAIL_GAP_MS = Number(process.env.BDS_DETAIL_GAP_MS || 2000);
const DETAIL_MAX = Number(process.env.BDS_DETAIL_MAX || 150);
async function boSungChiTiet(all, idCu) {
  const moi = all.filter((x) => !idCu.has(x.id) && x.source_url).slice(0, DETAIL_MAX);
  if (!moi.length) { console.error("Không có tin mới -> bỏ qua bước lấy chi tiết."); return; }
  console.error(`\nLấy chi tiết ${moi.length} tin MỚI (${DETAIL_GAP_MS}ms/tin)...`);
  let coToaDo = 0, coHuong = 0, coNgay = 0;
  for (const [i, x] of moi.entries()) {
    const html = await fetchDetail(x.source_url);
    if (html) {
      try {
        const d = parseDetail(html);
        if (d.lat != null) { x.lat = d.lat; x.lng = d.lng; coToaDo++; }
        if (d.direction) { x.direction = d.direction; coHuong++; }
        if (d.legal) x.legal = d.legal;
        if (d.furnishing) x.furnishing = d.furnishing;
        if (d.floors) x.floors = d.floors;
        if (d.posted_at) { x.posted_at = d.posted_at; coNgay++; }
        if (d.ward && !x.ward) x.ward = d.ward;
      } catch (e) { console.error("  parse chi tiết lỗi:", e.message.slice(0, 60)); }
    }
    if ((i + 1) % 20 === 0) console.error(`  ...${i + 1}/${moi.length} | toạ độ ${coToaDo} · hướng ${coHuong} · ngày đăng ${coNgay}`);
    await new Promise((r) => setTimeout(r, DETAIL_GAP_MS));
  }
  console.error(`Chi tiết xong: +${coToaDo} toạ độ thật · +${coHuong} hướng nhà · +${coNgay} ngày đăng`);
}

async function main() {
  const testIdx = process.argv.indexOf("--test");
  if (testIdx >= 0) {
    const html = fs.readFileSync(process.argv[testIdx + 1], "utf8");
    const rows = parseBatdongsan(html, "Hồ Chí Minh");
    console.error("Parsed", rows.length, "tin từ HTML lưu sẵn");
    rows.slice(0, 4).forEach((x) => console.error(JSON.stringify({ title: (x.title || "").slice(0, 50), deal: x.listing_type, type: x.property_type, price: x.price_vnd, area: x.area_m2, bed: x.bedrooms, loc: x.district, url: x.source_url.slice(0, 60) })));
    fs.writeFileSync(new URL("./batdongsan.json", import.meta.url), JSON.stringify({ summary: { source: "batdongsan.com.vn", total: rows.length }, listings: rows }, null, 0));
    return;
  }
  // id của lượt trước -> biết tin nào MỚI để chỉ lấy chi tiết cho chúng
  const idCu = new Set();
  try {
    const cu = JSON.parse(fs.readFileSync(new URL("./batdongsan.json", import.meta.url), "utf8"));
    for (const x of cu.listings || []) idCu.add(x.id);
  } catch { /* lần đầu chạy */ }

  let all = [];
  for (const s of SEEDS) {
    const city = Object.entries(CITY).find(([k]) => s.includes(k));
    for (let p = 1; p <= PAGES; p++) {
      const html = await fetchSRP(srpUrl(s, p));
      const rows = parseBatdongsan(html, city ? city[1] : null);
      all = all.concat(rows);
      console.error(`${s} p${p}: +${rows.length}`);
      await new Promise((r) => setTimeout(r, 2500));
    }
  }
  const seen = new Set();
  all = all.filter((x) => (seen.has(x.id) ? false : seen.add(x.id)));
  if (!all.length) {
    // Cloudflare chặn (thường gặp ở IP datacenter/CI) -> GIỮ file cũ, merge.mjs sẽ tự bỏ qua nếu file quá 2 ngày
    console.error("DONE 0 — không lấy được tin (Cloudflare?). Giữ nguyên batdongsan.json cũ.");
    return;
  }
  // Bổ sung chi tiết cho tin mới (toạ độ thật, hướng, pháp lý, ngày đăng, phường)
  if (!process.argv.includes("--no-detail")) await boSungChiTiet(all, idCu);

  fs.writeFileSync(new URL("./batdongsan.json", import.meta.url), JSON.stringify({
    summary: {
      source: "batdongsan.com.vn", crawled_at: new Date().toISOString().slice(0, 10), total: all.length,
      with_geo: all.filter((x) => x.lat != null).length,
      with_direction: all.filter((x) => x.direction).length,
      with_posted_at: all.filter((x) => x.posted_at).length,
    },
    listings: all,
  }, null, 0));
  console.error("DONE", all.length, `| toạ độ thật: ${all.filter((x) => x.lat != null).length}`);
}
// Chỉ chạy khi gọi trực tiếp (không chạy khi bị import) - fix audit #12; luôn đóng browser dùng chung khi xong/lỗi
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error("batdongsan lỗi:", e.message); process.exitCode = 1; })
    .finally(async () => { if (_browser) await _browser.close().catch(() => {}); });
}
