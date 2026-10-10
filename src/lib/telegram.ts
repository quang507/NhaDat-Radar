// SERVER-ONLY: tích hợp Telegram Bot (thông báo Lead mới, lịch hẹn xem phòng & Chatbot tư vấn)
import { fmtPrice } from "@/lib/format";
import { laRoHang, maPhong } from "@/lib/ro-hang";
import { SITE_URL } from "@/lib/ld";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const DEFAULT_BOT_TOKEN = "8828001883:AAHbo7xqdzYEASoHF5F3mx4iy6f1a96XjbQ";
const DEFAULT_CHAT_ID = "8670770583";

export async function sendTelegramMessage(
  text: string,
  options?: {
    chatId?: string | number;
    parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
    reply_markup?: unknown;
    disable_web_page_preview?: boolean;
  }
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  const chatId = options?.chatId || process.env.TELEGRAM_CHAT_ID || DEFAULT_CHAT_ID;
  if (!token || !chatId) {
    return false;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parse_mode ?? "HTML",
        disable_web_page_preview: options?.disable_web_page_preview ?? true,
        ...(options?.reply_markup ? { reply_markup: options.reply_markup } : {}),
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("sendTelegramMessage error:", res.status, err.slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error("sendTelegramMessage error:", e instanceof Error ? e.message : e);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export type LeadDetails = {
  name: string;
  phone: string;
  message: string;
  tin?: {
    id: string;
    title: string;
    price_vnd: number | null;
    deal: string;
    district: string | null;
    source: string | null;
    source_site: string | null;
  } | null;
  rieng?: {
    exact_address: string | null;
    unit_code: string | null;
    commission: string | null;
  } | null;
};

export async function baoLeadTelegram(data: LeadDetails): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || DEFAULT_CHAT_ID;
  if (!token || !chatId) return;

  const { name, phone, message, tin, rieng } = data;
  const hen = message.match(/^\[HẸN XEM ([^\]]+)\]/)?.[1];
  const loiNhan = message.replace(/^\[HẸN XEM [^\]]+\]\s*/, "").trim();
  const sdt = phone.replace(/[\s.-]/g, "");
  const roHang = tin ? laRoHang(tin) : false;

  const lines = [
    hen ? "📅 <b>KHÁCH ĐẶT LỊCH XEM PHÒNG</b>" : "💬 <b>KHÁCH ĐỂ LẠI LIÊN HỆ MỚI</b>",
    `⏱ <i>${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</i>`,
    "",
    `👤 <b>Khách hàng:</b> ${esc(name)}`,
    `📞 <b>SĐT:</b> <a href="tel:${esc(sdt)}">${esc(phone)}</a> (👉 <a href="https://zalo.me/${esc(sdt)}">Nhắn Zalo</a>)`,
  ];

  if (hen) lines.push(`⏰ <b>Thời gian hẹn:</b> ${esc(hen)}`);
  if (loiNhan) lines.push(`📝 <b>Lời nhắn:</b> ${esc(loiNhan)}`);

  if (tin) {
    lines.push("");
    lines.push(`🏠 <b>Tin đăng:</b> <a href="${SITE_URL}/listings/${tin.id}">${esc(tin.title)}</a>`);
    lines.push(`💰 <b>Giá niêm yết:</b> ${esc(fmtPrice(tin.price_vnd, tin.deal))}`);
    if (roHang) lines.push(`🔖 <b>Mã rổ hàng:</b> <code>${esc(maPhong(tin.id))}</code>`);
  }

  if (rieng && (rieng.exact_address || rieng.unit_code || rieng.commission)) {
    lines.push("");
    lines.push("🔒 <b>THÔNG TIN ĐỐI TÁC (CHỈ ADMIN/SALE):</b>");
    if (rieng.exact_address) lines.push(`📍 <b>Địa chỉ thật:</b> ${esc(rieng.exact_address)}`);
    if (rieng.unit_code) lines.push(`🚪 <b>Mã phòng:</b> ${esc(rieng.unit_code)}`);
    if (rieng.commission) lines.push(`💸 <b>Hoa hồng:</b> ${esc(rieng.commission)}`);
  }

  const buttons: Array<Array<{ text: string; url?: string }>> = [];
  if (tin) {
    buttons.push([{ text: "🌐 Xem tin trên web", url: `${SITE_URL}/listings/${tin.id}` }]);
  }
  buttons.push([
    { text: "💬 Chat Zalo", url: `https://zalo.me/${esc(sdt)}` },
    { text: "📞 Gọi ngay", url: `tel:${esc(sdt)}` },
  ]);

  await sendTelegramMessage(lines.join("\n"), {
    chatId,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buttons },
  });
}
