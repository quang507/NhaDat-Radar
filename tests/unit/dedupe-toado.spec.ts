import { test, expect } from "@playwright/test";

// Audit pipeline 22/9: (1) dedupe Object.assign đè toàn bộ bản gốc; (2) seed đè toạ độ thật bằng điểm
// geocode rải ngẫu nhiên. Ca kiểm là đúng dữ liệu đã tái hiện lỗi (F1 chotot / F2 mogi, F5).
const CRAWLER = "../../crawler/";

const F1 = () => ({
  id: "ct-F1", source: "crawl", source_site: "chotot", url: "https://www.nhatot.com/F1.htm", source_post_id: "F1",
  title: "Bán nhà hẻm xe hơi Huỳnh Tấn Phát Phú Thuận 4x15m", description: "Nhà 1 trệt 2 lầu. LH 0903123456",
  price_vnd: 5_200_000_000, area_m2: 60, price_per_m2: 86_666_667, district: "Quận 7", ward: "Phường Phú Thuận",
  lat: 10.7301, lng: 106.7402, geo_precision: "nguon", phone_masked: "090312***", phone_hash: "abc",
  images: ["a1", "a2"], amenities: ["parking"], bedrooms: 3, posted_at: "2026-09-20", source_count: 2,
});
const F2 = () => ({
  id: "mg-F2", source: "crawl", source_site: "mogi.vn", url: "https://mogi.vn/F2", source_post_id: "F2",
  title: "Bán nhà hẻm xe hơi Huỳnh Tấn Phát Phú Thuận 4x15m", description: "Mô tả dài hơn nhiều ".repeat(20),
  price_vnd: 5_250_000_000, area_m2: 60, district: "Quận 7", ward: null, lat: null, lng: null, geo_precision: null,
  phone_masked: null, images: ["b1", "b2", "b3", "b4"], amenities: ["security"], bedrooms: null, bathrooms: 3, posted_at: "2026-09-18",
});

test("gopTrung: giữ danh tính, giá, toạ độ nguồn, phường, SĐT che của bản gốc", async () => {
  const { gopTrung } = await import(CRAWLER + "gop.mjs");
  const d = gopTrung(F1(), F2());
  expect(d.id).toBe("ct-F1");
  expect(d.url).toBe("https://www.nhatot.com/F1.htm");
  expect(d.price_vnd).toBe(5_200_000_000);            // bản cũ: 5,25 tỷ (giá mogi) dưới link chotot
  expect([d.lat, d.lng, d.geo_precision]).toEqual([10.7301, 106.7402, "nguon"]); // bản cũ: mất -> geocode theo quận
  expect(d.ward).toBe("Phường Phú Thuận");
  expect(d.phone_masked).toBe("090312***");
  expect(d.bedrooms).toBe(3);
  // phần "giàu" hơn của bản trùng vẫn được lấy
  expect(d.description.length).toBeGreaterThan(300);
  expect(d.images).toEqual(["a1", "a2", "b1", "b2", "b3", "b4"]);
  expect(d.amenities).toEqual(["parking", "security"]);
  expect(d.bathrooms).toBe(3);                          // bù khi bản gốc thiếu
  expect(d.posted_at).toBe("2026-09-18");               // sớm nhất
});

test("gopTrung: bản gốc thiếu giá/toạ độ thì mới lấy của bản trùng", async () => {
  const { gopTrung } = await import(CRAWLER + "gop.mjs");
  const goc = { ...F2(), price_vnd: null, area_m2: 60 };
  const d = gopTrung(goc, F1());
  expect(d.price_vnd).toBe(5_200_000_000);
  expect(d.price_per_m2).toBe(Math.round(5_200_000_000 / 60));
  expect([d.lat, d.lng, d.geo_precision]).toEqual([10.7301, 106.7402, "nguon"]);
  expect(d.id).toBe("mg-F2");
});

test("chonToaDo: toạ độ kém chính xác KHÔNG đè toạ độ tốt hơn đã lưu", async () => {
  const { chonToaDo } = await import(CRAWLER + "gop.mjs");
  const that = { lat: 10.727, lng: 106.713, geo_precision: "nguon" };
  const phuong = { lat: 10.72917, lng: 106.71409, geo_precision: "phuong" };   // F5 ngày 22/9
  const quan = { lat: 10.74263, lng: 106.73557, geo_precision: "quan" };
  expect(chonToaDo(phuong, that)).toEqual(that);
  expect(chonToaDo(quan, phuong)).toEqual(phuong);
  expect(chonToaDo(phuong, quan)).toEqual(phuong);            // chính xác hơn thì được đè
  expect(chonToaDo(that, phuong)).toEqual(that);
  expect(chonToaDo({ ...that, lat: 10.7271 }, that).lat).toBe(10.7271); // cùng mức (nguồn cập nhật) -> lấy mới
  // hàng cũ trước migration 029 (geo_precision null): chỉ toạ độ nguồn mới được đè
  const cuKhongRo = { lat: 10.727, lng: 106.713, geo_precision: null };
  expect(chonToaDo(quan, cuKhongRo)).toEqual(cuKhongRo);
  expect(chonToaDo(that, cuKhongRo)).toEqual(that);
  // thiếu một bên
  expect(chonToaDo({ lat: null, lng: null, geo_precision: null }, that)).toEqual(that);
  expect(chonToaDo(quan, null)).toEqual(quan);
});
