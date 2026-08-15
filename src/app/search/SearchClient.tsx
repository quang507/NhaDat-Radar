"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ListingRow from "@/components/ListingRow";
import MapResults, { type MapItem } from "@/components/MapResults";
import SaveSearchButton from "@/components/SaveSearchButton";
import { PROP } from "@/lib/format";
import type { Listing } from "@/lib/types";

export type GeoTree = Record<string, Record<string, string[]>>;

const PRICE_OPTS: [string, string][] = [
  ["", "Tất cả"], ["500000000", "500 triệu"], ["1000000000", "1 tỷ"], ["2000000000", "2 tỷ"],
  ["3000000000", "3 tỷ"], ["5000000000", "5 tỷ"], ["10000000000", "10 tỷ"], ["20000000000", "20 tỷ"],
];
const SORTS: [string, string][] = [
  ["", "Mới nhất"], ["score", "Điểm tin cao"], ["price_asc", "Giá thấp đến cao"],
  ["price_desc", "Giá cao đến thấp"], ["area_desc", "Diện tích lớn nhất"],
];

function shortPrice(v: number | null): string {
  if (!v) return "TL";
  if (v >= 1e9) { const t = v / 1e9; return (t % 1 ? t.toFixed(1) : String(t)) + "tỷ"; }
  return Math.round(v / 1e6) + "tr";
}

