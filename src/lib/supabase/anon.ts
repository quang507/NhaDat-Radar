import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client anon KHÔNG cookie cho route handler công khai (chat, định giá):
// chỉ đọc được dữ liệu mà RLS cho phép (tin published) — dùng làm lưới an toàn
// thay vì service-role vốn bỏ qua RLS (lỡ quên .eq("status","published") là lộ tin ẩn).
export function createAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// Rate-limit tối giản theo IP, trong RAM (best-effort trên serverless:
// mỗi instance một bộ đếm — vẫn chặn được spam đơn giản từ một nguồn).
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now > h.reset) {
    hits.set(key, { n: 1, reset: now + windowMs });
    if (hits.size > 5000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
    return true;
  }
  h.n += 1;
  return h.n <= max;
}
