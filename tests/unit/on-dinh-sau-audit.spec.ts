import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { nhoTam } from "../../src/lib/nho-tam";

// 19/11/2026 (audit 24 giờ, Supabase logs + pg_stat_statements):
//  1. rpc cay_khu_vuc bị Vercel gọi ~390 lần/ngày, 3-5 giây/lần, 98% thời gian CSDL của cả project (25.612 giây);
//  2. trang dự án: .ilike("district", "%Huyện Cần Giuộc%") có ký tự đại diện đứng đầu -> không dùng index -> timeout 3s;
//  3. daily-crawl bị cắt ở phút 60 (bước price-history), lượt thành công trước đó cũng 59 phút.
// Chạy không cần mạng.

const goc = path.join(__dirname, "../..");
const doc = (p: string) => fs.readFileSync(path.join(goc, p), "utf8");

test("nhoTam: gọi một lần trong thời hạn, gộp các lượt gọi đồng thời, không nhớ lượt lỗi", async () => {
  let dem = 0, bay = 0;
  const gia = () => bay;
  const f = nhoTam(async () => { dem++; await new Promise((r) => setTimeout(r, 20)); return `v${dem}`; }, 60_000, gia);
  // 5 lượt đồng thời -> 1 lần gọi thật
  const kq = await Promise.all([f(), f(), f(), f(), f()]);
  expect(dem).toBe(1);
  expect(new Set(kq)).toEqual(new Set(["v1"]));
  // còn hạn -> không gọi lại
  bay = 59_000;
  expect(await f()).toBe("v1");
  expect(dem).toBe(1);
  // hết hạn -> gọi lại
  bay = 61_000;
  expect(await f()).toBe("v2");
  expect(dem).toBe(2);

  // lượt lỗi không được nhớ: lượt sau gọi lại ngay
  let lan = 0;
  const g = nhoTam(async () => { lan++; if (lan === 1) throw new Error("DB bận"); return "ok"; }, 60_000, () => 0);
  await expect(g()).rejects.toThrow("DB bận");
  expect(await g()).toBe("ok");
  expect(lan).toBe(2);
});

test("lib/geo: cây khu vực đi qua bộ nhớ tạm trước khi chạm DB", () => {
  const s = doc("src/lib/geo.ts");
  expect(s).toContain("nhoTam(");
  // cả hai bản cache Next (6 giờ / 24 giờ) dùng chung hàm đã có nhớ tạm
  expect(s).toMatch(/unstable_cache\(\s*fetchAreasNho/);
  expect(s.match(/fetchAreasNho/g)!.length).toBeGreaterThanOrEqual(3);
});

test("trang dự án: khối tin cùng quận lọc bằng '=' / in(), không còn ilike ký tự đại diện đầu", () => {
  const s = doc("src/app/projects/[id]/page.tsx");
  expect(s).not.toMatch(/\.ilike\(p\.district/);
  expect(s).toContain("canonDistrict");
  expect(s).toMatch(/\.in\(p\.district \? "district" : "province"/);
});

test("daily-crawl: timeout 120 phút (lượt cào thật mất ~60 phút, từng bị cắt ở bước cuối)", () => {
  const y = doc(".github/workflows/daily-crawl.yml");
  expect(y).toMatch(/timeout-minutes:\s*120/);
  expect(y).not.toMatch(/timeout-minutes:\s*60/);
});

test("migration 047: cây khu vực đọc từ bảng cache, làm mới bằng pg_cron, giữ quyền chỉ service_role", () => {
  const sql = doc("supabase/migrations/047_cay_khu_vuc_cache.sql");
  expect(sql).toMatch(/create table if not exists public\.cay_khu_vuc_cache/i);
  expect(sql).toMatch(/alter table public\.cay_khu_vuc_cache enable row level security/i);
  expect(sql).toMatch(/rename to tinh_cay_khu_vuc/i);                       // thân hàm nặng cũ giữ nguyên, đổi tên
  expect(sql).toMatch(/create or replace function public\.lam_moi_cay_khu_vuc\(\)/i);
  expect(sql).toMatch(/create function public\.cay_khu_vuc\(\)[\s\S]*security definer/i);
  expect(sql).toMatch(/revoke execute on function public\.cay_khu_vuc\(\) from public, anon, authenticated/i);
  expect(sql).toMatch(/grant execute on function public\.cay_khu_vuc\(\) to service_role/i);
  expect(sql).toMatch(/cron\.schedule\(\s*'lam-moi-cay-khu-vuc'/i);
  expect(sql).toMatch(/create extension if not exists pg_cron/i);
});
