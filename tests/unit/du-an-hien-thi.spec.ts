import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { giaDuAn, tenChuDauTu, hangThongSo, khoaTrungDuAn } from "../../src/lib/du-an-hien-thi";
import { DU_AN_DA_GOP } from "../../src/lib/du-an-da-gop";
import { khoaTrung } from "../../crawler/khoa-trung-du-an.mjs";

// 17/11/2026 (anh Quang gửi ảnh trang /projects và /projects/<id>): thẻ "1.19 tỷ - Thoả thuận", "CĐT: Chủ đầu tư: …",
// bảng thông số hiện khoá thô "tong_dien_tich", 9 View Apartment có 3 dòng, hai nút quanh dự án khác màu.
// Chạy không cần mạng.

const goc = path.join(__dirname, "../..");
const doc = (p: string) => fs.readFileSync(path.join(goc, p), "utf8");

test("giaDuAn: chỉ có giá thấp nhất thì ghi 'Từ …', không ghi 'Thoả thuận' làm đầu kia", () => {
  expect(giaDuAn(1_194_000_000, null)).toBe("Từ 1.19 tỷ");
  expect(giaDuAn(2_500_000_000, 3_000_000_000)).toBe("2.5 tỷ - 3 tỷ");
  expect(giaDuAn(3_000_000_000, 3_000_000_000)).toBe("3 tỷ");
  expect(giaDuAn(null, 4_000_000_000)).toBe("Đến 4 tỷ");
  expect(giaDuAn(null, null)).toBe("Giá thoả thuận");
  expect(giaDuAn(0, 0)).toBe("Giá thoả thuận");
});

test("tenChuDauTu: bỏ tiền tố 'Chủ đầu tư:' mà nguồn dính vào tên", () => {
  expect(tenChuDauTu("Chủ đầu tư: Hưng Thịnh Corporation")).toBe("Hưng Thịnh Corporation");
  expect(tenChuDauTu("chủ đầu tư : Công ty CP đầu tư X")).toBe("Công ty CP đầu tư X");
  expect(tenChuDauTu("CĐT: Tập đoàn Hưng Thịnh")).toBe("Tập đoàn Hưng Thịnh");
  expect(tenChuDauTu("Hung Thinh Land")).toBe("Hung Thinh Land");
  expect(tenChuDauTu("  -  ")).toBe("");
  expect(tenChuDauTu(null)).toBe("");
});

test("hangThongSo: khoá thô của kho cũ thành nhãn tiếng Việt, bỏ ô rỗng, không lặp 'Bàn giao'", () => {
  const thoi = { ban_giao: null, gia_dong: null, gia_m2_max: null, gia_m2_min: null, nam_khoi_cong: null, nam_hoan_thanh: null, tong_dien_tich: "29.000m²", dien_tich_tu_m2: null, dien_tich_den_m2: null };
  expect(hangThongSo(thoi, { handover: null, coGia: false })).toEqual([["Tổng diện tích", "29.000 m²"]]);

  const day = {
    tong_dien_tich: "10000 m2", dien_tich_tu_m2: 110, dien_tich_den_m2: 500, ban_giao: "2020", nam_khoi_cong: "2018", nam_hoan_thanh: "Quý IV/2025",
    gia_m2_min: 240_000_000, gia_m2_max: 450_000_000, gia_dong: "Giá từ 13 tỷ 920 triệu (240 - 450 triệu/m2)", "Pháp lý": "Sổ hồng",
  };
  const kq = Object.fromEntries(hangThongSo(day, { handover: "2020", coGia: true }));
  expect(kq["Tổng diện tích"]).toBe("10.000 m²");
  expect(kq["Diện tích căn"]).toBe("110 - 500 m²");
  expect(kq["Khởi công"]).toBe("2018");
  expect(kq["Hoàn thành"]).toBe("Quý IV/2025");
  expect(kq["Giá / m²"]).toBe("240 - 450 triệu/m²");
  expect(kq["Pháp lý"]).toBe("Sổ hồng");
  expect(kq["Bàn giao"]).toBe("2020");                       // đúng 1 dòng, lấy từ cột handover
  expect(hangThongSo(day, { handover: "2020", coGia: true }).filter(([k]) => k === "Bàn giao")).toHaveLength(1);
  expect(Object.keys(kq)).not.toContain("Giá tham khảo");   // đã có giá ở khung bên phải
  expect(hangThongSo(day, { handover: null, coGia: true }).find(([k]) => k === "Bàn giao")?.[1]).toBe("2020");
  expect(hangThongSo({ gia_dong: "Giá từ 5 tỷ 500 triệu" }, { handover: null, coGia: false })).toEqual([["Giá tham khảo", "Giá từ 5 tỷ 500 triệu"]]);
  for (const [k] of hangThongSo(day, { handover: "2020", coGia: true })) expect(k, k).not.toMatch(/_/);
});

