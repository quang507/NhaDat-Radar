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

// mogi có ~1.600 dự án (đã dò: cp=200 vẫn ra dự án mới). Sàn phục vụ khách miền Nam nên
// CÀO TP.HCM TRƯỚC (?tinh-thanh=ho-chi-minh), xong mới quét toàn quốc cho phần còn lại.
const SEEDS = [
  { url: "https://mogi.vn/du-an?tinh-thanh=ho-chi-minh", pages: Number(process.env.MOGI_HCM_PAGES || 60), ten: "TP.HCM" },
  { url: "https://mogi.vn/du-an", pages: Number(process.env.MOGI_ALL_PAGES || 40), ten: "toàn quốc" },
];

const dec = (s) => (s || "")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[e])
  .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// HTML mô tả -> text CÓ CẤU TRÚC (17/8: bản đầu nhét cả bài thành 1 khối 3.200 ký tự, trang dự án
// thành bức tường chữ). Giữ lại phân đoạn của nguồn: <h2/h3/h4/strong đứng riêng> -> "## Tiêu đề",
// <li> -> "- gạch đầu dòng", <p>/<br> -> xuống dòng. Trang web tự render lại theo các dấu này.
export function structText(html) {
  if (!html) return "";
  let s = String(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<h[1-6][^>]*>/gi, "\n\n## ")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|ul|ol|table|tr)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ");
  s = dec0(s);
  const dong = s.split("\n").map((l) => l.replace(/\s+/g, " ").trim());
  // Ghép dấu đầu dòng bị MỒ CÔI: mogi hay lồng <p> trong <li> nên "-" rơi thành một dòng riêng,
  // chữ tụt xuống dòng sau -> trang hiện một gạch đầu dòng TRỐNG rồi mới tới nội dung (17/8).
  const ghep = [];
  for (const l of dong) {
    const truoc = ghep.length ? ghep[ghep.length - 1] : null;
    if (l && (truoc === "-" || truoc === "##")) { ghep[ghep.length - 1] = truoc + " " + l; continue; }
    ghep.push(l);
  }
  return ghep
    .filter((l, i, a) => l || (a[i - 1] || "").length)      // gộp dòng trống liên tiếp
    .filter((l) => l !== "-" && l !== "##")                 // dấu/tiêu đề rỗng còn sót
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
// giải mã entity nhưng KHÔNG bóc thẻ (structText đã xử lý thẻ trước đó)
const dec0 = (s) => (s || "")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[e]);

// Dòng khu vực ở TRANG DANH SÁCH: "Quận 10, TPHCM | Bàn giao: 2020" -> {district, province}.
// Đây là nguồn khu vực ĐÁNG TIN nhất cho dự án đã gỡ trang chi tiết (17/8: 287 dự án từng bị gán
// district = "Thành phố Hồ Chí Minh", ward = "TP.Hồ Chí Minh" vì lấy nhầm khối JSON-LD văn phòng mogi).
export function parseAddrLine(line) {
  const truoc = String(line || "").split("|")[0].trim();
  if (!truoc) return { district: null, province: null };
  const phan = truoc.split(",").map((s) => s.trim()).filter(Boolean);
  if (!phan.length) return { district: null, province: null };
  const province = canonProvince(phan[phan.length - 1]);
  const district = phan.length >= 2 ? phan[phan.length - 2] : null;
  // Bỏ district khi nó chính là TÊN TỈNH ("Thành phố Hồ Chí Minh" trong tỉnh "Hồ Chí Minh")
  // -> hiện ra sẽ thành "Thành phố Hồ Chí Minh, Hồ Chí Minh". LƯU Ý: "Thành phố Dĩ An",
  // "Thành phố Thuận An", "Thành phố Thủ Đức" là ĐƠN VỊ CẤP HUYỆN có thật, phải giữ.
  const rac = district && canonProvince(district) === province;
  return { district: rac ? null : district, province };
}

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
  // Loại khối của CHÍNH trang mogi (tên "Mogi", url về trang chủ) — sự cố 17/8: 17 dự án bị đặt tên
  // "Mogi" vì không khối nào khớp url dự án nên rơi vào nhánh cuối và vớ đúng khối của website.
  const laMogi = (c) => /^mogi/i.test(String(c?.name || "").trim()) || /^https?:\/\/mogi\.vn\/?$/.test(String(c?.url || ""));
  const ld = cands.find((c) => typeof c?.url === "string" && c.url.includes(base))
    || cands.filter((c) => !laMogi(c)).find((c) => typeof c?.address === "string")
    || cands.filter((c) => !laMogi(c)).pop()
    || null;
  const lat = ld?.geo?.latitude ? Number(ld.geo.latitude) : null;
  const lng = ld?.geo?.longitude ? Number(ld.geo.longitude) : null;
  // Toạ độ phải nằm trong lãnh thổ VN, không thì là địa chỉ văn phòng mogi lọt vào
  const geoOk = lat != null && lng != null && lat > 8 && lat < 24 && lng > 102 && lng < 110;

  // Mô tả dài nằm trong <div id="project-intro"> (KHÔNG phải class) — cắt tới khối kế tiếp.
  // ld.description chỉ là câu SEO ngắn nên chỉ dùng làm phương án dự phòng.
  const introHtml = (html.match(/id="project-intro">([\s\S]*?)(?:<div (?:id|class)="(?!.*project-intro)|<section|<\/section)/) || [])[1] || "";
  const intro = structText(introHtml).slice(0, 6000);
  // dec() bóc thẻ nên "m<sup>2</sup>" thành "m 2" -> ghép lại thành m² cho ra hồn
  const m2 = (s) => s.replace(/\bm\s*2\b/g, "m²");
  const specs = [...html.matchAll(/<li>\s*<span>\s*([^<]+?)\s*<\/span>([\s\S]*?)<\/li>/g)]
    .map((m) => [dec(m[1]), m2(dec(m[2]))]).filter(([k, v]) => k && v);

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

// fetch KHÔNG có timeout mặc định — một kết nối treo là đứng cả lượt cào mà không có dấu hiệu gì.
// (17/8: script bổ sung tạm bị nghi treo vì thiếu đúng chỗ này.)
const TIMEOUT_MS = Number(process.env.MOGI_TIMEOUT_MS || 30000);
async function fetchTO(url, opt = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try { return await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "vi" }, signal: ctrl.signal, ...opt }); }
  finally { clearTimeout(t); }
}

