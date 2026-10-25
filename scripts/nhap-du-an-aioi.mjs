// Nhập DỰ ÁN từ kho "AI Ơi Nhà Đất" (Supabase rqxmmqmctpklqcmbfxuj, cùng chủ) vào bảng projects của Radar (25/10).
// Kho nguồn ~2.360 dự án (Mogi: tên, chủ đầu tư, địa chỉ/đường, phường, quận, toạ độ, ảnh, giá, tiện ích);
// Radar trước đó chỉ có 57 dự án lấy từ chính kho này.
//
// Chạy thử (không ghi):  node --env-file=.env.local scripts/nhap-du-an-aioi.mjs
// Ghi thật:              node --env-file=.env.local scripts/nhap-du-an-aioi.mjs --ghi
//
// - Khử trùng theo slug (cùng kiểu "ten-du-an-prjNNNN" của Mogi) + tên chuẩn hoá; dự án đã có thì GIỮ NGUYÊN.
// - Bỏ dự án không ảnh (web cũng ẩn - xem app/projects/page.tsx).
// - Ghi bằng SUPABASE_SERVICE_ROLE_KEY của Radar; đọc kho nguồn bằng publishable key (projects ở nguồn cho đọc công khai).
const RADAR = process.env.NEXT_PUBLIC_SUPABASE_URL, RKEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SRC = process.env.AIOI_SUPABASE_URL || "https://rqxmmqmctpklqcmbfxuj.supabase.co";
const SKEY = process.env.AIOI_SUPABASE_KEY || "sb_publishable_f4wNO8jQcCDWn1QmNZQ7-g_BXDtYM3Y";
const GHI = process.argv.includes("--ghi");
if (!RADAR || !RKEY) { console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (chạy với --env-file=.env.local)"); process.exit(1); }

const hdr = (k) => ({ apikey: k, Authorization: `Bearer ${k}` });
// mạng chập chờn (lần chạy đầu 25/10 chết giữa chừng ở lô 4): thử lại 3 lần, cách 2s
async function goi(url, init = {}, lan = 3) {
  try { return await fetch(url, init); }
  catch (e) { if (lan <= 1) throw e; await new Promise((r) => setTimeout(r, 2000)); return goi(url, init, lan - 1); }
}
// PostgREST trả tối đa 1.000 dòng/lần -> đọc theo trang (Range)
async function docHet(url, key) {
  const ra = [];
  for (let tu = 0; ; tu += 1000) {
    const r = await goi(url, { headers: { ...hdr(key), Range: `${tu}-${tu + 999}` } });
    if (!r.ok) throw new Error(`đọc ${url.split("?")[0]} ${r.status}: ${await r.text()}`);
    const d = await r.json(); ra.push(...d);
    if (d.length < 1000) return ra;
  }
}
const COT = "slug,name,developer,description,province,district,ward,location_raw,lat,lng,amenities,images,price_min,price_max,legal_status,status_text,handover,specs,source_url";


const chuan = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const mangChu = (v, max) => (Array.isArray(v) ? v : []).filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()).slice(0, max);

const nguon = await docHet(`${SRC}/rest/v1/projects?select=${COT}&order=slug`, SKEY);
const coSan = await docHet(`${RADAR}/rest/v1/projects?select=slug,name&order=slug`, RKEY);
const slugCo = new Set(coSan.map((p) => p.slug).filter(Boolean)), tenCo = new Set(coSan.map((p) => chuan(p.name)));

const thongKe = { nguon: nguon.length, daCo: 0, khongAnh: 0, trungTrongNguon: 0, nhap: 0 };
const daThay = new Set(); const moi = [];
for (const p of nguon) {
  const anh = mangChu(p.images, 12);
  if (!p.name || !p.slug) continue;
  if (slugCo.has(p.slug) || tenCo.has(chuan(p.name))) { thongKe.daCo++; continue; }
  if (!anh.length) { thongKe.khongAnh++; continue; }
  if (daThay.has(p.slug)) { thongKe.trungTrongNguon++; continue; }
  daThay.add(p.slug);
  const specs = { ...(p.specs && typeof p.specs === "object" && !Array.isArray(p.specs) ? p.specs : {}) };
  if (p.legal_status && !specs["Pháp lý"]) specs["Pháp lý"] = p.legal_status;
  if (p.status_text && !specs["Tình trạng"]) specs["Tình trạng"] = p.status_text;
  const lat = Number(p.lat), lng = Number(p.lng);
  moi.push({
    slug: p.slug, name: p.name.trim(), investor: p.developer || null, description: p.description || null,
    province: p.province || null, district: p.district || null, ward: p.ward || null, address: p.location_raw || null,
    geo: Number.isFinite(lat) && Number.isFinite(lng) && lat && lng ? `SRID=4326;POINT(${lng} ${lat})` : null,
    amenities: mangChu(p.amenities, 30), images: anh,
    price_min: p.price_min ?? null, price_max: p.price_max ?? null,
    handover: p.handover || null, specs, source_url: p.source_url || null, status: "published",
  });
}
thongKe.nhap = moi.length;
console.log(thongKe);
console.log("Ví dụ:", moi.slice(0, 2).map((m) => ({ ten: m.name, dia_chi: m.address, toa_do: !!m.geo, anh: m.images.length, gia: m.price_min })));
const theoTinh = moi.reduce((a, m) => ((a[m.province || "?"] = (a[m.province || "?"] || 0) + 1), a), {});
console.log("Theo tỉnh:", theoTinh);

if (!GHI) { console.log("\nChạy thử - chưa ghi gì. Thêm --ghi để nhập thật."); process.exit(0); }
let ok = 0;
for (let i = 0; i < moi.length; i += 200) {
  const lo = moi.slice(i, i + 200);
  const r = await goi(`${RADAR}/rest/v1/projects?on_conflict=slug`, {
    method: "POST",
    headers: { ...hdr(RKEY), "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(lo),
  });
  if (!r.ok) { console.error(`Lô ${i / 200 + 1} lỗi ${r.status}: ${(await r.text()).slice(0, 300)}`); process.exit(1); }
  ok += lo.length; process.stdout.write(`\rĐã ghi ${ok}/${moi.length}`);
}
console.log(`\n✓ Xong: nhập ${ok} dự án mới.`);
