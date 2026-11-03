// Video 9:16 từ 1 tin rổ hàng thật: đọc tin qua anon REST (CHỈ cột công khai như trang tin), tải ảnh
// về public/tin/<id>/, ghi props.json rồi render composition TinPhong ra out/tin-<mã>.mp4.
//
//   node scripts/lay-tin.mjs <id | mã RHxxxxxx>   -> tin đó
//   node scripts/lay-tin.mjs                      -> tin rổ hàng cho thuê mới nhất có >= 4 ảnh và giá điện
//   thêm --khong-render để chỉ lấy dữ liệu (xem thử bằng `npm run studio`)
//   thêm --khong-giong để bỏ lồng tiếng ElevenLabs (mặc định có, cần video/.env)
//
// Không đọc listing_ro_hang, contact_phone, source_url, address: video chỉ có những gì trang tin công khai đã hiện.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { longTieng, docTien, docMa } from "./long-tieng.mjs";

const ROOT = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

function docEnv() {
  const env = { ...process.env };
  const f = path.join(ROOT, "..", ".env.local");
  if (existsSync(f)) {
    for (const dong of readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = dong.match(/^(NEXT_PUBLIC_SUPABASE_(?:URL|ANON_KEY))=(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL / ANON_KEY (.env.local ở gốc repo)");
  return { url: env.NEXT_PUBLIC_SUPABASE_URL, key: env.NEXT_PUBLIC_SUPABASE_ANON_KEY };
}

const COT = "id,source,source_site,deal,kind,title,price_vnd,area_m2,bedrooms,bathrooms,province,district,ward,specs,images,status";

async function rest(sb, query) {
  const r = await fetch(`${sb.url}/rest/v1/listings?select=${COT}&${query}`, { headers: { apikey: sb.key, Authorization: `Bearer ${sb.key}` } });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

// giống src/lib/ro-hang.ts
const maPhong = (id) => "RH" + id.replace(/-/g, "").slice(0, 6).toUpperCase();
const laRoHang = (x) => x.source === "ro_hang" || ["evohome", "hifriendz", "thienkhoi"].includes(x.source_site || "");
// giống src/lib/doc-quyen.ts cheSoVanBan
const cheSo = (s) => String(s || "").replace(/(\+?84|0)[\s.\-]?(\d[\s.\-]?){7,10}/g, (m) => m.slice(0, 4) + "***");
// giống src/lib/img.ts hiRes (phần áp cho rổ hàng)
const hiRes = (u) => (u.includes(".zdn.vn/jpg/") ? u.replace("/jpg/", "/") : u);
const LA_VIDEO = /\.(mp4|mov|m4v|webm|avi|3gp|mkv)$/i;

function fmtGia(v, deal) {
  if (!v) return { so: "Thoả thuận", donVi: "" };
  if (v >= 1e9) { const t = v / 1e9; return { so: (t % 1 ? t.toFixed(2).replace(/\.?0+$/, "") : String(t)).replace(".", ","), donVi: "tỷ" }; }
  return { so: (Math.round(v / 1e5) / 10).toString().replace(/\.0$/, "").replace(".", ","), donVi: deal === "cho_thue" ? "triệu/tháng" : "triệu" };
}

// bảng phí: cùng regex với trang tin (src/app/listings/[id]/page.tsx), thiếu thì BỎ dòng - không bịa
const PHI = [["Điện", /^(tiền )?điện/i], ["Nước", /^(tiền )?nước/i], ["Gửi xe", /(gửi|giữ|để) xe/i], ["Dịch vụ", /dịch vụ|phí quản lý|phí chung/i]];

async function chonTin(sb, arg) {
  if (arg && /^[0-9a-f-]{36}$/i.test(arg)) return (await rest(sb, `id=eq.${arg}`))[0];
  if (arg) {
    const p = arg.trim().toLowerCase().replace(/^rh/, "");
    if (!/^[0-9a-f]{6}$/.test(p)) throw new Error(`"${arg}" không phải id hay mã phòng RHxxxxxx`);
    const ds = await rest(sb, `id=gte.${p}00-0000-0000-0000-000000000000&id=lte.${p}ff-ffff-ffff-ffff-ffffffffffff&status=eq.published`);
    if (ds.length > 1) console.warn(`Mã ${arg} khớp ${ds.length} tin, lấy tin đầu: ${ds.map((x) => x.id).join(", ")}`);
    return ds[0];
  }
  const ds = await rest(sb, "deal=eq.cho_thue&status=eq.published&order=first_seen_at.desc&limit=60");
  const match = ds.find((x) => (x.images || []).filter((u) => !LA_VIDEO.test(String(u).split(/[?#]/)[0])).length >= 4 && Object.keys(x.specs || {}).some((k) => PHI[0][1].test(k)));
  if (match) return match;
  return ds.find((x) => (x.images || []).filter((u) => !LA_VIDEO.test(String(u).split(/[?#]/)[0])).length >= 4);
}

async function taiAnh(urls, thuMuc, toiDa = 6) {
  rmSync(thuMuc, { recursive: true, force: true });
  mkdirSync(thuMuc, { recursive: true });
  const ok = [];
  for (const u of urls) {
    if (ok.length >= toiDa) break;
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(20000) });
      if (!r.ok) { console.warn(`  bỏ ảnh HTTP ${r.status}`); continue; }
      // vài CDN không gửi content-type -> nhận định dạng qua byte đầu
      const buf = Buffer.from(await r.arrayBuffer());
      const duoi = buf[0] === 0xff && buf[1] === 0xd8 ? "jpg" : buf.subarray(1, 4).toString() === "PNG" ? "png"
        : buf.subarray(8, 12).toString() === "WEBP" ? "webp" : null;
      if (!duoi || buf.length < 5000) { console.warn(`  bỏ ảnh: không phải jpg/png/webp (${buf.length} byte)`); continue; }
      const ten = `${ok.length + 1}.${duoi}`;
      writeFileSync(path.join(thuMuc, ten), buf);
      ok.push(ten);
    } catch (e) { console.warn(`  bỏ ảnh: ${e.message}`); }
  }
  return ok;
}

const args = process.argv.slice(2);
const khongRender = args.includes("--khong-render");
const khongGiong = args.includes("--khong-giong");
const sb = docEnv();
const x = await chonTin(sb, args.find((a) => !a.startsWith("--")));
if (!x) throw new Error("Không tìm thấy tin");
if (x.status !== "published") console.warn(`Cảnh báo: tin đang ở trạng thái ${x.status}`);
if (!laRoHang(x)) console.warn("Cảnh báo: không phải tin rổ hàng - video vẫn chỉ dẫn khách về Radar");

const ma = maPhong(x.id);
const specs = x.specs || {};
const giaTri = (re) => {
  const hit = Object.entries(specs).find(([k, v]) => re.test(k) && v && String(v).trim() !== "-");
  // "4.2 triệu" -> "4,2 triệu" cho khớp cách ghi giá trong video
  return hit ? String(hit[1]).trim().replace(/(\d)\.(\d)(?=\s*(triệu|tr|tỷ)\b)/gi, "$1,$2") : null;
};
const phi = x.deal === "cho_thue" ? PHI.map(([nhan, re]) => [nhan, giaTri(re)]).filter(([, v]) => v) : [];
const coc = x.deal === "cho_thue" ? giaTri(/cọc/i) : null;

// "Studio 25m² - 55/•• đường số 2, Gò Vấp" -> loại "Studio", khu vực "Đường số 2, Gò Vấp" (bỏ số nhà đã che)
const [dau, ...duoi] = cheSo(x.title).split(" - ");
const loai = specs["Loại phòng"] || dau.replace(/\s*\d+(?:[.,]\d+)?\s*m²/i, "").trim() || "Phòng";
const khuVucTho = duoi.join(" - ").replace(/^Khu vực\s+/i, "").replace(/^[\d/]*[•*][^\s]*\s+/, "").trim();
const quan = (x.district || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
const khuVuc = khuVucTho ? khuVucTho.charAt(0).toUpperCase() + khuVucTho.slice(1) : [x.ward, quan].filter(Boolean).join(", ");

const anhNguon = (x.images || []).filter((u) => typeof u === "string" && /^https?:\/\//.test(u) && !LA_VIDEO.test(u.split(/[?#]/)[0])).map(hiRes);
const thuMuc = path.join(ROOT, "public", "tin", x.id);
console.log(`Tin ${ma} · ${x.title} · ${anhNguon.length} ảnh nguồn`);
const anh = await taiAnh(anhNguon, thuMuc);
if (anh.length < 2) throw new Error(`Chỉ tải được ${anh.length} ảnh - không đủ làm video`);

const props = {
  id: x.id, ma, loai, khuVuc, quan,
  dienTich: x.area_m2 || null, phongNgu: x.bedrooms || null,
  noiThat: specs["Nội thất"] ? String(specs["Nội thất"]).replace(/^Nội thất\s+/i, "") : null,
  deal: x.deal, gia: fmtGia(x.price_vnd, x.deal), phi, coc,
  anh: anh.map((t) => `tin/${x.id}/${t}`),
  hotline: "0387 365 020",
};
// Lời đọc chỉ từ đúng các trường đã hiện trên hình - không thêm thông tin nào khác
function loiDoc(p) {
  const gia = p.gia.donVi ? `${docTien(`${p.gia.so} ${p.gia.donVi.replace("/tháng", "")}`)}${p.deal === "cho_thue" ? " một tháng" : ""}` : "thoả thuận";
  const dt = p.dienTich ? ` ${docTien(String(p.dienTich))} mét vuông` : "";
  const cau = [["hero", `[warmly] ${docTien(p.loai)}${dt} ở ${p.khuVuc}, giá ${gia}.`]];
  if (p.anh.length > 1) cau.push(["anh", `Ảnh thật của phòng${p.noiThat ? `, nội thất ${p.noiThat.toLowerCase()}` : ""}.`]);
  if (p.deal === "cho_thue" && (p.phi.length || p.coc)) {
    const khoan = p.phi.map(([a, b]) => `${a.toLowerCase()} ${docTien(b)}`);
    cau.push(["phi", `Chi phí ghi rõ ràng. ${khoan.join(", ")}${khoan.length ? "." : ""}${p.coc ? ` Cọc ${docTien(p.coc)}.` : ""}`]);
  }
  cau.push(["cta", `Muốn xem phòng, nhắn Zalo Nhà Đất Radar, gửi kèm mã ${docMa(p.ma)}.`]);
  return cau;
}
if (!khongGiong) props.vo = await longTieng(`tin-${ma}`, loiDoc(props));

const fileProps = path.join(thuMuc, "props.json");
writeFileSync(fileProps, JSON.stringify(props, null, 2));
console.log(`Đã ghi ${path.relative(ROOT, fileProps)} (${anh.length} ảnh, ${phi.length} khoản phí)`);

if (!khongRender) {
  const out = `out/tin-${ma}.mp4`;
  // shell: true để chạy được npx.cmd trên Windows -> tham số có dấu cách phải tự bọc ngoặc kép
  const r = spawnSync("npx", ["remotion", "render", "src/index.ts", "TinPhong", out, `"--props=${fileProps}"`,
    "--codec", "h264", "--crf", "17", "--overwrite", `"--browser-executable=${CHROME}"`], { cwd: ROOT, stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
  console.log(`Xong: ${path.join(ROOT, out)}`);
}
