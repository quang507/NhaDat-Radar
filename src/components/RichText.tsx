// Render mô tả dài có cấu trúc (17/8: trang dự án trước đây đổ nguyên 3.200 ký tự thành 1 khối
// whitespace-pre-line -> bức tường chữ không đọc nổi). Crawler (crawler/mogi-projects.mjs -> structText)
// giữ lại phân đoạn của nguồn bằng quy ước:
//    "## Tiêu đề"  -> đầu mục
//    "- nội dung"  -> gạch đầu dòng
//    dòng trống    -> ngắt đoạn
// Đây KHÔNG phải markdown đầy đủ (không cố ý hỗ trợ **đậm**, link…) — chỉ 3 quy ước trên,
// đủ để dựng lại đúng bố cục bài gốc mà không cần thư viện.
type Block =
  | { t: "h"; text: string }
  | { t: "p"; text: string }
  | { t: "ul"; items: string[] };

export function parseBlocks(src: string): Block[] {
  const out: Block[] = [];
  for (const raw of (src || "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("## ")) { out.push({ t: "h", text: line.slice(3).trim() }); continue; }
    if (line.startsWith("- ")) {
      const item = line.slice(2).trim();
      const last = out[out.length - 1];
      if (last?.t === "ul") last.items.push(item);
      else out.push({ t: "ul", items: [item] });
      continue;
    }
    out.push({ t: "p", text: line });
  }
  return out;
}

export default function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parseBlocks(text);
  if (!blocks.length) return <p className="text-sm text-[var(--ink-soft)]">(Chưa có mô tả)</p>;
  return (
    <div className={`space-y-3 ${className}`}>
      {blocks.map((b, i) =>
        b.t === "h" ? (
          <h3 key={i} className="font-bold text-[0.95rem] text-[var(--ink)] pt-2 first:pt-0">{b.text}</h3>
        ) : b.t === "ul" ? (
          <ul key={i} className="grid gap-1.5 pl-1">
            {b.items.map((it, j) => (
              <li key={j} className="flex gap-2 text-sm text-[var(--ink-soft)] leading-relaxed">
                <span className="text-brand shrink-0 mt-[0.35em] w-1 h-1 rounded-full bg-brand" aria-hidden />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        ) : (
          // WCAG: dòng dài dễ lạc mắt -> giới hạn bề rộng đo được ~75 ký tự
          <p key={i} className="text-sm text-[var(--ink-soft)] leading-relaxed max-w-[68ch]">{b.text}</p>
        ),
      )}
    </div>
  );
}
