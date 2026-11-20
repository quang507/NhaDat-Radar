import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// 21/11/2026: khách phản ánh (1) bấm Đăng xuất không thấy gì, (2) đăng nhập xong ai cũng bị đưa vào "Kênh người bán",
// (3) nút "Đăng tin" xấu. Chốt các điểm dễ vỡ. Chạy không cần mạng.

const goc = path.join(__dirname, "../..");
const doc = (p: string) => fs.readFileSync(path.join(goc, p), "utf8").replace(/\r\n/g, "\n");

test("đăng nhập thường: mặc định về trang chủ, không còn mặc định /dashboard", () => {
  const a = doc("src/app/auth/actions.ts");
  expect(a).not.toMatch(/redirect\(next \|\| "\/dashboard"\)/);
  expect(a).toMatch(/redirect\(next \|\| "\/"\)/);
  expect(a).not.toMatch(/redirect\("\/dashboard"\)/);
  const cb = doc("src/app/auth/callback/route.ts");
  expect(cb).not.toContain('"/dashboard"');
  expect(cb).toMatch(/get\("next"\) \?\? "\/"/);
});

test("bấm Đăng tin / vào trang cần đăng nhập: gửi kèm next để quay về đúng chỗ", () => {
  expect(doc("src/app/dashboard/new/page.tsx")).toContain('redirect("/auth?next=%2Fdashboard&message=');
  expect(doc("src/app/dashboard/page.tsx")).toContain('redirect("/auth?next=%2Fdashboard&message=');
  expect(doc("src/app/account/page.tsx")).toContain('redirect("/auth?next=%2Faccount&message=');
  expect(doc("src/components/AppointmentForm.tsx")).toContain('"/auth?next=" + encodeURIComponent(window.location.pathname)');
  expect(doc("src/components/SaveSearchButton.tsx")).toContain("window.location.pathname + window.location.search");
});

test("đăng xuất chạy ở trình duyệt rồi tải lại trang chủ (không Server Action)", () => {
  const nut = doc("src/components/NutDangXuat.tsx");
  expect(nut).toContain('signOut({ scope: "local" })');
  expect(nut).toContain('window.location.assign("/")');
  expect(nut).toContain("/auth/dang-xuat");
  expect(doc("src/components/NavAuth.tsx")).toContain("<NutDangXuat");
  expect(doc("src/components/NavAuth.tsx")).not.toContain("action={signOut}");
  const menu = doc("src/components/MobileMenu.tsx");
  expect(menu).toContain("<NutDangXuat");
  expect(menu).not.toContain("action={signOut}");
  const route = doc("src/app/auth/dang-xuat/route.ts");
  expect(route).toContain("export async function POST");
  expect(route).toContain('signOut({ scope: "local" })');
});

test("nút Đăng tin là nút chính (đặc), vùng chạm 44px, mobile chỉ còn dấu +", () => {
  const nav = doc("src/components/NavAuth.tsx");
  expect(nav).toContain('"btn btn-primary whitespace-nowrap min-w-11 !min-h-11');
  expect(nav).not.toMatch(/border-brand text-brand hover:bg-brand/);
  expect(nav).toContain('<span className="hidden sm:inline">Đăng tin</span>');
});
