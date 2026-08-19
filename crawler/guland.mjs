// Crawler GULAND.VN — HTML server-render, fetch thẳng được (không Cloudflare, không cần Playwright).
// Thêm 18/8 để dày dữ liệu. Cấu trúc thẻ tin rất sạch:
//   <h3 class="c-sdb-card__tle"><a href=".../post/...-<id>">Tiêu đề</a></h3>
//   <span class="sdb-inf-data data-color-1 data-size-xl"><b>480 triệu</b></span>   <- giá
//   <span class="sdb-inf-data data-size-lg"><b>424m²</b></span>                    <- diện tích
//   <div class="sdb-inf-data data-type-adr">Xã ..., Huyện ..., Tỉnh ...</div>      <- khu vực
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { soVN } from "./so-vn.mjs";

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
  const ty = t.match(/([\d.,]+)\s*tỷ/);
  if (ty) return Math.round(soVN(ty[1]) * 1e9);
  const tr = t.match(/([\d.,]+)\s*(?:triệu|tr)\b/);
  if (tr) return Math.round(soVN(tr[1]) * 1e6);
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

// "đất" cần NHIỀU HƠN là biên chữ. Tiếng Việt tách âm tiết bằng khoảng trắng, nên trong
// "Xã Đất Cuốc" chữ "đất" VẪN là một token độc lập — biên (?<!\p{L})/(?!\p{L}) không cứu được.
// Đo thật trên 175 tiêu đề guland: thêm biên cho kết quả Y HỆT bản không biên (106 dat cả hai).
// Phải chặn theo NGỮ CẢNH:
//   1. sau đơn vị hành chính -> là ĐỊA DANH: Xã Đất Cuốc, Huyện Đất Đỏ (BRVT), Xã Đất Mũi (Cà Mau)
//   2. sau "nhà và/&/+"       -> là NHÀ kèm đất, không phải bán đất: "BÁN NHÀ VÀ ĐẤT 220M2"
//   3. "nền tảng"            -> không phải bất động sản (chú thích cũ nói đã chặn, thực ra chưa)
// odt|ont phải có biên: không thì khớp vào waterfront/belmont/piedmont/fontana -> shophouse thành "dat".
const DON_VI_HC = "(?:xã|huyện|phường|quận|thị\\s+trấn|thị\\s+xã|tp\\.?|thành\\s+phố|tỉnh)\\s+";
const RE_DAT = new RegExp(
  `(?<!${DON_VI_HC})(?<!nhà\\s(?:và|&|\\+)\\s)(?<!\\p{L})(?:đất|thổ\\s*cư|nền(?!\\s*tảng)|odt|ont)(?!\\p{L})`, "u");

export function loaiBds(s) {
  const t = (s || "").toLowerCase();
  if (/căn hộ|chung cư|c\.hộ/.test(t)) return "can_ho";
  if (RE_DAT.test(t)) return "dat";
  // "kho" cần biên chữ hai đầu: "kho" trần khớp cả "khoảng", "khu" -> 44 tin bị xếp nhầm (18/8)
  if (/mặt bằng|(?<!\p{L})kho(?!\p{L})|xưởng|văn phòng|shophouse|mặt tiền kinh doanh/u.test(t)) return "mat_bang";
  if (/phòng trọ|nhà trọ/.test(t)) return "phong_tro";
  if (/nhà|biệt thự|villa|nhà phố/.test(t)) return "nha";
  return "khac";
}

