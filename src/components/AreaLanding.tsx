// Trang SEO khu vực: /nha-dat-ban/[tinh]/[quan] & /nha-dat-cho-thue/[tinh]/[quan]
// (học batdongsan: URL theo khu vực + H1 động + "N tin"; học homigo: tóm tắt thị trường tự sinh từ dữ liệu + FAQ + JSON-LD).
// MỌI con số đều tính từ listings đang published — không hardcode.
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fmtPrice, PROP } from "@/lib/format";
import { median, percentile } from "@/lib/gemini";
import { slugify, areaPath, DEAL_WORD } from "@/lib/slug";
import type { Listing } from "@/lib/types";
import ListingRow from "@/components/ListingRow";
import PriceTrend from "@/components/PriceTrend";

type Deal = "ban" | "cho_thue";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nha-dat-radar-rkyn.vercel.app";
const canonDistrict = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, "").trim();

/** Bảng tên khu vực đang có tin (để resolve slug -> tên thật, và để dựng link/sitemap). */
export async function loadAreas() {
  const supabase = await createClient();
  const { data } = await supabase.from("listings").select("province,district,deal").eq("status", "published").limit(5000);
  const map = new Map<string, { province: string; districts: Map<string, { ban: number; cho_thue: number }>; ban: number; cho_thue: number }>();
  for (const r of data ?? []) {
    const p = (r.province || "").trim(); if (!p) continue;
    const e = map.get(p) ?? { province: p, districts: new Map(), ban: 0, cho_thue: 0 };
    e[r.deal as Deal] += 1;
    const d = canonDistrict(r.district || "");
    if (d) { const de = e.districts.get(d) ?? { ban: 0, cho_thue: 0 }; de[r.deal as Deal] += 1; e.districts.set(d, de); }
    map.set(p, e);
  }
  return map;
}

export async function resolveArea(provinceSlug: string, districtSlug?: string) {
  const areas = await loadAreas();
  const prov = [...areas.values()].find((a) => slugify(a.province) === provinceSlug);
  if (!prov) return null;
  if (!districtSlug) return { province: prov.province, district: null as string | null, area: prov };
  const dist = [...prov.districts.keys()].find((d) => slugify(d) === districtSlug);
  if (!dist) return null;
  return { province: prov.province, district: dist, area: prov };
}

export function areaTitle(deal: Deal, province: string, district: string | null, n: number) {
  const where = district ? `${district}, ${province}` : province;
  return `${DEAL_WORD[deal]} nhà đất ${where} — ${n.toLocaleString("vi-VN")} tin mới nhất T${new Date().getMonth() + 1}/${new Date().getFullYear()} | NhaDat Radar`;
}

const fmtPpm2 = (v: number) => (v >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, "") + " tr/m²" : Math.round(v / 1e3) + "k/m²");
const fmtP = (v: number, deal: Deal) => fmtPrice(v, deal);