async function get(url) {
  const res = await fetchTO(url);
  if (res.status !== 200) throw new Error("HTTP " + res.status);
  return res.text();
}

// Lấy trang CHI TIẾT dự án.
//
// Sự cố 17/8 — CHẨN ĐOÁN SAI LẦN ĐẦU, ghi lại để không lặp: lượt cào đầu có 280/700 dự án trả
// 302 về /du-an. Tôi kết luận "mogi đã gỡ dự án" sau khi thử ĐÚNG MỘT URL. Sai. Thử lại 12 URL
// với nhịp 3 giây thì 11/12 trả 200 kèm JSON-LD đầy đủ — nghĩa là mogi CHẶN TỐC ĐỘ khi bị bắn
// 700 request cách nhau 0.9s, và 302 là tín hiệu "chậm lại", không phải "trang không còn".
// (fetch() mặc định đi theo redirect nên crawler âm thầm parse trang danh sách chung -> tên rơi
//  về "Mogi", địa chỉ thành văn phòng mogi, toạ độ sai cho 288 dự án.)
//
// -> Gặp 3xx thì NGHỈ RỒI THỬ LẠI (5s, 15s, 30s). Chỉ khi hết lượt mới coi là không lấy được,
//    và kể cả khi đó cũng KHÔNG kết luận là bị gỡ — chỉ ghi nhận "chưa lấy được lần này".
const DETAIL_GAP_MS = Number(process.env.MOGI_DETAIL_GAP_MS || 2500);
async function getDetail(url) {
  const cho = [5000, 15000, 30000];
  for (let lan = 0; lan <= cho.length; lan++) {
    let res;
    try { res = await fetchTO(url, { redirect: "manual" }); }
    catch (e) { // timeout / lỗi mạng -> coi như lần thử hỏng, nghỉ rồi thử lại
      if (lan === cho.length) return { html: null, chuaLay: true };
      await sleep(cho[lan]); continue;
    }
    if (res.status === 200) return { html: await res.text(), chuaLay: false };
    if (res.status >= 300 && res.status < 400) {
      if (lan === cho.length) return { html: null, chuaLay: true };   // bị chặn liên tục -> bỏ qua lượt này
      await sleep(cho[lan]);
      continue;
    }
    throw new Error("HTTP " + res.status);
  }
  return { html: null, chuaLay: true };
}

