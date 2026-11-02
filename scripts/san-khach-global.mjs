import { chromium } from "file:///d:/Radarnhadat/node_modules/playwright/index.mjs";
import { laBaiTimPhong } from "../crawler/khach-tim.mjs";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

// Bỏ qua lỗi tranh chấp dialog giữa CDP và Playwright
process.on("unhandledRejection", (err) => {
  if (String(err?.message || err).includes("handleJavaScriptDialog")) return;
  console.error("Unhandled Rejection:", err);
});
process.on("uncaughtException", (err) => {
  if (String(err?.message || err).includes("handleJavaScriptDialog")) return;
  console.error("Uncaught Exception:", err);
});

// Đọc cấu hình từ .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
function getEnv(key, fallback = "") {
  if (process.env[key]) return process.env[key];
  const m = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim() : fallback;
}

const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// Bộ nhớ đệm các bài đã comment để không bao giờ comment trùng
const CACHE_FILE = "C:/Users/quang/.gemini/antigravity/brain/fc10db72-f782-4138-9234-6e3f53d99a7b/scratch/commented_cache.json";
let commentedCache = new Set();
if (fs.existsSync(CACHE_FILE)) {
  try {
    commentedCache = new Set(JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")));
  } catch {}
}

function saveCache() {
  fs.writeFileSync(CACHE_FILE, JSON.stringify([...commentedCache], null, 2));
}

// Bóc tách quận và ngân sách thô (0 token AI)
function bocThongTinTho(text) {
  const t = text.toLowerCase();
  let district = null;
  if (t.includes("bình thạnh")) district = "Bình Thạnh";
  else if (t.includes("gò vấp")) district = "Gò Vấp";
  else if (t.includes("quận 10") || t.includes("q10") || t.includes("q.10")) district = "Quận 10";
  else if (t.includes("quận 7") || t.includes("q7") || t.includes("q.7")) district = "Quận 7";
  else if (t.includes("tân bình")) district = "Tân Bình";
  else if (t.includes("tân phú")) district = "Tân Phú";
  else if (t.includes("quận 12") || t.includes("q12") || t.includes("q.12")) district = "Quận 12";
  else if (t.includes("quận 1") || t.includes("q1") || t.includes("q.1")) district = "Quận 1";
  else if (t.includes("quận 3") || t.includes("q3") || t.includes("q.3")) district = "Quận 3";
  else if (t.includes("thủ đức") || t.includes("q9") || t.includes("quận 9")) district = "Thủ Đức";

  let maxPrice = 6000000;
  const mGia = t.match(/(\d+[\.,]?\d*)\s*(tr|triệu|m)/);
  if (mGia) {
    const val = parseFloat(mGia[1].replace(",", "."));
    if (val >= 1 && val <= 20) maxPrice = Math.round(val * 1000000);
  }

  return { district, maxPrice };
}

// Tìm phòng từ rổ hàng Supabase (0 token AI)
async function timPhongSupabase(district, maxPrice) {
  let query = sb
    .from("listings")
    .select("id, title, price_vnd, district, ward, area_m2")
    .eq("source", "ro_hang")
    .eq("status", "published");

  if (district) {
    query = query.eq("district", district);
  }
  query = query.lte("price_vnd", Math.round(maxPrice * 1.25)).order("price_vnd", { ascending: true }).limit(3);

  const { data } = await query;
  return data || [];
}

// Sinh câu comment Spintax tự nhiên kèm CTA Follow
function taoNoiDungComment(seekerText, district, rooms) {
  const dName = district || "khu vực này";
  const ctaFollow = " 👉 Bạn bấm theo dõi Trang Nhà Đất Radar để xem thêm rổ hàng phòng trống giá thật mỗi ngày nhé!";
  if (rooms && rooms.length > 0) {
    const r = rooms[0];
    const giaStr = Math.round(r.price_vnd / 1000000);
    const areaStr = r.area_m2 ? `${r.area_m2}m²` : "rộng rãi";
    const options = [
      `Chào bạn, bên mình đang có sẵn phòng ${areaStr} full nội thất tại ${r.ward || ""}, ${r.district || dName}, giá ${giaStr}tr/tháng (giờ tự do, an ninh). Bạn xem thêm hình thật thì nhắn Zalo 0387 365 020 mình gửi chi tiết nha!${ctaFollow}`,
      `Bên mình đang có phòng ${areaStr} sạch đẹp, giờ giấc tự do ngay ${r.district || dName} tầm ${giaStr}tr đúng tiêu chí bạn cần nè. Bạn nhắn Zalo 0387 365 020 mình gửi ảnh thật và dẫn xem miễn phí nha!${ctaFollow}`,
      `Bạn check thử phòng bên mình nha: phòng ${areaStr} full nội thất tại ${r.district || dName}, giá ${giaStr}tr/tháng. Cần xem video phòng và vị trí bạn nhắn Zalo 0387 365 020 nhé!${ctaFollow}`
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  return `Chào bạn, bên mình đang có sẵn nhiều phòng trọ và căn hộ dịch vụ full nội thất khu vực ${dName} giá từ 3,5 - 6tr (ảnh thật, dẫn xem miễn phí). Bạn cần tìm phòng nhắn Zalo 0387 365 020 mình lọc căn phù hợp gửi bạn xem nha!${ctaFollow}`;
}

// Hàm chạy 1 lượt quét và bình luận
async function chayMotLuot() {
  console.log(`\n======================================================`);
  console.log(`🚀 BẮT ĐẦU LƯỢT QUÉT SĂN KHÁCH & COMMENT (${new Date().toLocaleTimeString("vi-VN")})`);
  console.log(`======================================================`);

  let browser, ctx, isCDP = false;
  try {
    browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
    ctx = browser.contexts()[0];
    isCDP = true;
    console.log("  -> Gắn thành công vào Chrome Antigravity (Port 9222)!");
  } catch (e) {
    console.log("  -> Chrome chưa bật port 9222, khởi động PersistentContext mới...");
    ctx = await chromium.launchPersistentContext(
      "C:\\Users\\quang\\AppData\\Local\\Google\\Chrome\\AntigravityProfile",
      {
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        headless: false,
        args: ["--remote-debugging-port=9222"]
      }
    );
  }

  const page = ctx.pages().find(p => p.url().includes("facebook.com")) || await ctx.newPage();

  const searchQueries = [
    "cần tìm phòng trọ Bình Thạnh",
    "cần tìm phòng trọ Gò Vấp",
    "tìm phòng trọ Quận 10",
    "tìm phòng trọ Tân Bình",
    "tìm phòng trọ Quận 7",
    "tìm người ở ghép Sài Gòn"
  ];

  const recent = Buffer.from(JSON.stringify({ "recent_posts:0": JSON.stringify({ name: "recent_posts", args: "" }) })).toString("base64");
  let totalCommented = 0;
  const MAX_COMMENTS_PER_RUN = 5;

  for (const sq of searchQueries) {
    if (totalCommented >= MAX_COMMENTS_PER_RUN) break;
    console.log(`\n🔎 Quét bài tìm phòng: "${sq}"...`);
    try {
      await page.goto(`https://www.facebook.com/search/posts/?q=${encodeURIComponent(sq)}&filters=${recent}`, { waitUntil: "domcontentloaded", timeout: 40000 });
      await page.waitForTimeout(4500);

      // Cuộn nhẹ 2 lần để nạp bài mới
      for (let s = 0; s < 2; s++) {
        await page.mouse.wheel(0, 1800);
        await page.waitForTimeout(1500);
      }

      // Quét danh sách bài viết
      const articles = page.locator('div[role="feed"] > div, div[role="article"]');
      const count = await articles.count();
      console.log(`  -> Tìm thấy ${count} bài hiển thị trên trang.`);

      for (let i = 0; i < count; i++) {
        if (totalCommented >= MAX_COMMENTS_PER_RUN) break;
        const art = articles.nth(i);
        const text = (await art.innerText().catch(() => "")).replace(/\s+/g, " ");

        if (text.length < 35) continue;
        if (!laBaiTimPhong(text)) continue;

        // Băm nhận diện bài viết để tránh comment lặp
        const postSig = text.slice(0, 90);
        if (commentedCache.has(postSig)) {
          console.log(`  ⏩ Đã từng comment bài này trước đây, bỏ qua.`);
          continue;
        }

        console.log(`\n★ PHÁT HIỆN BÀI TÌM PHÒNG HỢP LỆ:`);
        console.log(`  Nội dung: "${text.slice(0, 110)}..."`);

        // Bóc tách thông tin & truy vấn Supabase
        const { district, maxPrice } = bocThongTinTho(text);
        console.log(`  Tiêu chí bóc tách: Khu vực = ${district || "Tất cả"}, Ngân sách <= ${maxPrice / 1e6}tr`);
        const rooms = await timPhongSupabase(district, maxPrice);
        const cmtText = taoNoiDungComment(text, district, rooms);
        console.log(`  Câu comment chuẩn bị gửi: "${cmtText}"`);

        // Cuộn tới bài viết
        await art.scrollIntoViewIfNeeded().catch(() => {});
        await page.waitForTimeout(1000);

        // AUTO-LIKE: Thả like tương tác trước để chủ bài nhận thông báo
        const likeBtn = art.locator('div[aria-label="Thích"], div[aria-label="Like"], div[role="button"]:has-text("Thích"), div[role="button"]:has-text("Like")').first();
        if (await likeBtn.isVisible().catch(() => false)) {
          const isPressed = await likeBtn.getAttribute("aria-pressed").catch(() => null);
          if (isPressed !== "true") {
            await likeBtn.click({ force: true }).catch(() => {});
            console.log(`  👍 ĐÃ TỰ ĐỘNG THẢ LIKE BÀI VIẾT! (Chủ bài sẽ nhận thông báo)`);
            await page.waitForTimeout(1200);
          }
        }

        // Tìm nút Bình luận hoặc ô nhập bình luận trong chính bài viết
        let cmtBox = art.locator('div[role="textbox"][contenteditable="true"]').first();
        if (!await cmtBox.isVisible().catch(() => false)) {
          const cmtBtn = art.getByRole("button", { name: /bình luận|comment/i }).first();
          if (await cmtBtn.isVisible().catch(() => false)) {
            await cmtBtn.click().catch(() => {});
            await page.waitForTimeout(1500);
            cmtBox = art.locator('div[role="textbox"][contenteditable="true"]').first();
          }
        }

        if (await cmtBox.isVisible({ timeout: 4000 }).catch(() => false)) {
          await cmtBox.click().catch(() => {});
          await page.waitForTimeout(500);
          await cmtBox.fill(cmtText).catch(() => {});
          await page.waitForTimeout(1000);
          await page.keyboard.press("Enter");
          console.log(`  ✅ ĐÃ GỬI BÌNH LUẬN THÀNH CÔNG!`);
          totalCommented++;
          commentedCache.add(postSig);
          saveCache();

          // Giãn cách ngẫu nhiên 12 - 20s giữa các bài để đảm bảo an toàn cho tài khoản
          const waitSec = Math.floor(Math.random() * 8) + 12;
          console.log(`  ⏳ Nghỉ an toàn ${waitSec}s trước khi sang bài tiếp theo...`);
          await page.waitForTimeout(waitSec * 1000);
        } else {
          console.log(`  ⚠️ Không thể mở ô comment ở bài này (có thể nhóm đóng bình luận hoặc bài cũ).`);
        }
      }
    } catch (err) {
      console.warn(`  ⚠️ Lỗi khi quét từ khóa "${sq}": ${err.message}`);
    }
  }

  // LƯỢT TƯƠNG TÁC TỰ ĐỘNG (AUTO-LIKE NHÓM ĐỂ NUÔI TƯƠNG TÁC & KÉO NOTIFICATION)
  try {
    console.log(`\n👥 Đang mở bảng feed các nhóm BĐS để tương tác auto-like...`);
    await page.goto("https://www.facebook.com/groups/feed/", { waitUntil: "domcontentloaded", timeout: 35000 });
    await page.waitForTimeout(4000);

    const groupPosts = page.locator('div[role="feed"] > div, div[role="article"]');
    const gCount = await groupPosts.count();
    let likedCount = 0;
    const MAX_LIKES_PER_FEED = 5;

    for (let j = 0; j < Math.min(gCount, 15); j++) {
      if (likedCount >= MAX_LIKES_PER_FEED) break;
      const gPost = groupPosts.nth(j);
      const likeBtn = gPost.locator('div[aria-label="Thích"], div[aria-label="Like"]').first();
      if (await likeBtn.isVisible().catch(() => false)) {
        const isPressed = await likeBtn.getAttribute("aria-pressed").catch(() => null);
        if (isPressed !== "true") {
          await gPost.scrollIntoViewIfNeeded().catch(() => {});
          await page.waitForTimeout(800);
          await likeBtn.click({ force: true }).catch(() => {});
          likedCount++;
          console.log(`  👍 [Auto-like nhóm ${likedCount}/${MAX_LIKES_PER_FEED}] Đã thích 1 bài viết trong hội nhóm!`);
          await page.waitForTimeout(3500);
        }
      }
    }
  } catch (gErr) {
    console.warn(`  ⚠️ Bỏ qua auto-like nhóm lượt này: ${gErr.message}`);
  }

  console.log(`\n======================================================`);
  console.log(`🏁 HOÀN TẤT LƯỢT CHẠY! Đã bình luận: ${totalCommented}/${MAX_COMMENTS_PER_RUN}`);
  console.log(`======================================================`);

  if (isCDP) {
    await browser.close();
  } else {
    await ctx.close();
  }

  return totalCommented;
}

// Chế độ chạy
const args = process.argv.slice(2);
const isLoop = args.includes("--loop");
const intervalMin = Number(args[args.indexOf("--loop") + 1]) || 60;

if (isLoop) {
  console.log(`🔄 CHẾ ĐỘ CHẠY TỰ ĐỘNG LIÊN TỤC: Lặp lại mỗi ${intervalMin} phút.`);
  while (true) {
    try {
      await chayMotLuot();
    } catch (e) {
      console.error("❌ Lỗi trong vòng lặp:", e.message);
    }
    console.log(`\n💤 Tạm nghỉ ${intervalMin} phút cho tới lượt tiếp theo...`);
    await new Promise(r => setTimeout(r, intervalMin * 60 * 1000));
  }
} else {
  await chayMotLuot();
}
