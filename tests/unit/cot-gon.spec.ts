import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { LISTING_THE_COLS, LISTING_CARD_COLS, LISTING_SEARCH_COLS, LISTING_PUBLIC_COLS } from "../../src/lib/cols";
import { gonChoDanhSach, thongTinAnh } from "../../src/lib/img";

// 17/11/2026 (egress Supabase 3,975/5 GB sau 10 ngày, hết ân hạn -> vượt là 402): các truy vấn DANH SÁCH từng
// kéo nguyên mảng images (10-15 URL/tin, ~75% dung lượng phản hồi) và nguyên mô tả, rồi mới cắt ở server.
// Migration 046 cho DB giữ sẵn bản gọn (anh_bia 1 ảnh, anh_the 4 ảnh, so_anh, co_video, mo_ta_ngan 240 ký tự);
// các bộ cột danh sách lấy bản gọn dưới ĐÚNG TÊN CŨ (alias PostgREST) nên component không đổi. Chạy không cần mạng.

const goc = path.join(__dirname, "../..");
const doc = (p: string) => fs.readFileSync(path.join(goc, p), "utf8");
const cot = (s: string) => s.split(",");

test("bộ cột thẻ dọc/thẻ tin: 1 ảnh bìa + số ảnh từ DB, không kéo nguyên mảng images", () => {
  for (const bo of [LISTING_THE_COLS, LISTING_CARD_COLS]) {
    expect(cot(bo)).toContain("images:anh_bia");
    expect(cot(bo)).toContain("so_anh");
    expect(cot(bo)).toContain("co_video");
    expect(cot(bo)).not.toContain("images");
    expect(cot(bo)).not.toContain("description");
  }
  expect(cot(LISTING_CARD_COLS)).toContain("description:mo_ta_ngan");
});

test("bộ cột /search: 4 ảnh thẻ, mô tả rút gọn, khoá tiện ích DB tính; không kéo images/description/amenities", () => {
  const c = cot(LISTING_SEARCH_COLS);
  for (const k of ["images:anh_the", "so_anh", "co_video", "description:mo_ta_ngan", "tien_ich_tim"]) expect(c).toContain(k);
  for (const k of ["images", "description", "amenities"]) expect(c).not.toContain(k);
  const trang = doc("src/app/search/page.tsx");
  expect(trang).toContain("ti: x.tien_ich_tim");
  expect(trang).not.toContain("tienIchCua(");
});

test("trang chi tiết vẫn lấy đủ ảnh và mô tả", () => {
  expect(cot(LISTING_PUBLIC_COLS)).toContain("images");
  expect(cot(LISTING_PUBLIC_COLS)).toContain("description");
});

test("tin ở dạng gọn từ DB: số ảnh/video lấy theo cột DB, không đếm lại trên mảng đã cắt", () => {
  const x = gonChoDanhSach({ images: ["https://a/1.jpg"], so_anh: 12, co_video: true, description: "x".repeat(240) });
  expect(x.so_anh).toBe(12);
  expect(x.co_video).toBe(true);
  expect(x.description).toHaveLength(160);
  expect(thongTinAnh({ images: ["https://a/1.jpg"], so_anh: 12, co_video: true })).toEqual({ so: 12, video: true });
});

test("migration 046: cấp quyền cột mới, trigger, đuôi video khớp lib/img", () => {
  const sql = doc("supabase/migrations/046_listings_cot_gon.sql");
  expect(sql).toMatch(/grant\s+select\s*\(\s*anh_bia\s*,\s*anh_the\s*,\s*so_anh\s*,\s*co_video\s*,\s*mo_ta_ngan\s*\)\s+on\s+public\.listings\s+to\s+anon\s*,\s*authenticated/i);
  expect(sql).toMatch(/before insert or update of images, description on public\.listings/);
  const duoiSql = (sql.match(/!~\* '\\\.\(([a-z0-9|]+)\)\$'/) || [])[1];
  const duoiTs = (doc("src/lib/img.ts").match(/LA_VIDEO = \/\\\.\(([a-z0-9|]+)\)\$\/i/) || [])[1];
  expect(duoiSql, "không đọc được đuôi video trong migration").toBeTruthy();
  expect(duoiSql).toBe(duoiTs);
  // mô tả rút gọn phải dài hơn mức cắt 160 của gonChoDanhSach: cheSoTin che SĐT trên 240 ký tự rồi mới cắt
  expect(sql).toMatch(/left\(new\.description, 240\)/);
});

test("bản đồ lân cận chỉ lấy ảnh bìa", () => {
  expect(doc("src/components/ListingMap.tsx")).toContain("images:anh_bia");
});
