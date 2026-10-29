// Chuẩn hoá cột listings.district về một tên mỗi quận (29/10).
// Bot Zalo từng ghi tên trần ("Gò Vấp", "Hóc Môn") cạnh "Quận Gò Vấp"; vài tin còn dạng "Q. Gò Vấp (P. ... mới)".
// Cùng quận bị tách bucket -> chip quận trùng trên /search, trang khu vực đếm thiếu.
// Dùng đúng hàm của crawler (chung.mjs canonDistrict + quanTheoDB) để dữ liệu cũ và tin mới cùng một chuẩn.
//
//   node scripts/chuan-hoa-quan.mjs          -> chạy thử: in các thay đổi, KHÔNG ghi DB
//   node scripts/chuan-hoa-quan.mjs --chay   -> ghi thật
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { canonDistrict, quanTheoDB } from "../crawler/chung.mjs";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const CHAY = process.argv.includes("--chay");

// mọi trạng thái tin (ẩn/đã bán cũng chuẩn luôn, kẻo hiện lại thì tách bucket)
const rows = [];
for (let tu = 0; ; tu += 1000) {
  const { data, error } = await sb.from("listings").select("id,province,district,ward,source_site").not("district", "is", null).order("id").range(tu, tu + 999);
  if (error) throw error;
  rows.push(...data);
  if (data.length < 1000) break;
}

// tên chuẩn chọn theo số tin của chính dữ liệu (biến thể có tiền tố nhiều tin nhất trong tỉnh)
const dem = new Map();
for (const r of rows) { const k = `${r.province}\u0000${r.district}`; dem.set(k, (dem.get(k) || 0) + 1); }
const demQuan = [...dem].map(([k, n]) => [...k.split("\u0000"), n]);

// Tên đã đủ tiền tố, không ngoặc ("Quận Thủ Đức", "Thành phố Thủ Đức") KHÔNG đụng: EvoHome (ro-hang-evohome.mjs
// tenQuan) cố ý ghi "Quận Thủ Đức" và ghi lại mỗi lượt quét -> đổi ở đây chỉ bị lật lại; gộp Thủ Đức là việc riêng.
const daDuTienTo = (d) => /^(Quận|Huyện|Thành phố|Thị xã) [^()]+$/.test(d);

const doi = new Map();   // "tỉnh|cũ|mới" -> { ids, nguon, phuong: [{id, ward}] }
for (const r of rows) {
  if (daDuTienTo(r.district)) continue;
  const { district, wardHint } = r.province ? quanTheoDB(r.district, r.province, demQuan) : canonDistrict(r.district);
  if (!district || district === r.district) continue;
  const k = [r.province, r.district, district].join("|");
  const g = doi.get(k) || { province: r.province, cu: r.district, moi: district, ids: [], nguon: new Set(), phuong: [] };
  g.ids.push(r.id); g.nguon.add(r.source_site);
  if (!r.ward && wardHint) g.phuong.push({ id: r.id, ward: wardHint });
  doi.set(k, g);
}

let tong = 0;
for (const g of [...doi.values()].sort((a, b) => b.ids.length - a.ids.length)) {
  tong += g.ids.length;
  console.log(`${String(g.ids.length).padStart(4)}  ${g.province ?? "(không tỉnh)"}: "${g.cu}" -> "${g.moi}"  [${[...g.nguon].join(", ")}]${g.phuong.length ? `  +${g.phuong.length} phường` : ""}`);
}
console.log(`\n${tong} tin / ${rows.length} tin có quận sẽ đổi tên quận (${doi.size} nhóm).`);
if (!CHAY) { console.log("Chạy thử - chưa ghi gì. Ghi thật: node scripts/chuan-hoa-quan.mjs --chay"); process.exit(0); }

for (const g of doi.values()) {
  for (let i = 0; i < g.ids.length; i += 200) {
    const { error } = await sb.from("listings").update({ district: g.moi }).in("id", g.ids.slice(i, i + 200));
    if (error) throw error;
  }
  for (const p of g.phuong) {
    const { error } = await sb.from("listings").update({ ward: p.ward }).eq("id", p.id).is("ward", null);
    if (error) throw error;
  }
}
console.log("Đã ghi. Cây khu vực (areas-v5, 30 phút) và kết quả tìm (search-v10, 15 phút) tự làm mới; muốn ngay thì gọi /api/revalidate.");
