export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmtPrice } from "@/lib/format";
import SafeImg from "@/components/SafeImg";
import { tinhMoi } from "@/lib/sap-nhap";
import type { Project } from "@/lib/types";

export const metadata = { title: "Dự án bất động sản - NhaDat Radar" };

const PER_PAGE = 24;

// Chỉ lấy cột cần cho THẺ dự án. Tuyệt đối không lấy `description` (~4.000 ký tự/dự án) -
// sự cố 17/8: trang này select("*") KHÔNG limit, với 700+ dự án là ~3MB đổ vào một trang.
const CARD_COLS = "id,name,investor,province,district,images,price_min,price_max,is_partner,priority,handover";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.p) || 1);
  const tinh = (sp.tinh || "").trim();
  const supabase = await createClient();

  let q = supabase.from("projects").select(CARD_COLS, { count: "exact" }).eq("status", "published");
  if (tinh) q = q.eq("province", tinh);
  // Thứ tự PHẢI ổn định giữa các trang, không thì phân trang sẽ lặp/sót dự án:
  // priority (đối tác lên đầu) -> tên. Không sắp lại ở client như bản cũ vì làm vậy chỉ đúng trong 1 trang.
  const from = (page - 1) * PER_PAGE;
  const [{ data, count }, { data: provRows }] = await Promise.all([
    q.order("priority", { ascending: false }).order("name").range(from, from + PER_PAGE - 1),
    supabase.from("projects").select("province").eq("status", "published").not("province", "is", null).limit(2000),
  ]);
  const projects = (data ?? []) as unknown as Project[];
  const total = count ?? projects.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  // Danh sách tỉnh + số dự án, để lọc nhanh (TP.HCM thường nhiều nhất nên tự lên đầu)
  const dem = new Map<string, number>();
  for (const r of provRows ?? []) dem.set(r.province!, (dem.get(r.province!) ?? 0) + 1);
  const tinhList = [...dem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const href = (p: number) => {
    const u = new URLSearchParams();
    if (tinh) u.set("tinh", tinh);
    if (p > 1) u.set("p", String(p));
    return "/projects" + (u.size ? "?" + u : "");
  };

  return (
    <div>
      <div className="mb-4">
        <div className="kicker mb-1">Chủ đầu tư uy tín</div>
        <h1 className="prata text-2xl md:text-3xl">Dự án bất động sản</h1>
        <p className="text-[var(--ink-soft)] text-sm">
          <b className="text-[var(--ink)]">{total.toLocaleString("vi-VN")}</b> dự án
          {tinh ? ` tại ${tinh}` : " trên toàn quốc"}
          {totalPages > 1 ? ` · trang ${page}/${totalPages}` : ""}
        </p>
      </div>

      {/* Lọc theo tỉnh - link thật để bot đọc được và bấm Back hoạt động đúng */}
      {tinhList.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <Link href="/projects" className={`text-xs px-3 py-1.5 rounded-lg border transition ${!tinh ? "border-brand text-brand font-semibold" : "border-[var(--line)] hover:border-brand"}`}>
            Tất cả
          </Link>
          {tinhList.map(([p, n]) => (
            <Link
              key={p}
              href={`/projects?tinh=${encodeURIComponent(p)}`}
              className={`text-xs px-3 py-1.5 rounded-lg border transition ${tinh === p ? "border-brand text-brand font-semibold" : "border-[var(--line)] hover:border-brand"}`}
              // Giữ tên tỉnh CŨ để bấm/tìm được như thói quen thị trường, nhưng nói rõ nó đã
              // sáp nhập vào đâu (2025). Xem src/lib/sap-nhap.ts.
              title={tinhMoi(p) ? `${p} đã sáp nhập vào ${tinhMoi(p)} (2025)` : undefined}
            >
              {p} <span className="text-[var(--ink-faint)]">({n})</span>
              {tinhMoi(p) && <span className="ml-1 text-[0.6rem] text-[var(--ink-faint)]">· nay thuộc {tinhMoi(p)}</span>}
            </Link>
          ))}
        </div>
      )}

      {projects.length ? (
        <>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
            {projects.map((p, i) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="reveal group card rounded-lg overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col"
                style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
              >
                <div className="aspect-[16/10] bg-gradient-to-br from-brand to-brand-2 grid place-items-center text-white text-3xl overflow-hidden relative">
                  {p.images?.[0] ? (
                    <SafeImg src={p.images[0]} alt={p.name} className="lc-img w-full h-full object-cover" />
                  ) : "🏙️"}
                  <span className={`absolute top-2 left-2 text-[0.65rem] font-bold px-2 py-0.5 rounded-md text-white backdrop-blur-sm ${p.is_partner ? "bg-brand" : "bg-black/55"}`}>{p.is_partner ? "Đối tác Radar" : "Dự án"}</span>
                  {p.handover ? (
                    <span className="absolute bottom-2 right-2 text-[0.62rem] font-semibold px-1.5 py-0.5 rounded bg-black/55 text-white">Bàn giao {p.handover}</span>
                  ) : null}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold leading-snug group-hover:text-brand transition-colors line-clamp-2">{p.name}</h3>
                  <div className="text-xs text-[var(--ink-soft)] mt-1 flex-1 line-clamp-2">
                    {p.investor ? `CĐT: ${p.investor}` : ""}
                    {p.investor && (p.district || p.province) ? " · " : ""}
                    {[p.district, p.province].filter(Boolean).join(", ")}
                  </div>
                  <div className="text-brand font-bold text-sm mt-2">
                    {p.price_min || p.price_max ? `${fmtPrice(p.price_min, "ban")} - ${fmtPrice(p.price_max, "ban")}` : "Giá thoả thuận"}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && <Pager page={page} totalPages={totalPages} href={href} />}
        </>
      ) : (
        <p className="text-[var(--ink-soft)] py-8">
          Chưa có dự án nào{tinh ? ` tại ${tinh}` : ""}.{" "}
          {tinh ? <Link href="/projects" className="text-brand font-semibold">Xem tất cả ›</Link> : null}
        </p>
      )}
    </div>
  );
}

// Phân trang bằng <Link> thật (không JS): bấm Back/Forward đúng, bot index được từng trang.
function Pager({ page, totalPages, href }: { page: number; totalPages: number; href: (p: number) => string }) {
  // cửa sổ 2 trang quanh trang hiện tại + luôn có trang đầu/cuối, chèn "…" khi cách quãng
  const nums = new Set<number>([1, totalPages, page, page - 1, page + 1, page - 2, page + 2]);
  const list = [...nums].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const cls = "min-w-9 h-9 px-2 grid place-items-center rounded-lg border text-sm transition";
  return (
    <nav className="flex flex-wrap items-center justify-center gap-1.5 mt-8" aria-label="Phân trang dự án">
      {page > 1 && <Link href={href(page - 1)} className={`${cls} border-[var(--line)] hover:border-brand`} rel="prev" aria-label="Trang trước">‹</Link>}
      {list.map((n, i) => (
        <span key={n} className="contents">
          {i > 0 && n - list[i - 1] > 1 && <span className="px-1 text-[var(--ink-faint)]">…</span>}
          {n === page ? (
            <span className={`${cls} border-brand bg-brand text-white font-semibold`} aria-current="page">{n}</span>
          ) : (
            <Link href={href(n)} className={`${cls} border-[var(--line)] hover:border-brand`}>{n}</Link>
          )}
        </span>
      ))}
      {page < totalPages && <Link href={href(page + 1)} className={`${cls} border-[var(--line)] hover:border-brand`} rel="next" aria-label="Trang sau">›</Link>}
    </nav>
  );
}
