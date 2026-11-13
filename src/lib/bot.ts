// Phân loại khách theo User-Agent và cổng chặn bot cào (14/11/2026 - Hướng B).
// Chạy ở cả môi trường Node và Edge (middleware), không import thư viện ngoài.

export type LoaiKhach = "nguoi" | "xem_truoc" | "bot_cao";

const XEM_TRUOC = [
  "facebookexternalhit",
  "facebot",
  "zalo",
  "telegrambot",
  "twitterbot",
  "whatsapp",
  "slackbot",
  "discordbot",
  "linkedinbot",
  "viber",
  "skypeuripreview",
  "okhttp",
  "dalvik",
  "cfnetwork",
];

const BOT_DA_BIET = [
  "bytespider",
  "semrush",
  "ahrefs",
  "mj12bot",
  "dotbot",
  "petalbot",
  "amazonbot",
  "gptbot",
  "ccbot",
  "claudebot",
  "yandex",
  "bingbot",
  "googlebot",
  "coccocbot",
  "applebot",
  "duckduckbot",
  "meta-webindexer",
  "meta-externalagent",
];

const HEADLESS_CRAWLER = ["headlesschrome", "phantomjs", "puppeteer", "playwright"];

export function phanLoaiKhach(ua: string | null | undefined): LoaiKhach {
  if (!ua || !ua.trim()) return "bot_cao";

  const lower = ua.toLowerCase();

  // 1. Bot xem trước link và bộ tải ứng dụng di động (cần lấy OpenGraph / thumbnail)
  for (const b of XEM_TRUOC) {
    if (lower.includes(b)) return "xem_truoc";
  }

  // 2. Bot cào tự động
  if (!ua.startsWith("Mozilla/")) return "bot_cao";
  if (lower.includes("+http")) return "bot_cao";

  for (const h of HEADLESS_CRAWLER) {
    if (lower.includes(h)) return "bot_cao";
  }

  for (const b of BOT_DA_BIET) {
    if (lower.includes(b)) return "bot_cao";
  }

  // 3. Người dùng thật (kể cả máy CUBOT, trình duyệt trong ứng dụng)
  return "nguoi";
}

const TIEN_TO_CAM = [
  "/search",
  "/thong-ke",
  "/auth",
  "/yeu-thich",
  "/agents",
  "/dashboard",
  "/account",
  "/admin",
  "/listings",
  "/rh",
];

export function duongDanCamBot(pathname: string): boolean {
  for (const prefix of TIEN_TO_CAM) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return true;
  }
  return false;
}

export function phaiChan(ua: string | null | undefined, pathname: string): boolean {
  return duongDanCamBot(pathname) && phanLoaiKhach(ua) === "bot_cao";
}
