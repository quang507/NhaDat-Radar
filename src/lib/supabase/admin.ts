import { createClient } from "@supabase/supabase-js";

// Service-role client cho server-side tin cậy (webhook Zalo, seed, worker).
// KHÔNG bao giờ import file này vào Client Component. Key chỉ ở server.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
