"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { baoLeadMoi } from "@/lib/bao-lead";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/supabase/anon";

// Chủ trọ đăng ký LẤP PHÒNG (25/10). Không thêm bảng: ghi vào `leads` (anon insert qua RLS) với tiền tố
// [LẤP PHÒNG] - cùng cách form hẹn xem ghi [HẸN XEM] - nên admin thấy ngay ở tab leads, báo Telegram/email
// như mọi lead. Khi lượng đăng ký đủ lớn mới tách bảng riêng (gói, trạng thái khảo sát...).
const PHONE_RE = /^(\+84|0)\d{8,10}$/;
const GOI = ["Cơ bản", "Pro", "Premium", "Chưa chọn"];

export type DangKyState = { ok: boolean; error?: string };

async function tooMany(max: number): Promise<boolean> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || h.get("x-real-ip") || "?").split(",")[0].trim();
  return !rateLimit(`lap-phong:${ip}`, max, 10 * 60 * 1000);
}

export async function dangKyLapPhong(_prev: DangKyState, formData: FormData): Promise<DangKyState> {
  // ô ẩn chống bot: người thật không thấy nên không điền
  if (String(formData.get("website") || "")) return { ok: true };
  const name = String(formData.get("name") || "").trim().slice(0, 120);
  const phone = String(formData.get("phone") || "").replace(/[\s.-]/g, "");
  const khuVuc = String(formData.get("khu_vuc") || "").trim().slice(0, 120);
  const soPhong = Number(formData.get("so_phong") || 0);
  const gia = String(formData.get("gia") || "").trim().slice(0, 60);
  const goi = GOI.includes(String(formData.get("goi"))) ? String(formData.get("goi")) : "Chưa chọn";
  const ghiChu = String(formData.get("ghi_chu") || "").trim().slice(0, 1000);

  if (!name) return { ok: false, error: "Nhập tên của anh/chị." };
  if (!PHONE_RE.test(phone)) return { ok: false, error: "Số điện thoại chưa đúng (VD: 0912 345 678)." };
  if (!Number.isInteger(soPhong) || soPhong < 1 || soPhong > 2000) return { ok: false, error: "Nhập số phòng/giường đang trống (từ 1)." };
  if (await tooMany(5)) return { ok: false, error: "Bạn gửi hơi nhanh - thử lại sau ít phút." };

  const message = [`[LẤP PHÒNG] ${soPhong} phòng trống`, khuVuc && `Khu vực: ${khuVuc}`, gia && `Giá: ${gia}`, `Gói: ${goi}`, ghiChu && `Ghi chú: ${ghiChu}`]
    .filter(Boolean).join(" · ");
  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert({ listing_id: null, name, phone, message });
  if (error) {
    console.error("dangKyLapPhong error:", error.message);
    return { ok: false, error: "Chưa gửi được, thử lại hoặc nhắn Zalo cho Radar." };
  }
  after(() => baoLeadMoi({ listing_id: null, name, phone, message }));
  return { ok: true };
}
