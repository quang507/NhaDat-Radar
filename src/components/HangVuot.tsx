import type { ReactNode } from "react";

// Hàng thẻ VUỐT NGANG trên điện thoại, lưới như cũ từ sm+ (29/9, kiểu "Tin TOP" của Mogi).
// Thẻ rộng 78% để lộ mép thẻ sau = gợi ý vuốt được; -mx-5/px-5 khớp padding của <main> để hàng
// chạy tràn mép màn hình; scroll-px-5 để snap tính cả padding (không thì thẻ đầu dính mép trái).
// Tailwind cần tên class nguyên văn -> bề rộng cột lưới chọn qua `cot`, không nội suy số.
const LUOI = {
  230: "sm:[grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]",
  250: "sm:[grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]",
} as const;

// toiDaSm: từ sm+ chỉ hiện N thẻ đầu (1 hàng lưới) - điện thoại vẫn vuốt được hết (trang chủ 30/9)
export default function HangVuot({ items, cot = 250, toiDaSm }: { items: { key: string; node: ReactNode }[]; cot?: keyof typeof LUOI; toiDaSm?: number }) {
  return (
    <div className={`flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-5 -mx-5 px-5 pb-2 [scrollbar-width:none]
      sm:grid sm:gap-4 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0 ${LUOI[cot]}`}>
      {items.map((it, i) => (
        <div key={it.key} className={`w-[78%] shrink-0 snap-start sm:w-auto flex ${toiDaSm != null && i >= toiDaSm ? "sm:hidden" : ""}`}>{it.node}</div>
      ))}
    </div>
  );
}
