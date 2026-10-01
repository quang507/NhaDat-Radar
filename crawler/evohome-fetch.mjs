// CÀO RỔ HÀNG EVOHOME / HIFRIENDZ (28/9) - phòng TRỐNG (status=VACANT) từ app.evohome.it.com.
//
//   EVOHOME_PHONE=... EVOHOME_PASSWORD=... node crawler/evohome-fetch.mjs
//   -> crawler/private/evohome.json  (rồi crawler/ro-hang-evohome.mjs đưa lên web)
//
// Đăng nhập bằng Playwright (web dùng phiên đăng nhập), rồi gọi thẳng API JSON của chính app
// trong trang đã đăng nhập - cùng cách script Antigravity đã chạy được 26/9 (1.461 phòng).
// TÀI KHOẢN chỉ lấy từ biến môi trường (GitHub Secrets / .env.local) - repo PUBLIC, không ghi vào code.
// File đầu ra có số nhà thật + hoa hồng -> nằm trong crawler/private/ (gitignore).
import fs from "node:fs";
import { chromium } from "playwright";

const PHONE = process.env.EVOHOME_PHONE, PASS = process.env.EVOHOME_PASSWORD;
if (!PHONE || !PASS) { console.error("Thiếu EVOHOME_PHONE / EVOHOME_PASSWORD"); process.exit(1); }
const OUT = "crawler/private/evohome.json";
const TOI_THIEU = 100;   // ít hơn chừng này phòng = đăng nhập hỏng / API đổi -> KHÔNG ghi đè file cũ

const LOAI = { DUPLEX: "Gác lửng", STUDIO: "Studio", ONE_BEDROOM: "1 Phòng ngủ", TWO_BEDROOM: "2 Phòng ngủ", ROOM: "Phòng", APARTMENT: "Căn hộ" };
const tien = (v) => {
  const n = Number(v) || 0;
  if (!n) return "Thỏa thuận";
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + " triệu";
  return n.toLocaleString("vi-VN") + " đ";
};
const so = (v) => Number(v).toLocaleString("vi-VN");

const browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage"] });
const units = [];

