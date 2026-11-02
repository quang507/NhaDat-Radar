import Link from "next/link";

// Dòng thông báo mục đích dưới mọi form lấy SĐT/tên (audit pháp lý 2/11, Luật 91/2025 Điều 9: đồng ý phải
// biết rõ mục đích). Không dùng hook -> nhúng được cả trong server lẫn client component.
export default function GhiChuDuLieu({
  mucDich = "liên hệ tư vấn về nhu cầu này",
  className = "",
}: {
  mucDich?: string;
  className?: string;
}) {
  return (
    <p className={`text-caption leading-relaxed text-[var(--ink-faint)] ${className}`}>
      Bằng việc gửi, bạn đồng ý để NhaDat Radar dùng thông tin này để {mucDich}. Bạn có thể yêu cầu xoá bất cứ lúc
      nào.{" "}
      <Link href="/chinh-sach-bao-mat" className="underline hover:text-brand">Chính sách bảo mật</Link>
    </p>
  );
}
