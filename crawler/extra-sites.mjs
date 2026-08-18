// Crawler 3 trang BĐS nhỏ (thăm dò 2026-08-14 xác nhận crawl được từ GitHub Actions):
//   1) bannhadat123.vn — card .media, link /(ban|cho-thue)-.../...-eid-{id}/
//
// 18/8: BỎ batdongsantoanquoc.vn và sosanhnha.com. Không phải lỗi kỹ thuật — cào được
// nhưng tin của chúng thiếu giá/diện tích nên rớt hết ở cổng chất lượng: đo trên DB
// batdongsantoanquoc 142/145 tin và sosanhnha 4/5 tin ở trạng thái "gone". Giữ lại chỉ
// tốn ~4 request + 3.6s mỗi lượt cào mà không thêm được tin nào dùng được.
// Cách bóc: cắt block HTML giữa 2 anchor tin liên tiếp (giống batdongsan.mjs), regex field
// trong block + fallback từ slug. Trang đổi markup -> parser trả 0 tin, không vỡ pipeline.
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(u) {
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA, "Accept-Language": "vi" }, signal: AbortSignal.timeout(20000) });
    return r.ok ? await r.text() : null;
  } catch { return null; }
}
const strip = (s) => (s || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, " ").trim();

// "28,8 tỷ" / "4.2 tỷ" / "950 triệu" trong text đã strip tag
function priceFromText(t) {
  const m = t.match(/([\d.,]+)\s*(tỷ|ty\b|triệu|trieu)/i);
  if (!m) return null;
  // "4.2 tỷ" = thập phân, "8.500.000.000" = ngăn nghìn — audit 16/8: xoá mọi dấu chấm từng biến 4.2 tỷ thành 42 tỷ
  const raw = m[1];
  const n = parseFloat(/^\d{1,3}(\.\d{3})+$/.test(raw) ? raw.replace(/\./g, "") : raw.replace(",", "."));
  if (!n || n > 100000) return null;
  return Math.round(n * (/tỷ|ty/i.test(m[2]) ? 1e9 : 1e6));
}
function areaFromText(t) {
  const m = t.match(/([\d.,]+)\s*m²|([\d.,]+)\s*m2\b|dien-tich-([\d]+)-?m/i);
  const v = parseFloat(((m && (m[1] || m[2] || m[3])) || "").replace(",", "."));
  return v > 0 && v < 100000 ? v : null;
}
function dealOf(s) { return /cho-thue|cho thuê/i.test(s) ? "cho_thue" : "ban"; }
function kindOf(s) {
  const t = s.toLowerCase();
  if (/can-ho|căn hộ|chung-cu|chung cư/.test(t)) return "can_ho";
  if (/mat-bang|mặt bằng|kiot|ki-ot|shophouse|van-phong|văn phòng|toa-nha|tòa nhà/.test(t)) return "mat_bang";
  if (/phong-tro|phòng trọ/.test(t)) return "phong_tro";
  if (/dat|đất/.test(t) && !/nha|nhà/.test(t)) return "dat";
  if (/nha|nhà|biet-thu|biệt thự|lien-ke|liền kề/.test(t)) return "nha";
  return "khac";
}
const PROVINCES = [
  ["ha-noi", "Hà Nội"], ["ho-chi-minh", "Hồ Chí Minh"], ["tphcm", "Hồ Chí Minh"], ["da-nang", "Đà Nẵng"],
  ["bac-ninh", "Bắc Ninh"], ["hai-phong", "Hải Phòng"], ["binh-duong", "Bình Dương"], ["dong-nai", "Đồng Nai"],
  ["khanh-hoa", "Khánh Hòa"], ["lam-dong", "Lâm Đồng"], ["hung-yen", "Hưng Yên"], ["can-tho", "Cần Thơ"],
];
function provinceFromSlug(s) { const hit = PROVINCES.find(([k]) => s.includes(k)); return hit ? hit[1] : null; }

