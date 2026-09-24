// Trang SEO khu vực: /nha-dat-ban/[tinh]/[quan] & /nha-dat-cho-thue/[tinh]/[quan]
// (học batdongsan: URL theo khu vực + H1 động + "N tin"; học homigo: tóm tắt thị trường tự sinh từ dữ liệu + FAQ + JSON-LD).
// MỌI con số đều tính từ listings đang published - không hardcode.
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAnonClient } from "@/lib/supabase/anon";   // KHÔNG cookie -> trang cache được (23/9)
import { unstable_cache } from "next/cache";
import { fmtPrice, fmtPpm2, PROP, startOfDayVN } from "@/lib/format";
import { median, percentile } from "@/lib/gemini";
import { slugify, areaPath, DEAL_WORD, KIND_SLUG, kindFromSlug } from "@/lib/slug";
import { getAreas } from "@/lib/geo";
import type { Listing } from "@/lib/types";
import ListingRow from "@/components/ListingRow";
import DaiDocQuyen, { locDocQuyen } from "@/components/DaiDocQuyen";
import PriceTrend from "@/components/PriceTrend";
import { cheTinDocQuyen } from "@/lib/doc-quyen";
import { ldJson } from "@/lib/ld";

type Deal = "ban" | "cho_thue";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nhadatradar.com";

/**
 * Tuần tự hoá JSON-LD an toàn để nhúng vào <script>.
 *
 * XSS LƯU TRỮ (review /ultrareview): JSON.stringify KHÔNG escape "<" hay "/", nên một tiêu đề tin
 * CÀO chứa "</script>" thoát ra khỏi thẻ script và chạy mã trên chính origin của site. Kiểm chứng:
 *   title = 'Bán nhà Q7 </script><img src=x onerror=alert(document.domain)>'
 *   JSON.stringify(o).includes("</script>") === true
 * Đường tấn công không cần tài khoản: đăng tin lên bất kỳ nguồn nào Radar cào (chotot/mogi/guland/
 * group Facebook) -> crawler nhận -> seed ghi vào DB -> MỌI trang khu vực render cho mọi khách.
 * Đây lại đúng là nhóm trang được index SEO nên có lưu lượng cao nhất, và script chạy cùng origin
 * nên đọc được phiên Supabase trong localStorage.
 * Escape sang \\u00XX: vẫn là JSON hợp lệ, trình duyệt vẫn parse đúng, mà không thoát được thẻ.
 */
// (thân hàm chuyển sang src/lib/ld.ts 23/9 để trang chi tiết tin dùng chung - import ở đầu file)

/** slug -> tên thật, dựa trên cây khu vực CACHE (lib/geo) - audit 16/8: bản cũ select 5.000 dòng x2 mỗi request (metadata + page) */
export type AreaInfo = { province: string; ban: number; cho_thue: number; kinds: Record<string, { ban: number; cho_thue: number }>; districts: Record<string, { ban: number; cho_thue: number; kinds: Record<string, { ban: number; cho_thue: number }> }> };
export async function resolveArea(provinceSlug: string, districtSlug?: string): Promise<{ province: string; district: string | null; area: AreaInfo } | null> {
  const { counts } = await getAreas();
  const provName = Object.keys(counts).find((p) => slugify(p) === provinceSlug);
  if (!provName) return null;
  const area: AreaInfo = { province: provName, ...counts[provName] };
  if (!districtSlug) return { province: provName, district: null, area };
  const dist = Object.keys(area.districts).find((d) => slugify(d) === districtSlug);
  if (!dist) return null;
  return { province: provName, district: dist, area };
}

export function areaTitle(deal: Deal, province: string, district: string | null, n: number, kind?: string | null) {
  const where = district ? `${district}, ${province}` : province;
  const what = kind ? (PROP[kind] || kind) : "nhà đất";
  return `${DEAL_WORD[deal]} ${what} ${where} - ${n.toLocaleString("vi-VN")} tin mới nhất T${new Date().getMonth() + 1}/${new Date().getFullYear()} | NhaDat Radar`;
}

/** Số tin của một khu vực (có thể lọc theo loại BĐS) - dùng cho metadata + sitemap */
export function areaCount(area: AreaInfo, deal: Deal, district?: string | null, kind?: string | null): number {
  const node = district ? area.districts[district] : area;
  if (!node) return 0;
  return kind ? (node.kinds?.[kind]?.[deal] ?? 0) : node[deal];
}