export function parseGuland(html, tinhMacDinh, deal) {
  const out = [];
  // Cắt ở TIÊU ĐỀ (__tle). Đã thử 2 mốc khác hôm 18/8 và đều hỏng: __wrap không bao tiêu đề
  // -> 0 tin; "c-sdb-card" trần khớp cả __cnt/__inf nên tiêu đề và giá rơi vào 2 mảnh -> 0 giá.
  // Ảnh không nằm trong mảnh này — boSungChiTiet() lấy từ trang chi tiết.
  const khoi = html.split('class="c-sdb-card__tle"').slice(1);
  for (const k0 of khoi) {
    const k = k0.slice(0, 4000);
    const m = k.match(/<a href="(https:\/\/guland\.vn\/post\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!m) continue;
    const url = m[1];
    // NFC — review /ultrareview: (?!\p{L}) coi dấu tổ hợp NFD (VD ký tự "ô" tách thành "o"+dấu) là
    // biên chữ, nên regex có biên tự thêm hôm nay có thể bị vô hiệu trên text NFD. Dữ liệu guland
    // đo thật đang là NFC (178/179), giữ vậy để không phụ thuộc vào nguồn không đổi định dạng.
    const title = dec(m[2]).normalize("NFC");
    if (!title || title.length < 10) continue;
    const id = (url.match(/-(\d+)$/) || [])[1];

    // các ô số liệu theo thứ tự: giá, diện tích, đơn giá, giá/m ngang
    const o = [...k.matchAll(/sdb-inf-data[^"]*"><b>([\s\S]*?)<\/b>/g)].map((x) => dec(x[1]));
    const giaTxt = o.find((v) => /tỷ|triệu|thỏa thuận/i.test(v) && !/\/m/.test(v));
    const dtTxt = o.find((v) => /m²|m2/i.test(v) && !/\//.test(v));
    // Diện tích dùng CHUNG quy tắc chấm với parseGia (review /ultrareview: bản cũ để nguyên dấu
    // chấm nên parseFloat("1.200m²") = 1.2 — mảnh 1.200m² thành 1,2m². Vì price_per_m2 = giá/DT,
    // sai 1000 lần ở đây đẩy đơn giá lệch 1000 lần và làm hỏng cả trung vị của cụm so giá.)
    const dt = dtTxt ? soVN(dtTxt.replace(/[^\d.,]/g, "")) : null;

    const diaChi = dec((k.match(/data-type-adr"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || "");
    const phan = diaChi.split(",").map((s) => s.trim()).filter(Boolean);
    const tinh = phan.length ? phan[phan.length - 1] : tinhMacDinh;
    // Nhận diện theo TIỀN TỐ, không theo vị trí — review 19/8: địa chỉ 2 cấp sau sáp nhập
    // ("Đường TC5, Xã Đức Lập, Tây Ninh") từng bị đọc thành quận="Xã Đức Lập",
    // phường="Đường TC5" -> bộ lọc quận/phường ra bucket rác, khoá geocode vô nghĩa.
    const giua = phan.slice(0, -1);
    const phuong = giua.find((x) => /^(Phường|Xã|Thị trấn|P\.\s*\d)/i.test(x)) || null;
    const quan = giua.find((x) => /^(Quận|Huyện|Thị xã|Thành phố|TP\.?|Q\.\s*\d)/i.test(x)) || null;

    // KHÔNG lấy ảnh ở trang danh sách: ảnh ở đó là /users/image/...-op.webp = AVATAR NGƯỜI ĐĂNG
    // (kiểm chứng 18/8: 9 tin dùng chung 1 ảnh). Ảnh thật chỉ có ở trang chi tiết -> boSungChiTiet().
    const gia = parseGia(giaTxt);
    out.push({
      id: "gl-" + (id || Math.abs(hash(url)).toString(36)),
      source: "crawl", source_site: "guland.vn", source_url: url, source_post_id: id || null,
      title, description: null,
      // chuỗi địa chỉ nguyên văn của nguồn ("Đường TC5, Xã Đức Lập, Tây Ninh") — trước đây
      // tách xong lấy 3 mảnh cuối rồi VỨT, mất luôn tên đường. Giữ lại: vừa hiện cho khách
      // đọc, vừa dùng geocode chính xác hơn tâm quận.
      address: diaChi || null,
      price_vnd: gia, area_m2: dt && dt > 0 ? dt : null,
      bedrooms: null, bathrooms: null, floors: null,
      listing_type: deal, property_type: loaiBds(title),
      province: sachTinh(tinh) || tinhMacDinh, district: quan, ward: phuong,
      lat: null, lng: null, amenities: [], images: [],
      poster_role: "khong_ro",
      // ai_score để null cho heuristicScore() của merge chấm — review 19/8: công thức tự chế
      // ở đây chấm guland trên thang khác hẳn các nguồn còn lại, và mọi tinh chỉnh thang chung
      // không bao giờ tới được guland.
      ai_score: null,
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
// review 19/8: tên cũ ANH_/GULAND_IMG_* gây lạc lối — hai hằng này giờ điều tiết CẢ lượt lấy
// chi tiết (ảnh + mô tả + SĐT + thông số), ai chỉnh "giới hạn ảnh" là vô tình bóp luôn phần kia.
// Trần nâng 120 -> 250: guland.json nằm trong .gitignore nên trên CI mỗi run đều VÔ TRẠNG THÁI,
// tin ngoài trần sẽ mang images:[] + description:null đi GHI ĐÈ dữ liệu run trước trong DB.
// 250 phủ trọn ~200 tin/lượt (~5 phút với 1.2s/tin — CI đã nới 60 phút).
const CT_GAP_MS = Number(process.env.GULAND_DETAIL_GAP_MS || process.env.GULAND_IMG_GAP_MS || 1200);
const CT_MAX = Number(process.env.GULAND_DETAIL_MAX || process.env.GULAND_IMG_MAX || 250);
// Cùng 1 lượt tải trang chi tiết lấy được CẢ BA: ảnh, mô tả, SĐT. Trang danh sách không
// có thứ nào trong ba (đo 19/8: 99/99 tin guland trong DB mô tả rỗng, 0% có SĐT).
// Lấy cho tin MỚI, và cho cả tin cũ còn THIẾU mô tả — để 99 tin đã nằm trong DB được bù.
async function boSungChiTiet(all, idCu) {
  // "đã lấy chi tiết" là DẤU MỐC tường minh (chi_tiet_luc), không suy từ dữ liệu — review 19/8:
  // suy từ "có ảnh && có mô tả" khiến tin mà trang chi tiết vốn không có ảnh bị tải lại VĨNH
  // VIỄN mỗi lượt, chiếm chỗ trong trần CT_MAX của tin mới thật.
  const can = all.filter((x) => x.source_url && !idCu.has(x.id)).slice(0, CT_MAX);
  if (!can.length) { console.error("Không tin nào cần lấy chi tiết."); return; }
  console.error(`\nLấy chi tiết (ảnh + mô tả + SĐT) cho ${can.length} tin (${CT_GAP_MS}ms/tin)...`);
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

      // SĐT: CHỈ lấy từ nút gọi của người đăng (class call-post). KHÔNG quét tel: cả trang —
      // review 19/8: trang còn chứa số của các tin gợi ý bên cạnh (đo: 5 số khác nhau/trang),
      // fallback tel: từng có thể gắn số NGƯỜI KHÁC vào tin -> khách gọi nhầm chủ.
      const p = html.match(/class="[^"]*call-post[^"]*"[\s\S]{0,300}?((?:0|\+84)\d{8,10})/);
      if (p) { x.contact_phone = p[1].replace(/^\+84/, "0"); sdt++; }
    }
    // review /ultrareview: trước đây đóng dấu NGOÀI khối if(html) -> một lần curl hỏng thoáng qua
    // (403/timeout — đúng chế độ dòng 125-128 mô tả) bị coi là "đã lấy chi tiết", loại tin đó khỏi
    // mọi lần thử lại VĨNH VIỄN dù chưa từng lấy được gì. Chỉ đóng dấu khi html tải thành công.
    if (html) x.chi_tiet_luc = new Date().toISOString();
    if ((i + 1) % 20 === 0) console.error(`  ...${i + 1}/${can.length} | ảnh ${anh} · mô tả ${mota} · SĐT ${sdt} · thông số ${spec}`);
    await sleep(CT_GAP_MS);
  }
  console.error(`Chi tiết xong: ảnh ${anh}/${can.length} · mô tả ${mota}/${can.length} · SĐT ${sdt}/${can.length} · thông số ${spec}/${can.length}`);
}

async function run() {
  // Đọc guland.json lượt trước MỘT lần (review 19/8: trước đây parse 2 lần, 2 Map lệch nhau)
  let cuMap = new Map();
  try {
    const cu = JSON.parse(fs.readFileSync(new URL("./guland.json", import.meta.url), "utf8"));
    cuMap = new Map((cu.listings || []).map((x) => [x.id, x]));
  } catch { /* lần đầu */ }
  // "đã lấy chi tiết" = có dấu mốc chi_tiet_luc; tin cũ trước khi có dấu mốc thì suy tạm từ mô tả
  const idCu = new Set([...cuMap.values()].filter((x) => x.chi_tiet_luc || x.description).map((x) => x.id));

  let all = [];
  for (const [base, tinh, deal] of SEEDS) {
    const html = tai(base);
    if (!html) { console.error(`  ${base} -> không tải được`); continue; }
    const rows = parseGuland(html, tinh, deal);   // review 19/8: từng parse 2 lần chỉ để log số
    all = all.concat(rows);
    console.error(`  ${tinh}/${deal} trang gốc: +${rows.length}`);

    // gom link khu vực trên chính trang đó rồi cào thêm (mỗi khu ~45 tin)
    // review /ultrareview: seed "cho_thue" từng lọc theo tiền tố "mua-ban-..." nên 0 link khu vực
    // khớp -> chỉ lấy được ~45 tin từ trang gốc, bỏ sót phần mở rộng. Đo thật trên trang cho thuê
    // TP.HCM: 120 href dạng "cho-thue-bat-dong-san-*", 0 dạng "mua-ban-...". Đổi tiền tố theo deal.
    const tienToKhu = deal === "cho_thue" ? "cho-thue" : "mua-ban";
    const khu = [...new Set([...html.matchAll(new RegExp(`href="(/${tienToKhu}-bat-dong-san-[a-z0-9-]{10,})"`, "g"))].map((m) => m[1]))]
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

  // Mang sang từ lượt trước MỌI thứ chỉ trang chi tiết mới có — review 19/8: bản cũ chỉ mang
  // description + contact_phone, làm specs/hướng/pháp lý/số tầng/tiện ích thành null ở lượt
  // N+1 rồi upsert nguyên hàng GHI ĐÈ null lên DB: thông số biến mất sau đúng một ngày.
  for (const x of all) {
    const c = cuMap.get(x.id);
    if (!c) continue;
    if (!x.images.length && c.images?.length) x.images = c.images;
    if (!x.description && c.description) x.description = c.description;
    if (!x.contact_phone && c.contact_phone) x.contact_phone = c.contact_phone;
    if (!x.specs && c.specs) x.specs = c.specs;
    if (!x.direction && c.direction) x.direction = c.direction;
    if (!x.legal && c.legal) x.legal = c.legal;
    if (!x.furnishing && c.furnishing) x.furnishing = c.furnishing;
    if (!x.floors && c.floors) x.floors = c.floors;
    if (!x.amenities?.length && c.amenities?.length) x.amenities = c.amenities;
    if (c.chi_tiet_luc) x.chi_tiet_luc = c.chi_tiet_luc;
  }

  if (!process.argv.includes("--no-img")) await boSungChiTiet(all, idCu);
  fs.writeFileSync(new URL("./guland.json", import.meta.url), JSON.stringify({
    summary: { source: "guland.vn", crawled_at: new Date().toISOString().slice(0, 10), total: all.length,
      with_price: all.filter((x) => x.price_vnd).length, with_img: all.filter((x) => x.images.length).length },
    listings: all,
  }, null, 0));
  console.error(`TỔNG guland: ${all.length} tin (giá: ${all.filter((x) => x.price_vnd).length}, ảnh: ${all.filter((x) => x.images.length).length})`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
