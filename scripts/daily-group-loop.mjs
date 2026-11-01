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
import os from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { laBaiTimPhong, chuanHoaNhuCau, SYS_TIM, SCHEMA_TIM } from "../crawler/khach-tim.mjs";
import { cleanFbText } from "../crawler/fb-clean.mjs";
import { PHONE_RE } from "../crawler/quality-gate.mjs";

// Bỏ qua lỗi tranh chấp đóng beforeunload dialog giữa Chrome DevTools MCP và Playwright
process.on("unhandledRejection", (err) => {
  if (String(err?.message || err).includes("handleJavaScriptDialog")) return;
  console.error("Unhandled Rejection:", err);
});
process.on("uncaughtException", (err) => {
  if (String(err?.message || err).includes("handleJavaScriptDialog")) return;
  console.error("Uncaught Exception:", err);
});

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
const TELEGRAM_BOT_TOKEN = getEnv("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = getEnv("TELEGRAM_CHAT_ID");
const GEMINI_KEYS = [
  getEnv("GEMINI_API_KEY"),
  getEnv("GEMINI_API_KEY2"),
  getEnv("GEMINI_API_KEY3"),
  getEnv("GEMINI_API_KEY4"),
  getEnv("GEMINI_API_KEY5"),
].filter(Boolean);
let _gIdx = 0;

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

// Tải ảnh của listing về thư mục tạm để đính kèm khi đăng Facebook
export async function taiAnhListing(images = []) {
  const valid = (images || []).filter((u) => typeof u === "string" && u.startsWith("http") && !/\.(mp4|mov|webm)(\?|$)/i.test(u)).slice(0, 4);
  if (!valid.length) return { dir: null, files: [] };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "radar-fb-img-"));
  const files = [];
  for (let i = 0; i < valid.length; i++) {
    try {
      const res = await fetch(valid[i], { signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;
      const ext = (res.headers.get("content-type") || "").includes("png") ? "png" : "jpg";
      const fp = path.join(dir, `img_${i + 1}.${ext}`);
      fs.writeFileSync(fp, Buffer.from(await res.arrayBuffer()));
      files.push(fp);
    } catch { /* bỏ qua ảnh lỗi */ }
  }
  return { dir, files };
}

// Đăng bài lên Profile cá nhân bằng Chrome CDP (kèm ảnh thật)
export async function dangBaiProfile(noiDung, imageFiles = []) {
  console.log("🔗 Đang kết nối Chrome qua port 9222...");
  const browser = await chromium.connectOverCDP(CDP_URL);
  const ctx = browser.contexts()[0];
  let page = ctx.pages().find((p) => p.url().includes("facebook.com")) || (await ctx.newPage());

  console.log("Mở trang cá nhân Facebook...");
  await page.goto("https://www.facebook.com/me", { waitUntil: "domcontentloaded", timeout: 45000 });
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
  await page.waitForTimeout(1500);

  if (imageFiles.length > 0) {
    console.log(`📷 Đang đính kèm ${imageFiles.length} ảnh thật vào bài Profile...`);
    const fileInput = page.locator('div[role="dialog"] input[type="file"]').first();
    if ((await fileInput.count()) > 0) {
      await fileInput.setInputFiles(imageFiles);
      await page.waitForTimeout(4000);
    }
  }

  console.log("Tìm nút Đăng / Post...");
  const postBtn = page.locator('div[role="dialog"] div[aria-label="Post"], div[role="dialog"] div[aria-label="Đăng"]').first();
  await postBtn.waitFor({ state: "visible", timeout: 8000 });
  await postBtn.click();
  await page.waitForTimeout(6000);

  console.log("✅ ĐÃ ĐĂNG BÀI KÈM ẢNH LÊN PROFILE FACEBOOK THÀNH CÔNG!");
}

// Tạo caption không chứa link (tránh bị FB bóp reach) + comment đầu tiên chứa link & Zalo
export function taoBaiDangNhomHiFriendz(item) {
  const ma = getMaPhong(item.id);
  const giaStr = item.price_vnd
    ? (item.price_vnd >= 1e9
        ? `${(item.price_vnd / 1e9).toFixed(1).replace(/\.0$/, "")} tỷ`
        : `${(item.price_vnd / 1e6).toFixed(1).replace(/\.0$/, "").replace(".", ",")} triệu/tháng`)
    : "Thương lượng";
  const dtStr = item.area_m2 ? `${item.area_m2}m²` : "";
  const khuVuc = [item.ward, item.district].filter(Boolean).join(", ");
  const linkWeb = `${SITE_URL}/listings/${item.id}`;

  const caption = spinText(
    `{[w]🏠|✨|🌿} {Góc cho thuê|Cần tìm khách thuê thiện chí|Phòng trống xác minh thực tế dọn vào ở ngay} khu vực ${khuVuc}[w]\n\n` +
    `• {Thông tin|Chi tiết}: ${item.title}${dtStr ? ` (${dtStr})` : ""}\n` +
    `• {Giá thuê|Mức giá}: ${giaStr} {(báo đúng giá thực tế, minh bạch điện nước từ đầu)|(cam kết ảnh thật - giá thật 100%)}\n` +
    `• {Khu vực|Vị trí}: ${item.address || khuVuc}\n` +
    `• {Tình trạng|Ưu điểm}: {Phòng sạch thoáng, an ninh, giờ giấc tự do, dẫn xem trực tiếp miễn phí 24/7|Đã ghim vị trí trên bản đồ Radar, hỗ trợ thương lượng hợp đồng trực tiếp}.\n\n` +
    `💡 {Ngoài căn này, hệ thống Nhà Đất Radar đang có sẵn hơn 1.400+ phòng trống & nhà nguyên căn đã lọc theo từng Phường/Quận (không cần lướt trăm group tìm mỏi mắt).|Nếu căn này chưa đúng tầm giá bạn tìm, nhắn mình khu vực + ngân sách để mình lọc nhanh 3–5 phòng khớp nhất từ rổ hàng 1.400+ căn hôm nay nhé!}\n` +
    `📌 Mã căn: ${ma} — {Xem toạ độ bản đồ & full ảnh dưới bình luận hoặc nhắn Zalo 0387 365 020 giúp mình nha!|Mình để link bản đồ chi tiết dưới bình luận đầu tiên, cần xem phòng nhắn Zalo 0387 365 020 kèm mã căn nhé!}[w]`
  );

  const firstComment = spinText(
    `{[w]👉|🗺️} Xem vị trí trên Bản đồ Radar & bộ ảnh thực tế căn ${ma} (hoặc tự lọc hơn 12.900+ phòng theo Phường/Quận) tại: ${linkWeb}\n📲 Cần tìm phòng theo yêu cầu riêng? Nhắn Zalo/Hotline: 0387 365 020 (báo mã ${ma} hoặc gửi khu vực + tầm giá để mình lọc phòng miễn phí trong 30s ạ!)[w]`
  );

  return { caption, firstComment, ma };
}

// Quét danh sách nhóm đã tham gia và tự động đăng bài theo lịch
export async function dangBaiNhomVaPage(maxGroups = 8) {
  console.log("🔗 Đang kết nối Chrome qua port 9222 để chạy lịch đăng Nhóm & Page...");
  const browser = await chromium.connectOverCDP(CDP_URL);
  const ctx = browser.contexts()[0];
  let page = ctx.pages().find((p) => p.url().includes("facebook.com")) || (await ctx.newPage());

  // Chờ nếu đang ở màn hình xác thực reCAPTCHA / login
  for (let w = 0; w < 60; w++) {
    const u = page.url();
    if (!u.includes("two_step_verification") && !u.includes("/login") && !u.includes("checkpoint")) {
      const hasEmail = await page.locator('input[name="email"]').count().catch(() => 0);
      if (hasEmail === 0) break;
    }
    if (w === 0) console.log("⏳ Đang chờ hoàn tất tích ô 'I'm not a robot' / đăng nhập trên cửa sổ Chrome...");
    await page.waitForTimeout(3000);
  }
  console.log("✅ Đã nhận diện phiên Facebook hoạt động! Bắt đầu chạy lịch đăng bài...");

  let roHang = await layRoHang(30);
  const targetIdIdx = process.argv.indexOf("--listing-id");
  const targetId = targetIdIdx >= 0 ? process.argv[targetIdIdx + 1] : null;
  if (targetId) {
    const { data: one } = await sb
      .from("listings")
      .select("id, title, description, price_vnd, area_m2, address, ward, district, province, source, source_site, images")
      .eq("id", targetId)
      .single();
    if (one) {
      console.log(`⭐ Ưu tiên đăng Tin tiêu điểm nổi bật: ${one.title} (Mã: ${getMaPhong(one.id)})`);
      roHang = [one];
    }
  }
  if (!roHang.length) {
    console.log("❌ Không có phòng rổ hàng để đăng.");
    return;
  }

  // 1. Đăng lên trang cá nhân / Page trước (trừ khi có cờ --skip-profile)
  if (!process.argv.includes("--skip-profile")) {
    const itemDau = roHang[0];
    const { dir, files } = await taiAnhListing(itemDau.images);
    try {
      const baiProfile = taoBaiDang(itemDau);
      await dangBaiProfile(baiProfile, files);
    } catch (e) {
      console.warn("⚠️ Bỏ qua đăng Profile:", e.message);
    } finally {
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  // 2. Lấy danh sách nhóm đã tham gia
  console.log("🔎 Đang lấy danh sách nhóm BĐS đã tham gia...");
  await page.goto("https://www.facebook.com/groups/joins/?nav_source=tab", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(4000);
  for (let s = 0; s < 5; s++) {
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(1200);
  }

  const groupUrls = await page.$$eval('a[href*="/groups/"]', (as) => {
    const urls = new Set();
    for (const a of as) {
      const m = a.href.match(/https:\/\/www\.facebook\.com\/groups\/([^/?#]+)/);
      if (m && !["feed", "discover", "joins", "create", "notifications"].includes(m[1])) {
        urls.add(`https://www.facebook.com/groups/${m[1]}/`);
      }
    }
    return [...urls];
  });

  console.log(`📋 Tìm thấy ${groupUrls.length} nhóm đã tham gia. Sẽ đăng vào ${Math.min(maxGroups, groupUrls.length)} nhóm.`);
  let daDang = 0;

  for (const [idx, gUrl] of groupUrls.slice(0, maxGroups).entries()) {
    const item = roHang[idx % roHang.length];
    const { caption, firstComment, ma } = taoBaiDangNhomHiFriendz(item);
    const { dir, files } = await taiAnhListing(item.images);
    console.log(`\n[${idx + 1}/${Math.min(maxGroups, groupUrls.length)}] 🌐 Mở nhóm: ${gUrl} (Mã: ${ma}, ${files.length} ảnh)`);

    try {
      await page.goto(gUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(4000);

      // Nếu có tab Thảo luận (trong nhóm mua bán), bấm sang Thảo luận để mở composer thông thường
      const discussionTab = page.locator('a[role="tab"]:has-text("Thảo luận"), a[role="tab"]:has-text("Discussion")').first();
      if (await discussionTab.isVisible({ timeout: 1500 }).catch(() => false)) {
        await discussionTab.click().catch(() => {});
        await page.waitForTimeout(2000);
      }

      const composer = page.locator(
        'div[role="button"]:has-text("Bạn viết gì đi"), div[role="button"]:has-text("Write something"), div[role="button"]:has-text("Bạn đang nghĩ gì"), div[role="button"]:has-text("Tạo bài viết công khai"), div[role="button"]:has-text("Viết gì đó"), span:has-text("Bạn viết gì đi"), span:has-text("Tạo bài viết công khai")'
      ).first();

      if (!(await composer.isVisible({ timeout: 7000 }).catch(() => false))) {
        console.warn("  ⚠️ Không thấy ô đăng bài (nhóm chưa duyệt hoặc khoá đăng) -> sang nhóm kế.");
        continue;
      }

      await composer.click();
      await page.waitForTimeout(2000);

      const textbox = page.locator('div[role="dialog"] div[contenteditable="true"][role="textbox"]').first();
      await textbox.waitFor({ state: "visible", timeout: 8000 });
      await textbox.click();
      await textbox.fill(caption);
      await page.waitForTimeout(1500);

      if (files.length > 0) {
        const fileInput = page.locator('div[role="dialog"] input[type="file"]').first();
        if ((await fileInput.count()) > 0) {
          await fileInput.setInputFiles(files);
          await page.waitForTimeout(4000);
        }
      }

      const postBtn = page.locator('div[role="dialog"] div[aria-label="Đăng"], div[role="dialog"] div[aria-label="Post"]').first();
      await postBtn.waitFor({ state: "visible", timeout: 10000 });
      // Chờ nếu nút Đăng đang bị disabled do ảnh đang upload
      for (let c = 0; c < 15; c++) {
        const dis = await postBtn.getAttribute("aria-disabled").catch(() => null);
        if (dis !== "true") break;
        await page.waitForTimeout(1000);
      }
      await postBtn.click({ force: true });
      await page.waitForTimeout(6000);

      daDang++;
      console.log(`  ✅ Đã đăng bài mã ${ma} vào nhóm ${gUrl}`);

      // Thử thả First Comment chứa link dưới bài vừa đăng nếu hiện ngay trên feed
      const commentBox = page.locator(
        'div[role="textbox"][aria-label*="bình luận" i], div[role="textbox"][aria-label*="comment" i]'
      ).first();
      if (await commentBox.isVisible({ timeout: 4000 }).catch(() => false)) {
        await commentBox.click();
        await page.waitForTimeout(500);
        await commentBox.fill(firstComment);
        await page.waitForTimeout(800);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(2500);
        console.log(`  💬 Đã thả First Comment kèm link chi tiết căn ${ma}!`);
      }

      const waitSec = Math.floor(Math.random() * 40) + 60;
      console.log(`  ⏳ Nghỉ ${waitSec}s trước khi đăng nhóm tiếp theo...`);
      await page.waitForTimeout(waitSec * 1000);
    } catch (e) {
      console.warn(`  ❌ Lỗi tại nhóm ${gUrl}: ${e.message}`);
    } finally {
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  console.log(`\n🏁 Đã hoàn tất lịch đăng bài: thành công ${daDang} nhóm!`);
  if (process.argv.includes("--with-seeker")) {
    console.log("\n🎯 Tiếp tục chuyển sang luồng Săn khách thông minh & Báo cáo ngày...");
    await chaySanKhachTuDong(8);
  }
}

// ============================================================================
//  LUỒNG SĂN KHÁCH THÔNG MINH TỪ BẢNG khach_tim + GHÉP PHÒNG RỔ HÀNG + BÁO CÁO NGÀY
// ============================================================================
const LOAI_TEN = {
  phong_tro: "phòng trọ",
  can_ho: "căn hộ",
  nha: "nhà nguyên căn",
  mat_bang: "mặt bằng",
  o_ghep: "chỗ ở ghép",
};
const quanGon = (d) => String(d || "").trim().replace(/^(Quận|Huyện|Thị xã|TP\.|Thành phố) (?=\D)/i, "");

function dieuKienQuan(quan) {
  const ds = (quan || []).map(quanGon).map((s) => s.replace(/[,()*%]/g, " ").trim()).filter(Boolean).slice(0, 3);
  if (!ds.length) return null;
  return ds.map((d) => (/^\d+$/.test(d) || /^Quận \d+$/i.test(d) ? `district.eq.Quận ${d.replace(/\D/g, "")}` : `district.ilike.*${d}*`)).join(",");
}

function khoangGia(nc) {
  const tr = (v) => `${(v / 1e6).toFixed(1).replace(/\.0$/, "").replace(".", ",")}tr`;
  if (nc.gia_tu && nc.gia_den) return ` tầm ${tr(nc.gia_tu)}-${tr(nc.gia_den)}`;
  if (nc.gia_den) return ` dưới ${tr(nc.gia_den)}`;
  if (nc.gia_tu) return ` từ ${tr(nc.gia_tu)}`;
  return "";
}

/** Tìm các phòng rổ hàng khớp nhu cầu của khách */
export async function timPhongKhopChoKhach(nc = {}) {
  if (nc.deal === "mua") return [];
  let pq = sb
    .from("listings")
    .select("id,title,price_vnd,deal,district,ward,area_m2")
    .eq("source", "ro_hang")
    .eq("status", "published")
    .eq("deal", "cho_thue");
  const dk = dieuKienQuan(nc.quan);
  if (dk) pq = pq.or(dk);
  if (nc.gia_den) pq = pq.lte("price_vnd", Math.round(nc.gia_den * 1.15));
  if (nc.gia_tu) pq = pq.gte("price_vnd", Math.round(nc.gia_tu * 0.8));
  if (nc.loai_phong === "can_ho" || nc.loai_phong === "phong_tro") pq = pq.eq("kind", nc.loai_phong);
  const { data } = await pq.order("price_vnd", { ascending: false }).limit(6);
  return data || [];
}

/** Tạo câu bình luận thông minh: ghép đúng số phòng + quận + tầm giá, KHÔNG chèn link để an toàn tuyệt đối */
export function taoBinhLuanKhachTim(nc = {}, phong = []) {
  const q = nc.quan?.length ? nc.quan.map(quanGon).join(", ") : "";
  const loai = LOAI_TEN[nc.loai_phong || ""] || "phòng";
  const gia = khoangGia(nc);
  const sl = phong.length;

  const mauCoPhong = `{[w]Chào bạn, bên mình|Bên mình|Mình} đang có sẵn ${sl} ${loai} trống${q ? ` ở ${q}` : ""}${gia} {đúng nhu cầu bạn tìm|khớp ý bạn nè}, {mình nhắn riêng bạn ảnh thật + chi phí chi tiết nha|bạn check tin nhắn chờ hoặc kết bạn Zalo 0387 365 020 mình gửi ảnh thật từng phòng nha} {[w]🏠|✨|🔑}`;
  const mauChung = `{[w]Bên mình|Mình} đang có sẵn mấy ${loai} trống${q ? ` khu ${q}` : ""}${gia} {sạch đẹp, giờ giấc tự do|xác thực chính chủ}, {mình nhắn riêng gửi ảnh thật cho bạn xem nha|bạn nhắn Zalo 0387 365 020 hoặc check hộp thư chờ mình gửi hình thực tế nha} {[w]🏠|✨}`;

  return spinText(sl > 0 ? mauCoPhong : mauChung);
}

/** Gọi Gemini phân tích bài khách tìm phòng */
async function goiGeminiKhachTim(text) {
  if (!GEMINI_KEYS.length) return null;
  const body = {
    systemInstruction: { parts: [{ text: SYS_TIM }] },
    contents: [{ parts: [{ text: SCHEMA_TIM + "\n\n--- BÀI ĐĂNG ---\n" + text }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0 },
  };
  for (let i = 0; i < GEMINI_KEYS.length; i++) {
    const key = GEMINI_KEYS[_gIdx % GEMINI_KEYS.length];
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 429) { _gIdx++; continue; }
      const j = await res.json();
      const raw = j.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      return JSON.parse(raw.replace(/\\u(?![0-9a-fA-F]{4})/g, "\\\\u").replace(/[\x00-\x1f]/g, ""));
    } catch {
      _gIdx++;
    }
  }
  return null;
}

/** Gửi báo cáo tổng hợp cuối ngày qua Telegram */
export async function guiBaoCaoNgayTelegram() {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("⚠️ Chưa cấu hình TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID.");
    return;
  }
  const dauNgay = new Date();
  dauNgay.setHours(0, 0, 0, 0);
  const tu = dauNgay.toISOString();

  const { data: trongNgay } = await sb
    .from("khach_tim")
    .select("id,ten,sdt,url,nhu_cau,xu_ly,xu_ly_luc,created_at")
    .gte("created_at", tu)
    .order("created_at", { ascending: false });

  const { data: daXuLyHomNay } = await sb
    .from("khach_tim")
    .select("id,ten,sdt,url,nhu_cau,xu_ly,xu_ly_luc")
    .eq("xu_ly", "da_nhan")
    .gte("xu_ly_luc", tu)
    .order("xu_ly_luc", { ascending: false });

  const dsMoi = trongNgay || [];
  const dsDaCmt = daXuLyHomNay || [];
  const ngayVN = new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  const dong = [
    `📊 BÁO CÁO NGÀY SĂN KHÁCH FB (${ngayVN})`,
    `• Khách tìm phòng mới phát hiện: ${dsMoi.length} người`,
    `• Đã tự động ghép phòng & bình luận: ${dsDaCmt.length} bài`,
  ];

  if (dsDaCmt.length > 0) {
    dong.push(`\n🎯 Danh sách khách đã tiếp cận hôm nay:`);
    for (const [i, k] of dsDaCmt.slice(0, 12).entries()) {
      const nc = k.nhu_cau || {};
      const kv = (nc.quan || []).join(", ") || "TP.HCM";
      const gia = khoangGia(nc).trim() || "chưa rõ giá";
      dong.push(`${i + 1}. ${k.ten || "Khách FB"} (${kv} · ${gia})${k.sdt ? ` · SĐT: ${k.sdt}` : ""}${k.url ? `\n   🔗 ${k.url}` : ""}`);
    }
  } else if (dsMoi.length > 0) {
    dong.push(`\n⏳ Còn ${dsMoi.filter((x) => !x.xu_ly).length} khách đang chờ bình luận.`);
  }

  dong.push(`\n👉 Xem & quản lý chi tiết: ${SITE_URL}/admin?tab=san-khach`);

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: dong.join("\n"),
      disable_web_page_preview: true,
    }),
  });
  console.log("✅ Đã gửi Báo cáo ngày về Telegram!");
}

/** Lấy danh sách khách chưa xử lý kèm câu bình luận đã ghép phòng */
export async function layDanhSachKhachCanBinhLuan(limit = 15) {
  const tu = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: ds } = await sb
    .from("khach_tim")
    .select("id,ten,sdt,url,noi_dung,nhu_cau,created_at")
    .is("xu_ly", null)
    .not("url", "is", null)
    .gte("created_at", tu)
    .order("created_at", { ascending: false })
    .limit(limit);

  const ketQua = [];
  for (const k of ds || []) {
    if (!k.url || k.url === "#") continue;
    const nc = k.nhu_cau || {};
    const phong = await timPhongKhopChoKhach(nc);
    const binhLuan = taoBinhLuanKhachTim(nc, phong);
    ketQua.push({
      id: k.id,
      ten: k.ten || "Khách",
      sdt: k.sdt || null,
      url: k.url,
      tom_tat: nc.tom_tat || (k.noi_dung || "").slice(0, 80),
      so_phong_khop: phong.length,
      binh_luan: binhLuan,
    });
  }
  return ketQua;
}

/** Quét nhanh các nhóm trên Chrome CDP để nạp thêm khách tìm phòng mới vào bảng khach_tim */
export async function quetThemKhachTimQuaCDP(page, maxGroups = 4) {
  console.log("🔎 Đang quét các nhóm Facebook đã tham gia để tìm bài khách cần thuê phòng...");
  await page.goto("https://www.facebook.com/groups/joins/?nav_source=tab", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3500);

  const groupLinks = await page.$$eval('a[href*="/groups/"]', (as) => {
    const urls = new Set();
    for (const a of as) {
      const m = a.href.match(/https:\/\/www\.facebook\.com\/groups\/([^/?#]+)/);
      if (m && !["feed", "discover", "joins", "create", "notifications"].includes(m[1])) {
        urls.add(`https://www.facebook.com/groups/${m[1]}/`);
      }
    }
    return [...urls];
  });

  const PostSel = 'div[role="article"], div[role="feed"] > div, div[aria-posinset]';
  let demMoi = 0;

  for (const gUrl of groupLinks.slice(0, maxGroups)) {
    console.log(`  🌐 Đang đọc nhóm: ${gUrl}`);
    try {
      await page.goto(gUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(3000);
      const gid = (gUrl.match(/\/groups\/([^/?#]+)/) || [])[1] || "";

      for (let s = 0; s < 4; s++) {
        await page.mouse.wheel(0, 2200);
        await page.waitForTimeout(1800);
      }

      const rawPosts = await page.$$eval(PostSel, (nodes, gid) =>
        nodes.map((n) => {
          const box = n.closest("[aria-posinset]") || n;
          let url = box.querySelector('a[href*="/posts/"],a[href*="/permalink/"],a[href*="/story.php"]')?.href || "";
          if (!url && gid) {
            for (const a of box.querySelectorAll('a[href*="set=pcb."]')) {
              const id = (a.getAttribute("href") || "").match(/set=pcb\.(\d+)/)?.[1];
              if (id) { url = `https://www.facebook.com/groups/${gid}/posts/${id}/`; break; }
            }
          }
          return { text: n.innerText || "", url };
        }), gid);

      for (const p of rawPosts) {
        const cleaned = cleanFbText(p.text);
        if (!laBaiTimPhong(cleaned)) continue;
        const urlClean = p.url ? p.url.replace(/[?#].*$/, "") : null;
        if (!urlClean) continue;

        const ai = await goiGeminiKhachTim(cleaned);
        const nc = chuanHoaNhuCau(ai);
        if (!nc) continue;

        const row = {
          nguon: "facebook",
          url: urlClean,
          khoa: urlClean,
          ten: null,
          sdt: (cleaned.match(PHONE_RE)?.[0] || "").replace(/[\s.\-]/g, "") || null,
          noi_dung: cleaned.slice(0, 1800),
          nhu_cau: nc,
          dang_luc: new Date().toISOString(),
        };
        const { data } = await sb.from("khach_tim").upsert([row], { onConflict: "khoa", ignoreDuplicates: true }).select("id");
        if (data?.length) {
          demMoi++;
          console.log(`  ★ Phát hiện khách mới: ${nc.tom_tat || cleaned.slice(0, 60)}`);
        }
      }
    } catch (e) {
      console.warn(`  ⚠️ Bỏ qua nhóm ${gUrl}: ${e.message}`);
    }
  }
  console.log(`✅ Quét xong: thêm ${demMoi} khách tìm phòng mới vào bảng khach_tim.`);
  return demMoi;
}

/** Chạy trọn quy trình săn khách & tự động bình luận qua Chrome CDP + Báo cáo ngày */
export async function chaySanKhachTuDong(limit = 10) {
  console.log("🔗 Kết nối Chrome qua port 9222...");
  const browser = await chromium.connectOverCDP(CDP_URL);
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find((p) => p.url().includes("facebook.com")) || (await ctx.newPage());

  let ds = await layDanhSachKhachCanBinhLuan(limit);
  if (ds.length === 0) {
    await quetThemKhachTimQuaCDP(page, 4);
    ds = await layDanhSachKhachCanBinhLuan(limit);
  }

  console.log(`📋 Có ${ds.length} bài khách tìm phòng cần bình luận.`);
  let thanhCong = 0;

  for (const k of ds) {
    console.log(`\n👉 Đang mở bài của [${k.ten}] (${k.tom_tat})...`);
    console.log(`   💬 Câu bình luận (${k.so_phong_khop} phòng khớp): "${k.binh_luan}"`);
    try {
      await page.goto(k.url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(4000);

      const commentBox = page.locator(
        'div[role="textbox"][aria-label*="bình luận" i], div[role="textbox"][aria-label*="comment" i], div[contenteditable="true"][role="textbox"]'
      ).first();

      if (await commentBox.isVisible({ timeout: 7000 }).catch(() => false)) {
        await commentBox.click();
        await page.waitForTimeout(600);
        await commentBox.fill(k.binh_luan);
        await page.waitForTimeout(1000);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(3500);

        await sb.from("khach_tim").update({ xu_ly: "da_nhan", xu_ly_luc: new Date().toISOString() }).eq("id", k.id);
        thanhCong++;
        console.log(`   ✅ Đã bình luận & đánh dấu hoàn tất!`);

        const waitMs = (Math.floor(Math.random() * 35) + 45) * 1000;
        console.log(`   ⏳ Nghỉ ${Math.round(waitMs / 1000)}s trước khi sang khách tiếp theo...`);
        await page.waitForTimeout(waitMs);
      } else {
        console.warn("   ⚠️ Bài viết khoá bình luận hoặc không tồn tại -> đánh dấu bỏ qua.");
        await sb.from("khach_tim").update({ xu_ly: "bo_qua", xu_ly_luc: new Date().toISOString() }).eq("id", k.id);
      }
    } catch (e) {
      console.warn(`   ❌ Lỗi bình luận bài ${k.url}: ${e.message}`);
    }
  }

  console.log(`\n🏁 Hoàn tất phiên săn khách: Đã bình luận ${thanhCong}/${ds.length} bài.`);
  await guiBaoCaoNgayTelegram();
}

// Chạy trực tiếp qua CLI
async function main() {
  const args = process.argv.slice(2);

  // Chế độ xuất JSON cho FBManager C# đọc trực tiếp
  if (args.includes("--san-khach-json")) {
    const limit = Number(args[args.indexOf("--san-khach-json") + 1]) || 15;
    const ds = await layDanhSachKhachCanBinhLuan(limit);
    console.log("__JSON_START__" + JSON.stringify(ds) + "__JSON_END__");
    return;
  }

  // Chế độ đánh dấu đã xử lý từ FBManager C#
  if (args.includes("--mark-done")) {
    const id = args[args.indexOf("--mark-done") + 1];
    const status = args.includes("--skip") ? "bo_qua" : "da_nhan";
    if (id) await sb.from("khach_tim").update({ xu_ly: status, xu_ly_luc: new Date().toISOString() }).eq("id", id);
    console.log("OK");
    return;
  }

  // Chế độ chỉ gửi báo cáo ngày về Telegram
  if (args.includes("--bao-cao-ngay")) {
    await guiBaoCaoNgayTelegram();
    return;
  }

  // Chế độ chạy lịch đăng nhóm & page
  if (args.includes("--post-groups")) {
    const maxG = Number(args[args.indexOf("--post-groups") + 1]) || 30;
    const loopHours = args.includes("--loop") ? Number(args[args.indexOf("--loop") + 1]) || 24 : null;
    if (loopHours) {
      console.log(`🔁 Chế độ tự động đăng ${maxG} nhóm mỗi ${loopHours} giờ được kích hoạt.`);
      while (true) {
        try {
          await dangBaiNhomVaPage(maxG);
        } catch (e) {
          console.error("Lỗi trong vòng lặp đăng nhóm:", e);
        }
        console.log(`💤 Đã xong lượt hôm nay! Nghỉ ${loopHours} tiếng trước lượt kế tiếp...`);
        await new Promise((r) => setTimeout(r, loopHours * 3600 * 1000));
      }
    } else {
      await dangBaiNhomVaPage(maxG);
    }
    return;
  }

  // Chế độ săn khách & tự động bình luận
  if (args.includes("--san-khach")) {
    await chaySanKhachTuDong(10);
    return;
  }

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
    console.log("Chạy thử nghiệm (Dry-run). Thêm cờ `--post-profile` để đăng Profile hoặc `--san-khach` để săn khách tự động.");
  }
}

if (process.argv[1] && process.argv[1].endsWith("daily-group-loop.mjs")) {
  main().catch((err) => {
    console.error("Lỗi:", err);
    process.exit(1);
  });
}
