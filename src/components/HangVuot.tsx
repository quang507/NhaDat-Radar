import type { ReactNode } from "react";

// Hàng thẻ VUỐT NGANG trên điện thoại, lưới như cũ từ sm+ (29/9, kiểu "Tin TOP" của Mogi).
// Thẻ rộng 78% để lộ mép thẻ sau = gợi ý vuốt được; -mx-4/px-4 khớp padding của <main> để hàng
// chạy tràn mép màn hình; scroll-px-4 để snap tính cả padding (không thì thẻ đầu dính mép trái).
// Tailwind cần tên class nguyên văn -> bề rộng cột lưới chọn qua `cot`, không nội suy số.
const LUOI = {
  230: "sm:[grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]",
  250: "sm:[grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]",
} as const;

// 25/10: lưới auto-fill đổi số cột theo bề rộng -> "Dự án nổi bật" 3 thẻ trong 4 cột (hở 1 ô), dải
// "Tin đã xác minh" 6 thẻ thành 4 + 2. motHang: số cột CỐ ĐỊNH theo breakpoint (sm 2 · md 3 · lg 4) và
// ẩn thẻ dư ở từng breakpoint -> luôn đúng 1 hàng đầy. Điện thoại vẫn vuốt được hết.
const MOT_HANG = "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
const anTheoCot = (i: number) => (i < 2 ? "" : i === 2 ? "sm:hidden md:flex" : i === 3 ? "sm:hidden lg:flex" : "sm:hidden");

export default function HangVuot({ items, cot = 250, motHang = false }: { items: { key: string; node: ReactNode }[]; cot?: keyof typeof LUOI; motHang?: boolean }) {
  return (
    <div className={`cuon-ngang flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 -mx-4 px-4 sm:scroll-px-5 sm:-mx-5 sm:px-5 pb-2 [scrollbar-width:none]
      sm:grid sm:gap-4 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0 ${motHang ? MOT_HANG : LUOI[cot]}`}>
      {items.map((it, i) => (
        <div key={it.key} className={`w-[78%] shrink-0 snap-start sm:w-auto flex ${motHang ? anTheoCot(i) : ""}`}>{it.node}</div>
      ))}
    </div>
  );
}
