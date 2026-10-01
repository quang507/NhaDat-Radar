import { test, expect } from "@playwright/test";
import { toaDoTuLink, laHostMaps } from "../../src/lib/maps-link";
import { docTienIch, dieuKienTienIch } from "../../src/lib/tien-ich";
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

test("tiện ích: đọc tham số ti + dựng điều kiện .or()", () => {
  expect(docTienIch("dieu_hoa,la_lung,tu_lanh,dieu_hoa").map((t) => t.k)).toEqual(["dieu_hoa", "tu_lanh"]);
  const dk = dieuKienTienIch(docTienIch("dieu_hoa")[0]);
  expect(dk).toContain("amenities.cs.{ac}");
  expect(dk).toContain("description.ilike.%máy lạnh%");
  // ký tự phá cú pháp .or() không được có trong cụm từ
  for (const t of docTienIch("dieu_hoa,nuoc_nong,tu_lanh,tivi,may_giat,tu_quan_ao,giuong,ban_cong,thang_may,de_xe,thu_cung,san_phoi,gieng_troi,xe_dien,an_ninh,chu_chung,gac_lung,bon_rua,cua_so,ke_bep"))
    for (const w of t.tu) expect(w, w).not.toMatch(/[,()%_*]/);
});

test("linkGocEvohome: mở bảng chi tiết phòng", () => {
  expect(linkGocEvohome("v01uzpysxg1mwevq6l6gyj7l")).toContain("&sheet=transaction-unit%3Av01uzpysxg1mwevq6l6gyj7l%3Adetail");
  expect(linkGocEvohome(null)).not.toContain("sheet=");
});
