"use client";

import { useState } from "react";
import { HOTLINE, HOTLINE_ZALO } from "@/lib/hotline";
import { NutZalo } from "@/components/TheoDoi";
import { MessageCircle, ShieldCheck, Video, Clock, CheckCircle2, PhoneCall } from "lucide-react";

const QUAN_HOT = [
  "Bình Thạnh",
  "Gò Vấp",
  "Tân Bình",
  "Phú Nhuận",
  "Quận 7",
  "Quận 10",
  "Quận 1",
  "TP. Thủ Đức",
  "Quận 3",
  "Tân Phú",
];

const GIA_MUC = [
  "Dưới 3.5 triệu",
  "3.5 - 5 triệu",
  "5 - 8 triệu",
  "8 - 12 triệu",
  "Trên 12 triệu",
];

const LOAI_HINH = [
  "Phòng trọ / Studio",
  "Gác lửng tiện nghi",
  "Căn hộ 1 - 2PN",
  "Nhà nguyên căn",
  "Mặt bằng kinh doanh",
];

export default function TimPhongNhanh() {
  const [district, setDistrict] = useState(QUAN_HOT[0]);
  const [budget, setBudget] = useState(GIA_MUC[1]);
  const [type, setType] = useState(LOAI_HINH[0]);

  const tinNhan = `Chào Radar, mình đang cần tìm ${type} tại khu vực ${district}, tài chính khoảng ${budget}. Gửi giúp mình 3 - 5 căn còn trống có video thực tế nhé!`;

  return (
    <section className="my-8 band-zalo p-5 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Cột trái: Thông điệp giải quyết nỗi đau tìm nhà */}
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-3 border border-emerald-400/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hỗ trợ tìm phòng &amp; dẫn xem hoàn toàn miễn phí</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
            Quá bận để tự lọc hàng ngàn tin?
          </h2>
          <p className="text-sm text-emerald-50/85 mt-1.5 leading-relaxed">
            Chọn nhanh nhu cầu — Chuyên viên Radar lọc sẵn <b className="text-amber-300">3 - 5 căn phòng đẹp nhất</b>, còn trống hôm nay và gửi video thực tế qua Zalo cho bạn trong <b className="text-emerald-300">15 phút</b>.
          </p>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/15 text-xs text-white/90 font-medium">
            <div className="flex items-center gap-1.5">
              <Video className="w-4 h-4 text-rose-400 shrink-0" />
              <span>100% có video</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Đúng giá chủ nhà</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Dẫn xem trong ngày</span>
            </div>
          </div>
        </div>

        {/* Cột phải: Form chọn nhanh 3 bước */}
        <div className="w-full lg:max-w-md bg-[var(--surface)] text-[var(--ink)] rounded-md p-4 sm:p-5 border border-[var(--line)] shadow-zen-3">
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-[var(--ink-soft)] mb-1.5">
                1. Khu vực bạn muốn thuê:
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="inp w-full !py-2 text-sm rounded-md bg-[var(--surface-2)] border-[var(--line-strong)] text-[var(--ink)] font-medium cursor-pointer"
              >
                {QUAN_HOT.map((q) => (
                  <option key={q} value={q}>
                    {q} (TP.HCM)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-[var(--ink-soft)] mb-1.5">
                  2. Ngân sách / tháng:
                </label>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="inp w-full !py-2 text-xs sm:text-sm rounded-md bg-[var(--surface-2)] border-[var(--line-strong)] text-[var(--ink)] font-medium cursor-pointer"
                >
                  {GIA_MUC.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--ink-soft)] mb-1.5">
                  3. Loại hình phòng:
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="inp w-full !py-2 text-xs sm:text-sm rounded-md bg-[var(--surface-2)] border-[var(--line-strong)] text-[var(--ink)] font-medium cursor-pointer"
                >
                  {LOAI_HINH.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <NutZalo
                tinNhan={tinNhan}
                href={HOTLINE_ZALO}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-zalo w-full py-2.5 px-4 rounded-md font-bold text-sm active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Nhận 3 - 5 phòng phù hợp qua Zalo</span>
              </NutZalo>

              <div className="mt-2.5 text-center flex items-center justify-center gap-2 text-xs text-[var(--ink-faint)]">
                <span>Hoặc gọi hỗ trợ trực tiếp:</span>
                <a
                  href={`tel:${HOTLINE}`}
                  className="font-bold text-[var(--ink)] hover:text-brand inline-flex items-center gap-1"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-brand" />
                  <span>0387 365 020</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
