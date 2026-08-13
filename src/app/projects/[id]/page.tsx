export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fmtPrice, AMEN } from "@/lib/format";
import ListingCard from "@/components/ListingCard";
import type { Project, Listing } from "@/lib/types";

export default async function ProjectDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: proj } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!proj) notFound();
  const p = proj as Project;

  const { data: ls } = await supabase
    .from("listings")
    .select("*")
    .eq("project_id", id)
    .eq("status", "published");
  const listings = (ls ?? []) as Listing[];

  return (
    <div>
      <Link href="/projects" className="text-sm text-[var(--ink-soft)] font-semibold">← Về danh sách dự án</Link>

      <div className="rounded-2xl overflow-hidden aspect-[21/9] max-h-[420px] grid place-items-center text-white text-5xl my-4 bg-gradient-to-br from-brand to-brand-2">
        {p.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
        ) : "🏙️"}
      </div>
      {p.images && p.images.length > 1 && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {p.images.slice(1, 5).map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={img} alt="" className="aspect-[4/3] w-full object-cover rounded-lg" />
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div>
          <h1 className="prata text-3xl">{p.name}</h1>
          <div className="text-brand font-semibold">{p.investor}</div>
          <div className="text-sm text-[var(--ink-soft)] mt-1">
            📍 {[p.address, p.district, p.province].filter(Boolean).join(", ") || "-"}
          </div>

          <div className="card rounded-2xl p-5 mt-5">
            <h3 className="font-bold mb-2">Giới thiệu dự án</h3>
            <p className="text-[var(--ink-soft)] text-sm whitespace-pre-line">
              {p.description || "(Chưa có mô tả)"}
            </p>
          </div>

          {p.amenities?.length ? (
            <div className="card rounded-2xl p-5 mt-4">
              <h3 className="font-bold mb-3">Tiện ích nội khu</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                {p.amenities.map((a) => (
                  <span key={a} className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)]">
                    {AMEN[a] || a}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <h3 className="font-bold mt-6 mb-3">Bất động sản đang bán trong dự án</h3>
          {listings.length ? (
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
              {listings.map((x) => (
                <ListingCard key={x.id} x={x} />
              ))}
            </div>
          ) : (
            <div className="card rounded-2xl p-8 text-center text-[var(--ink-soft)]">
              Chưa có bất động sản nào trong dự án này.
            </div>
          )}
        </div>

        <div>
          <div className="card rounded-2xl p-5 sticky top-20">
            <div className="text-xs text-[var(--ink-soft)] uppercase">Mức giá từ</div>
            <div className="prata text-2xl text-brand mb-4">
              {fmtPrice(p.price_min, "ban")} - {fmtPrice(p.price_max, "ban")}
            </div>
            <Row k="Chủ đầu tư" v={p.investor || "-"} />
            <Row k="Khu vực" v={[p.district, p.province].filter(Boolean).join(", ") || "-"} />
            <Row k="Số tin đang bán" v={String(listings.length)} />
            <button className="btn btn-primary w-full mt-4">📞 Liên hệ tư vấn</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-[var(--line)] text-sm">
      <span className="text-[var(--ink-soft)]">{k}</span>
      <span className="font-semibold text-right">{v}</span>
    </div>
  );
}