// Đăng nhập + mở trang danh sách trong một tab MỚI. Tách riêng để tab crash thì dựng lại được.
async function moTab() {
  const ctx = await browser.newContext();
  // 29/9 lượt 19:22 chết "Target crashed" giữa vòng lặp: trang view=all là SPA nặng (vẽ cả nghìn phòng
  // kèm ảnh). Chỉ cần phiên đăng nhập để gọi API -> không tải ảnh/font/media cho nhẹ bộ nhớ.
  await ctx.route("**/*", (r) => (["image", "font", "media"].includes(r.request().resourceType()) ? r.abort() : r.continue()));
  const page = await ctx.newPage();
  // Trang là SPA: HTML trả về rỗng, form do JS vẽ sau (lượt CI đầu 28/9 chờ form 30s không thấy).
  // Selector theo data-testid của chính form (kiểm 28/9: login-username / login-password / login-submit).
  await page.goto("https://app.evohome.it.com/sign-in", { waitUntil: "load", timeout: 60000 });
  try {
    await page.waitForSelector("[data-testid=login-username], input[name=username]", { timeout: 60000 });
  } catch (e) {
    // chỉ in trang ĐĂNG NHẬP (chưa có dữ liệu gì) để biết bị chặn hay trang đổi
    console.error("Không thấy form đăng nhập. Tiêu đề:", await page.title(), "| URL:", page.url());
    console.error("Chữ đầu trang:", (await page.evaluate(() => document.body?.innerText || "")).slice(0, 300));
    throw e;
  }
  await page.fill("[data-testid=login-username], input[name=username]", PHONE);
  await page.fill("[data-testid=login-password], input[name=password]", PASS);
  await page.click("[data-testid=login-submit], button[type=submit]");
  await page.waitForURL((u) => !u.pathname.includes("sign-in"), { timeout: 20000 }).catch(() => {});
  if (page.url().includes("sign-in")) throw new Error("Đăng nhập EvoHome thất bại (sai tài khoản hoặc trang đổi form)");
  await page.goto("https://app.evohome.it.com/re-selling-dashboard/real-estate/transaction-units?adminMode=old&status=VACANT&type=ROOM&view=all", { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(3000);   // "networkidle" không bao giờ tới trên trang này (SPA gọi mạng liên tục)
  return { ctx, page };
}

try {
  // form đăng nhập thỉnh thoảng không vẽ kịp 60s (29/9: lần 1 kẹt, chạy lại ngay thì được) -> thử lần nữa
  let ctx, page;
  try { ({ ctx, page } = await moTab()); }
  catch (e) { console.warn("Mở trang lần 1 lỗi, thử lại:", String(e.message).split("\n")[0]); await browser.contexts().at(-1)?.close().catch(() => {}); ({ ctx, page } = await moTab()); }
  let lanThu = 0;
  for (let p = 1; p <= 100; p++) {
    let r;
    try {
      r = await page.evaluate(async (p) => {
        const res = await fetch(`https://app.evohome.it.com/api/real-estate-management/transaction-units?page=${p}&limit=50&type=ROOM&status=VACANT&sortBy=updatedAt&sortOrder=desc`);
        if (!res.ok) return { data: [], pages: [], status: res.status };
        const j = await res.json();
        return { data: j?.data || [], pages: j?.meta?.pages || [] };
      }, p);
    } catch (e) {
      // tab crash / bị đóng -> dựng tab mới, đăng nhập lại, lấy tiếp đúng trang p (không lặp phòng đã có)
      if (++lanThu > 3 || !/crash|closed|Target/i.test(String(e?.message))) throw e;
      console.warn(`Trang ${p}: ${String(e.message).split("\n")[0]} -> mở tab mới, thử lại (lần ${lanThu}/3)`);
      await ctx.close().catch(() => {});
      ({ ctx, page } = await moTab());
      p--;
      continue;
    }
    if (r.status) console.warn(`Trang ${p}: API trả ${r.status} - dừng`);
    if (!r.data.length) break;
    units.push(...r.data);
    if (r.pages.length && p >= Math.max(...r.pages)) break;
    await page.waitForTimeout(400);
  }
} finally {
  await browser.close();
}
console.log(`EvoHome: ${units.length} phòng trống`);
if (units.length < TOI_THIEU) { console.error(`Quá ít (<${TOI_THIEU}) - giữ nguyên ${OUT} cũ`); process.exit(1); }

const DA_MAP = new Set(["room_hasAirConditioner", "room_hasWashingMachine", "room_hasFridge", "room_hasKitchenShelf", "room_hasBed",
  "room_hasWindow", "room_hasBalcony", "room_hasSkylight", "room_hasElevator"]);
const TRUONG_LA = new Map();   // trường room_has* chưa map -> số phòng có
// Chuẩn hoá về dạng trung gian mà ro-hang-evohome.mjs đọc (cùng khuôn file Antigravity 26/9)
const out = units.map((u) => {
  const site = u.site || {};
  const quan = site.oldDistrict?.name || "";
  const phuongTho = site.oldWard?.name || "";
  const phuong = phuongTho ? `Phường ${/^\d+$/.test(phuongTho) ? phuongTho.replace(/^0+/, "") : phuongTho}` : "";
  const loai = LOAI[u.roomType] || "Phòng";
  const gia = Number(u.rentPrice) || 0, dt = Number(u.area) || 0;
  const tn = [
    [u.room_hasAirConditioner, "Máy lạnh"], [u.room_hasWashingMachine, "Máy giặt"], [u.room_hasFridge, "Tủ lạnh"],
    [u.room_hasKitchenShelf, "Kệ bếp"], [u.room_hasBed, "Giường nệm"], [u.room_hasWindow, "Cửa sổ thoáng"],
    [u.room_hasBalcony, "Ban công"], [u.room_hasSkylight, "Giếng trời"], [u.roomGateLock === "FINGERPRINT", "Khóa vân tay"],
    [u.roomActivityHours === "FREE", "Giờ giấc tự do"], [u.room_security, "Camera an ninh"], [u.room_hasElevator, "Thang máy"],
  ].filter(([c]) => c).map(([, t]) => t);
  // 1/10: khoá tiện ích cho bộ lọc web (src/lib/tien-ich.ts TIEN_ICH.k). Chỉ map các trường EvoHome đã
  // biết tên; trường room_has* lạ thì đếm ở TRUONG_LA để in cuối lượt -> bổ sung map sau, không đoán tên.
  const ti = [
    [u.room_hasAirConditioner, "dieu_hoa"], [u.room_hasWashingMachine, "may_giat"], [u.room_hasFridge, "tu_lanh"],
    [u.room_hasKitchenShelf, "ke_bep"], [u.room_hasBed, "giuong"], [u.room_hasWindow, "cua_so"],
    [u.room_hasBalcony, "ban_cong"], [u.room_hasSkylight, "gieng_troi"], [u.roomGateLock === "FINGERPRINT", "an_ninh"],
    [u.room_security, "an_ninh"], [u.room_hasElevator, "thang_may"], [u.roomType === "DUPLEX", "gac_lung"],
  ].filter(([c]) => c).map(([, k]) => k);
  for (const [k, v] of Object.entries(u)) if (/^room_has/.test(k) && v && !DA_MAP.has(k)) TRUONG_LA.set(k, (TRUONG_LA.get(k) || 0) + 1);
  const moTa = [
    `🏠 Cho thuê ${loai} tại ${site.name || ""}, ${phuong ? phuong + ", " : ""}${quan}, TP.HCM.`,
    `• Diện tích: ${dt ? dt + " m²" : "Rộng rãi thoáng mát"}`,
    `• Giá thuê: ${tien(gia)}/tháng`,
    u.depositPrice ? `• Tiền cọc: ${tien(u.depositPrice)}` : "",
    "✨ TIỆN NGHI PHÒNG:",
    ...(tn.length ? tn.map((t) => `• ${t}`) : ["• Đầy đủ tiện nghi cơ bản"]),
    "⚡ CHI PHÍ DỊCH VỤ:",
    u.electricityPrice ? `• Điện: ${so(u.electricityPrice)} đ/kWh` : "",
    u.waterPrice ? `• Nước: ${so(u.waterPrice)} đ/người/tháng` : "",
    u.managementPrice ? `• Phí quản lý: ${so(u.managementPrice)} đ/phòng` : "",
    u.washingMachinePrice ? `• Giặt sấy: ${so(u.washingMachinePrice)} đ/người` : "",
  ].filter(Boolean).join("\n");
  return {
    source_post_id: u.id,
    posted_at: u.createdAt || null,
    description: moTa,
    price_vnd: gia,
    area_m2: dt || null,
    kind: dt >= 35 || u.roomType === "ONE_BEDROOM" || u.roomType === "TWO_BEDROOM" ? "can_ho" : "phong_tro",
    district: quan,
    ward: phuong || null,
    address: `${site.name || ""}, ${phuong ? phuong + ", " : ""}${quan}, TP.HCM`,
    lat: site.latitude ?? null,
    lng: site.longitude ?? null,
    images: (u.mediaFiles || []).map((m) => m.mediaFile?.url).filter(Boolean),
    amenities: [...new Set(ti)],
    specs: {
      "Loại phòng": loai,
      "Số phòng": u.name || "-",
      "Hoa hồng môi giới": u.commissionPer || "Thỏa thuận",
      "Tiền cọc": tien(u.depositPrice),
      "Điện": u.electricityPrice ? `${so(u.electricityPrice)} đ/kWh` : "-",
      "Nước": u.waterPrice ? `${so(u.waterPrice)} đ/người` : "-",
      "Phí quản lý": u.managementPrice ? `${so(u.managementPrice)} đ/phòng` : "-",
    },
  };
});
if (TRUONG_LA.size) console.log("Trường tiện ích EvoHome chưa map (thêm vào biến ti):", Object.fromEntries(TRUONG_LA));
fs.mkdirSync("crawler/private", { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`✓ Ghi ${out.length} phòng -> ${OUT}`);
