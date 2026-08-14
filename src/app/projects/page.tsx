export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmtPrice } from "@/lib/format";
import SafeImg from "@/components/SafeImg";
import type { Project } from "@/lib/types";

export const metadata = { title: "Dự án bất động sản - NhaDat Radar" };

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("status", "published")
    .order("name");
  const projects = (data ?? []) as Project[];
  // Dự án có ảnh lên trước cho đẹp
  const sorted = [...projects].sort((a, b) => (b.images?.length ? 1 : 0) - (a.images?.length ? 1 : 0));

  return (
    <div>
      <div className="mb-6">
        <div className="kicker mb-1">Chủ đầu tư uy tín</div>
        <h1 className="prata text-2xl md:text-3xl">Dự án nổi bật</h1>
        <p className="text-[var(--ink-soft)] text-sm">Khám phá các dự án bất động sản được chọn lọc trên toàn quốc.</p>
      </div>
      {sorted.length ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
          {sorted.map((p, i) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="reveal group card rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col"
              style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
            >
              <div className="aspect-[16/10] bg-gradient-to-br from-brand to-brand-2 grid place-items-center text-white text-3xl overflow-hidden relative">
                {p.images?.[0] ? (
                  <SafeImg src={p.images[0]} alt={p.name} className="lc-img w-full h-full object-cover" />
                ) : "🏙️"}
                <span className="absolute top-2 left-2 text-[0.65rem] font-bold px-2 py-0.5 rounded-md bg-black/55 text-white backdrop-blur-sm">Dự án</span>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold leading-snug group-hover:text-brand transition-colors">{p.name}</h3>
                <div className="text-xs text-[var(--ink-soft)] mt-1 flex-1">
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
      ) : (
        <p className="text-[var(--ink-soft)] py-8">Chưa có dự án. Thêm vào bảng <code>projects</code>.</p>
      )}
    </div>
  );
}
