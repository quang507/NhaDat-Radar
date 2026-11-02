"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { baoLeadMoi } from "@/lib/bao-lead";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/supabase/anon";

// Chủ trọ đăng ký LẤP PHÒNG (25/10). Không thêm bảng: ghi vào `leads` với tiền tố
// [LẤP PHÒNG] - cùng cách form hẹn xem ghi [HẸN XEM] - nên admin thấy ngay ở tab leads, báo Telegram/email
// như mọi lead. Khi lượng đăng ký đủ lớn mới tách bảng riêng (gói, trạng thái khảo sát...).
// 2/11 (audit S3): leads không còn cho anon insert qua REST (038) -> ghi bằng service role sau khi kiểm input.
const PHONE_RE = /^(\+84|0)\d{8,10}$/;
const GOI = ["Cơ bản", "Pro", "Premium", "Chưa chọn"];

// v: giá trị đã gõ - React 19 reset form sau action, báo lỗi xong form tự điền lại (audit Q7)
export type DangKyState = { ok: boolean; error?: string; v?: Record<string, string> };

async function tooMany(max: number): Promise<boolean> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || h.get("x-real-ip") || "?").split(",")[0].trim();
  return !rateLimit(`lap-phong:${ip}`, max, 10 * 60 * 1000);
}

export async function dangKyLapPhong(_prev: DangKyState, formData: FormData): Promise<DangKyState> {
  // ô ẩn chống bot: người thật không thấy nên không điền.
  // 2/11 (audit Q12): trả ok:false im lặng - ok:true làm form bắn sự kiện GA "ndr_lap_phong" giả
  if (String(formData.get("website") || "")) return { ok: false };
  const name = String(formData.get("name") || "").trim().slice(0, 120);
  const phoneGo = String(formData.get("phone") || "").trim().slice(0, 30);
  const phone = phoneGo.replace(/[\s.-]/g, "");
  const khuVuc = String(formData.get("khu_vuc") || "").trim().slice(0, 120);
  const soPhongGo = String(formData.get("so_phong") || "").trim().slice(0, 10);
  const soPhong = Number(soPhongGo || 0);
  const gia = String(formData.get("gia") || "").trim().slice(0, 60);
  const goi = GOI.includes(String(formData.get("goi"))) ? String(formData.get("goi")) : "Chưa chọn";
  const ghiChu = String(formData.get("ghi_chu") || "").trim().slice(0, 1000);
  const v = { name, phone: phoneGo, khu_vuc: khuVuc, so_phong: soPhongGo, gia, goi, ghi_chu: ghiChu };

  if (!name) return { ok: false, error: "Nhập tên của anh/chị.", v };
  if (!PHONE_RE.test(phone)) return { ok: false, error: "Số điện thoại chưa đúng (VD: 0912 345 678).", v };
  if (!Number.isInteger(soPhong) || soPhong < 1 || soPhong > 2000) return { ok: false, error: "Nhập số phòng/giường đang trống (từ 1).", v };
  if (await tooMany(5)) return { ok: false, error: "Bạn gửi hơi nhanh - thử lại sau ít phút.", v };

  const message = [`[LẤP PHÒNG] ${soPhong} phòng trống`, khuVuc && `Khu vực: ${khuVuc}`, gia && `Giá: ${gia}`, `Gói: ${goi}`, ghiChu && `Ghi chú: ${ghiChu}`]
    .filter(Boolean).join(" · ");
  const { error } = await createAdminClient().from("leads").insert({ listing_id: null, name, phone, message });
  if (error) {
    console.error("dangKyLapPhong error:", error.message);
    return { ok: false, error: "Chưa gửi được, thử lại hoặc nhắn Zalo cho Radar.", v };
  }
  after(() => baoLeadMoi({ listing_id: null, name, phone, message }));
  return { ok: true };
}
