// Crawler GULAND.VN — HTML server-render, fetch thẳng được (không Cloudflare, không cần Playwright).
// Thêm 18/8 để dày dữ liệu. Cấu trúc thẻ tin rất sạch:
//   <h3 class="c-sdb-card__tle"><a href=".../post/...-<id>">Tiêu đề</a></h3>
//   <span class="sdb-inf-data data-color-1 data-size-xl"><b>480 triệu</b></span>   <- giá
//   <span class="sdb-inf-data data-size-lg"><b>424m²</b></span>                    <- diện tích
//   <div class="sdb-inf-data data-type-adr">Xã ..., Huyện ..., Tỉnh ...</div>      <- khu vực
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAGES = Number(process.env.GULAND_PAGES || 5);

const dec = (s) => (s || "")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[e])
  .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// Guland dùng CUỘN VÔ HẠN, không có link ?page= -> mỗi URL chỉ lấy được ~45 tin.
// Bù lại trang có sẵn rất nhiều link theo KHU VỰC (/mua-ban-bat-dong-san-<phường>-<tỉnh>),
// nên lấy breadth bằng cách gom link khu vực từ trang gốc rồi cào từng khu.
const SEEDS = [
  ["https://guland.vn/mua-ban-nha-dat-tp-ho-chi-minh", "Hồ Chí Minh", "ban"],
  ["https://guland.vn/cho-thue-nha-dat-tp-ho-chi-minh", "Hồ Chí Minh", "cho_thue"],
  ["https://guland.vn/mua-ban-nha-dat-ha-noi", "Hà Nội", "ban"],
  ["https://guland.vn/mua-ban-nha-dat-da-nang", "Đà Nẵng", "ban"],
];

function parseGia(s) {
  const t = (s || "").toLowerCase();
  if (!t || /thỏa thuận|thoả thuận|liên hệ/.test(t)) return null;
  const num = (v) => parseFloat(v.replace(/\./g, "").replace(",", "."));
  const ty = t.match(/([\d.,]+)\s*tỷ/);
  if (ty) return Math.round(num(ty[1]) * 1e9);
  const tr = t.match(/([\d.,]+)\s*(?:triệu|tr)\b/);
  if (tr) return Math.round(num(tr[1]) * 1e6);
  return null;
}

// Guland gắn hậu tố "(Mới)" vào tên tỉnh sau sáp nhập ("Đồng Nai (Mới)") -> bỏ, không thì
// thành một tỉnh riêng trong bộ lọc, khác với "Đồng Nai" của các nguồn khác.
const sachTinh = (s) => {
  const t = (s || "").replace(/\s*\((mới|cũ)\)\s*$/i, "").replace(/^(TP\.?|Thành phố|Tỉnh)\s+/i, "").trim();
  if (!t) return null;
  // đưa về đúng tên các nguồn khác đang dùng, không thì "TP. Hồ Chí Minh" thành một tỉnh riêng trong bộ lọc
  if (/hồ chí minh|hcm|sài gòn/i.test(t)) return "Hồ Chí Minh";
  if (/hà nội/i.test(t)) return "Hà Nội";
  if (/đà nẵng/i.test(t)) return "Đà Nẵng";
  return t;
};

function loaiBds(s) {
  const t = (s || "").toLowerCase();
  if (/căn hộ|chung cư|c\.hộ/.test(t)) return "can_ho";
  if (/đất|đất nền|đất thổ|thổ cư|lô đất|nền|odt|ont/.test(t)) return "dat";
  // kho chứ không phải /kho/: "kho" trần khớp cả "khoảng", "khu" -> 44 tin bị xếp nhầm (18/8)
  if (/mặt bằng|kho|nhà xưởng|xưởng|văn phòng|shophouse|mặt tiền kinh doanh/.test(t)) return "mat_bang";
  if (/phòng trọ|nhà trọ/.test(t)) return "phong_tro";
  if (/nhà|biệt thự|villa|nhà phố/.test(t)) return "nha";
  return "khac";
}

