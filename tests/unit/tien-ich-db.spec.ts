import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { TIEN_ICH } from "../../src/lib/tien-ich";

// 17/11/2026: bộ lọc tiện ích của /search từng quét chữ trong mô tả của cả bảng (8 ilike × 5 truy vấn) ->
// 4-5 giây, hay vượt hạn 3s của role anon (57014). Giờ DB tự tính khoá tiện ích vào cột listings.tien_ich_tim
// (migration 045: hàm tinh_tien_ich + trigger) và /search chỉ lọc `tien_ich_tim @> {khoá}`.
// Danh sách khoá/cụm từ vì thế nằm ở HAI nơi: src/lib/tien-ich.ts và hàm SQL. Bài này bắt lệch nhau.
// Chạy không cần mạng.

const goc = path.join(__dirname, "../..");
const sql = fs.readFileSync(path.join(goc, "supabase/migrations/045_listings_tien_ich_tim.sql"), "utf8");

/** các dòng (thứ tự, 'khoá', 'khoá cũ' | null::text, array['cụm từ', ...]) trong hàm tinh_tien_ich */
function docBangSql() {
  const ds: { k: string; am?: string; tu: string[] }[] = [];
  const re = /\(\s*\d+\s*,\s*'([a-z_]+)'\s*,\s*(?:null::text|'([a-z_]+)')\s*,\s*array\[([^\]]*)\]\s*\)/g;
  for (const m of sql.matchAll(re)) {
    ds.push({ k: m[1], ...(m[2] ? { am: m[2] } : {}), tu: [...m[3].matchAll(/'([^']*)'/g)].map((x) => x[1]) });
  }
  return ds;
}

test("hàm SQL tinh_tien_ich có đúng khoá, khoá cũ và cụm từ như src/lib/tien-ich.ts", () => {
  const trongSql = docBangSql();
  const trongTs = TIEN_ICH.map((t) => ({ k: t.k, ...(t.am ? { am: t.am } : {}), tu: t.tu }));
  expect(trongSql.length, "không đọc được bảng khoá trong migration 045").toBeGreaterThan(0);
  // đổi TIEN_ICH thì phải viết migration mới cập nhật hàm tinh_tien_ich + ghi lại cột cho tin cũ
  expect(trongSql).toEqual(trongTs);
});

test("migration 045 cấp quyền đọc cột mới cho anon/authenticated (CLAUDE.md mục 6.1)", () => {
  expect(sql).toMatch(/grant\s+select\s*\(\s*tien_ich_tim\s*\)\s+on\s+public\.listings\s+to\s+anon\s*,\s*authenticated/i);
});

test("/search: một tên tỉnh thì lọc bằng '=' để danh sách đi index theo thứ tự (không đọc hết rồi sort)", () => {
  const trang = fs.readFileSync(path.join(goc, "src/app/search/page.tsx"), "utf8");
  expect(trang).toContain('if (ds.length === 1) query = query.eq("province", ds[0]);');
  // index phải có đúng thứ tự sắp xếp của danh sách: first_seen_at desc nulls last, id
  expect(sql).toMatch(/idx_listings_pub_prov_deal_src_seen_id_ti\s+on public\.listings \(province, deal, source, first_seen_at desc nulls last, id\)/);
  expect(sql).toMatch(/idx_listings_pub_prov_deal_khac_seen_id\s+on public\.listings \(province, deal, first_seen_at desc nulls last, id\)\s+where status = 'published' and source <> 'ro_hang'/);
});

test("/search lọc tiện ích bằng cột tien_ich_tim, không quét mô tả", () => {
  const trang = fs.readFileSync(path.join(goc, "src/app/search/page.tsx"), "utf8");
  expect(trang).toContain('.contains("tien_ich_tim"');
  expect(trang).not.toContain("dieuKienTienIch");
  const lib = fs.readFileSync(path.join(goc, "src/lib/tien-ich.ts"), "utf8");
  expect(lib).not.toMatch(/description\.ilike/);
});
