// "Điểm tin 82/100 ⓘ" - bấm mở giải thích (mobile không hover được tooltip; UX audit #13).
// Nói đúng bản chất: điểm ĐẦY ĐỦ THÔNG TIN theo heuristic, không phải xác minh/AI.
export default function ScoreInfo({ score, trust }: { score: number | null; trust?: number | null }) {
  if (!score) return null;
  return (
    <details className="relative inline-block text-[var(--ink-soft)]">
      <summary className="list-none cursor-pointer select-none [&::-webkit-details-marker]:hidden">
        Điểm tin <b>{score}/100</b> <span aria-hidden className="inline-grid place-items-center w-4 h-4 rounded-full border border-current text-[0.6rem] align-middle">i</span>
      </summary>
      <div className="absolute z-20 left-0 mt-2 w-72 max-w-[85vw] card rounded-lg p-3 text-xs leading-relaxed shadow-lg text-[var(--ink)]">
        <b>Điểm tin</b> = mức đầy đủ thông tin của tin đăng: có giá &amp; diện tích, số ảnh, pháp lý, độ dài mô tả, toạ độ, dấu hiệu chính chủ; trừ điểm khi giá lệch mạnh so với khu vực hoặc tiêu đề kiểu câu view.
        {trust ? <> <b>Độ đầy đủ tin {trust}/100</b> là thang tương tự tính riêng cho phần hiển thị.</> : null}
        <div className="text-[var(--ink-faint)] mt-1">Đây là chấm tự động theo dữ liệu, <b>không phải xác minh</b> tin thật/giả. Luôn xem trực tiếp và kiểm tra pháp lý trước khi đặt cọc.</div>
      </div>
    </details>
  );
}
