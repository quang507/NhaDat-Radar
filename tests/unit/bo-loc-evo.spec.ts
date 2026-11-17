import { test, expect } from "@playwright/test";
import { toaDoTuLink, laHostMaps } from "../../src/lib/maps-link";
import { docTienIch, khoaLocTienIch, nhanTienIch, tienIchCua } from "../../src/lib/tien-ich";
import { linkGocEvohome } from "../../src/lib/ro-hang";

// Bộ lọc kiểu EvoHome (1/10): đọc toạ độ từ link Google Maps, tiện ích, link gốc EvoHome cho admin.

test("toaDoTuLink: đọc các dạng link Google Maps", () => {
  expect(toaDoTuLink("https://www.google.com/maps/place/X/@10.7769,106.7009,17z")).toEqual({ lat: 10.7769, lng: 106.7009 });
  // !3d!4d (toạ độ địa điểm) ưu tiên hơn @ (tâm khung nhìn)
  expect(toaDoTuLink("https://www.google.com/maps/place/X/@10.1,106.1,17z/data=!3m1!4b1!4m6!3m5!3d10.7801!4d106.6992")).toEqual({ lat: 10.7801, lng: 106.6992 });
  expect(toaDoTuLink("https://maps.google.com/?q=10.75,106.66")).toEqual({ lat: 10.75, lng: 106.66 });
  expect(toaDoTuLink("10.75, 106.66")).toEqual({ lat: 10.75, lng: 106.66 });
  expect(toaDoTuLink("https://maps.app.goo.gl/abcXYZ")).toBeNull();
  expect(toaDoTuLink("không phải link")).toBeNull();
});

test("laHostMaps: chỉ cho host Google (chặn SSRF)", () => {
  for (const h of ["maps.app.goo.gl", "goo.gl", "www.google.com", "google.com.vn", "maps.google.com"]) expect(laHostMaps(h), h).toBe(true);
  for (const h of ["evil.com", "google.com.evil.com", "169.254.169.254", "localhost"]) expect(laHostMaps(h), h).toBe(false);
});

test("tiện ích: đọc tham số ti -> khoá lọc trên cột tien_ich_tim", () => {
  expect(docTienIch("dieu_hoa,la_lung,tu_lanh,dieu_hoa").map((t) => t.k)).toEqual(["dieu_hoa", "tu_lanh"]);
  // 17/11: bộ lọc tra cột listings.tien_ich_tim (DB tự tính, migration 045), không còn quét chữ trong mô tả
  expect(khoaLocTienIch("dieu_hoa,la_lung,tu_lanh,dieu_hoa")).toEqual(["dieu_hoa", "tu_lanh"]);
  expect(khoaLocTienIch("")).toEqual([]);
  expect(khoaLocTienIch(undefined)).toEqual([]);
  // nguồn cũ ghi khoá "ac" trong amenities -> tin đó vẫn được nhận là có điều hoà
  expect(tienIchCua({ title: "Phòng Q7", amenities: ["ac"] })).toContain("dieu_hoa");
  expect(tienIchCua({ title: "Phòng Q7", description: "Có MÁY LẠNH, wc riêng" })).toContain("dieu_hoa");
  expect(nhanTienIch("dieu_hoa")).toBe("❄ Điều hòa");
  expect(nhanTienIch("la")).toBeNull();
  // cụm từ nằm trong chuỗi SQL của migration 045: không được có ký tự phá cú pháp
  for (const t of docTienIch("dieu_hoa,nuoc_nong,tu_lanh,tivi,may_giat,tu_quan_ao,giuong,ban_cong,thang_may,de_xe,thu_cung,san_phoi,gieng_troi,xe_dien,an_ninh,chu_chung,gac_lung,bon_rua,cua_so,ke_bep"))
    for (const w of t.tu) expect(w, w).not.toMatch(/[,()%_*'\\]/);
});

test("tiện ích video: lọc qua ?ti=video và tự nhận clip .mp4 trong images", () => {
  const ds = docTienIch("video");
  expect(ds.map((t) => t.k)).toEqual(["video"]);
  expect(khoaLocTienIch("video")).toEqual(["video"]);
  expect(tienIchCua({ title: "Studio Tân Bình", images: ["https://cdn.example.com/phong.jpg", "https://cdn.example.com/tour.mp4?t=1"] })).toContain("video");
  expect(tienIchCua({ title: "Studio Tân Bình", images: ["https://cdn.example.com/phong.jpg"] })).not.toContain("video");
});

test("linkGocEvohome: mở bảng chi tiết phòng", () => {
  expect(linkGocEvohome("v01uzpysxg1mwevq6l6gyj7l")).toContain("&sheet=transaction-unit%3Av01uzpysxg1mwevq6l6gyj7l%3Adetail");
  expect(linkGocEvohome(null)).not.toContain("sheet=");
});