export function parseGuland(html, tinhMacDinh, deal) {
  const out = [];
  // mỗi tin bắt đầu bằng thẻ tiêu đề; cắt theo mốc đó
  // Cắt ở WRAPPER thẻ tin, không cắt ở tiêu đề: ảnh nằm TRƯỚC tiêu đề nên cắt ở tiêu đề
  // sẽ đẩy ảnh sang mảnh trước đó -> mất sạch ảnh (18/8: lần đầu ra 0 ảnh vì lỗi này).
  // Cắt ở TIÊU ĐỀ. Đã thử cắt ở c-sdb-card__wrap để lấy được cả ảnh (ảnh nằm trước tiêu đề)
  // nhưng __wrap không bao tiêu đề -> ra 0 tin. Cắt ở "c-sdb-card" trần thì khớp cả
  // __cnt/__tle/__inf nên mảnh vụn, tiêu đề và giá rơi vào 2 mảnh khác nhau -> 0 giá.
  // => giữ mốc này: đúng giá/diện tích/khu vực, tạm chưa lấy được ảnh (xem TODO cuối file).
  const khoi = html.split('class="c-sdb-card__tle"').slice(1);
  for (const k0 of khoi) {
    const k = k0.slice(0, 4000);
    const m = k.match(/<a href="(https:\/\/guland\.vn\/post\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!m) continue;
    const url = m[1], title = dec(m[2]);
    if (!title || title.length < 10) continue;
    const id = (url.match(/-(\d+)$/) || [])[1];

    // các ô số liệu theo thứ tự: giá, diện tích, đơn giá, giá/m ngang
    const o = [...k.matchAll(/sdb-inf-data[^"]*"><b>([\s\S]*?)<\/b>/g)].map((x) => dec(x[1]));
    const giaTxt = o.find((v) => /tỷ|triệu|thỏa thuận/i.test(v) && !/\/m/.test(v));
    const dtTxt = o.find((v) => /m²|m2/i.test(v) && !/\//.test(v));
    const dt = dtTxt ? parseFloat(dtTxt.replace(/[^\d.,]/g, "").replace(",", ".")) : null;

    const diaChi = dec((k.match(/data-type-adr"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || "");
    const phan = diaChi.split(",").map((s) => s.trim()).filter(Boolean);
    const tinh = phan.length ? phan[phan.length - 1] : tinhMacDinh;
    const quan = phan.length >= 2 ? phan[phan.length - 2] : null;
    const phuong = phan.length >= 3 ? phan[phan.length - 3] : null;

    // KHÔNG lấy ảnh ở trang danh sách: ảnh ở đó là /users/image/...-op.webp = AVATAR NGƯỜI ĐĂNG
    // (kiểm chứng 18/8: 9 tin khác nhau dùng chung 1 ảnh vì cùng người đăng). Ảnh thật của BĐS
    // nằm ở /files/... và CHỈ có trên trang chi tiết -> boSungAnh() lấy sau, chỉ cho tin MỚI.
    const anh = [];

    const gia = parseGia(giaTxt);
    out.push({
      id: "gl-" + (id || Math.abs(hash(url)).toString(36)),
      source: "crawl", source_site: "guland.vn", source_url: url, source_post_id: id || null,
      title, description: null,
      price_vnd: gia, area_m2: dt && dt > 0 ? dt : null,
      bedrooms: null, bathrooms: null, floors: null,
      listing_type: deal, property_type: loaiBds(title),
      province: sachTinh(tinh) || tinhMacDinh, district: quan, ward: phuong,
      lat: null, lng: null, amenities: [], images: [...new Set(anh)].slice(0, 6),
      poster_role: "khong_ro",
      ai_score: Math.max(40, Math.min(95, 55 + (gia ? 8 : 0) + (dt ? 6 : 0) + (anh.length ? 10 : 0) + (quan ? 4 : 0))),
    });
  }
  return out;
}
function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }

// Guland chặn theo DẤU VÂN TAY TLS của Node, không phải header: cùng thời điểm, cùng header thì
// curl trả 200 (45 tin) còn fetch() của Node trả 403. Đã thử thêm đủ bộ header trình duyệt
// (Accept, Sec-Fetch-*, Upgrade-Insecure-Requests...) vẫn 403 => không phải chuyện header.
// -> gọi curl để tải. curl có sẵn trên Windows 10+ và trên runner ubuntu của GitHub Actions.
function tai(url) {
  try {
    return execFileSync("curl", [
      "-sL", "--compressed", "--max-time", "30",
      "-A", UA, "-H", "Accept-Language: vi-VN,vi;q=0.9", url,
    ], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  } catch (e) { console.error("  curl lỗi:", e.message.slice(0, 80)); return ""; }
}

// Ảnh THẬT chỉ có ở trang chi tiết (/files/...). Chỉ lấy cho tin MỚI — so id với guland.json
// lượt trước — nên mỗi lượt chỉ vài chục lượt tải thay vì toàn bộ.
const ANH_GAP_MS = Number(process.env.GULAND_IMG_GAP_MS || 1200);
const ANH_MAX = Number(process.env.GULAND_IMG_MAX || 120);
// Cùng 1 lượt tải trang chi tiết lấy được CẢ BA: ảnh, mô tả, SĐT. Trang danh sách không
// có thứ nào trong ba (đo 19/8: 99/99 tin guland trong DB mô tả rỗng, 0% có SĐT).
// Lấy cho tin MỚI, và cho cả tin cũ còn THIẾU mô tả — để 99 tin đã nằm trong DB được bù.
async function boSungChiTiet(all, idCu) {
  const can = all.filter((x) => x.source_url && (!idCu.has(x.id) || !x.description)).slice(0, ANH_MAX);
  if (!can.length) { console.error("Không tin nào cần lấy chi tiết."); return; }
  console.error(`\nLấy chi tiết (ảnh + mô tả + SĐT) cho ${can.length} tin (${ANH_GAP_MS}ms/tin)...`);
  let anh = 0, mota = 0, sdt = 0, spec = 0;
  for (const [i, x] of can.entries()) {
    const html = tai(x.source_url);
    if (html) {
      // /files/... = ảnh BĐS thật; /users/image/... = avatar -> loại
      const u = [...new Set([...html.matchAll(/https:\/\/bizcdn\.guland\.vn\/files\/[^"'\s)]+?\.(?:jpg|jpeg|png|webp)/g)].map((m) => m[0]))];
      if (u.length) { x.images = u.slice(0, 8); anh++; }

      // mô tả nằm trong div.dtl-inf__dsr (đo trên trang thật 19/8: ~1100 ký tự)
      const d = html.match(/class="[^"]*dtl-inf__dsr[^"]*"[^>]*>([\s\S]*?)<\/div>/);
      if (d) {
        const t = d[1].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
          .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
        if (t.length > 60) { x.description = t.slice(0, 4000); mota++; }
      }

      // Bảng "Đặc điểm bất động sản": cặp nhãn/giá trị rất sạch, gồm cả thứ không nguồn nào
      // khác có (mặt tiền, chiều dài, hình dáng đất, số mặt tiếp giáp, loại sổ, hầm xe...).
      //   <div class="s-dtl-inf__lbl">Tổng diện tích đất:</div>
      //   <div class="s-dtl-inf__val"><b>505 m²</b></div>
      const sp = {};
      for (const m of html.matchAll(/s-dtl-inf__lbl">([^<]{2,40}?):?<\/div>\s*<div class="s-dtl-inf__val">([\s\S]{0,120}?)<\/div>/g)) {
        const v = m[2].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
        if (v && v !== "-") sp[m[1].trim()] = v;
      }
      if (Object.keys(sp).length) {
        x.specs = sp; spec++;
        // đổ vào đúng cột web đang hiển thị (trước đó toàn dấu gạch)
        x.direction = sp["Hướng nhà"] || sp["Hướng đất"] || x.direction || null;
        x.legal = sp["Loại sổ"] || sp["Tình trạng sổ"] || x.legal || null;
        x.furnishing = sp["Nội thất"] || x.furnishing || null;
        const t = parseInt(sp["Số tầng"] || "", 10);
        if (t > 0) x.floors = t;
        const am = new Set(x.amenities || []);
        if (/^có/i.test(sp["Hầm để xe"] || "")) am.add("parking");
        if (/^có/i.test(sp["Thang máy"] || "")) am.add("elevator");
        x.amenities = [...am];
      }

      // SĐT: nút "gọi" của người đăng — class call-post. KHÔNG quét cả trang vì trang còn
      // chứa số của các tin gợi ý bên cạnh (đo: 5 số khác nhau trong 1 trang).
      const p = html.match(/class="[^"]*call-post[^"]*"[\s\S]{0,300}?((?:0|\+84)\d{8,10})/)
        || html.match(/tel:((?:0|\+84)\d{8,10})/);
      if (p) { x.contact_phone = p[1].replace(/^\+84/, "0"); sdt++; }
    }
    if ((i + 1) % 20 === 0) console.error(`  ...${i + 1}/${can.length} | ảnh ${anh} · mô tả ${mota} · SĐT ${sdt} · thông số ${spec}`);
    await sleep(ANH_GAP_MS);
  }
  console.error(`Chi tiết xong: ảnh ${anh}/${can.length} · mô tả ${mota}/${can.length} · SĐT ${sdt}/${can.length} · thông số ${spec}/${can.length}`);
}

async function run() {
  // id lượt trước -> biết tin nào MỚI để chỉ lấy ảnh cho chúng
  const idCu = new Set();
  try {
    const cu = JSON.parse(fs.readFileSync(new URL("./guland.json", import.meta.url), "utf8"));
    for (const x of cu.listings || []) if (x.images?.length && x.description) idCu.add(x.id);
  } catch { /* lần đầu */ }

  let all = [];
  for (const [base, tinh, deal] of SEEDS) {
    const html = tai(base);
    if (!html) { console.error(`  ${base} -> không tải được`); continue; }
    all = all.concat(parseGuland(html, tinh, deal));
    console.error(`  ${tinh}/${deal} trang gốc: +${parseGuland(html, tinh, deal).length}`);

    // gom link khu vực trên chính trang đó rồi cào thêm (mỗi khu ~45 tin)
    const khu = [...new Set([...html.matchAll(/href="(\/mua-ban-bat-dong-san-[a-z0-9-]{10,})"/g)].map((m) => m[1]))]
      .slice(0, Number(process.env.GULAND_AREAS || 12));
    for (const k of khu) {
      const url = "https://guland.vn" + k;
      try {
        const h2 = tai(url);
        if (h2) {
          const rows = parseGuland(h2, tinh, deal);
          all = all.concat(rows);
          console.error(`    ${k.slice(0, 46)}: +${rows.length}`);
        }
      } catch (e) { console.error(`    ${k} lỗi:`, e.message); }
      await sleep(1200);
    }
  }
  const seen = new Set();
  all = all.filter((x) => (seen.has(x.id) ? false : seen.add(x.id)));
  if (!all.length) { console.error("guland: 0 tin -> giữ guland.json cũ"); return; }

  // giữ lại ảnh đã lấy được ở lượt trước cho tin cũ
  try {
    const cu = JSON.parse(fs.readFileSync(new URL("./guland.json", import.meta.url), "utf8"));
    const anhCu = new Map((cu.listings || []).filter((x) => x.images?.length).map((x) => [x.id, x.images]));
    for (const x of all) if (!x.images.length && anhCu.has(x.id)) x.images = anhCu.get(x.id);
    const ctCu = new Map((cu.listings || []).map((x) => [x.id, x]));
    for (const x of all) {
      const c = ctCu.get(x.id);
      if (c?.description && !x.description) x.description = c.description;
      if (c?.contact_phone && !x.contact_phone) x.contact_phone = c.contact_phone;
    }
  } catch { /* lần đầu */ }

  if (!process.argv.includes("--no-img")) await boSungChiTiet(all, idCu);
  fs.writeFileSync(new URL("./guland.json", import.meta.url), JSON.stringify({
    summary: { source: "guland.vn", crawled_at: new Date().toISOString().slice(0, 10), total: all.length,
      with_price: all.filter((x) => x.price_vnd).length, with_img: all.filter((x) => x.images.length).length },
    listings: all,
  }, null, 0));
  console.error(`TỔNG guland: ${all.length} tin (giá: ${all.filter((x) => x.price_vnd).length}, ảnh: ${all.filter((x) => x.images.length).length})`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