export default async function AreaLanding({ deal, provinceSlug, districtSlug }: { deal: Deal; provinceSlug: string; districtSlug?: string }) {
  const r = await resolveArea(provinceSlug, districtSlug);
  if (!r) notFound();
  const { province, district, area } = r;
  const supabase = await createClient();

  // Tin trong khu vực (đến 300 tin mới nhất để tính số liệu; hiển thị 20)
  let q = supabase.from("listings").select("*").eq("status", "published").eq("deal", deal).ilike("province", `%${province}%`);
  if (district) q = q.ilike("district", `${district}%`);
  const startOfDayVN = (() => { const d = new Date(Date.now() + 7 * 3600 * 1000); d.setUTCHours(0, 0, 0, 0); return new Date(d.getTime() - 7 * 3600 * 1000).toISOString(); })();
  const [{ data }, { count: newToday }] = await Promise.all([
    q.order("first_seen_at", { ascending: false }).limit(300),
    (() => { let c = supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "published").eq("deal", deal).ilike("province", `%${province}%`).gte("first_seen_at", startOfDayVN); if (district) c = c.ilike("district", `${district}%`); return c; })(),
  ]);
  let rows = (data ?? []) as Listing[];
  if (district) rows = rows.filter((x) => canonDistrict(x.district || "").toLowerCase() === district.toLowerCase());
  const total = district ? rows.length : (area[deal] || rows.length);

  // ---- Số liệu thị trường (thật) ----
  const prices = rows.map((x) => x.price_vnd).filter((v): v is number => !!v && v > 0);
  const ppm2 = rows.map((x) => Number(x.price_per_m2)).filter((v) => v > 0);
  const p25 = percentile(prices, 25), p75 = percentile(prices, 75), medPrice = median(prices), medPpm2 = median(ppm2);
  const byKind = new Map<string, number[]>();
  for (const x of rows) { if (x.price_vnd) { const a = byKind.get(x.kind) ?? []; a.push(x.price_vnd); byKind.set(x.kind, a); } }
  const kindStats = [...byKind.entries()].map(([k, arr]) => ({ kind: k, n: arr.length, med: median(arr)! })).filter((s) => s.n >= 3).sort((a, b) => b.n - a.n).slice(0, 4);
  // quận rẻ nhất (cấp tỉnh): median giá theo quận, cần ≥3 tin
  const byDist = new Map<string, number[]>();
  if (!district) for (const x of rows) { const d = canonDistrict(x.district || ""); if (d && x.price_vnd) { const a = byDist.get(d) ?? []; a.push(x.price_vnd); byDist.set(d, a); } }
  const distStats = [...byDist.entries()].map(([d, arr]) => ({ d, n: arr.length, med: median(arr)! })).filter((s) => s.n >= 3).sort((a, b) => a.med - b.med);
  const cheapest = distStats.slice(0, 3), priciest = distStats.slice(-3).reverse();
  const brokers = rows.filter((x) => x.poster_role_guess === "moi_gioi").length, owners = rows.filter((x) => x.poster_role_guess === "chu_nha").length;
  const withImg = rows.filter((x) => x.images?.length).length;
  const sources = [...new Set(rows.map((x) => x.source === "agent" ? "tự đăng" : x.source_site).filter(Boolean))];

  const where = district ? `${district}, ${province}` : province;
  const dealWord = DEAL_WORD[deal];
  const h1 = `${dealWord} nhà đất ${where}`;
  const monthLabel = `tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
  const show = rows.slice(0, 20);
  const searchHref = `/search?deal=${deal}&province=${encodeURIComponent(province)}${district ? `&district=${encodeURIComponent(district)}` : ""}`;
  const otherDeal: Deal = deal === "ban" ? "cho_thue" : "ban";
  const districts = [...area.districts.entries()].filter(([, c]) => c[deal] > 0).sort((a, b) => b[1][deal] - a[1][deal]);

  // ---- FAQ sinh từ dữ liệu (chỉ hỏi câu có số liệu để trả lời) ----
  const faq: { q: string; a: string }[] = [];
  if (medPrice) faq.push({
    q: `Giá ${deal === "ban" ? "nhà đất" : "thuê nhà đất"} ${where} ${monthLabel} khoảng bao nhiêu?`,
    a: `Theo ${prices.length} tin đang hiển thị trên NhaDat Radar, giá phổ biến từ ${fmtP(p25!, deal)} đến ${fmtP(p75!, deal)}, trung vị ${fmtP(medPrice, deal)}${medPpm2 ? ` (khoảng ${fmtPpm2(medPpm2)})` : ""}. Số liệu tổng hợp từ tin rao, chỉ mang tính tham khảo, không phải định giá.`,
  });
  if (kindStats.length) faq.push({
    q: `Loại hình nào được ${deal === "ban" ? "rao bán" : "cho thuê"} nhiều nhất ở ${where}?`,
    a: kindStats.map((s) => `${PROP[s.kind] || s.kind}: ${s.n} tin, trung vị ${fmtP(s.med, deal)}`).join("; ") + ".",
  });
  if (cheapest.length >= 2) faq.push({
    q: `Khu vực nào ở ${province} có giá ${deal === "ban" ? "bán" : "thuê"} mềm hơn?`,
    a: `Theo trung vị tin đang đăng: ${cheapest.map((s) => `${s.d} (${fmtP(s.med, deal)}, ${s.n} tin)`).join(", ")}. Cao nhất: ${priciest.map((s) => `${s.d} (${fmtP(s.med, deal)})`).join(", ")}.`,
  });
  faq.push({
    q: `Làm sao biết tin ${where} trên NhaDat Radar có thật?`,
    a: `Radar ghi rõ nguồn từng tin (${sources.slice(0, 5).join(", ")}), thời điểm Radar thấy tin lần đầu và lần gần nhất, cảnh báo tin có giá lệch ≥28% so với trung vị khu vực, và nêu dấu hiệu môi giới/chính chủ từ dữ liệu (${brokers} tin có dấu hiệu môi giới, ${owners} tin có dấu hiệu chính chủ trong ${rows.length} tin gần nhất). Luôn xem nhà trực tiếp và kiểm tra pháp lý trước khi đặt cọc.`,
  });

  // ---- JSON-LD ----
  const url = SITE + areaPath(deal, province, district);
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE },
      { "@type": "ListItem", position: 2, name: `${dealWord} nhà đất`, item: SITE + (deal === "ban" ? "/nha-dat-ban" : "/nha-dat-cho-thue") },
      { "@type": "ListItem", position: 3, name: province, item: SITE + areaPath(deal, province) },
      ...(district ? [{ "@type": "ListItem", position: 4, name: district, item: url }] : []),
    ] },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    { "@context": "https://schema.org", "@type": "ItemList", name: h1, numberOfItems: show.length, itemListElement: show.map((x, i) => ({
      "@type": "ListItem", position: i + 1, url: `${SITE}/listings/${x.id}`, name: x.title })) },
  ];

  return (
    <div>
      {ld.map((o, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(o) }} />)}

      <nav className="text-xs text-[var(--ink-soft)] mb-3 flex flex-wrap gap-1">
        <Link href="/" className="hover:text-brand">Trang chủ</Link><span>/</span>
        <Link href={deal === "ban" ? "/nha-dat-ban" : "/nha-dat-cho-thue"} className="hover:text-brand">{dealWord} nhà đất</Link><span>/</span>
        {district ? <><Link href={areaPath(deal, province)} className="hover:text-brand">{province}</Link><span>/</span><span className="text-[var(--ink)]">{district}</span></> : <span className="text-[var(--ink)]">{province}</span>}
      </nav>

      <h1 className="prata text-2xl md:text-3xl">{h1}</h1>
      <p className="text-sm text-[var(--ink-soft)] mt-1">
        Hiện có <b>{total.toLocaleString("vi-VN")}</b> tin {deal === "ban" ? "bán" : "cho thuê"} tại {where}
        {newToday ? <> · <b className="text-emerald-600">{newToday} tin mới hôm nay</b></> : null}
        {" "}· tổng hợp từ {sources.length} nguồn, cập nhật hằng ngày.
      </p>

      {/* Tóm tắt thị trường (số thật) */}
      {medPrice ? (
        <section className="card rounded-xl p-5 mt-5">
          <h2 className="font-bold mb-2">Thị trường {where} {monthLabel}</h2>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="border-l-2 border-[var(--line)] pl-3"><div className="text-xs text-[var(--ink-soft)] uppercase">Giá phổ biến</div><div className="font-bold">{fmtP(p25!, deal)} – {fmtP(p75!, deal)}</div></div>
            <div className="border-l-2 border-[var(--line)] pl-3"><div className="text-xs text-[var(--ink-soft)] uppercase">Trung vị</div><div className="font-bold">{fmtP(medPrice, deal)}{medPpm2 ? <span className="text-[var(--ink-soft)] font-normal"> · {fmtPpm2(medPpm2)}</span> : null}</div></div>
            <div className="border-l-2 border-[var(--line)] pl-3"><div className="text-xs text-[var(--ink-soft)] uppercase">Tin có ảnh</div><div className="font-bold">{withImg}/{rows.length}</div></div>
          </div>
          {kindStats.length ? (
            <p className="text-sm text-[var(--ink-soft)] mt-3">
              Theo loại hình: {kindStats.map((s) => <span key={s.kind}><b>{PROP[s.kind] || s.kind}</b> {s.n} tin, trung vị {fmtP(s.med, deal)}; </span>)}
            </p>
          ) : null}
          {cheapest.length >= 2 ? (
            <p className="text-sm text-[var(--ink-soft)] mt-1">
              Giá mềm hơn: {cheapest.map((s) => <Link key={s.d} href={areaPath(deal, province, s.d)} className="text-brand font-semibold">{s.d} ({fmtP(s.med, deal)})</Link>).reduce<ReactNode[]>((acc, el, i) => (i ? [...acc, ", ", el] : [el]), [])}.
            </p>
          ) : null}
          <p className="text-[0.7rem] text-[var(--ink-faint)] mt-2">Tính từ {prices.length} tin đang hiển thị (đến 300 tin mới nhất). Tham khảo, không phải định giá chính thức.</p>
          <div className="mt-3"><PriceTrend province={province} district={district} kind="all" deal={deal} compact /></div>
        </section>
      ) : null}

      {/* Quận/huyện trong tỉnh */}
      {!district && districts.length ? (
        <section className="mt-6">
          <h2 className="font-bold text-sm mb-2">{dealWord} nhà đất theo quận/huyện tại {province}</h2>
          <div className="flex flex-wrap gap-2">
            {districts.map(([d, c]) => (
              <Link key={d} href={areaPath(deal, province, d)} className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--line)] hover:border-brand hover:text-brand transition">
                {d} <span className="text-[var(--ink-faint)]">({c[deal]})</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Danh sách tin */}
      <section className="mt-6">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 className="font-bold">Tin {deal === "ban" ? "bán" : "cho thuê"} mới nhất tại {where}</h2>
          <Link href={searchHref} className="text-sm text-brand font-semibold">Xem tất cả {total.toLocaleString("vi-VN")} tin + bộ lọc →</Link>
        </div>
        {show.length ? (
          <div className="flex flex-col gap-3">{show.map((x) => <ListingRow key={x.id} x={x} />)}</div>
        ) : (
          <p className="text-sm text-[var(--ink-soft)]">Chưa có tin nào — Radar cào lại mỗi sáng.</p>
        )}
        {total > show.length ? <div className="mt-4 text-center"><Link href={searchHref} className="btn">Xem thêm {(total - show.length).toLocaleString("vi-VN")} tin</Link></div> : null}
      </section>

      {/* FAQ */}
      <section className="mt-10 card rounded-xl p-5">
        <h2 className="font-bold mb-3">Câu hỏi thường gặp về {deal === "ban" ? "mua" : "thuê"} nhà đất {where}</h2>
        <div className="flex flex-col gap-3 text-sm">
          {faq.map((f) => (
            <details key={f.q} className="group">
              <summary className="font-semibold cursor-pointer">{f.q}</summary>
              <p className="text-[var(--ink-soft)] mt-1 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Liên kết chéo */}
      <section className="mt-6 text-sm flex flex-wrap gap-x-4 gap-y-1">
        <Link href={areaPath(otherDeal, province, district)} className="text-brand">{DEAL_WORD[otherDeal]} nhà đất {where} →</Link>
        {district ? <Link href={areaPath(deal, province)} className="text-brand">Toàn {province} →</Link> : null}
        <Link href="/thong-ke" className="text-brand">Thống kê giá →</Link>
        <Link href="/dinh-gia" className="text-brand">Định giá nhanh →</Link>
      </section>
    </div>
  );
}
