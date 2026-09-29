"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Mô tả dài thu gọn ~10 dòng + "Xem thêm" (29/9). Tin rổ hàng liệt kê tiện nghi mỗi dòng một mục ->
// riêng mô tả ~1.300px trên điện thoại, đẩy vị trí + liên hệ xuống rất xa.
// Toàn văn vẫn nằm trong HTML (chỉ cắt bằng CSS) -> bot vẫn đọc đủ. Ngắn sẵn thì không hiện nút.
export default function MoTaThuGon({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [dai, setDai] = useState(false);
  const [mo, setMo] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el) setDai(el.scrollHeight > el.clientHeight + 24);
  }, []);
  return (
    <div>
      <div ref={ref} className={`relative ${mo ? "" : "max-h-[17rem] overflow-hidden"}`}>
        {children}
        {dai && !mo && <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--surface)] to-transparent pointer-events-none" />}
      </div>
      {dai && (
        <button type="button" onClick={() => setMo((v) => !v)} className="mt-2 text-sm font-semibold text-brand" aria-expanded={mo}>
          {mo ? "Thu gọn ▴" : "Xem thêm ▾"}
        </button>
      )}
    </div>
  );
}
