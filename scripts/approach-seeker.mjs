import { chromium } from "file:///d:/Radarnhadat/node_modules/playwright/index.mjs";

const ctx = await chromium.launchPersistentContext(
  "C:\\Users\\quang\\AppData\\Local\\Google\\Chrome\\AntigravityProfile",
  {
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: false
  }
);

const page = ctx.pages()[0] || await ctx.newPage();

console.log("=== 1. XỬ LÝ KHÁCH 1: HÀO TRẦN ===");
const haoUrl = "https://www.facebook.com/groups/759109829411311/user/100034700494413/";
await page.goto(haoUrl, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(5000);

// Find the post
const haoPost = page.locator('div[role="feed"] > div, div[role="article"]').filter({ hasText: "Mình cần tìm căn 2pn" }).first();

if (await haoPost.isVisible({ timeout: 8000 }).catch(() => false)) {
  console.log("Found post by Hào Trần!");
  await haoPost.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);

  // 1. Comment on the post
  const commentBox = haoPost.locator('div[role="textbox"][contenteditable="true"]').first();
  if (await commentBox.isVisible({ timeout: 5000 }).catch(() => false)) {
    await commentBox.click();
    await page.waitForTimeout(800);
    const cmtText = "Chào bạn Hào, bên mình đang có sẵn phòng 25-30m² full nội thất ở ngay Vườn Lài & Hà Huy Giáp (Q12 sát Gò Vấp, di chuyển qua Bình Thạnh rất gần), giá 4tr/tháng. Mình có nhắn tin riêng gửi bạn ảnh thật và vị trí chi tiết, bạn check hộp thư chờ hoặc Zalo 0387 365 020 nha!";
    await commentBox.fill(cmtText);
    await page.waitForTimeout(1000);
    await page.keyboard.press("Enter");
    console.log("Submitted comment on Hào Trần's post!");
    await page.waitForTimeout(4000);
  } else {
    console.log("Comment box not immediately visible, looking for Comment button...");
    const cmtBtn = haoPost.locator('div[role="button"]').filter({ hasText: /bình luận|comment/i }).first();
    if (await cmtBtn.isVisible().catch(() => false)) {
      await cmtBtn.click();
      await page.waitForTimeout(2000);
      const cBox = haoPost.locator('div[role="textbox"][contenteditable="true"]').first();
      if (await cBox.isVisible().catch(() => false)) {
        await cBox.click();
        await cBox.fill("Chào bạn Hào, bên mình đang có sẵn phòng 25-30m² full nội thất ở ngay Vườn Lài & Hà Huy Giáp (Q12 sát Gò Vấp, di chuyển qua Bình Thạnh rất gần), giá 4tr/tháng. Mình có nhắn tin riêng gửi bạn ảnh thật và vị trí chi tiết, bạn check hộp thư chờ hoặc Zalo 0387 365 020 nha!");
        await page.waitForTimeout(1000);
        await page.keyboard.press("Enter");
        console.log("Submitted comment via button!");
        await page.waitForTimeout(4000);
      }
    }
  }

  await page.screenshot({ path: "C:/Users/quang/.gemini/antigravity/brain/fc10db72-f782-4138-9234-6e3f53d99a7b/scratch/hao_commented.png" });

  // 2. Direct message Hào Trần
  console.log("Navigating to Hào Trần profile to send Message...");
  await page.goto("https://www.facebook.com/100034700494413", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);

  const msgBtn = page.locator('div[aria-label*="Message" i], div[aria-label*="Nhắn tin" i], div[role="button"]:has-text("Message"), div[role="button"]:has-text("Nhắn tin")').first();
  if (await msgBtn.isVisible({ timeout: 6000 }).catch(() => false)) {
    await msgBtn.click();
    console.log("Clicked Message button!");
    await page.waitForTimeout(4000);

    // Messenger chatbox popup or message input
    const chatInput = page.locator('div[role="textbox"][aria-label*="tin nhắn" i], div[role="textbox"][aria-label*="message" i], div[contenteditable="true"]').last();
    if (await chatInput.isVisible({ timeout: 6000 }).catch(() => false)) {
      await chatInput.click();
      const dm = `Chào bạn Hào, mình thấy bài tìm phòng của bạn trong nhóm Gò Vấp. Bên mình (Nhà Đất Radar) đang có phòng gác lửng 25-30m² full nội thất ở Vườn Lài & Hà Huy Giáp (ngay sát cầu An Lộc qua Gò Vấp, đi Bình Thạnh rất tiện), giá 4 triệu/tháng, giờ giấc tự do không chung chủ.

Bạn cần xem ảnh thật và video phòng thì nhắn lại mình hoặc kết bạn Zalo 0387 365 020 mình gửi chi tiết và hỗ trợ bạn dẫn xem miễn phí nha!`;
      await chatInput.fill(dm);
      await page.waitForTimeout(1000);
      await page.keyboard.press("Enter");
      console.log("Sent direct message to Hào Trần!");
      await page.waitForTimeout(3000);
    }
  } else {
    console.log("Direct Message button not visible on profile.");
  }

  await page.screenshot({ path: "C:/Users/quang/.gemini/antigravity/brain/fc10db72-f782-4138-9234-6e3f53d99a7b/scratch/hao_messaged.png" });
} else {
  console.log("Could not locate Hào Trần's post on page.");
}

await ctx.close();