// Cắt block giữa các anchor khớp `re` (g flag). Trả [{href, id, block}]
function blocks(html, re, maxLen = 4000) {
  const found = [...html.matchAll(re)], out = [], seen = new Set();
  for (let i = 0; i < found.length; i++) {
    const id = found[i][2] ?? found[i][1];
    if (seen.has(id)) continue; seen.add(id);
    const start = found[i].index;
    const end = i + 1 < found.length ? found[i + 1].index : Math.min(html.length, start + maxLen);
    out.push({ href: found[i][1], id, block: html.slice(start, Math.min(end, start + maxLen)) });
  }
  return out;
}
function imgsOf(block, hostFilter) {
  return [...block.matchAll(/<img[^>]+(?:data-src|src)="(https?:\/\/[^"]+\.(?:jpe?g|png|webp)[^"]*)"/gi)]
    .map((m) => m[1]).filter((u) => !/logo|icon|sprite|avatar|no[-_]?image/i.test(u))
    .filter((u) => !hostFilter || u.includes(hostFilter) || !/facebook|google/.test(u))
    .filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);
}
function row(site, id, url, title, block, slug) {
  const text = strip(block);
  return {
    id: `${site.key}-${id}`, source: "crawl", source_site: site.name,
    source_url: url, source_post_id: `${site.key}-${id}`,
    title: title || "", description: "",
    price_vnd: priceFromText(text), area_m2: areaFromText(text) ?? areaFromText(slug),
    bedrooms: null, bathrooms: null, floors: null,
    listing_type: dealOf(slug + " " + url), property_type: kindOf(slug + " " + (title || "")),
    province: provinceFromSlug(slug) || provinceFromSlug(url) || null,
    district: null, lat: null, lng: null, amenities: [], poster_role: "khong_ro",
    ai_score: null, images: imgsOf(block),
  };
}

// --- 2) bannhadat123.vn ---
async function bannhadat123() {
  const out = [];
  for (const path of ["/", "/mua-ban-nha-dat/"]) {
    const h = await get("https://bannhadat123.vn" + path);
    if (!h) continue;
    for (const b of blocks(h, /href="(\/(?:ban|cho-thue)[^"]{10,160}-eid-(\d{5,})\/)"/g)) {
      const url = "https://bannhadat123.vn" + b.href;
      // Tiêu đề nằm trong <a> LỒNG BÊN TRONG .media-heading (run 14/8: 60 tin bị rớt
      // vì regex cũ không xuyên qua thẻ lồng) -> thử 3 lớp, chốt bằng slug.
      const title = strip((b.block.match(/class="media-heading"[^>]*>[\s\S]{0,160}?<a[^>]*>([\s\S]{0,240}?)<\/a>/) || [])[1] || "")
        || strip((b.block.match(/class="media-heading"[^>]*>([\s\S]{0,240}?)<\/(?:h\d|div)/) || [])[1] || "")
        || strip((b.block.match(/title="([^"]{15,200})"/) || [])[1] || "")
        || (() => { // slug -> "Ban lien ke centa vsip bac ninh..." (không dấu nhưng còn hơn mất tin)
          const s = (b.href.split("/").filter(Boolean).pop() || "").replace(/-eid-\d+\/?$/, "").replace(/-/g, " ").trim();
          return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
        })();
      out.push(row({ key: "bnd123", name: "bannhadat123.vn" }, b.id, url, title, b.block, b.href));
    }
    await sleep(1200);
  }
  return out;
}

async function main() {
  const all = [];
  for (const [name, fn] of [["bannhadat123", bannhadat123]]) {
    try {
      const rows = await fn();
      console.error(`${name}: +${rows.length}`);
      all.push(...rows);
    } catch (e) { console.error(`${name}: lỗi ${e.message} — bỏ qua`); }
  }
  // chỉ giữ tin có tiêu đề tử tế
  const ok = all.filter((x) => (x.title || "").length >= 15);
  if (!ok.length) { console.error("extra-sites: 0 tin -> giữ extra.json cũ"); return; } // audit 16/8
  fs.writeFileSync(new URL("./extra.json", import.meta.url),
    JSON.stringify({ summary: { source: "extra-sites", crawled_at: new Date().toISOString().slice(0, 10), total: ok.length }, listings: ok }, null, 0));
  console.error("DONE extra-sites:", ok.length);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
