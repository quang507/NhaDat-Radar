export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LISTING_COLS, LISTING_CARD_COLS } from "@/lib/cols";
import { fmtPrice, AMEN } from "@/lib/format";
import { cleanImages } from "@/lib/img";
import ListingCard from "@/components/ListingCard";
import Gallery from "@/components/Gallery";
import ProjectContact from "./ProjectContact";
import RichText from "@/components/RichText";
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
    .select(LISTING_CARD_COLS)
    .eq("project_id", id)
    .eq("status", "published")
    .order("first_seen_at", { ascending: false })
    .limit(24);
  let listings = (ls ?? []) as Listing[];

  // Chưa có tin gắn trực tiếp dự án -> hiện tin cùng khu vực (quận/tỉnh) làm gợi ý
  let related = false;
  if (!listings.length && (p.district || p.province)) {
    const { data: near } = await supabase
      .from("listings").select(LISTING_CARD_COLS).eq("status", "published")
      .ilike(p.district ? "district" : "province", `%${p.district || p.province}%`)
      .not("images", "eq", "{}")
      .order("ai_score", { ascending: false, nullsFirst: false }).limit(8);
    listings = (near ?? []) as Listing[];
    related = listings.length > 0;
  }

  return (
    <div>
      <Link href="/projects" className="text-sm text-[var(--ink-soft)] font-semibold">‹ Về danh sách dự án</Link>

      <div className="my-4">
        {(() => {
          const imgs = cleanImages(p.images || []);
          return imgs.length ? (
            <Gallery images={imgs} title={p.name} />
          ) : (
            <div className="rounded-lg overflow-hidden aspect-[21/9] max-h-[420px] grid place-items-center text-white text-5xl bg-gradient-to-br from-brand to-brand-2">🏙️</div>
          );
        })()}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div>
          <h1 className="prata text-3xl">{p.name}</h1>
          <div className="text-brand font-semibold">{p.investor}</div>
          <div className="text-sm text-[var(--ink-soft)] mt-1">
            📍 {[p.address, p.district, p.province].filter(Boolean).join(", ") || "-"}
          </div>

          {/* Bảng thông số (migration 013): tổng DT, DT xây dựng, DT căn từ-đến, ngày khởi công/hoàn
              thành, pháp lý — thông tin người mua tìm đầu tiên, phải nằm TRÊN phần mô tả dài. */}
          {(() => {
            const specs = (p.specs ?? {}) as Record<string, string>;
            const rows = Object.entries(specs).filter(([, v]) => v);
            if (p.handover) rows.push(["Bàn giao", p.handover]);
            if (!rows.length) return null;
            return (
              <dl className="card rounded-lg p-5 mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex items-baseline gap-2 border-b border-[var(--line)] pb-2 last:border-0">
                    <dt className="text-xs text-[var(--ink-soft)] shrink-0">{k}</dt>
                    <dd className="ml-auto text-sm font-semibold text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            );
          })()}

          <div className="card rounded-lg p-5 mt-4">
            <h2 className="font-bold mb-3">Giới thiệu dự án</h2>
            {/* Mô tả dài -> gấp lại, mở bằng <details> (không cần JS, hoạt động cả khi tắt script) */}
            {(() => {
              const full = p.description || "";
              if (full.length <= 1200) return <RichText text={full} />;
              // Cắt tại ĐẦU DÒNG gần 900 ký tự nhất — cắt giữa chừng sẽ vỡ "## tiêu đề" / "- gạch đầu dòng".
              const cut = full.lastIndexOf("\n", 900);
              const dau = full.slice(0, cut > 300 ? cut : 900);
              const con = full.slice(dau.length);   // phần CÒN LẠI, không lặp lại phần đã hiện
              return (
                <>
                  <RichText text={dau} />
                  <details className="group mt-2">
                    {/* chỉ chữ "Xem đầy đủ" nằm trong summary — để cả đoạn văn vào đây thì bôi đen
                        chọn chữ cũng vô tình đóng/mở, và nội dung sẽ hiện lặp hai lần khi mở */}
                    <summary className="cursor-pointer list-none text-sm font-semibold text-brand">
                      <span className="group-open:hidden">Xem đầy đủ ↓</span>
                      <span className="hidden group-open:inline">Thu gọn ↑</span>
                    </summary>
                    <div className="mt-3">
                      <RichText text={con} />
                    </div>
                  </details>
                </>
              );
            })()}
          </div>

          {p.amenities?.length ? (
            <div className="card rounded-lg p-5 mt-4">
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

          <h3 className="font-bold mt-6 mb-3">
            {related ? `Bất động sản tại ${p.district || p.province}` : "Bất động sản đang bán trong dự án"}
          </h3>
          {listings.length ? (
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
              {listings.map((x) => (
                <ListingCard key={x.id} x={x} />
              ))}
            </div>
          ) : (
            <div className="card rounded-lg p-8 text-center text-[var(--ink-soft)]">
              Chưa có bất động sản nào trong dự án này.
            </div>
          )}
        </div>

        <div>
          <div className="card rounded-lg p-5 sticky top-20">
            <div className="text-xs text-[var(--ink-soft)] uppercase">Mức giá từ</div>
            <div className="prata text-2xl text-brand">
              {fmtPrice(p.price_min, "ban")} - {fmtPrice(p.price_max, "ban")}
            </div>
            {p.price_per_m2_text ? (
              <div className="text-xs text-[var(--ink-soft)] mb-4">{p.price_per_m2_text}</div>
            ) : <div className="mb-4" />}
            <Row k="Chủ đầu tư" v={p.investor || "-"} />
            <Row k="Khu vực" v={[p.district, p.province].filter(Boolean).join(", ") || "-"} />
            <Row k={related ? "Tin gợi ý cùng khu vực" : "Số tin đang bán"} v={String(listings.length)} />
            <ProjectContact projectId={p.id} projectName={p.name} />
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