/**
 * Metadata dùng chung cho 6 route khu vực (bán/thuê x tỉnh/quận/loại) - trước đây mỗi file tự viết
 * tay title + description + canonical nên dễ trôi khỏi nhau.
 * kindSlug không hợp lệ -> trả null để route tự notFound.
 */
export async function areaMeta(deal: Deal, provinceSlug: string, districtSlug?: string, kindSlug?: string) {
  const kind = kindFromSlug(kindSlug);
  if (kindSlug && !kind) return { title: "Không tìm thấy khu vực - NhaDat Radar" };
  const r = await resolveArea(provinceSlug, districtSlug);
  if (!r || (districtSlug && !r.district)) return { title: "Không tìm thấy khu vực - NhaDat Radar" };
  const n = areaCount(r.area, deal, r.district, kind);
  const where = r.district ? `${r.district}, ${r.province}` : r.province;
  const what = kind ? (PROP[kind] || kind).toLowerCase() : "nhà đất";
  const hanhDong = deal === "ban" ? "bán" : "cho thuê";
  return {
    title: areaTitle(deal, r.province, r.district, n, kind),
    description: `${n.toLocaleString("vi-VN")} tin ${hanhDong} ${what} tại ${where}: giá phổ biến và trung vị theo m², xu hướng giá, cảnh báo giá lệch, dấu hiệu môi giới/chính chủ và nguồn của từng tin. Cập nhật hằng ngày trên NhaDat Radar.`,
    alternates: { canonical: areaPath(deal, r.province, r.district, kind) },
  };
}

const fmtP = (v: number, deal: Deal) => fmtPrice(v, deal);
// cột thật sự dùng (ListingRow + số liệu) thay vì select("*")
const COLS = "id,source,source_site,source_url,deal,kind,title,description,price_vnd,area_m2,price_per_m2,bedrooms,bathrooms,province,district,ward,images,ai_score,poster_role_guess,price_flag,first_seen_at,source_count,source_sites,status";

/**
 * Truy vấn tin của một khu vực, CÓ CACHE 10 phút (unstable_cache).
 * Next 15 không cache fetch mặc định nữa -> mỗi lượt xem trang khu vực là 2 truy vấn Supabase, và
 * route bị coi là động nên không bao giờ được cache (đo 23/9: mọi phản hồi "no-store", TTFB 0,4-0,6s).
 * Dữ liệu chỉ đổi mỗi lượt crawl (4 tiếng) nên cache 10 phút là quá đủ.
 */
const layTinKhuVuc = unstable_cache(
  async (deal: Deal, province: string, district: string | null, kind: string | null) => {
    const supabase = createAnonClient();
    let q = supabase.from("listings").select(COLS).eq("status", "published").eq("deal", deal).eq("province", province);
    if (district) q = q.eq("district", district);
    if (kind) q = q.eq("kind", kind);
    let c = supabase.from("listings").select("id", { count: "exact", head: true })
      .eq("status", "published").eq("deal", deal).eq("province", province).gte("first_seen_at", startOfDayVN());
    if (district) c = c.eq("district", district);
    if (kind) c = c.eq("kind", kind);
    const [{ data }, { count }] = await Promise.all([q.order("first_seen_at", { ascending: false }).limit(300), c]);
    return { data: data ?? [], newToday: count ?? 0 };
  },
  ["area-listings-v1"],
  { revalidate: 600, tags: ["listings"] },
);

