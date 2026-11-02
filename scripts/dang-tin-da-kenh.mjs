/**
 * dang-tin-da-kenh.mjs
 * Tự động đăng tin BĐS hàng ngày lên:
 * 1. TikTok Studio (@nhadatradar) - Video walkthrough
 * 2. Facebook Fanpage (Nhà Đất Radar) - Ảnh thực tế + Bài viết chi tiết
 * 3. Threads (@qle888149) - Microblog + Carousel ảnh
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

// Bỏ qua unhandled dialog errors
process.on("unhandledRejection", (err) => {
  if (String(err?.message || err).includes("handleJavaScriptDialog")) return;
  console.error("Unhandled Rejection:", err);
});
process.on("uncaughtException", (err) => {
  if (String(err?.message || err).includes("handleJavaScriptDialog")) return;
  console.error("Uncaught Exception:", err);
});

const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
function getEnv(key, fallback = "") {
  if (process.env[key]) return process.env[key];
  const m = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim() : fallback;
}

const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const CDP_URL = "http://127.0.0.1:9222";
const HOTLINE = "0387 365 020";
const ZALO_LINK = "https://zalo.me/0387365020";

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// Sinh nội dung đa kênh tự nhiên (qua lớp Humanizer)
function taoNoiDungDang(listing) {
  const ma = "RH" + listing.id.replace(/-/g, "").slice(0, 6).toUpperCase();
  const giaTr = (listing.price_vnd / 1000000).toFixed(1).replace(".0", "");
  const dName = listing.district || "TP.HCM";
  const wName = listing.ward ? `${listing.ward}, ` : "";
  const area = listing.area_m2 ? `${listing.area_m2}m²` : "rộng rãi";

  let titleClean = listing.title || `Phòng ${area} full nội thất ${dName}`;
  const tagDistrict = dName.toLowerCase().replace(/[^a-z0-9]/g, "");

  const tiktokCaption = `Căn ${area} full nội thất tại ${wName}${dName}. Giá ${giaTr} triệu/tháng, dọn vào ở ngay.
Tất cả phòng trên nhadatradar.com đều có định vị bản đồ và giá thật chính chủ gửi, không lo tin ảo.
Xem phòng thực tế nhắn Zalo ${HOTLINE} (Mã căn ${ma}) nhé! Web: nhadatradar.com
#nhadatradar #phongtro${tagDistrict} #thuephongsaigon #timphongtro #nhadatradarcom`;

  const fanpageCaption = `🌿 ${titleClean.toUpperCase()} 🌿

📍 Vị trí: Khu vực ${wName}${dName} (thuận tiện di chuyển, gần chợ, trường học và trục đường chính).
📐 Diện tích: ${area} sạch đẹp thoáng mát, cửa sổ đón sáng tự nhiên.
💰 Giá thuê: ${giaTr} triệu/tháng (giá niêm yết thật, hỗ trợ làm việc trực tiếp).

✨ Tiện nghi hoàn thiện:
• Khóa vân tay an ninh, camera khu vực 24/7.
• Full nội thất: Giường nệm, máy lạnh, tủ lạnh, tủ quần áo, kệ bếp riêng.
• Giờ giấc tự do, không chung chủ, khu dân trí yên tĩnh.

---
🔗 Xem toạ độ bản đồ & thông tin niêm yết tại:
👉 https://nhadatradar.com/listings/${listing.id}

📲 Hỗ trợ dẫn xem phòng thực tế miễn phí 24/7:
• Hotline / Zalo: ${HOTLINE} (Mã căn: ${ma})
• Nhắn trực tiếp Zalo: ${ZALO_LINK}`;

  const threadsCaption = `${titleClean} · ${area} · ${giaTr}tr/tháng full nội thất dọn vào ở ngay.

Phòng thoáng, có sẵn máy lạnh, tủ lạnh, giường nệm, khóa vân tay an ninh. Vị trí thuận tiện đi học, đi làm trung tâm.

Xem toạ độ bản đồ và chi tiết phòng tại: https://nhadatradar.com/listings/${listing.id}
Cần xem phòng thực tế nhắn Zalo mình nhé: ${HOTLINE} (Mã: ${ma})

#nhadatradar #phongtro${tagDistrict} #timphongsaigon #chothuecanho`;

  return { tiktokCaption, fanpageCaption, threadsCaption, ma, giaTr, area, dName };
}

// Tải file về thư mục tạm
async function downloadFile(url, destPath) {
  console.log(`📥 Đang tải media: ${url.slice(0, 80)}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
  console.log(`✅ Đã lưu: ${destPath} (${(buf.length / (1024 * 1024)).toFixed(2)} MB)`);
  return destPath;
}

// 1. KÊNH TIKTOK STUDIO (VIDEO)
async function dangTikTok(page, listing, videoPath) {
  console.log("\n==========================================");
  console.log("🎬 BẮT ĐẦU ĐĂNG TIKTOK STUDIO (@nhadatradar)...");
  console.log("==========================================");

  await page.goto("https://www.tiktok.com/tiktokstudio/upload?from=webapp", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(5000);

  // Xóa mọi overlay / joyride tour cản trở click
  await page.evaluate(() => {
    document.getElementById("react-joyride-portal")?.remove();
    document.querySelectorAll(".react-joyride__overlay, .react-joyride__tooltip").forEach((el) => el.remove());
  }).catch(() => {});

  // Đính kèm video file
  console.log("📤 Tìm ô tải file video...");
  let fileInput = page.locator('input[type="file"][accept*="video"], input[type="file"]').first();
  const hasInput = await fileInput.count();

  if (hasInput > 0) {
    await fileInput.setInputFiles(videoPath);
  } else {
    const frames = page.frames();
    let frameUploaded = false;
    for (const frame of frames) {
      const fInput = frame.locator('input[type="file"]').first();
      if (await fInput.count() > 0) {
        await fInput.setInputFiles(videoPath);
        frameUploaded = true;
        break;
      }
    }
    if (!frameUploaded) {
      throw new Error("Không tìm thấy ô input file trên TikTok Studio");
    }
  }

  console.log("⏳ Đang chờ TikTok upload và render video...");
  await page.waitForTimeout(8000);

  // Xóa joyride một lần nữa sau khi upload
  await page.evaluate(() => {
    document.getElementById("react-joyride-portal")?.remove();
    document.querySelectorAll(".react-joyride__overlay, .react-joyride__tooltip").forEach((el) => el.remove());
  }).catch(() => {});

  // Nhập caption qua Humanizer
  const { tiktokCaption } = taoNoiDungDang(listing);
  const caption = tiktokCaption;

  console.log("📝 Nhập caption TikTok...");
  const captionEditor = page.locator('div[contenteditable="true"], div[role="textbox"], .DraftEditor-editorContainer div[contenteditable="true"]').first();
  if (await captionEditor.count() > 0) {
    await captionEditor.click({ force: true });
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.type(caption, { delay: 25 });
    await page.waitForTimeout(2000);
  }

  // Chờ video upload hoàn tất 100%
  console.log("⏳ Chờ video xử lý hoàn tất...");
  for (let i = 0; i < 30; i++) {
    const postBtn = page.locator('button:has-text("Post"), button:has-text("Đăng")').first();
    const disabled = await postBtn.getAttribute("disabled");
    const ariaDisabled = await postBtn.getAttribute("aria-disabled");
    if (disabled === null && ariaDisabled !== "true") {
      console.log("✅ Nút Post đã sẵn sàng!");
      break;
    }
    await page.waitForTimeout(3000);
  }

  // Xóa joyride trước khi bấm Post
  await page.evaluate(() => {
    document.getElementById("react-joyride-portal")?.remove();
    document.querySelectorAll(".react-joyride__overlay, .react-joyride__tooltip").forEach((el) => el.remove());
  }).catch(() => {});

  // Bấm Post (cuộn xuống đáy trang để lộ nút Post)
  console.log("📜 Cuộn xuống đáy trang TikTok để bấm Post...");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);

  const postBtn = page.locator('button:has-text("Post"), button:has-text("Đăng")').first();
  await postBtn.scrollIntoViewIfNeeded();
  await postBtn.click({ force: true });
  console.log("🚀 Đã bấm nút Post trên TikTok!");
  await page.waitForTimeout(10000);

  console.log("✅ HOÀN TẤT ĐĂNG TIKTOK!");
}

// 2. KÊNH FANPAGE FACEBOOK (NHÀ ĐẤT RADAR)
async function dangFanpage(page, listing, imagePaths) {
  console.log("\n==========================================");
  console.log("📘 BẮT ĐẦU ĐĂNG FANPAGE (Nhà Đất Radar)...");
  console.log("==========================================");

  const fanpageUrl = "https://www.facebook.com/profile.php?id=61596142946505";
  await page.goto(fanpageUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(5000);

  // Kiểm tra nút chuyển profile sang Fanpage
  const switchBtn = page.locator('div[role="button"]:has-text("Chuyển ngay"), div[role="button"]:has-text("Switch Now"), div[aria-label*="Chuyển sang Nhà Đất Radar"]').first();
  if (await switchBtn.count() > 0 && await switchBtn.isVisible()) {
    console.log("🔄 Bấm chuyển sang Fanpage profile...");
    await switchBtn.click();
    await page.waitForTimeout(6000);
  }

  // Tìm ô đăng bài
  console.log("Tìm ô 'Bạn đang nghĩ gì?' / 'What\\'s on your mind?'...");
  const composer = page.locator('div[role="button"]:has-text("Bạn đang nghĩ gì?"), div[role="button"]:has-text("What\'s on your mind?"), div[role="button"]:has-text("Tạo bài viết")').first();
  await composer.waitFor({ state: "visible", timeout: 15000 });
  await composer.click();
  await page.waitForTimeout(3000);

  const { fanpageCaption } = taoNoiDungDang(listing);
  const postContent = fanpageCaption;

  console.log("📝 Nhập nội dung bài đăng...");
  const textbox = page.locator('div[role="dialog"] div[contenteditable="true"][role="textbox"]').first();
  await textbox.waitFor({ state: "visible", timeout: 10000 });
  await textbox.click();
  await textbox.fill(postContent);
  await page.waitForTimeout(2000);

  // Đính kèm ảnh
  if (imagePaths.length > 0) {
    console.log(`📷 Đính kèm ${imagePaths.length} ảnh nội thất...`);
    const fileInput = page.locator('div[role="dialog"] input[type="file"]').first();
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(imagePaths);
      await page.waitForTimeout(5000);
    }
  }

  // Bấm Đăng / Post
  console.log("🚀 Bấm nút Đăng...");
  const postBtn = page.locator('div[role="dialog"] div[aria-label="Đăng"], div[role="dialog"] div[aria-label="Post"]').first();
  await postBtn.waitFor({ state: "visible", timeout: 10000 });
  await postBtn.click();
  await page.waitForTimeout(8000);

  console.log("✅ HOÀN TẤT ĐĂNG BÀI LÊN FANPAGE!");
}

// 3. KÊNH THREADS (@qle888149)
async function dangThreads(page, listing, imagePaths) {
  console.log("\n==========================================");
  console.log("🧵 BẮT ĐẦU ĐĂNG THREADS (@qle888149)...");
  console.log("==========================================");

  await page.goto("https://www.threads.net/", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(5000);

  // Chụp ảnh kiểm tra giao diện Threads
  const shotPath = path.join(process.cwd(), "scratch", "threads_home.png");
  await page.screenshot({ path: shotPath }).catch(() => {});
  console.log(`📸 Đã chụp màn hình Threads: ${shotPath}`);

  // Tìm nút tạo Thread
  console.log("Tìm nút mở ô soạn thảo Thread...");
  // Thử các selector thông dụng của Threads:
  const selectors = [
    'div[aria-label="Create"]',
    'div[aria-label="Tạo"]',
    'svg[aria-label="Create"]',
    'svg[aria-label="Tạo"]',
    'span:has-text("What\'s new?")',
    'span:has-text("Bắt đầu chủ đề...")',
    'div:has-text("What\'s new?")',
    'div:has-text("Bắt đầu chủ đề...")',
    'a[href*="/composer"]',
  ];

  let opened = false;
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.count() > 0 && await el.isVisible().catch(() => false)) {
      console.log(`👉 Bấm nút compose: ${sel}`);
      await el.click({ force: true });
      opened = true;
      break;
    }
  }

  if (!opened) {
    // Thử click vào ô 'What's new' / 'Bắt đầu chủ đề' trên feed
    const composerBox = page.locator('div[role="button"]:has-text("Bắt đầu"), div[role="button"]:has-text("What\'s new")').first();
    if (await composerBox.count() > 0) {
      console.log("👉 Bấm composer trên feed");
      await composerBox.click({ force: true });
      opened = true;
    }
  }

  await page.waitForTimeout(3000);

  const { threadsCaption } = taoNoiDungDang(listing);
  const threadContent = threadsCaption;

  console.log("📝 Điền nội dung Thread...");
  // Tìm ô nhập text
  const textbox = page.locator('div[contenteditable="true"], div[data-lexical-editor="true"], [role="textbox"], p[data-placeholder]').first();
  await textbox.waitFor({ state: "visible", timeout: 15000 });
  await textbox.click({ force: true });
  await page.waitForTimeout(500);
  
  // Dùng keyboard type để kích hoạt Lexical state
  await page.keyboard.type(threadContent, { delay: 15 });
  await page.waitForTimeout(2000);

  // Đính kèm ảnh (tối đa 4 ảnh)
  if (imagePaths.length > 0) {
    const threadImages = imagePaths.slice(0, 4);
    console.log(`📷 Đính kèm ${threadImages.length} ảnh lên Threads...`);
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(threadImages);
      await page.waitForTimeout(4000);
    }
  }

  // Chụp trước khi Post
  await page.screenshot({ path: path.join(process.cwd(), "scratch", "threads_before_post.png") }).catch(() => {});

  // Bấm nút Post
  console.log("🚀 Bấm Đăng bài Threads...");
  const postBtn = page.locator('div[role="button"]').filter({ hasText: /^Post$/ }).last();
  await postBtn.waitFor({ state: "visible", timeout: 10000 });

  // Chờ nếu còn disabled do media đang tải lên
  for (let c = 0; c < 20; c++) {
    const isDis = await postBtn.getAttribute("aria-disabled").catch(() => null);
    if (isDis !== "true") break;
    await page.waitForTimeout(1500);
  }

  await postBtn.click({ force: true });

  // Chờ ô textbox biến mất (popup New Thread đóng lại tự nhiên, không đóng trang ép buộc)
  for (let w = 0; w < 30; w++) {
    const isVisible = await textbox.isVisible().catch(() => false);
    if (!isVisible) {
      console.log("✅ Popup New thread đã đóng, bài đã gửi thành công!");
      break;
    }
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(6000);

  // Chụp sau khi Post
  await page.screenshot({ path: path.join(process.cwd(), "scratch", "threads_after_post.png") }).catch(() => {});
  console.log("✅ HOÀN TẤT ĐĂNG THREADS!");
}

// MAIN EXECUTION
async function main() {
  console.log("🚀 KHỞI ĐỘNG TIẾN TRÌNH ĐĂNG TIN ĐA KÊNH...");
  const targetId = process.argv.find((a) => a.startsWith("--id="))?.split("=")[1];
  const listingId = targetId || "42f0f0d0-a7d2-4743-95e3-8f0a1fc0ae7b";

  const targetChannel = process.argv.find((a) => a.startsWith("--channel="))?.split("=")[1] || "all";

  const { data: listing, error } = await sb.from("listings").select("*").eq("id", listingId).single();
  if (error || !listing) {
    console.error("❌ Không tìm thấy listing:", error?.message);
    process.exit(1);
  }

  // Tải video và ảnh
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "radar-multi-"));
  const vidItem = (listing.images || []).find((u) => typeof u === "string" && (u.includes(".mp4") || u.includes(".mov")));
  const videoUrl = vidItem || "https://firebasestorage.googleapis.com/v0/b/hifriendz-agent.firebasestorage.app/o/listings%2Fuploads%2F544558fe-911a-4cad-ab4a-612cca4dc1cf-1792749574477_4222574419869787183_g9000699545731355486.mp4?alt=media&token=8a525619-f3b0-4bee-9930-3fb43bc66527";
  const videoPath = path.join(tempDir, "walkthrough_video.mp4");
  await downloadFile(videoUrl, videoPath);

  const rawImages = (listing.images || []).filter((u) => typeof u === "string" && !u.includes(".mp4")).slice(0, 6);
  const imagePaths = [];
  for (let i = 0; i < rawImages.length; i++) {
    try {
      const imgPath = path.join(tempDir, `room_${i + 1}.jpg`);
      await downloadFile(rawImages[i], imgPath);
      imagePaths.push(imgPath);
    } catch (e) {
      console.warn(`Lỗi tải ảnh ${i}:`, e.message);
    }
  }

  console.log("🔗 Kết nối Chrome CDP 9222...");
  const browser = await chromium.connectOverCDP(CDP_URL);
  const ctx = browser.contexts()[0];
  const page = await ctx.newPage();

  try {
    // 1. TikTok Studio (Video)
    if (targetChannel === "all" || targetChannel === "tiktok") {
      try {
        await dangTikTok(page, listing, videoPath);
      } catch (err) {
        console.error("❌ Lỗi đăng TikTok:", err.message);
      }
    }

    // 2. Fanpage Facebook (Ảnh + Bài chi tiết)
    if (targetChannel === "all" || targetChannel === "fanpage") {
      try {
        await dangFanpage(page, listing, imagePaths);
      } catch (err) {
        console.error("❌ Lỗi đăng Fanpage:", err.message);
      }
    }

    // 3. Threads (Microblog + Carousel)
    if (targetChannel === "all" || targetChannel === "threads") {
      try {
        await dangThreads(page, listing, imagePaths);
      } catch (err) {
        console.error("❌ Lỗi đăng Threads:", err.message);
      }
    }

  } finally {
    await page.close().catch(() => {});
    console.log("\n🎉 HOÀN TẤT LƯỢT CHẠY ĐĂNG TIN ĐA KÊNH!");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
