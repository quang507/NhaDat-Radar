// Crawler DỰ ÁN từ mogi.vn/du-an (HTML SSR, fetch thẳng được như mogi.mjs).
// Trang list -> link chi tiết dạng /{slug}-prj{id}; trang chi tiết có JSON-LD (tên, địa chỉ, toạ độ,
// chủ đầu tư, ảnh bìa) + div.project-intro (mô tả) + ul.info-general (diện tích, ngày bàn giao, pháp lý).
//
//   node mogi-projects.mjs            : cào -> projects.json
//   node mogi-projects.mjs --seed     : cào -> projects.json -> upsert vào Supabase (theo slug)
//   node mogi-projects.mjs --seed-only: chỉ upsert từ projects.json có sẵn
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAGES = Number(process.env.MOGI_PROJECT_PAGES || 8);

const dec = (s) => (s || "")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[e])
  .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function canonProvince(s) {
  const t = (s || "").toLowerCase();
  if (/hà nội|ha noi/.test(t)) return "Hà Nội";
  if (/tphcm|hcm|hồ chí minh|ho chi minh|sài gòn/.test(t)) return "Hồ Chí Minh";
  if (/đà nẵng|da nang/.test(t)) return "Đà Nẵng";
  return s || null;
}
// "Từ 3 tỷ 55 triệu" / "3,5 tỷ" -> VND. Trả null nếu "Thoả thuận"/"Liên hệ".
function parsePrice(s) {
  if (!s) return null;
  const t = s.toLowerCase();
  if (/thỏa thuận|thoả thuận|liên hệ|đang cập nhật/.test(t)) return null;
  const toNum = (v) => parseFloat(/^\d{1,3}(\.\d{3})+$/.test(v) ? v.replace(/\./g, "") : v.replace(",", "."));
  let vnd = 0;
  const ty = t.match(/([\d.,]+)\s*tỷ/); if (ty) vnd += toNum(ty[1]) * 1e9;
  const tr = t.match(/([\d.,]+)\s*triệu(?!\/)/); if (tr) vnd += toNum(tr[1]) * 1e6;  // "triệu/m²" là đơn giá, không phải tổng
  return Math.round(vnd) || null;
}

// ---- Trang danh sách -> [{href, name, investor, addrLine, priceText, thumb}] ----
export function parseList(html) {
  const out = [];
  // mỗi thẻ bắt đầu bằng class="project clearfix"; cắt theo mốc đó rồi bóc trong từng khối
  const blocks = html.split('class="project clearfix"').slice(1);
  for (const b0 of blocks) {
    const b = b0.slice(0, 2500);
    const href = (b.match(/<a href="(\/[^"]*-prj\d+)"/) || [])[1];
    if (!href) continue;
    out.push({
      href,
      name: dec((b.match(/class="project-title">([\s\S]*?)<\/h2>/) || [])[1] || ""),
      investor: dec((b.match(/class="project-org">([\s\S]*?)<\/div>/) || [])[1] || "") || null,
      addrLine: dec((b.match(/class="project-address">\s*<div class="project-address">([\s\S]*?)<\/div>/) || [])[1] || ""),
      priceText: dec((b.match(/class="project-avg-price">([\s\S]*?)<\/div>/) || [])[1] || ""),
      thumb: (b.match(/src="(https:\/\/cloud\.mogi\.vn\/project\/[^"]+)"/) || [])[1] || null,
    });
  }
  return out;
}