export default async function AreaLanding({ deal, provinceSlug, districtSlug, kind }: { deal: Deal; provinceSlug: string; districtSlug?: string; kind?: string | null }) {
  const r = await resolveArea(provinceSlug, districtSlug);
  if (!r) notFound();
  const { province, district, area } = r;
  // trang theo loại BĐS chỉ tồn tại khi khu vực đó thực sự có tin loại đó (tránh đẻ URL rỗng)
  if (kind && areaCount(area, deal, district, kind) < 1) notFound();
  const kindWord = kind ? (PROP[kind] || kind) : null;
  const { data, newToday } = await layTinKhuVuc(deal, province, district, kind ?? null);
  const rows = ((data ?? []) as Listing[]).map(cheTinDocQuyen);
  // tổng THẬT từ cây đếm (cache) - audit: bản cũ dùng rows.length bị cap 300 cho cấp quận
  const total = areaCount(area, deal, district, kind) || rows.length;

  // ---- Số liệu thị trường (thật) ----
  const prices = rows.map((x) => x.price_vnd).filter((v): v is number => !!v && v > 0);
  const ppm2 = rows.map((x) => Number(x.price_per_m2)).filter((v) => v > 0);
  const p25 = percentile(prices, 25), p75 = percentile(prices, 75), medPrice = median(prices), medPpm2 = median(ppm2);
  const byKind = new Map<string, number[]>();
  for (const x of rows) { if (x.price_vnd) { const a = byKind.get(x.kind) ?? []; a.push(x.price_vnd); byKind.set(x.kind, a); } }
  const kindStats = [...byKind.entries()].map(([k, arr]) => ({ kind: k, n: arr.length, med: median(arr)! })).filter((s) => s.n >= 3).sort((a, b) => b.n - a.n).slice(0, 4);
  // quận rẻ nhất (cấp tỉnh): median giá theo quận, cần ≥3 tin
  const byDist = new Map<string, number[]>();
  if (!district) for (const x of rows) { const d = x.district || ""; if (d && x.price_vnd) { const a = byDist.get(d) ?? []; a.push(x.price_vnd); byDist.set(d, a); } }
  const distStats = [...byDist.entries()].map(([d, arr]) => ({ d, n: arr.length, med: median(arr)! })).filter((s) => s.n >= 3).sort((a, b) => a.med - b.med);
  const cheapest = distStats.slice(0, 3), priciest = distStats.slice(-3).reverse();
  const brokers = rows.filter((x) => x.poster_role_guess === "moi_gioi").length, owners = rows.filter((x) => x.poster_role_guess === "chu_nha").length;
  const withImg = rows.filter((x) => x.images?.length).length;
  const sources = [...new Set(rows.map((x) => x.source === "agent" ? "tự đăng" : x.source_site).filter(Boolean))];

  const where = district ? `${district}, ${province}` : province;
  const dealWord = DEAL_WORD[deal];
  const h1 = `${dealWord} ${kindWord || "nhà đất"} ${where}`;
  const monthLabel = `tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
  // tin độc quyền hiện ở dải riêng đầu danh sách -> loại khỏi list thường cho khỏi lặp
  const idsDocQuyen = new Set(locDocQuyen(rows, 6).map((t) => t.id));
  const show = rows.filter((r) => !idsDocQuyen.has(r.id)).slice(0, 20);
  const searchHref = `/search?deal=${deal}&province=${encodeURIComponent(province)}${district ? `&district=${encodeURIComponent(district)}` : ""}${kind ? `&kind=${kind}` : ""}`;
  const otherDeal: Deal = deal === "ban" ? "cho_thue" : "ban";
  const districts = Object.entries(area.districts).filter(([, c]) => c[deal] > 0).sort((a, b) => b[1][deal] - a[1][deal]);
  // Loại BĐS có thật trong khu vực này -> chip dẫn sang /nha-dat-ban/[tinh]/[quan]/[loai]
  const kindsHere = Object.entries((district ? area.districts[district]?.kinds : area.kinds) || {})
    .filter(([k, c]) => c[deal] >= 3 && KIND_SLUG[k]).sort((a, b) => b[1][deal] - a[1][deal]);
  // Quận lân cận (chỉ hiện ở trang cấp quận) - trước đây trang quận không link sang quận nào khác
  const quanKhac = district ? districts.filter(([d]) => d !== district).slice(0, 12) : [];

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
  const url = SITE + areaPath(deal, province, district, kind);
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE },
      { "@type": "ListItem", position: 2, name: `${dealWord} nhà đất`, item: SITE + (deal === "ban" ? "/nha-dat-ban" : "/nha-dat-cho-thue") },
      { "@type": "ListItem", position: 3, name: province, item: SITE + areaPath(deal, province) },
      ...(district ? [{ "@type": "ListItem", position: 4, name: district, item: SITE + areaPath(deal, province, district) }] : []),
      ...(kindWord ? [{ "@type": "ListItem", position: district ? 5 : 4, name: kindWord, item: url }] : []),
    ] },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    { "@context": "https://schema.org", "@type": "ItemList", name: h1, numberOfItems: show.length, itemListElement: show.map((x, i) => ({
      "@type": "ListItem", position: i + 1, url: `${SITE}/listings/${x.id}`, name: x.title })) },
  ];

  return (
    <div>
      {ld.map((o, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(o) }} />)}

      <nav className="text-xs text-[var(--ink-soft)] mb-3 flex flex-wrap gap-1">
        <Link href="/" className="hover:text-brand">Trang chủ</Link><span>/</span>
        <Link href={deal === "ban" ? "/nha-dat-ban" : "/nha-dat-cho-thue"} className="hover:text-brand">{dealWord} nhà đất</Link><span>/</span>
        {district ? <><Link href={areaPath(deal, province)} className="hover:text-brand">{province}</Link><span>/</span>{kindWord ? <><Link href={areaPath(deal, province, district)} className="hover:text-brand">{district}</Link><span>/</span><span className="text-[var(--ink)]">{kindWord}</span></> : <span className="text-[var(--ink)]">{district}</span>}</> : (kindWord ? <><Link href={areaPath(deal, province)} className="hover:text-brand">{province}</Link><span>/</span><span className="text-[var(--ink)]">{kindWord}</span></> : <span className="text-[var(--ink)]">{province}</span>)}
      </nav>

      <h1 className="prata text-2xl md:text-3xl">{h1}</h1>
      <p className="text-sm text-[var(--ink-soft)] mt-1">
        Hiện có <b>{total.toLocaleString("vi-VN")}</b> tin {deal === "ban" ? "bán" : "cho thuê"} tại {where}
        {newToday ? <> · <b className="text-emerald-600">{newToday} tin mới hôm nay</b></> : null}
        {" "}· tổng hợp từ {sources.length} nguồn, cập nhật hằng ngày.
      </p>

      {/* Dải độc quyền là KHỐI ĐẦU TIÊN sau tiêu đề - "vẫn nằm phía trên cùng" (21/8),
          đứng trên cả tóm tắt thị trường và danh sách quận */}
      <div className="mt-5"><DaiDocQuyen listings={rows} /></div>

      {/* Tóm tắt thị trường (số thật) */}
      {medPrice ? (
        <section className="card rounded-xl p-5 mt-5">
          <h2 className="font-bold mb-2">Thị trường {where} {monthLabel}</h2>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="border-l-2 border-[var(--line)] pl-3"><div className="text-xs text-[var(--ink-soft)] uppercase">Giá phổ biến</div><div className="font-bold">{fmtP(p25!, deal)} - {fmtP(p75!, deal)}</div></div>
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

      {/* Loại BĐS trong khu vực (trang SEO theo loại) */}
      {kindsHere.length ? (
        <section className="mt-6">
          <h2 className="font-bold text-sm mb-2">{dealWord} theo loại BĐS tại {where}</h2>
          <div className="flex flex-wrap gap-2">
            {kind ? (
              <Link href={areaPath(deal, province, district)} className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--line)] hover:border-brand hover:text-brand transition">Tất cả loại</Link>
            ) : null}
            {kindsHere.map(([k, c]) => (
              <Link key={k} href={areaPath(deal, province, district, k)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${k === kind ? "border-brand text-brand font-semibold" : "border-[var(--line)] hover:border-brand hover:text-brand"}`}>
                {PROP[k] || k} <span className="text-[var(--ink-faint)]">({c[deal]})</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Quận lân cận (trang cấp quận) */}
      {quanKhac.length ? (
        <section className="mt-6">
          <h2 className="font-bold text-sm mb-2">{dealWord} {kindWord || "nhà đất"} ở khu vực lân cận</h2>
          <div className="flex flex-wrap gap-2">
            {quanKhac.map(([d, c]) => (
              <Link key={d} href={areaPath(deal, province, d, kind)} className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--line)] hover:border-brand hover:text-brand transition">
                {d} <span className="text-[var(--ink-faint)]">({c[deal]})</span>
              </Link>
            ))}
          </div>
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
          <Link href={searchHref} className="text-sm text-brand font-semibold">Xem tất cả {total.toLocaleString("vi-VN")} tin + bộ lọc ›</Link>
        </div>
        {show.length ? (
          <div className="flex flex-col gap-3">{show.map((x) => <ListingRow key={x.id} x={x} />)}</div>
        ) : (
          <p className="text-sm text-[var(--ink-soft)]">Chưa có tin nào - Radar cào lại mỗi sáng.</p>
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
        <Link href={areaPath(otherDeal, province, district, kind)} className="text-brand">{DEAL_WORD[otherDeal]} {kindWord || "nhà đất"} {where} ›</Link>
        {district ? <Link href={areaPath(deal, province, null, kind)} className="text-brand">Toàn {province} ›</Link> : null}
        {kind ? <Link href={areaPath(deal, province, district)} className="text-brand">Tất cả loại BĐS tại {where} ›</Link> : null}
        {/* mang theo ngữ cảnh bán/thuê + tỉnh - link trần từng nhảy về mặc định sai chiều */}
        <Link href={`/thong-ke?deal=${deal}&city=${encodeURIComponent(province)}`} className="text-brand">Thống kê giá ›</Link>
        <Link href="/dinh-gia" className="text-brand">Định giá nhanh ›</Link>
      </section>
    </div>
  );
}
