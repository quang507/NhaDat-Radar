// ISO 9241-110 (self-descriptiveness): nguồn gốc tin nhìn thấy ngay dưới tiêu đề — favicon nguồn + tên + thời điểm đăng
// trên nguồn (nếu có) / Radar thấy lần đầu + link bài gốc. Chỉ dùng dữ liệu thật của tin, không suy đoán.
import { fresh, coLinkThat } from "@/lib/format";

/** source_site (như crawler ghi) -> domain thật để lấy favicon & tên hiển thị */
const HOME: Record<string, { domain: string; name: string }> = {
  chotot: { domain: "nhatot.com", name: "Chợ Tốt (nhatot.com)" },
  "batdongsan.com.vn": { domain: "batdongsan.com.vn", name: "batdongsan.com.vn" },
  "mogi.vn": { domain: "mogi.vn", name: "mogi.vn" },
  facebook: { domain: "facebook.com", name: "Facebook group" },
  zalo: { domain: "zalo.me", name: "Zalo group" },
};
export function sourceInfo(site: string | null | undefined) {
  if (!site) return null;
  return HOME[site] ?? { domain: site.replace(/^https?:\/\//, "").split("/")[0], name: site };
}

export default function SourceBadge({ source, sourceSite, sourceUrl, postedAt, firstSeenAt, contactName }: {
  source: string; sourceSite: string | null | undefined; sourceUrl?: string | null;
  postedAt?: string | null; firstSeenAt?: string | null; contactName?: string | null;
}) {
  const own = source === "agent";
  const info = own ? null : sourceInfo(sourceSite);
  const when = postedAt || firstSeenAt;
  const ageMin = when ? Math.round((Date.now() - new Date(when).getTime()) / 60000) : null;
  const dt = when ? new Date(when).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--ink-soft)] mt-1.5">
      {own ? (
        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full">
          ✓ Tự đăng trên Radar{contactName ? ` · ${contactName}` : ""}
        </span>
      ) : info ? (
        <span className="inline-flex items-center gap-1.5 font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-2)]">
          {/* favicon nguồn (Google s2, 16px). Lỗi tải -> ẩn, không vỡ layout */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://www.google.com/s2/favicons?domain=${info.domain}&sz=32`} alt="" width={14} height={14} className="rounded-sm" loading="lazy" />
          Nguồn: {info.name}
        </span>
      ) : null}
      {dt && ageMin != null && (
        <span title={dt}>
          {postedAt ? "Đăng" : "Radar thấy"} <b className="text-[var(--ink)]">{fresh(ageMin)}</b> <span className="text-[var(--ink-faint)]">({dt})</span>
        </span>
      )}
      {/* Chỉ hiện nút khi thật sự có link. Facebook giấu permalink ở nhiều bài nên crawler
          ghi source_url = "#" — mà "#" vẫn là chuỗi khác rỗng, nên trước đây nút vẫn hiện và
          bấm vào thì ĐỨNG YÊN TẠI CHỖ. Đo 19/8: 319/808 tin facebook (39%) rơi vào cảnh này.
          Nút bấm không làm gì tệ hơn là không có nút — người dùng tưởng web hỏng. */}
      {!own && coLinkThat(sourceUrl) ? (
        <a href={sourceUrl!} target="_blank" rel="noopener nofollow" className="text-brand font-semibold hover:underline">Xem bài gốc ↗</a>
      ) : !own && sourceSite ? (
        <span className="text-[var(--ink-faint)]" title="Facebook không cho lấy link cố định của bài này">
          (bài gốc không còn link)
        </span>
      ) : null}
    </div>
  );
}
