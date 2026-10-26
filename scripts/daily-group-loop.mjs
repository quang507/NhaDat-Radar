/**
 * daily-group-loop.mjs
 * Tự động hoá phân phối BĐS Radar:
 * 1. Đọc tin mới nhất từ rổ hàng Supabase (ro_hang / độc quyền).
 * 2. Sinh bài viết Spintax {a|b|c} + [w] chống trùng lặp thuật toán Facebook.
 * 3. Đính kèm Backlink nhadatradar.com + Mã phòng RH... nhắn Zalo.
 * 4. Điều khiển Chrome Antigravity (qua CDP port 9222) để:
 *    - Đăng bài lên Profile cá nhân
 *    - Quét danh sách nhóm BĐS đã tham gia
 *    - Bắn 1 căn phù hợp vào từng nhóm mỗi ngày.
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

// Đọc biến môi trường từ .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
function getEnv(key, fallback = "") {
  if (process.env[key]) return process.env[key];
  const m = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim() : fallback;
}

const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const SITE_URL = getEnv("NEXT_PUBLIC_SITE_URL", "https://nhadatradar.com");
const CDP_URL = getEnv("CHROME_CDP_URL", "http://localhost:9222");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// Bộ tạo ký tự vô hình [w] chống trùng lặp
function randomInvisible() {
  const chars = ["\u200B", "\u200C", "\u200D", "\uFEFF"];
  let res = "";
  const count = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < count; i++) {
    res += chars[Math.floor(Math.random() * chars.length)];
  }
  return res;
}

// Xử lý Spintax {a|b|c}
export function spinText(text) {
  if (!text) return "";
  let result = text;
  const regex = /\{([^{}]*)\}/;
  let guard = 0;
  while (regex.test(result) && guard++ < 100) {
    result = result.replace(regex, (_, match) => {
      const options = match.split("|");
      return options[Math.floor(Math.random() * options.length)];
    });
  }
  return result.replace(/\[w\]/g, () => randomInvisible());
}

// Sinh mã phòng RH...
function getMaPhong(id) {
  return "RH" + (id || "").replace(/-/g, "").slice(0, 6).toUpperCase();
}

// Sinh nội dung bài đăng chuẩn Spintax cho 1 tin BĐS
export function taoBaiDang(item) {
  const ma = getMaPhong(item.id);
  const giaStr = item.price_vnd
    ? (item.price_vnd >= 1e9
        ? `${(item.price_vnd / 1e9).toFixed(1).replace(/\.0$/, "")} Tỷ`
        : `${Math.round(item.price_vnd / 1e6)} Triệu`)
    : "Thương lượng";
  const dtStr = item.area_m2 ? `${item.area_m2}m²` : "";
  const khuVuc = [item.district, item.province].filter(Boolean).join(", ");
  const linkWeb = `${SITE_URL}/listings/${item.id}`;

  const spintax = `{[w]🔥|⚡|✨} {[CĂN MỚI RA]|CHÍNH CHỦ GỬI|SIÊU PHẨM BĐS} {TẠI|KHU VỰC} ${khuVuc.toUpperCase()}[w]

📍 {Vị trí|Địa chỉ}: {Đường ${item.address || khuVuc}|Khu dân cư hiện hữu, an ninh, tiện di chuyển}.
📐 {Quy mô & Diện tích|Thông số}: ${dtStr ? dtStr + ", " : ""}{thiết kế hiện đại, thông thoáng, ánh sáng tự nhiên|không gian thoáng mát, tối ưu công năng}.
💰 {Mức giá|Giá công khai}: ${giaStr}{/tháng| (cam kết thông tin & giá thật 100%)}.

🛋️ {Chi tiết căn|Điểm nổi bật}:
- {Pháp lý minh bạch, hỗ trợ xem nhà/phòng trực tiếp|Giờ giấc tự do, an ninh đảm bảo 24/7}.
- {Chi phí rõ ràng, không phụ phí phát sinh ngoài hợp đồng|Nội thất hoàn thiện, sẵn sàng dọn vào ở ngay}.[w]

---
🔗 {Xem toạ độ bản đồ & hình ảnh thực tế tại:|Xem chi tiết & ảnh gốc không nén tại:}[w]
👉 ${linkWeb}
📲 {Liên hệ trực tiếp qua Zalo/Hotline (kèm mã căn):|Nhắn Zalo kèm mã căn để được hỗ trợ nhanh:}[w] 0387365020 (Mã: ${ma})
👉 Chat Zalo: https://zalo.me/0387365020
`;

  return spinText(spintax);
}

// Lấy danh sách rổ hàng từ Supabase
export async function layRoHang(limit = 10) {
  const { data, error } = await sb
    .from("listings")
    .select("id, title, description, price_vnd, area_m2, address, district, province, source, source_site, images")
    .eq("status", "published")
    .in("source", ["ro_hang", "agent", "user", "crawl"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Lỗi truy vấn listings:", error.message);
    return [];
  }
  return data || [];
}

// Đăng bài lên Profile cá nhân bằng Chrome CDP
export async function dangBaiProfile(noiDung) {
  console.log("🔗 Đang kết nối Chrome qua port 9222...");
  const browser = await chromium.connectOverCDP(CDP_URL);
  const ctx = browser.contexts()[0];
  let page = ctx.pages().find((p) => p.url().includes("facebook.com"));

  if (!page) {
    page = await ctx.newPage();
    await page.goto("https://www.facebook.com/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
  }

  console.log("Mở trang cá nhân Facebook...");
  await page.goto("https://www.facebook.com/me", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  console.log("Tìm ô 'What\\'s on your mind?' / 'Bạn đang nghĩ gì?'...");
  const composer = page.locator('div[role="button"]:has-text("What\'s on your mind?"), div[role="button"]:has-text("Bạn đang nghĩ gì?")').first();
  await composer.waitFor({ state: "visible", timeout: 10000 });
  await composer.click();
  await page.waitForTimeout(2000);

  console.log("Nhập nội dung bài đăng...");
  const textbox = page.locator('div[role="dialog"] div[contenteditable="true"][role="textbox"]').first();
  await textbox.waitFor({ state: "visible", timeout: 8000 });
  await textbox.click();
  await textbox.fill(noiDung);
  await page.waitForTimeout(2000);

  console.log("Tìm nút Đăng / Post...");
  const postBtn = page.locator('div[role="dialog"] div[aria-label="Post"], div[role="dialog"] div[aria-label="Đăng"]').first();
  await postBtn.waitFor({ state: "visible", timeout: 8000 });
  await postBtn.click();
  await page.waitForTimeout(5000);

  console.log("✅ ĐÃ ĐĂNG BÀI LÊN PROFILE FACEBOOK THÀNH CÔNG!");
}

// Chạy trực tiếp qua CLI
async function main() {
  const args = process.argv.slice(2);
  console.log("=== RADAR NHÀ ĐẤT - DAILY GROUP & PROFILE LOOP ===");

  const items = await layRoHang(5);
  if (!items.length) {
    console.log("Không tìm thấy tin rổ hàng hợp lệ trong database.");
    process.exit(0);
  }

  const selected = items[0];
  const baiViet = taoBaiDang(selected);

  console.log("\n--- BÀI VIẾT MẪU ĐƯỢC TẠO TỪ RỔ HÀNG ---");
  console.log(baiViet);
  console.log("-----------------------------------------\n");

  if (args.includes("--post-profile")) {
    await dangBaiProfile(baiViet);
  } else {
    console.log("Chạy thử nghiệm (Dry-run). Thêm cờ `--post-profile` để đăng thật lên Facebook cá nhân.");
  }
}

if (process.argv[1] && process.argv[1].endsWith("daily-group-loop.mjs")) {
  main().catch((err) => {
    console.error("Lỗi:", err);
    process.exit(1);
  });
}
