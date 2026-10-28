// Dựng bảng quy đổi phường/xã CŨ -> MỚI (sáp nhập 01/7/2025) từ bảng chuyển đổi chính thức của Cục Thống kê (NSO).
//
//   node scripts/xay-bang-phuong.mjs <đường dẫn CSV NSO>   -> ghi data/sap-nhap-phuong-2025.json
//
// Nguồn (28/10, kiểm SHA-256 trước khi dựng):
//   - NSO: https://danhmuchanhchinh.nso.gov.vn/TAPTIN/BangChuyendoi%C4%90VHCmoi_cu_final.xlsx
//     sha256 213966723785859dedd7c88965d6f12f8c3c508c91796e003804cf60a1054fc2
//   - Bản CSV chép nguyên bảng trên (sunshine-tech/VietnamProvinces @4cc4038):
//     dev/seed-data/2025-07/BangChuyendoiĐVHCmoi_cu_khong_merge.csv
//     sha256 21da94f59a498d03deda1f0882e71f65cd3b7c855bbd6c760ba72f6b6a94ee46
//   ViAdminShift (LLaammTTeerr) dùng đúng hai file này và đối chiếu với 34 nghị quyết NQ 1654-1687/NQ-UBTVQH15.
// Dùng chung cho Radar (src/lib/phuong-moi.ts) và bot AI Ơi Nhà Đất (Python đọc thẳng JSON).
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const SHA_CSV = "21da94f59a498d03deda1f0882e71f65cd3b7c855bbd6c760ba72f6b6a94ee46";
const tep = process.argv[2];
if (!tep) { console.error("thiếu đường dẫn CSV NSO"); process.exit(1); }
const raw = readFileSync(tep);
const sha = createHash("sha256").update(raw).digest("hex");
if (sha !== SHA_CSV) { console.error(`SHA-256 lệch (${sha}) - nguồn đã đổi, kiểm lại trước khi dựng`); process.exit(1); }

// CSV RFC4180 tối giản: ngoặc kép, "" thoát, xuống dòng trong ô (tên xã mới có ô xuống dòng)
function docCsv(t) {
  const rows = []; let row = [], o = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"' && t[i + 1] === '"') { o += '"'; i++; } else if (c === '"') q = false; else o += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(o); o = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(o); rows.push(row); row = []; o = ""; }
    else o += c;
  }
  if (o || row.length) { row.push(o); rows.push(row); }
  return rows;
}
const sach = (s) => s.replace(/\s+/g, " ").trim();
const boMa = (s) => sach(s).replace(/\s*\(\d+\)$/, "");          // "Quận Bình Tân (777)" -> "Quận Bình Tân"
const maTrong = (s) => (s.match(/\((\d+)\)$/) || [])[1] || null;

// Ghi chú NSO -> 4 kiểu dùng được cho địa chỉ NHÀ DÂN:
//   toan_bo        cả xã cũ vào xã mới này -> chắc chắn
//   toan_bo_dan_so chỉ một phần diện tích nhưng TOÀN BỘ dân cư sang xã mới này -> nhà dân chắc chắn thuộc đây
//   mot_phan       xã cũ bị chia cho nhiều xã mới -> phải hỏi (cho chọn) hoặc tra toạ độ
//   giu_nguyen     giữ nguyên / đổi tên / đổi loại hình -> chắc chắn
function kieu(g) {
  const k = g.toLowerCase();
  if (/toàn bộ dân số/.test(k)) return "toan_bo_dan_so";
  if (/^nh[aâậ]p toàn bộ|^sắp xếp toàn bộ/.test(k)) return "toan_bo";   // NSO có 1 dòng gõ sai "Nhâp"
  if (/một phần|phần còn lại/.test(k)) return "mot_phan";
  if (/giữ nguyên|đổi tên|đổi loại hình/.test(k)) return "giu_nguyen";
  throw new Error(`ghi chú lạ: ${g}`);
}

const rows = docCsv(raw.toString("utf8").replace(/^﻿/, "")).map((r) => r.map(sach));
const xaMoi = {}, xaCu = {}, dacKhu = [];
let soDong = 0;
for (const r of rows) {
  const [tinhMoi, tenMoi, maMoi, tenCu, maCu, ghiChu, quanCu, tinhCu] = r;
  if (!/\(\d+\)$/.test(tinhMoi || "") || !/^\d{5}$/.test(maMoi || "")) continue;
  xaMoi[maMoi] = { t: tenMoi, p: boMa(tinhMoi) };
  if (!/^\d{5}$/.test(maCu || "")) {
    // huyện đảo -> đặc khu (không có mã xã cũ) / bãi bồi chưa thành xã
    dacKhu.push({ moi: maMoi, cu: tenCu || boMa(quanCu), q: boMa(quanCu), p: boMa(tinhCu), g: ghiChu });
    continue;
  }
  soDong++;
  const cu = (xaCu[maCu] ??= { t: tenCu, q: boMa(quanCu), qm: maTrong(quanCu), p: boMa(tinhCu), v: [] });
  const k = kieu(ghiChu);
  if (!cu.v.some(([m]) => m === maMoi)) cu.v.push(k === "toan_bo" || k === "giu_nguyen" ? [maMoi, k] : [maMoi, k, ghiChu]);
}

const nXaMoi = Object.keys(xaMoi).length, nXaCu = Object.keys(xaCu).length;
const nChia = Object.values(xaCu).filter((x) => x.v.length > 1).length;
const bang = {
  ghiChu: "Quy đổi phường/xã cũ -> mới sau sáp nhập 01/7/2025. xaCu[mã cũ] = {t: tên, q: quận/huyện cũ, qm: mã quận, p: tỉnh cũ, v: [[mã xã mới, kiểu, ghi chú NSO nếu không phải toàn bộ]]}. xaMoi[mã mới] = {t: tên, p: tỉnh mới}. Kiểu: toan_bo | toan_bo_dan_so | mot_phan | giu_nguyen. Xã cũ có nhiều dòng v = bị chia, địa chỉ nhà cần hỏi/tra toạ độ.",
  nguon: {
    nso: "https://danhmuchanhchinh.nso.gov.vn/TAPTIN/BangChuyendoi%C4%90VHCmoi_cu_final.xlsx",
    csv: "sunshine-tech/VietnamProvinces@4cc4038 dev/seed-data/2025-07/BangChuyendoiĐVHCmoi_cu_khong_merge.csv",
    sha256Csv: SHA_CSV,
    canCu: "Nghị quyết 202/2025/QH15; NQ 1654-1687/NQ-UBTVQH15 ngày 16/6/2025",
    dungNgay: "2026-10-28",
  },
  thongKe: { dongChuyenDoi: soDong, xaMoi: nXaMoi, xaCu: nXaCu, xaCuBiChia: nChia, dacKhu: dacKhu.length },
  xaMoi, xaCu, dacKhu,
};
writeFileSync("data/sap-nhap-phuong-2025.json", JSON.stringify(bang));
console.log(bang.thongKe);
