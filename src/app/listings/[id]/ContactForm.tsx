"use client";

import { useActionState, useEffect, useState } from "react";
import { baoGA } from "@/lib/su-kien-client";
import { createLead, deLaiSdt, type LeadState } from "../actions";
import GhiChuDuLieu from "@/components/GhiChuDuLieu";
import { PhoneCall, CheckCircle2 } from "lucide-react";

const initial: LeadState = { ok: false };

export default function ContactForm({
  listingId,
  listingTitle,
  viaRadar = false, // tin cào: lead vào Radar, KHÔNG tới người đăng -> nói thẳng, không hứa hão
  datLich = false,  // rổ hàng Radar: form hẹn xem phòng (ngày + buổi), không cần đăng nhập
  goiLaiNhanh = false, // 1 ô SĐT/Zalo duy nhất cho rổ hàng/tin độc quyền -> gửi thẳng Zalo/Telegram admin gọi lại
}: {
  listingId: string;
  listingTitle: string;
  viaRadar?: boolean;
  datLich?: boolean;
  goiLaiNhanh?: boolean;
}) {
  const [state, formAction, pending] = useActionState(createLead, initial);
  const [sdtNhanh, setSdtNhanh] = useState("");
  const [nhanhBusy, setNhanhBusy] = useState(false);
  const [nhanhErr, setNhanhErr] = useState<string | null>(null);
  const [nhanhOk, setNhanhOk] = useState(false);

  // chuyển đổi chính của web (2/10): báo GA khi gửi THÀNH CÔNG - đánh dấu "sự kiện chính" trong GA
  useEffect(() => {
    if (state.ok) baoGA(datLich ? "ndr_dat_lich" : "ndr_de_lai_sdt", { listing_id: listingId, kieu: datLich ? "ro_hang" : viaRadar ? "tin_cao" : "tin_tu_dang" });
  }, [state.ok, datLich, viaRadar, listingId]);
  // 2/11 (audit Q8): ngày VN tính ở TRÌNH DUYỆT - trang ISR dựng sẵn (UTC) nên 0h-7h mặc định thành hôm qua
  const [homNay, setHomNay] = useState("");
  useEffect(() => { setHomNay(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })); }, []);
  // 2/11 (audit Q7): React 19 reset form sau action -> điền lại giá trị đã gõ khi báo lỗi
  const v = state.v;

  const guiNhanh = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nhanhBusy) return;
    setNhanhErr(null);
    setNhanhBusy(true);
    try {
      const res = await deLaiSdt(listingId, sdtNhanh);
      if (!res.ok) {
        setNhanhErr(res.error || "Số điện thoại chưa đúng.");
      } else {
        setNhanhOk(true);
        baoGA("ndr_de_lai_sdt", { listing_id: listingId, kieu: "goi_lai_nhanh" });
      }
    } catch {
      setNhanhErr("Không gửi được, bạn thử lại hoặc bấm gọi trực tiếp nhé.");
    } finally {
      setNhanhBusy(false);
    }
  };

  if (goiLaiNhanh) {
    if (nhanhOk) {
      return (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <span>Đã nhận SĐT <b>{sdtNhanh}</b>! Radar sẽ gọi hoặc nhắn Zalo gửi video &amp; hẹn xem phòng ngay cho bạn.</span>
        </div>
      );
    }
    return (
      <form onSubmit={guiNhanh} className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
        <div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
          <PhoneCall className="w-3.5 h-3.5 text-brand shrink-0" />
          <span>Nhận video phòng &amp; gọi lại miễn phí</span>
        </div>
        <div className="flex gap-2">
          <input
            className="inp !py-2 min-h-11 text-sm flex-1 min-w-0 bg-[var(--surface)]"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Nhập SĐT / Zalo của bạn..."
            value={sdtNhanh}
            onChange={(e) => { setSdtNhanh(e.target.value); setNhanhErr(null); }}
            required
          />
          <button
            type="submit"
            disabled={nhanhBusy}
            className="btn btn-primary min-h-11 px-3.5 text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer"
          >
            {nhanhBusy ? "Đang gửi..." : "Gửi SĐT"}
          </button>
        </div>
        {nhanhErr && <div className="text-xs text-red-600">{nhanhErr}</div>}
        <p className="text-[11px] text-[var(--ink-soft)] leading-snug">
          Chỉ cần để lại SĐT, chuyên viên Radar gọi/nhắn Zalo tư vấn ngay (không spam, không phí).
        </p>
      </form>
    );
  }

  if (state.ok) {
    return (
      <div className="text-emerald-600 text-sm py-3">
        {datLich
          ? "✓ Đã nhận lịch hẹn! Radar gọi lại xác nhận giờ xem phòng trong ít phút (8h-21h)."
          : viaRadar
          ? "✓ Đã nhận. Radar sẽ liên hệ bạn qua SĐT vừa gửi (trong giờ hành chính)."
          : "✓ Đã gửi liên hệ! Người bán sẽ thấy trong mục Liên hệ của họ."}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="listing_id" value={listingId} />
      <label className="block">
        <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">Tên của bạn</span>
        <input className="inp" name="name" autoComplete="name" defaultValue={v?.name} placeholder="Tên của bạn" required />
      </label>
      <label className="block">
        <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">Số điện thoại</span>
        <input className="inp" name="phone" defaultValue={v?.phone} type="tel" inputMode="tel" autoComplete="tel" placeholder="SĐT của bạn (Zalo)" required />
      </label>
      {datLich && (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">Ngày xem</span>
            {/* key đổi khi có ngày VN / giá trị cũ -> dựng lại ô để defaultValue mới có hiệu lực */}
            <input key={`${homNay}|${v?.hen_ngay ?? ""}`} className="inp" type="date" name="hen_ngay" required min={homNay || undefined} defaultValue={v?.hen_ngay || homNay} />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">Buổi</span>
            <select className="inp" name="hen_buoi" defaultValue={v?.hen_buoi || "Chiều"}>
              <option>Sáng</option><option>Chiều</option><option>Tối</option>
            </select>
          </label>
        </div>
      )}
      <label className="block">
        <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">Lời nhắn</span>
        <textarea
          className="inp"
          name="message"
          rows={3}
          defaultValue={v ? v.message : datLich ? `Tôi muốn hẹn xem phòng: ${listingTitle.slice(0, 60)}` : viaRadar ? `Tôi muốn được tư vấn các tin tương tự: ${listingTitle.slice(0, 50)}...` : `Tôi quan tâm đến BĐS: ${listingTitle.slice(0, 60)}...`}
        />
      </label>
      {state.error ? <div className="text-red-600 text-sm">{state.error}</div> : null}
      <button className={`btn w-full ${viaRadar && !datLich ? "" : "btn-primary"}`} type="submit" disabled={pending}>
        {pending ? "Đang gửi..." : datLich ? "📅 Đặt lịch xem phòng" : viaRadar ? "Nhờ Radar liên hệ lại" : "Gửi tin nhắn cho người bán"}
      </button>
      <GhiChuDuLieu
        mucDich={datLich || viaRadar ? "liên hệ hẹn xem và tư vấn về tin này" : "chuyển tên và SĐT của bạn cho người đăng tin này liên hệ lại"}
      />
    </form>
  );
}
