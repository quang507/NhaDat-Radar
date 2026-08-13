import crypto from "crypto";

// === Zalo OA helpers ===
// Docs: https://developers.zalo.me/docs/official-account

// Xác thực webhook: Zalo gửi header X-ZEvent-Signature = "mac=" + sha256(appId + data + timeStamp + OASecretKey)
export function verifyZaloSignature(rawBody: string, signatureHeader: string | null, timeStamp: string | null): boolean {
  const appId = process.env.ZALO_APP_ID;
  const secret = process.env.ZALO_OA_SECRET;
  if (!appId || !secret) return false;
  // bỏ verify CHỈ khi test local (không bao giờ ở production)
  if (process.env.ZALO_SKIP_VERIFY === "1" && process.env.NODE_ENV !== "production") return true;
  if (!signatureHeader || !timeStamp) return false;
  const mac = crypto.createHash("sha256").update(appId + rawBody + timeStamp + secret).digest("hex");
  const got = signatureHeader.replace(/^mac=/, "").trim();
  try {
    return crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(got));
  } catch {
    return false;
  }
}

// Gửi tin nhắn văn bản tới người dùng (customer service message, trong cửa sổ 7 ngày)
export async function sendZaloText(userId: string, text: string): Promise<boolean> {
  const token = process.env.ZALO_OA_ACCESS_TOKEN; // TODO: token hết hạn ~1h -> cần refresh_token flow ở production
  if (!token) return false;
  try {
    const res = await fetch("https://openapi.zalo.me/v3.0/oa/message/cs", {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: token },
      body: JSON.stringify({ recipient: { user_id: userId }, message: { text: text.slice(0, 2000) } }),
    });
    const j = await res.json().catch(() => ({}));
    return (j as { error?: number }).error === 0;
  } catch {
    return false;
  }
}
