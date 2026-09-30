// SERVER-ONLY: ghi sự kiện quan tâm vào bảng su_kien (migration 031). Dùng ở /api/su-kien (sự kiện từ
// trình duyệt), createLead (đặt lịch) và api/chat (câu hỏi bot). Lỗi chỉ log - đo đạc không được làm hỏng
// luồng chính; bảng chưa tạo (chưa chạy migration) thì cũng chỉ log.
import { createAdminClient } from "@/lib/supabase/admin";

export const LOAI_SU_KIEN = ["xem", "goi", "zalo", "chia_se", "luu", "dat_lich", "chat"] as const;
export type LoaiSuKien = (typeof LOAI_SU_KIEN)[number];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function ghiSuKien(e: { loai: LoaiSuKien; listingId?: string | null; khach?: string | null; noiDung?: string | null; ketQua?: number | null }) {
  try {
    const { error } = await createAdminClient().from("su_kien").insert({
      loai: e.loai,
      listing_id: e.listingId && UUID_RE.test(e.listingId) ? e.listingId : null,
      khach: e.khach && /^[\w-]{8,40}$/.test(e.khach) ? e.khach : null,
      noi_dung: e.noiDung ? e.noiDung.slice(0, 500) : null,
      ket_qua: Number.isFinite(e.ketQua) ? e.ketQua : null,
    });
    if (error) console.warn("ghiSuKien:", error.message);
  } catch (err) {
    console.warn("ghiSuKien:", err instanceof Error ? err.message : err);
  }
}
