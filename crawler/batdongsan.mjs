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
const PAGES = 1;

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
function dealType(url) { return /\/cho-thue|-cho-thue-/.test(url) ? "cho_thue" : "ban"; }
function propType(url) {
  if (/can-ho|chung-cu/.test(url)) return "can_ho";
  if (/nha-rieng|nha-mat-pho|nha-biet-thu|nha-pho|biet-thu/.test(url)) return "nha";
  if (/-dat|dat-nen|dat-/.test(url)) return "dat";
  if (/van-phong|mat-bang|kho-|nha-xuong/.test(url)) return "mat_bang";
  if (/phong-tro/.test(url)) return "phong_tro";
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
async function fetchSRP(url) {
  try {
    const { chromium } = await import("playwright"); // cần: npm i playwright && npx playwright install chromium
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ userAgent: UA });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector(".js__card, .re__card-title", { timeout: 15000 }).catch(() => {});
    const html = await page.content();
    await browser.close();
    return html;
  } catch (e) {
    // fallback: plain fetch (đôi khi Cloudflare cho qua ở IP dân cư)
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "vi" } });
    return res.ok ? await res.text() : "";
  }
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
  fs.writeFileSync(new URL("./batdongsan.json", import.meta.url), JSON.stringify({ summary: { source: "batdongsan.com.vn", total: all.length }, listings: all }, null, 0));
  console.error("DONE", all.length);
}
// Chỉ chạy khi gọi trực tiếp (không chạy khi bị import) - fix audit #12
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