async function crawl() {
  const byHref = new Map();  // khử trùng ngay: dự án nổi bật lặp ở nhiều trang, và HCM trùng toàn quốc
  for (const seed of SEEDS) {
    let rong = 0;
    for (let p = 1; p <= seed.pages; p++) {
      const url = p === 1 ? seed.url : seed.url + (seed.url.includes("?") ? "&" : "?") + `cp=${p}`;
      try {
        const list = parseList(await get(url));
        if (!list.length) { console.error(`  ${seed.ten} trang ${p}: 0 dự án -> dừng seed này`); break; }
        const truoc = byHref.size;
        for (const c of list) if (!byHref.has(c.href)) byHref.set(c.href, c);
        const moi = byHref.size - truoc;
        if (p % 10 === 0 || moi === 0) console.error(`  ${seed.ten} trang ${p}: +${moi} mới (tổng ${byHref.size})`);
        // Dừng sớm khi hết dự án mới — nhưng CHỈ sau trang 12 và cần 8 trang trống liên tiếp.
        // Sự cố 17/8: seed "toàn quốc" có ~8 trang đầu là dự án NỔI BẬT, trùng hết với phần
        // TP.HCM vừa cào -> ngưỡng 3 trang cắt ngay trang 3, không bao giờ tới dự án Hà Nội/Đà Nẵng.
        if (moi === 0 && p >= 12) { if (++rong >= 8) { console.error(`  ${seed.ten}: 8 trang liền không có dự án mới -> dừng`); break; } }
        else if (moi > 0) rong = 0;
      } catch (e) { console.error(`  ${seed.ten} trang ${p} lỗi:`, e.message); }
      await sleep(900);
    }
    console.error(`${seed.ten}: xong, tổng gom được ${byHref.size} dự án`);
  }
  const uniq = [...byHref.values()];
  console.error(`\n${uniq.length} dự án duy nhất -> lấy chi tiết...`);

  const out = [];
  let chuaLayDem = 0;   // số dự án chưa lấy được trang chi tiết lượt này (bị chặn tốc độ)
  for (const [i, c] of uniq.entries()) {
    const url = "https://mogi.vn" + c.href;
    try {
      const { html, chuaLay } = await getDetail(url);
      // Chưa lấy được chi tiết (bị chặn tốc độ) -> KHÔNG parse, dùng dữ liệu trang danh sách.
      // Lượt cào sau sẽ lấy lại; tuyệt đối không ghi đè bằng dữ liệu rác.
      const d = chuaLay
        ? { name: null, mogiId: null, description: null, investor: null, address: null,
            province: null, district: null, ward: null, lat: null, lng: null, images: [], specs: [] }
        : parseDetail(html, c.href);
      if (chuaLay) chuaLayDem++;
      // Khu vực từ trang danh sách ("Quận 10, TPHCM | Bàn giao: 2020") — dùng khi chi tiết không có
      const kv = parseAddrLine(c.addrLine);
      const slug = c.href.replace(/^\//, "");
      const priceMin = parsePrice(c.priceText);
      // "Từ 3 tỷ 55 triệu (65 - 68 triệu/m²)" -> tách phần đơn giá trong ngoặc để hiện riêng
      const ppm2 = (c.priceText.replace(/\bm\s*2\b/g, "m²").match(/\(([^)]*\/m²?)/) || [])[1];
      out.push({
        slug, source_url: url, mogi_id: d.mogiId,
        price_per_m2_text: ppm2 ? ppm2.replace(/\s*2\s*$/, "²").trim() : null,
        // Tên ở TRANG DANH SÁCH (c.name) luôn đúng vì bóc từ <h2 class="project-title">;
        // JSON-LD chỉ dùng khi danh sách không có, và không bao giờ nhận "Mogi" (tên website).
        name: c.name || (/^mogi$/i.test((d.name || "").trim()) ? null : d.name) || null,
        investor: d.investor || c.investor,
        description: d.description,
        address: d.address,
        province: d.province || kv.province, district: d.district || kv.district, ward: d.ward,
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
  // ---- CỔNG CHẤT LƯỢNG (17/8) ----
  // Dự án thiếu cả bảng thông số lẫn mô tả thì trang chi tiết trống trơn, đưa lên chỉ tổ rác.
  // Nhiều dự án cũ trên mogi có <ul class="info-general"> RỖNG và không có #project-intro —
  // đã kiểm chứng tay (empire-city-thu-thiem, green-valley-thung-lung-xanh) chứ không phải bị chặn.
  // PHẢI lọc ở đây, không thì lượt cào sau lại nạp về đúng đám vừa xoá khỏi DB.
  const duTieuChuan = (p) => Object.keys(p.specs || {}).length > 0 && (p.description || "").trim().length > 200;
  const giu = out.filter(duTieuChuan);
  const loai = out.length - giu.length;
  console.error(`\nCổng chất lượng: giữ ${giu.length}/${out.length} dự án (loại ${loai} vì thiếu cả thông số lẫn mô tả)`);
  out.length = 0; out.push(...giu);

  if (!out.length) { console.error("mogi-projects: 0 dự án -> giữ projects.json cũ"); return null; }
  fs.writeFileSync(new URL("./projects.json", import.meta.url), JSON.stringify({
    summary: { crawled_at: new Date().toISOString().slice(0, 10), total: out.length, with_geo: out.filter((x) => x.lat).length, with_img: out.filter((x) => x.images.length).length },
    projects: out,
  }, null, 0));
  console.error(`\nTỔNG ${out.length} dự án (toạ độ: ${out.filter((x) => x.lat).length}, ảnh: ${out.filter((x) => x.images.length).length}, `
    + `${chuaLayDem} chưa lấy được chi tiết lượt này) -> projects.json`);
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
      specs: p.specs || {}, handover: p.handover, source_url: p.source_url,
      price_per_m2_text: p.price_per_m2_text,
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
