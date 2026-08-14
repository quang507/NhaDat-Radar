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

// Zalo OA access_token hết hạn ~1h. Nếu có ZALO_OA_REFRESH_TOKEN + app_id/secret,
// tự lấy token mới qua refresh_token flow và cache trong RAM (kèm refresh_token xoay vòng).
// Fallback: dùng ZALO_OA_ACCESS_TOKEN tĩnh (chỉ hợp cho test ngắn hạn).
let tokenCache: { access: string; refresh: string; exp: number } | null = null;

export async function getZaloAccessToken(): Promise<string | null> {
  const appId = process.env.ZALO_APP_ID;
  const secret = process.env.ZALO_OA_SECRET;
  const seedRefresh = process.env.ZALO_OA_REFRESH_TOKEN;

  // Không cấu hình refresh -> dùng token tĩnh nếu có
  if (!appId || !secret || !seedRefresh) return process.env.ZALO_OA_ACCESS_TOKEN || null;

  // Còn hạn (chừa 5 phút) -> tái sử dụng
  if (tokenCache && tokenCache.exp - Date.now() > 5 * 60_000) return tokenCache.access;

  try {
    const res = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", secret_key: secret },
      body: new URLSearchParams({
        app_id: appId,
        grant_type: "refresh_token",
        refresh_token: tokenCache?.refresh || seedRefresh,
      }),
    });
    const j = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: string };
    if (!j.access_token) return process.env.ZALO_OA_ACCESS_TOKEN || null;
    tokenCache = {
      access: j.access_token,
      refresh: j.refresh_token || tokenCache?.refresh || seedRefresh, // Zalo xoay refresh_token mỗi lần
      exp: Date.now() + (Number(j.expires_in) || 3600) * 1000,
    };
    return tokenCache.access;
  } catch {
    return process.env.ZALO_OA_ACCESS_TOKEN || null;
  }
}

// Gửi tin nhắn văn bản tới người dùng (customer service message, trong cửa sổ 7 ngày)
export async function sendZaloText(userId: string, text: string): Promise<boolean> {
  const token = await getZaloAccessToken();
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
