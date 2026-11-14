// Chuông báo production chạy trên máy 146 (Task Scheduler, 30 phút/lần) - 14/11/2026.
// Lịch của GitHub Actions trên repo này trễ hàng giờ và bỏ lượt (chuông 30 phút không chạy lượt nào trong 7 giờ),
// nên chuông chuyển về máy 146. Kiểm bằng kiemTra() của canh-production.mjs, báo qua bot Telegram của anh Quang.
//
// Biến môi trường (đặt trong .env.local trên máy 146, không commit):
//   TELEGRAM_BOT_TOKEN  bắt buộc để gửi tin
//   TELEGRAM_CHAT_ID    không bắt buộc: thiếu thì lấy chat của người nhắn bot gần nhất (nhắn /start cho bot trước)
//   CANH_TRANG_THAI     file lưu số lần hỏng liên tiếp (mặc định C:\radar\logs\canh-production.json)
//   BASE_URL            mặc định https://www.nhadatradar.com
import fs from "node:fs";

/**
 * Có nhắn không, nhắn gì. Hỏng 2 lượt liên tiếp mới nhắn (1 lượt hay là chập chờn mạng), rồi cứ 24 lượt (12 giờ)
 * nhắc lại một lần; hết hỏng sau khi đã nhắn thì báo đã ổn.
 */
export function quyetDinhBao(truoc, soLoi) {
  const hongTruoc = truoc?.hongLienTiep ?? 0;
  if (soLoi === 0) return { hongLienTiep: 0, gui: hongTruoc >= 2 ? "on" : null };
  const n = hongTruoc + 1;
  return { hongLienTiep: n, gui: n === 2 || (n > 2 && (n - 2) % 24 === 0) ? "hong" : null };
}

export function noiDungTin(loai, goc, dsLoi, hongLienTiep) {
  if (loai === "on") return `Radar: web đã chạy bình thường trở lại (${goc}).`;
  const phut = hongLienTiep * 30;
  return [`Radar: web đang lỗi, đã hỏng ${hongLienTiep} lượt kiểm liên tiếp (khoảng ${phut} phút).`, goc, ...dsLoi.slice(0, 10).map((l) => `- ${l}`)].join("\n");
}

async function telegram(token, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
    signal: AbortSignal.timeout(20000),
  });
  const j = await res.json().catch(() => ({}));
  if (!j.ok) throw new Error(`Telegram ${method}: ${j.description || res.status}`);
  return j.result;
}

async function timChatId(token, trangThai) {
  if (process.env.TELEGRAM_CHAT_ID) return process.env.TELEGRAM_CHAT_ID;
  if (trangThai.chatId) return trangThai.chatId;
  const ds = await telegram(token, "getUpdates", { limit: 50 });
  const chat = [...ds].reverse().map((u) => u.message?.chat).find((c) => c && c.type === "private");
  return chat ? String(chat.id) : null;
}

const laFileChayChinh = process.argv[1] && process.argv[1].endsWith("canh-production-bao.mjs");

if (laFileChayChinh) {
  const goc = process.env.BASE_URL || "https://www.nhadatradar.com";
  const fileTT = process.env.CANH_TRANG_THAI || "C:\\radar\\logs\\canh-production.json";
  let tt = {};
  try { tt = JSON.parse(fs.readFileSync(fileTT, "utf8")); } catch { /* lần đầu chưa có file */ }

  // `--thu`: chỉ gửi một tin thử để kiểm đã nối Telegram đúng, không kiểm web
  if (process.argv.includes("--thu")) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) { console.error("Thiếu TELEGRAM_BOT_TOKEN trong .env.local."); process.exit(2); }
    const chatId = await timChatId(token, tt);
    if (!chatId) { console.error("Chưa tìm thấy chat: mở bot trên Telegram và nhắn /start một lần."); process.exit(2); }
    await telegram(token, "sendMessage", { chat_id: chatId, text: "Radar: chuông báo trên máy 146 đã nối Telegram. Web lỗi 2 lượt kiểm liền (khoảng 1 giờ) sẽ nhắn vào đây." });
    fs.writeFileSync(fileTT, JSON.stringify({ ...tt, chatId }, null, 1));
    console.log("Đã gửi tin thử.");
    process.exit(0);
  }

  // nạp kiemTra trong nhánh CLI: test chỉ cần quyetDinhBao/noiDungTin, khỏi kéo theo module kiểm mạng
  const { kiemTra } = await import("./canh-production.mjs");
  const dsLoi = await kiemTra(goc);
  const kq = quyetDinhBao(tt, dsLoi.length);
  const gio = new Date().toISOString();
  console.log(`[${gio}] ${dsLoi.length ? `HONG (${kq.hongLienTiep} lượt liên tiếp): ${dsLoi.join(" | ")}` : "OK"}`);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  let chatId = tt.chatId || null;
  if (kq.gui) {
    if (!token) console.error("Thiếu TELEGRAM_BOT_TOKEN trong .env.local, không gửi được tin.");
    else {
      try {
        chatId = await timChatId(token, tt);
        if (!chatId) console.error("Chưa tìm thấy chat: mở bot trên Telegram và nhắn /start một lần.");
        else {
          await telegram(token, "sendMessage", { chat_id: chatId, text: noiDungTin(kq.gui, goc, dsLoi, kq.hongLienTiep), disable_web_page_preview: true });
          console.log(`Đã nhắn Telegram (${kq.gui}).`);
        }
      } catch (e) {
        console.error(String(e.message || e));
      }
    }
  }
  fs.writeFileSync(fileTT, JSON.stringify({ hongLienTiep: kq.hongLienTiep, lanCuoi: gio, chatId, loiCuoi: dsLoi }, null, 1));
  process.exit(dsLoi.length ? 1 : 0);
}
