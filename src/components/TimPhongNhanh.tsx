"use client";

import { useState } from "react";
import { HOTLINE, HOTLINE_ZALO } from "@/lib/hotline";
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
  const zaloUrl = `https://zalo.me/${HOTLINE}?text=${encodeURIComponent(tinNhan)}`;

  return (
    <section className="my-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Cột trái: Thông điệp giải quyết nỗi đau tìm nhà */}
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 text-xs font-bold mb-3 border border-emerald-200/60 dark:border-emerald-800/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Hỗ trợ tìm phòng &amp; dẫn xem hoàn toàn miễn phí</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
            Quá bận để tự lọc hàng ngàn tin?
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
            Chọn nhanh nhu cầu — Chuyên viên Radar lọc sẵn <b>3 - 5 căn phòng đẹp nhất</b>, còn trống hôm nay và gửi video thực tế qua Zalo cho bạn trong <b>15 phút</b>.
          </p>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-medium">
            <div className="flex items-center gap-1.5">
              <Video className="w-4 h-4 text-rose-500 shrink-0" />
              <span>100% có video</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Đúng giá chủ nhà</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Dẫn xem trong ngày</span>
            </div>
          </div>
        </div>

        {/* Cột phải: Form chọn nhanh 3 bước */}
        <div className="w-full lg:max-w-md bg-white dark:bg-slate-800 rounded-lg p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                1. Khu vực bạn muốn thuê:
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="inp w-full !py-2 text-sm rounded-md bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  2. Ngân sách / tháng:
                </label>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="inp w-full !py-2 text-xs sm:text-sm rounded-md bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
                >
                  {GIA_MUC.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  3. Loại hình phòng:
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="inp w-full !py-2 text-xs sm:text-sm rounded-md bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
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
              <a
                href={zaloUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-md font-bold text-sm text-white bg-[#0068ff] hover:bg-[#0057d9] active:scale-[0.99] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Nhận 3 - 5 phòng phù hợp qua Zalo</span>
              </a>

              <div className="mt-2.5 text-center flex items-center justify-center gap-2 text-xs text-slate-500">
                <span>Hoặc gọi hỗ trợ trực tiếp:</span>
                <a
                  href={`tel:${HOTLINE}`}
                  className="font-bold text-slate-800 hover:text-brand inline-flex items-center gap-1"
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
