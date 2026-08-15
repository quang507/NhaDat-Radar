import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

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

// Refresh token của Zalo DÙNG 1 LẦN rồi xoay -> trên serverless (RAM mất giữa các
// lần gọi) phải lưu bản mới nhất vào Supabase (bảng app_config, migration 007).
// Env ZALO_OA_REFRESH_TOKEN chỉ là "hạt giống" lần đầu.
async function loadStoredRefresh(): Promise<string | null> {
  try {
    const { data } = await createAdminClient().from("app_config")
      .select("value").eq("key", "zalo_refresh_token").maybeSingle();
    return (data?.value as { token?: string } | null)?.token ?? null;
  } catch { return null; }
}
async function saveStoredRefresh(token: string) {
  try {
    await createAdminClient().from("app_config")
      .upsert({ key: "zalo_refresh_token", value: { token }, updated_at: new Date().toISOString() });
  } catch { /* bảng chưa tạo (migration 007) -> đành dựa vào cache RAM */ }
}

export async function getZaloAccessToken(): Promise<string | null> {
  const appId = process.env.ZALO_APP_ID;
  const secret = process.env.ZALO_OA_SECRET;
  const seedRefresh = process.env.ZALO_OA_REFRESH_TOKEN;

  // Không cấu hình refresh -> dùng token tĩnh nếu có
  if (!appId || !secret || !seedRefresh) return process.env.ZALO_OA_ACCESS_TOKEN || null;

  // Còn hạn (chừa 5 phút) -> tái sử dụng
  if (tokenCache && tokenCache.exp - Date.now() > 5 * 60_000) return tokenCache.access;

  try {
    const refresh = tokenCache?.refresh || (await loadStoredRefresh()) || seedRefresh;
    const res = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", secret_key: secret },
      body: new URLSearchParams({ app_id: appId, grant_type: "refresh_token", refresh_token: refresh }),
    });
    const j = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: string };
    if (!j.access_token) return process.env.ZALO_OA_ACCESS_TOKEN || null;
    const newRefresh = j.refresh_token || refresh;
    tokenCache = {
      access: j.access_token,
      refresh: newRefresh,
      exp: Date.now() + (Number(j.expires_in) || 3600) * 1000,
    };
    if (j.refresh_token) await saveStoredRefresh(j.refresh_token); // xoay -> lưu bản mới
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
