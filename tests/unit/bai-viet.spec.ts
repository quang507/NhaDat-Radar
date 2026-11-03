import { test, expect } from "@playwright/test";
import { BAI_VIET } from "../../src/lib/bai-viet";

// 3/11: 10 bài thêm ở f0d3dba (1/11) lên production với mọi chữ có dấu thành "?" ("Ti?n ?i?n") - ghi file
// sai mã hoá trên Windows. Chặn lại: không chuỗi chữ nào (trừ URL và link nội bộ có query) được có "?" kẹp giữa hai chữ cái.
const MAT_DAU = /[\p{L}]\?[\p{L}]|(^|\s)\?[\p{L}]/u;
const LA_URL = /^(https?:\/)?\//;   // URL ảnh "https://...?w=800" và link nội bộ "/search?deal=..."

test("bài viết không có chữ mất dấu kiểu 'Ti?n ?i?n'", () => {
  const loi: string[] = [];
  const soi = (slug: string, v: unknown) => {
    if (typeof v === "string") { if (!LA_URL.test(v) && MAT_DAU.test(v)) loi.push(`${slug}: ${v.slice(0, 80)}`); }
    else if (Array.isArray(v)) v.forEach((x) => soi(slug, x));
    else if (v && typeof v === "object") Object.values(v).forEach((x) => soi(slug, x));
  };
  for (const b of BAI_VIET) soi(b.slug, b);
  expect(loi).toEqual([]);
});

test("slug bài viết không trùng", () => {
  const slugs = BAI_VIET.map((b) => b.slug);
  expect(new Set(slugs).size).toBe(slugs.length);
});
