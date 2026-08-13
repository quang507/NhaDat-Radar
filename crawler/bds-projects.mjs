// Crawler DỰ ÁN thật từ batdongsan.com.vn/du-an-... -> projects chuẩn (tên, vị trí, ảnh, quy mô, tag).
import fs from "node:fs";
import { pathToFileURL } from "node:url";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => (s || "").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/&amp;/g, "&").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const SEEDS = [
  ["du-an-can-ho-chung-cu-tp-hcm", "Hồ Chí Minh"],
  ["du-an-can-ho-chung-cu-ha-noi", "Hà Nội"],
  ["du-an-can-ho-chung-cu-da-nang", "Đà Nẵng"],
  ["du-an-nha-mat-pho-tp-hcm", "Hồ Chí Minh"],
];

function slugify(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export function parseProjects(html, city) {
  const titles = [...html.matchAll(/re__prj-card-title[^>]*>([\s\S]*?)<\/h3>/g)];
  const out = [];
  for (const m of titles) {
    const name = clean(m[1]);
    if (!name) continue;
    const around = html.slice(Math.max(0, m.index - 1600), m.index + 1400);
    const imgs = [...around.matchAll(/data-(?:src|img)="(https:\/\/file\d*\.batdongsan\.com\.vn\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/g)]
      .map((x) => x[1]).filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);
    const loc = clean((around.match(/re__prj-card-location[^>]*>([\s\S]*?)<\/div>/) || [])[1] || "");
    const summary = clean((around.match(/re__prj-card-summary[^>]*>([\s\S]*?)<\/div>/) || [])[1] || "");
    const status = clean((around.match(/re__prj-tag-info[^>]*>[\s\S]*?<label>([\s\S]*?)<\/label>/) || [])[1] || "");
    const configs = [...around.matchAll(/re__prj-card-config-value[^>]*>([\s\S]*?)<\/span>/g)]
      .map((x) => clean(x[1])).filter(Boolean).slice(0, 3);
    const href = (around.match(/href="(\/[^"]*(?:-prj\d+|du-an[^"]*)\.html?|\/du-an\/[^"]+)"/) || [])[1];
    const district = (loc.split(",")[0] || "").trim();
    out.push({
      slug: slugify(name) + "-" + Math.abs(hash(name + loc)).toString(36).slice(0, 4),
      name, investor: null,
      province: city, district: district || null,
      description: summary || null,
      amenities: [],
      scale: configs.join(" · ") + (status ? " · " + status : ""),
      images: imgs,
      price_min: null, price_max: null,
      status: "published",
      url: href ? "https://batdongsan.com.vn" + href : null,
    });
  }
  // khử trùng theo tên
  const seen = new Set();
  return out.filter((p) => (seen.has(p.name) ? false : seen.add(p.name)));
}
function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }

async function run() {
  let all = [];
  for (const [path, city] of SEEDS) {
    const res = await fetch(`https://batdongsan.com.vn/${path}`, { headers: { "User-Agent": UA, "Accept-Language": "vi" } });
    if (res.ok) { const rows = parseProjects(await res.text(), city); all = all.concat(rows); console.error(path, "->", rows.length, "dự án"); }
    await sleep(2000);
  }
  const seen = new Set();
  all = all.filter((p) => (seen.has(p.name) ? false : seen.add(p.name)));
  fs.writeFileSync(new URL("./projects.json", import.meta.url), JSON.stringify({ total: all.length, projects: all }, null, 0));
  console.error("TỔNG dự án thật:", all.length);
  if (all[0]) console.error("ví dụ:", JSON.stringify({ name: all[0].name, loc: all[0].district + "," + all[0].province, imgs: all[0].images.length, scale: all[0].scale }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
