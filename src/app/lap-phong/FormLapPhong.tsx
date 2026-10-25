"use client";

import { useActionState, useEffect } from "react";
import { CheckCircle2, MessageCircle, Send } from "lucide-react";
import { baoGA } from "@/lib/su-kien-client";
import { HOTLINE_ZALO } from "@/lib/hotline";
import { dangKyLapPhong, type DangKyState } from "./actions";

const initial: DangKyState = { ok: false };
const nhan = "block text-xs font-semibold text-[var(--ink-soft)] mb-1";

// Form 30 giây: chỉ bắt buộc tên, SĐT, số phòng trống - phần còn lại Radar hỏi khi gọi khảo sát.
export default function FormLapPhong() {
  const [state, formAction, pending] = useActionState(dangKyLapPhong, initial);
  useEffect(() => { if (state.ok) baoGA("ndr_lap_phong"); }, [state.ok]);

  if (state.ok) {
    return (
      <div role="status" className="flex flex-col items-center text-center gap-3 py-8">
        <CheckCircle2 className="w-10 h-10 text-brand" />
        <div className="heading-3">Radar đã nhận thông tin phòng trống</div>
        <p className="text-sm text-[var(--ink-soft)] max-w-sm">
          Chuyên viên sẽ gọi lại trong giờ làm việc để khảo sát và báo phí trước khi triển khai. Cần gấp, nhắn Zalo cho Radar.
        </p>
        <a href={HOTLINE_ZALO} target="_blank" rel="noopener noreferrer" className="btn min-h-11 font-bold !border-[#0068ff] !text-[#0068ff]">
          <MessageCircle className="w-4 h-4" /> Nhắn Zalo Radar
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label className="block">
        <span className={nhan}>Họ và tên *</span>
        <input className="inp" name="name" required autoComplete="name" placeholder="Nguyễn Văn A" />
      </label>
      <label className="block">
        <span className={nhan}>Số điện thoại (Zalo) *</span>
        <input className="inp" name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="0912 345 678" />
      </label>
      <label className="block">
        <span className={nhan}>Khu vực</span>
        <input className="inp" name="khu_vuc" placeholder="VD: Gò Vấp, gần ĐH Công Nghiệp" />
      </label>
      <label className="block">
        <span className={nhan}>Số phòng / giường đang trống *</span>
        <input className="inp" name="so_phong" required type="number" inputMode="numeric" min={1} max={2000} placeholder="VD: 5" />
      </label>
      <label className="block">
        <span className={nhan}>Giá thuê dự kiến</span>
        <input className="inp" name="gia" placeholder="VD: 3,5 - 4 triệu/tháng" />
      </label>
      <label className="block">
        <span className={nhan}>Gói quan tâm</span>
        <select className="inp" name="goi" defaultValue="Chưa chọn">
          <option value="Chưa chọn">Chưa chọn - nhờ Radar tư vấn</option>
          <option>Cơ bản</option>
          <option>Pro</option>
          <option>Premium</option>
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className={nhan}>Ghi chú</span>
        <textarea className="inp" name="ghi_chu" rows={3} placeholder="Loại phòng, nội thất, giờ giấc, điện nước..." />
      </label>
      {state.error ? <div role="alert" className="sm:col-span-2 text-sm text-red-600 dark:text-red-400">{state.error}</div> : null}
      <button type="submit" disabled={pending} className="btn btn-primary sm:col-span-2 min-h-12 font-bold">
        <Send className="w-4 h-4" />
        {pending ? "Đang gửi..." : "Gửi yêu cầu lấp phòng"}
      </button>
      <p className="sm:col-span-2 text-xs text-[var(--ink-faint)]">
        Miễn phí, không ràng buộc. Radar chỉ thu phí khi có khách ký hợp đồng thuê.
      </p>
    </form>
  );
}