// ---- Trang chi tiết -> bổ sung mô tả / toạ độ / ảnh / thông số ----
export function parseDetail(html, base) {
  // JSON-LD là nguồn sạch nhất (tên, địa chỉ đầy đủ, toạ độ, CĐT).
  // Trang có 2 khối cùng chứa GeoCoordinates: 1 của VĂN PHÒNG MOGI (address dạng object, toạ độ Q.Tân Bình)
  // và 1 của dự án -> phải chọn khối có url khớp đường dẫn dự án, không thì lấy nhầm toạ độ mogi.
  const cands = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    if (!/GeoCoordinates/.test(m[1])) continue;
    try { cands.push(JSON.parse(m[1])); } catch { /* khối hỏng -> bỏ */ }
  }
  const ld = cands.find((c) => typeof c?.url === "string" && c.url.includes(base))
    || cands.find((c) => typeof c?.address === "string")
    || cands[cands.length - 1] || null;
  const lat = ld?.geo?.latitude ? Number(ld.geo.latitude) : null;
  const lng = ld?.geo?.longitude ? Number(ld.geo.longitude) : null;
  // Toạ độ phải nằm trong lãnh thổ VN, không thì là địa chỉ văn phòng mogi lọt vào
  const geoOk = lat != null && lng != null && lat > 8 && lat < 24 && lng > 102 && lng < 110;

  // Mô tả dài nằm trong <div id="project-intro"> (KHÔNG phải class) — cắt tới khối kế tiếp.
  // ld.description chỉ là câu SEO ngắn nên chỉ dùng làm phương án dự phòng.
  const intro = dec((html.match(/id="project-intro">([\s\S]*?)(?:<div (?:id|class)="(?!.*project-intro)|<section|<\/section)/) || [])[1] || "")
    .slice(0, 4000);
  const specs = [...html.matchAll(/<li>\s*<span>\s*([^<]+?)\s*<\/span>([\s\S]*?)<\/li>/g)]
    .map((m) => [dec(m[1]), dec(m[2])]).filter(([k, v]) => k && v);

  const images = [...new Set(
    [...html.matchAll(/https:\/\/cloud\.mogi\.vn\/project\/(?!thumb-)[^\s"']+?\.(?:jpg|jpeg|png)/g)].map((m) => m[0]),
  )].slice(0, 12);

  // address có thể là chuỗi (dự án) hoặc object PostalAddress (khối văn phòng) -> ép về chuỗi
  const a = ld?.address;
  const addr = typeof a === "string" ? a
    : a ? [a.streetAddress, a.addressLocality, a.addressRegion].filter(Boolean).join(", ") : "";
  const parts = addr.split(",").map((s) => s.trim()).filter(Boolean);
  return {
    name: ld?.name || null,
    mogiId: ld?.id || (base.match(/-prj(\d+)$/) || [])[1] || null,
    description: intro || ld?.description || null,
    investor: ld?.brand?.name || null,
    address: addr || null,
    province: canonProvince(parts[parts.length - 1] || ""),
    district: parts.length >= 2 ? parts[parts.length - 2] : null,
    ward: parts.length >= 3 ? parts[parts.length - 3] : null,
    lat: geoOk ? lat : null,
    lng: geoOk ? lng : null,
    images,
    specs,
  };
}

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "vi" } });
  if (res.status !== 200) throw new Error("HTTP " + res.status);
  return res.text();
}

async function crawl() {
  const cards = [];
  for (let p = 1; p <= PAGES; p++) {
    const url = p === 1 ? "https://mogi.vn/du-an" : `https://mogi.vn/du-an?cp=${p}`;
    try {
      const list = parseList(await get(url));
      if (!list.length) { console.error(`trang ${p}: 0 dự án -> dừng`); break; }
      cards.push(...list);
      console.error(`trang ${p}: ${list.length} dự án`);
    } catch (e) { console.error(`trang ${p} lỗi:`, e.message); }
    await sleep(1200);
  }
  // khử trùng theo href (dự án nổi bật lặp lại ở nhiều trang)
  const uniq = [...new Map(cards.map((c) => [c.href, c])).values()];
  console.error(`\n${uniq.length} dự án duy nhất -> lấy chi tiết...`);

  const out = [];
  for (const [i, c] of uniq.entries()) {
    const url = "https://mogi.vn" + c.href;
    try {
      const d = parseDetail(await get(url), c.href);
      const slug = c.href.replace(/^\//, "");
      const priceMin = parsePrice(c.priceText);
      out.push({
        slug, source_url: url, mogi_id: d.mogiId,
        name: d.name || c.name,
        investor: d.investor || c.investor,
        description: d.description,
        address: d.address,
        province: d.province, district: d.district, ward: d.ward,
        lat: d.lat, lng: d.lng,
        images: d.images.length ? d.images : (c.thumb ? [c.thumb] : []),
        price_min: priceMin, price_max: null,
        specs: Object.fromEntries(d.specs),
        handover: (c.addrLine.match(/Bàn giao:\s*([^|]+)/) || [])[1]?.trim() || null,
      });
      if ((i + 1) % 10 === 0) console.error(`  ...${i + 1}/${uniq.length}`);
    } catch (e) { console.error(`  lỗi ${c.href}:`, e.message); }
    await sleep(900);
  }
  if (!out.length) { console.error("mogi-projects: 0 dự án -> giữ projects.json cũ"); return null; }
  fs.writeFileSync(new URL("./projects.json", import.meta.url), JSON.stringify({
    summary: { crawled_at: new Date().toISOString().slice(0, 10), total: out.length, with_geo: out.filter((x) => x.lat).length, with_img: out.filter((x) => x.images.length).length },
    projects: out,
  }, null, 0));
  console.error(`\nTỔNG ${out.length} dự án (toạ độ: ${out.filter((x) => x.lat).length}, ảnh: ${out.filter((x) => x.images.length).length}) -> projects.json`);
  return out;
}

// ---- Seed vào Supabase: upsert theo slug, KHÔNG đụng priority/is_partner (admin tự đặt) ----
async function seed(projects) {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("Thiếu SUPABASE env -> bỏ qua seed"); return; }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: existing } = await sb.from("projects").select("id,slug");
  const bySlug = new Map((existing || []).map((r) => [r.slug, r.id]));
  let ins = 0, upd = 0;
  for (const p of projects) {
    const row = {
      slug: p.slug, name: p.name, investor: p.investor, description: p.description,
      province: p.province, district: p.district, ward: p.ward, address: p.address,
      images: p.images || [], price_min: p.price_min, price_max: p.price_max,
      status: "published",
      // geography(Point,4326): PostgREST nhận EWKT
      ...(p.lat != null && p.lng != null ? { geo: `SRID=4326;POINT(${p.lng} ${p.lat})` } : {}),
    };
    const id = bySlug.get(p.slug);
    const { error } = id
      ? await sb.from("projects").update(row).eq("id", id)
      : await sb.from("projects").insert(row);
    if (error) console.error("  seed lỗi", p.slug, error.message);
    else if (id) upd++; else ins++;
  }
  console.error(`Seed dự án: ${ins} mới · ${upd} cập nhật`);
}

async function run() {
  const seedOnly = process.argv.includes("--seed-only");
  let projects;
  if (seedOnly) projects = JSON.parse(fs.readFileSync(new URL("./projects.json", import.meta.url))).projects;
  else projects = await crawl();
  if (projects && (seedOnly || process.argv.includes("--seed"))) await seed(projects);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
