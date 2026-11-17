"use client";

import { useEffect, useRef, useState } from "react";

type Muc = { id: string; label: string };

// Thanh mục dính dưới header cho trang dài (trang dự án, kiểu Mogi): bấm chip cuộn tới mục, mục đang đọc sáng lên.
// Nhận danh sách mục từ server (chỉ mục CÓ nội dung - lib/du-an-hien-thi mucTrangDuAn). Kiểu dáng giống
// MobileSectionJumper (tin đăng): nền đặc, không blur; .duoi-header trượt lên sát mép khi header tự ẩn lúc cuộn xuống.
export default function MucLucTrang({ muc, nhan = "Đi tới mục" }: { muc: Muc[]; nhan?: string }) {
  const [dangXem, setDangXem] = useState(muc[0]?.id ?? "");
  const hang = useRef<HTMLDivElement>(null);

  // Mục đang đọc = mục CUỐI CÙNG có mép trên đã lên tới 200px đầu màn hình (dưới thanh dính; chừa dư để bấm chip xong,
  // dù ảnh nạp muộn làm lệch vài chục px, vẫn sáng đúng chip vừa bấm); kéo tới đáy trang thì là mục cuối.
  // Tính theo vị trí khi cuộn (không dùng IntersectionObserver: nhảy cuộn nhanh làm lỡ mục, và mục cuối ngắn
  // không bao giờ chạm dải quan sát nên không bao giờ sáng).
  useEffect(() => {
    const els = muc.map((m) => document.getElementById(m.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const tinh = () => {
      const duoi = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let id = els[0].id;
      for (const el of els) if (el.getBoundingClientRect().top <= 200) id = el.id;
      setDangXem(duoi ? els[els.length - 1].id : id);
    };
    // tối đa ~8 phép đo vị trí mỗi sự kiện cuộn - đủ nhẹ để không cần rAF (rAF bị trình duyệt đóng băng ở tab nền)
    tinh();
    window.addEventListener("scroll", tinh, { passive: true });
    window.addEventListener("resize", tinh);
    return () => {
      window.removeEventListener("scroll", tinh);
      window.removeEventListener("resize", tinh);
    };
  }, [muc]);

  // giữ chip đang chọn trong khung (cuộn NGANG hàng chip, không đụng cuộn dọc của trang)
  useEffect(() => {
    const row = hang.current, chip = row?.querySelector<HTMLElement>(`[data-muc="${dangXem}"]`);
    if (row && chip) row.scrollTo({ left: chip.offsetLeft - 16, behavior: "smooth" });
  }, [dangXem]);

  const diTan = (id: string) => {
    setDangXem(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (muc.length < 2) return null;
  return (
    <div className="duoi-header sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 sm:mx-0 mt-4 py-2 bg-[var(--surface)] border-y sm:border border-[var(--line)] sm:rounded">
      <div ref={hang} className="cuon-ngang relative flex items-center gap-2 px-4 sm:px-3 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label={nhan}>
        {muc.map(({ id, label }) => {
          const on = id === dangXem;
          return (
            <button
              key={id}
              data-muc={id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => diTan(id)}
              className={`shrink-0 whitespace-nowrap min-h-11 px-3.5 rounded text-sm font-semibold border transition-colors cursor-pointer ${
                on ? "bg-brand/10 text-brand border-brand/40" : "bg-[var(--surface-2)] text-[var(--ink-soft)] border-[var(--line)] hover:text-[var(--ink)]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
