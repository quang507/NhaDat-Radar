// Chú giải pháp lý cho người mua lần đầu (ISO 9241-110 self-descriptiveness): "Sổ hồng" nghĩa là gì, rủi ro ở đâu.
// Chỉ diễn giải thuật ngữ — KHÔNG kết luận tin thật/giả. Bấm mở (details) để dùng được trên mobile.
const GLOSSARY: { re: RegExp; name: string; meaning: string; risk: "thap" | "vua" | "cao" }[] = [
  { re: /sổ hồng riêng|shr|sổ riêng|sổ hồng chính chủ/i, name: "Sổ hồng riêng", meaning: "Giấy chứng nhận quyền sử dụng đất & sở hữu nhà, đứng tên riêng thửa này — có thể sang tên trực tiếp, vay ngân hàng được.", risk: "thap" },
  { re: /không có sổ|chưa có sổ|ko sổ/i, name: "Không có sổ", meaning: "Không có giấy chứng nhận quyền sử dụng đất — không sang tên, không thế chấp được; tranh chấp thì rất khó đòi quyền lợi. Cần luật sư kiểm tra trước khi giao dịch.", risk: "cao" },
  { re: /sổ hồng|sổ đỏ|gcn|giấy chứng nhận|đã có sổ|có sổ|sổ sẵn/i, name: "Sổ hồng / Sổ đỏ", meaning: "Giấy chứng nhận do Nhà nước cấp. Sổ đỏ (đất) và sổ hồng (nhà + đất) nay đều là 'GCN quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất'. Kiểm tra sổ thật tại Văn phòng đăng ký đất đai, xem có thế chấp/quy hoạch không.", risk: "thap" },
  { re: /sổ chung|đồng sở hữu|chung sổ/i, name: "Sổ chung / đồng sở hữu", meaning: "Nhiều người cùng đứng tên một sổ. Bán/thế chấp cần tất cả đồng ý; khó vay ngân hàng, khó tách sổ. Giá thường rẻ hơn 15–30% là vì vậy.", risk: "vua" },
  { re: /hợp đồng mua bán|hđmb|hdmb|hợp đồng góp vốn/i, name: "Hợp đồng mua bán (chưa có sổ)", meaning: "Thường là căn hộ dự án chưa được cấp sổ — mua bán qua HĐMB với chủ đầu tư, chuyển nhượng phải qua CĐT xác nhận. Kiểm tra pháp lý dự án & tiến độ ra sổ.", risk: "vua" },
  { re: /chờ sổ|đang chờ sổ|đang làm sổ|sắp có sổ/i, name: "Đang chờ sổ", meaning: "Chưa có giấy chứng nhận — chỉ nên đặt cọc khi có giấy tờ chứng minh đang làm sổ và điều khoản hoàn cọc rõ ràng.", risk: "cao" },
  { re: /vi bằng|giấy tay|giấy tờ tay|công chứng vi bằng/i, name: "Vi bằng / giấy tay", meaning: "KHÔNG phải giấy tờ sở hữu hợp pháp. Vi bằng chỉ ghi nhận việc giao tiền, không chuyển quyền — không sang tên, không vay được. Rủi ro mất trắng nếu tranh chấp.", risk: "cao" },
  { re: /đất nông nghiệp|đất trồng cây|đất vườn|chưa lên thổ|chưa chuyển mục đích|cmđ/i, name: "Đất chưa lên thổ cư", meaning: "Không được xây nhà ở cho đến khi chuyển mục đích sử dụng — có phí và không chắc được duyệt. Chỉ hợp người đầu tư dài hạn.", risk: "vua" },
  { re: /thổ cư|đất ở|onts|odt|full thổ/i, name: "Đất thổ cư", meaning: "Đất ở — được xây nhà. Xem trên sổ mục đích sử dụng ghi ODT/ONT và diện tích thổ cư là bao nhiêu m² (không phải toàn thửa đều là thổ).", risk: "thap" },
];

export function explainLegal(raw: string | null | undefined) {
  if (!raw) return null;
  return GLOSSARY.find((g) => g.re.test(raw)) || null;
}

export default function LegalHint({ value }: { value: string | null | undefined }) {
  const g = explainLegal(value);
  if (!value) return <span>-</span>;
  if (!g) return <span>{value}</span>;
  const tone = g.risk === "thap" ? "text-emerald-700 bg-emerald-500/10" : g.risk === "vua" ? "text-amber-700 bg-amber-500/10" : "text-red-700 bg-red-500/10";
  const label = g.risk === "thap" ? "pháp lý rõ" : g.risk === "vua" ? "cần kiểm tra" : "rủi ro cao";
  return (
    <details className="inline-block">
      <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
        <span>{value}</span>{" "}
        <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded ${tone}`}>{label} ⓘ</span>
      </summary>
      <div className="mt-2 text-xs leading-relaxed text-[var(--ink-soft)] max-w-md rounded-lg border border-[var(--line)] p-2.5 bg-[var(--bg)]">
        <b className="text-[var(--ink)]">{g.name}:</b> {g.meaning}
        <div className="text-[var(--ink-faint)] mt-1">Diễn giải thuật ngữ chung, không thay cho kiểm tra sổ thật và tư vấn pháp lý.</div>
      </div>
    </details>
  );
}
