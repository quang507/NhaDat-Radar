// Crawler MOGI.VN - HTML SSR (curl/fetch qua được Cloudflare). Có ảnh + giá + diện tích + PN/WC.
import fs from "node:fs";
import { pathToFileURL } from "node:url";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dec = (s) => (s || "").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, "&").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// URL đúng của mogi là {tinh}/{mua|thue}-{loai} (+ ?cp=N phân trang). Dạng cũ "mua-nha-binh-duong"
// bị 301 về /mua-nha-dat chung -> 7 seed ra cùng 15 tin -> chỉ còn 30 tin (kiểm chứng 16/8).
const SEEDS = [
  // miền Nam trước
  ["ho-chi-minh/mua-nha", 3], ["ho-chi-minh/thue-nha", 2], ["ho-chi-minh/mua-can-ho-chung-cu", 2],
  ["ho-chi-minh/thue-can-ho-chung-cu", 2], ["ho-chi-minh/mua-dat", 1],
  ["binh-duong/mua-nha", 1], ["dong-nai/mua-nha", 1], ["can-tho/mua-nha", 1],
  ["ha-noi/mua-nha", 2], ["ha-noi/thue-nha", 1], ["da-nang/mua-nha", 1],
];
const seedUrls = SEEDS.flatMap(([s, pages]) => Array.from({ length: pages }, (_, i) => (i ? `${s}?cp=${i + 1}` : s)));

function canonProvince(s) {
  const t = (s || "").toLowerCase();
  if (/hà nội|ha noi/.test(t)) return "Hà Nội";
  if (/tphcm|hcm|hồ chí minh|ho chi minh|sài gòn/.test(t)) return "Hồ Chí Minh";
  if (/đà nẵng|da nang/.test(t)) return "Đà Nẵng";
  return s || null;
}
function propType(url) {
  if (/can-ho|chung-cu/.test(url)) return "can_ho";
  if (/dat-nen|mua-ban-dat|mua-dat|thue-dat|dat-tho-cu|ban-dat|\/dat\//.test(url)) return "dat"; // audit 16/8: /mua-dat-tho-cu/ từng rơi vào "khac"
  if (/van-phong|mat-bang|kho-xuong/.test(url)) return "mat_bang";
  if (/phong-tro/.test(url)) return "phong_tro";
  if (/nha|biet-thu|villa/.test(url)) return "nha";
  return "khac";
}
function parsePrice(s) {
  if (!s) return null; const t = s.toLowerCase();
  if (/thỏa thuận|liên hệ/.test(t)) return null;
  let vnd = 0;
  const ty = t.match(/([\d.,]+)\s*tỷ/); if (ty) vnd += parseFloat(ty[1].replace(/\./g, "").replace(",", ".")) * 1e9;
  const tr = t.match(/([\d.,]+)\s*triệu/); if (tr) vnd += parseFloat(tr[1].replace(/\./g, "").replace(",", ".")) * 1e6;
  if (!vnd) { const n = t.match(/([\d.,]+)/); if (n) vnd = parseFloat(n[1].replace(/\./g, "").replace(",", ".")); }
  return Math.round(vnd) || null;
}
function num(s) { const m = (s || "").match(/[\d.,]+/); return m ? parseFloat(m[0].replace(/\./g, "").replace(",", ".")) : null; }

export function parseMogi(html) {
  const re = /class="link-overlay" href="(https:\/\/mogi\.vn\/[^"]+)"><h2 class="prop-title">([\s\S]*?)<\/h2>/g;
  const anchors = [...html.matchAll(re)];
  const out = [];
  for (let i = 0; i < anchors.length; i++) {
    const url = anchors[i][1], title = dec(anchors[i][2]);
    const idx = anchors[i].index;
    const after = html.slice(idx, idx + 1000);
    const before = html.slice(Math.max(0, idx - 1600), idx);
    const addr = dec((after.match(/prop-addr">([\s\S]*?)<\/div>/) || [])[1] || "");
    const attrs = [...after.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => dec(m[1]));
    const area = attrs.map(num).find((v, i2) => /m/i.test(attrs[i2])) ?? (attrs[0] ? num(attrs[0]) : null);
    const beds = (() => { const a = attrs.find((x) => /PN/i.test(x)); return a ? num(a) : null; })();
    const baths = (() => { const a = attrs.find((x) => /WC/i.test(x)); return a ? num(a) : null; })();
    const price = parsePrice(dec((after.match(/class="price">([\s\S]*?)<\/div>/) || [])[1] || ""));
    // list chỉ có thumb-small (~15KB, vỡ hạt ở gallery); bản gốc nằm cùng đường dẫn bỏ "thumb-small/" (kiểm chứng 16/8: 200, ~44KB)
    const img = ((before.match(/(https:\/\/cloud\.mogi\.vn\/images\/thumb-small\/[^\s"]+\.jpg)/g) || []).slice(-1)[0] || "").replace("/images/thumb-small/", "/images/") || undefined;
    const id = (url.match(/-id(\d+)/) || [])[1];
    const parts = addr.split(",").map((s) => s.trim());
    out.push({
      id: "mg-" + (id || Math.abs(hash(url)).toString(36)),
      source: "crawl", source_site: "mogi.vn", source_url: url, source_post_id: id || null,
      title, price_vnd: price, area_m2: area, bedrooms: beds, bathrooms: baths, floors: null,
      listing_type: /thue|cho-thue/.test(url) ? "cho_thue" : "ban",
      property_type: propType(url),
      province: canonProvince(parts[parts.length - 1]), district: parts[0] || null, ward: null,
      lat: null, lng: null, amenities: [], images: img ? [img] : [],
      poster_role: "khong_ro", ai_score: Math.max(40, Math.min(95, 55 + (price ? 6 : 0) + (area ? 5 : 0) + (img ? 12 : 0) + (beds ? 4 : 0))),
    });
  }
  const seen = new Set();
  return out.filter((x) => (seen.has(x.id) ? false : seen.add(x.id)));
}
function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }

async function run() {
  let all = [];
  for (const s of seedUrls) {
    try {
      const res = await fetch(`https://mogi.vn/${s}`, { headers: { "User-Agent": UA, "Accept-Language": "vi" }, redirect: "manual" });
      if (res.status === 200) { const r = parseMogi(await res.text()); all = all.concat(r); console.error(s, "->", r.length); }
      else console.error(s, "HTTP", res.status, res.headers.get("location") || "");
    } catch (e) { console.error(s, "lỗi:", e.message); }
    await sleep(1500);
  }
  const seen = new Set();
  all = all.filter((x) => (seen.has(x.id) ? false : seen.add(x.id)));
  fs.writeFileSync(new URL("./mogi.json", import.meta.url), JSON.stringify({ summary: { crawled_at: new Date().toISOString().slice(0, 10), total: all.length, with_img: all.filter((x) => x.images.length).length }, listings: all }, null, 0));
  console.error("TỔNG mogi:", all.length, "(ảnh:", all.filter((x) => x.images.length).length, ")");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