test("hangThongSo: nhãn tiếng Việt của nguồn mogi giữ nguyên, trùng nhãn thì chỉ lấy một", () => {
  const kq = hangThongSo({ "Tổng diện tích": "5 ha", tong_dien_tich: "50000 m2", "Tình trạng": "Đang bán" }, { handover: null, coGia: false });
  expect(kq.filter(([k]) => k === "Tổng diện tích")).toHaveLength(1);
  expect(kq.find(([k]) => k === "Tình trạng")?.[1]).toBe("Đang bán");
  expect(hangThongSo(null, { handover: "2021", coGia: false })).toEqual([["Bàn giao", "2021"]]);
});

test("khoaTrungDuAn: 9 View / 9View / 9VIEW cùng quận là một dự án", () => {
  const k = (n: string, d: string) => khoaTrungDuAn(n, d);
  expect(k("9 View Apartment", "Quận 9 (TP. Thủ Đức)")).toBe(k("9VIEW APARTMENT", "Quận 9 (TP. Thủ Đức)"));
  expect(k("Sài Gòn Mia", "Huyện Bình Chánh")).toBe(k("SaigonMia", "Huyện Bình Chánh"));
  expect(k("Eco Green Sài Gòn", "Quận 7")).toBe(k("EcoGreen Sài Gòn", "Quận 7"));
  expect(k("The Pegasuite", "Quận 8")).not.toBe(k("The Pegasuite", "Quận 7"));       // khác quận thì không gộp
  expect(k("Green Park", "Quận 7")).not.toBe(k("Green Park 2", "Quận 7"));            // số phần khác nhau là dự án khác
});

test("khoaTrung của crawler (.mjs) cho đúng cùng kết quả với khoaTrungDuAn của web", () => {
  for (const [t, q] of [["9 View Apartment", "Quận 9 (TP. Thủ Đức)"], ["Sài Gòn Mia", "Huyện Bình Chánh"], ["Đảo Kim Cương", "Quận 2"], ["The Pegasuite", null], ["", ""]] as const)
    expect(khoaTrung(t, q), t).toBe(khoaTrungDuAn(t, q));
});

test("trang dự án: hai nút quanh dự án cùng nút xanh, nhãn đúng với mọi loại dự án, ảnh thấp không bị phóng", () => {
  const ct = doc("src/app/projects/[id]/page.tsx");
  const nut = [...ct.matchAll(/<Link href=\{quanh\("(cho_thue|ban)"\)!\} className="([^"]+)"/g)];
  expect(nut.map((m) => m[1])).toEqual(["cho_thue", "ban"]);
  for (const m of nut) expect(m[2], `nút ${m[1]}`).toContain("btn-primary");
  expect(ct).not.toContain("Tìm phòng trọ quanh dự án");        // dự án đất nền/nhà phố không có "phòng trọ"
  expect(ct).toMatch(/Tin cho thuê quanh dự án/);
  expect(ct).toMatch(/Tin bán quanh dự án/);
  expect(ct).toContain("anhThap");                              // ảnh mogi 672px: Gallery không phóng to + cắt
  const ds = doc("src/app/projects/page.tsx");
  expect(ds).toContain("giaDuAn(");
  expect(ds).toContain("tenChuDauTu(");
  expect(ds).not.toMatch(/fmtPrice\(p\.price_min, "ban"\)\} - \$\{fmtPrice\(p\.price_max/);
});

test("Gallery: chế độ anhThap hiện ảnh ở cỡ gốc tối đa (contain), không object-cover phóng to", () => {
  const g = doc("src/components/Gallery.tsx");
  expect(g).toContain("anhThap");
  expect(g).toMatch(/max-w-full max-h-full[^"]*object-contain/);
});

test("crawler dự án: không tạo bản trùng tên+quận và không bật lại dự án admin đã ẩn", () => {
  const s = doc("crawler/mogi-projects.mjs");
  expect(s).toContain("khoaTrung(");
  expect(s).toMatch(/status[^\n]*hidden/);
});

test("link cũ của dự án trùng đã xoá chuyển hướng sang dự án giữ lại (không 404, không chuyển hướng dây chuyền)", () => {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const cap = Object.entries(DU_AN_DA_GOP);
  expect(cap.length).toBe(10);
  for (const [tu, den] of cap) {
    expect(tu).toMatch(uuid); expect(den).toMatch(uuid);
    expect(den, "đích không được là chính nó").not.toBe(tu);
    expect(DU_AN_DA_GOP[den], "đích không được là một dự án đã xoá").toBeUndefined();
  }
  expect(doc("src/app/projects/[id]/page.tsx")).toContain("permanentRedirect(");
});