export default function SearchClient({
  listings, geo, params,
}: {
  listings: Listing[];
  geo: GeoTree;
  params: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [showFilter, setShowFilter] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [f, setF] = useState({
    q: params.q || "", deal: params.deal || "", kind: params.kind || "",
    province: params.province || "", district: params.district || "", ward: params.ward || "",
    priceMin: params.priceMin || "", priceMax: params.priceMax || "",
    areaMin: params.areaMin || "", bedrooms: params.bedrooms || "",
  });
  const sort = params.sort || "";
  // Công tắc "địa chỉ mới sau sáp nhập" (kiểu batdongsan): BẬT = duyệt Tỉnh -> Phường mới
  // (hệ 2 cấp, bỏ quận); TẮT = duyệt theo quận cũ như thói quen thị trường.
  const [newAddr, setNewAddr] = useState(params.newAddr === "1");

  const provinces = useMemo(() => Object.keys(geo).sort(), [geo]);
  const districts = useMemo(() => (f.province && geo[f.province] ? Object.keys(geo[f.province]).sort() : []), [geo, f.province]);
  const wards = useMemo(
    () => (f.province && f.district && geo[f.province]?.[f.district] ? geo[f.province][f.district] : []),
    [geo, f.province, f.district],
  );
  const allWards = useMemo(
    () => (f.province && geo[f.province]
      ? [...new Set(Object.values(geo[f.province]).flat())].sort()
      : []),
    [geo, f.province],
  );

  // "Điểm tin cao": đẩy tin có ảnh lên trước; các sort khác (kể cả mặc định
  // "Mới nhất") giữ nguyên thứ tự server để không phá trình tự thời gian crawl.
  const display = useMemo(() => {
    if (sort !== "score") return listings;
    const withImg = listings.filter((x) => x.images && x.images.length > 0);
    const noImg = listings.filter((x) => !x.images || x.images.length === 0);
    return [...withImg, ...noImg];
  }, [listings, sort]);

  // Phân trang kiểu batdongsan: 20 tin/trang, đổi lọc thì về trang 1
  const PER_PAGE = 20;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(display.length / PER_PAGE);
  useEffect(() => { setPage(1); }, [listings]);
  useEffect(() => { if (page > 1) window.scrollTo({ top: 0, behavior: "smooth" }); }, [page]);

  const mapItems: MapItem[] = useMemo(
    () => listings
      .filter((x) => x.lat != null && x.lng != null)
      .map((x) => ({ id: x.id, lat: x.lat!, lng: x.lng!, label: shortPrice(x.price_vnd), title: x.title })),
    [listings],
  );

  function push(next: Record<string, string>) {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) usp.set(k, v);
    if (newAddr) usp.set("newAddr", "1");
    router.push("/search" + (usp.size ? "?" + usp.toString() : ""));
  }
  const submit = () => push({ ...f, sort });
  const clear = () => { setF({ q: "", deal: "", kind: "", province: "", district: "", ward: "", priceMin: "", priceMax: "", areaMin: "", bedrooms: "" }); router.push("/search"); };

  const sel = "inp appearance-none pr-8 cursor-pointer";
  const set = (k: string) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const v = e.target.value;
    setF((s) => k === "province" ? { ...s, province: v, district: "", ward: "" } : k === "district" ? { ...s, district: v, ward: "" } : { ...s, [k]: v });
  };

  // Tiêu đề động kiểu batdongsan: "Mua bán nhà riêng Quận 7, Hồ Chí Minh"
  const dealWord = f.deal === "cho_thue" ? "Cho thuê" : f.deal === "ban" ? "Mua bán" : "Mua bán & cho thuê";
  const kindWord = f.kind ? (PROP as Record<string, string>)[f.kind]?.toLowerCase() : "nhà đất";
  const locWord = [f.district, f.province].filter(Boolean).join(", ");
  const pageTitle = `${dealWord} ${kindWord}${locWord ? " " + locWord : " toàn quốc"}`;

  return (
    <div>
      {/* ===== Breadcrumb ===== */}
      <nav className="text-xs text-[var(--ink-soft)] mb-2 flex flex-wrap gap-1 items-center">
        <Link href="/" className="hover:text-brand">Trang chủ</Link>
        <span>/</span>
        <Link href={`/search${f.deal ? `?deal=${f.deal}` : ""}`} className="hover:text-brand">{dealWord}</Link>
        {f.province && (<><span>/</span><button className="hover:text-brand" onClick={() => push({ ...f, district: "", ward: "" })}>{f.province}</button></>)}
        {f.district && (<><span>/</span><span className="text-[var(--ink)]">{f.district}</span></>)}
      </nav>

      {/* ===== Thanh header kết quả ===== */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div>
          <h1 className="prata text-xl md:text-2xl">{pageTitle}</h1>
          <p className="text-xs text-[var(--ink-soft)] mt-0.5">Hiện có {listings.length.toLocaleString("vi-VN")} bất động sản.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <SaveSearchButton filters={f} />
          <button className="btn text-sm" onClick={() => setShowFilter((v) => !v)}>
            {showFilter ? "Ẩn Bộ Lọc" : "Hiện Bộ Lọc"}
          </button>
          <button className="btn text-sm hidden lg:inline-block" onClick={() => setShowMap((v) => !v)}>
            {showMap ? "Ẩn Bản Đồ" : "Hiện Bản Đồ"}
          </button>
          <select
            className={`${sel} !w-auto text-sm`}
            value={sort}
            onChange={(e) => push({ ...f, sort: e.target.value })}
          >
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* ===== Bộ lọc ===== */}
      {showFilter && (
        <form
          className="card rounded-lg p-4 mb-5 shadow-sm"
          onSubmit={(e) => { e.preventDefault(); submit(); }}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <label className="block">
              <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Từ khoá</span>
              <input className="inp" value={f.q} onChange={set("q")} placeholder="Đường, dự án, khu vực..." />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Tỉnh/Thành phố</span>
              <select className={sel} value={f.province} onChange={set("province")}>
                <option value="">Chọn tỉnh/thành phố</option>
                {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            {!newAddr ? (
              <>
                <label className="block">
                  <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Quận/Huyện <span className="text-[var(--ink-faint)] font-normal">(cũ)</span></span>
                  <select className={sel} value={f.district} onChange={set("district")} disabled={!districts.length}>
                    <option value="">Chọn quận/huyện</option>
                    {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Phường/Xã</span>
                  <select className={sel} value={f.ward} onChange={set("ward")} disabled={!wards.length}>
                    <option value="">Chọn phường/xã</option>
                    {wards.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </label>
              </>
            ) : (
              <label className="block xl:col-span-2">
                <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Phường/Xã <span className="text-brand font-normal">(mới sau sáp nhập)</span></span>
                <select className={sel} value={f.ward} onChange={(e) => setF((s) => ({ ...s, district: "", ward: e.target.value }))} disabled={!allWards.length}>
                  <option value="">Chọn phường/xã mới</option>
                  {allWards.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </label>
            )}
            <label className="block">
              <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Loại bất động sản</span>
              <select className={sel} value={f.kind} onChange={set("kind")}>
                <option value="">Tất cả</option>
                {Object.entries(PROP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Bán/Cho thuê</span>
              <select className={sel} value={f.deal} onChange={set("deal")}>
                <option value="">Tất cả</option>
                <option value="ban">Bán</option>
                <option value="cho_thue">Cho thuê</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Giá từ</span>
              <select className={sel} value={f.priceMin} onChange={set("priceMin")}>
                {PRICE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Giá đến</span>
              <select className={sel} value={f.priceMax} onChange={set("priceMax")}>
                {PRICE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Diện tích tối thiểu (m²)</span>
              <input className="inp" type="number" min={0} value={f.areaMin} onChange={set("areaMin")} placeholder="VD: 50" />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Phòng ngủ</span>
              <select className={sel} value={f.bedrooms} onChange={set("bedrooms")}>
                <option value="">Tất cả</option>
                {[1, 2, 3, 4, 5].map((b) => <option key={b} value={b}>{b}+ phòng</option>)}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
            <button className="btn btn-primary px-8" type="submit">Tìm kiếm</button>
            <button className="btn" type="button" onClick={clear}>Xóa bộ lọc</button>
            <button
              type="button"
              onClick={() => { setNewAddr((v) => !v); setF((s) => ({ ...s, district: "", ward: "" })); }}
              className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-soft)] ml-auto"
            >
              <span className={`w-9 h-5 rounded-full transition relative ${newAddr ? "bg-brand" : "bg-[var(--line-strong)]"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${newAddr ? "left-[18px]" : "left-0.5"}`} />
              </span>
              Tìm theo địa chỉ mới sau sáp nhập
            </button>
          </div>
        </form>
      )}

      {/* ===== Kết quả + bản đồ ===== */}
      <div className={`grid gap-4 items-start ${showMap ? "lg:grid-cols-[1fr_420px]" : ""}`}>
        <div>
          {display.length ? (
            <>
              <div className="flex flex-col gap-3">
                {display.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((x) => <ListingRow key={x.id} x={x} />)}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-5">
                  <button className="btn !px-3 text-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
                    .map((n, i, arr) => (
                      <span key={n} className="flex items-center gap-1.5">
                        {i > 0 && arr[i - 1] !== n - 1 && <span className="text-[var(--ink-faint)]">…</span>}
                        <button
                          className={`btn !px-3.5 text-sm ${n === page ? "!bg-brand !text-white !border-brand" : ""}`}
                          onClick={() => setPage(n)}
                        >{n}</button>
                      </span>
                    ))}
                  <button className="btn !px-3 text-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
                </div>
              )}
            </>
          ) : (
            <div className="card rounded-lg p-10 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <h3 className="font-bold text-lg mb-1">Không tìm thấy bất động sản</h3>
              <p className="text-[var(--ink-soft)] text-sm mb-4">
                Hãy thử điều chỉnh bộ lọc tìm kiếm để tìm thêm bất động sản.
              </p>
              <button className="btn btn-primary" onClick={clear}>Xóa bộ lọc</button>
            </div>
          )}
        </div>
        {showMap && mapItems.length > 0 && (
          <div className="hidden lg:block sticky top-20 h-[calc(100vh-7rem)]">
            <MapResults items={mapItems} />
          </div>
        )}
      </div>

      {/* ===== Tìm kiếm phổ biến (kiểu footer SEO batdongsan) ===== */}
      {(() => {
        const prov = f.province || provinces[0];
        const ds = prov && geo[prov] ? Object.keys(geo[prov]).sort().slice(0, 12) : [];
        if (!ds.length) return null;
        return (
          <section className="mt-10 card rounded-xl p-5">
            <h2 className="font-bold text-sm mb-3">Tìm kiếm nhiều tại {prov}</h2>
            <div className="flex flex-wrap gap-2">
              {ds.map((d) => (
                <button
                  key={d}
                  onClick={() => { setF((s) => ({ ...s, province: prov, district: d, ward: "" })); push({ ...f, province: prov, district: d, ward: "" }); }}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--line)] hover:border-brand hover:text-brand transition"
                >
                  {dealWord} nhà đất {d}
                </button>
              ))}
            </div>
          </section>
        );
      })()}
    </div>
  );
}
