"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ListingCard from "@/components/ListingCard";
import MapResults, { type MapItem } from "@/components/MapResults";
import { PROP } from "@/lib/format";
import type { Listing } from "@/lib/types";

export type GeoTree = Record<string, Record<string, string[]>>;

const PRICE_OPTS: [string, string][] = [
  ["", "Tất cả"], ["500000000", "500 triệu"], ["1000000000", "1 tỷ"], ["2000000000", "2 tỷ"],
  ["3000000000", "3 tỷ"], ["5000000000", "5 tỷ"], ["10000000000", "10 tỷ"], ["20000000000", "20 tỷ"],
];
const SORTS: [string, string][] = [
  ["", "Phù hợp nhất"], ["newest", "Mới nhất"], ["price_asc", "Giá thấp đến cao"],
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

  const provinces = useMemo(() => Object.keys(geo).sort(), [geo]);
  const districts = useMemo(() => (f.province && geo[f.province] ? Object.keys(geo[f.province]).sort() : []), [geo, f.province]);
  const wards = useMemo(
    () => (f.province && f.district && geo[f.province]?.[f.district] ? geo[f.province][f.district] : []),
    [geo, f.province, f.district],
  );

  // Sort mặc định: tin có ảnh lên trước (đẹp hơn hẳn); sort giá/diện tích thì giữ nguyên thứ tự server
  const display = useMemo(() => {
    if (sort) return listings;
    const withImg = listings.filter((x) => x.images && x.images.length > 0);
    const noImg = listings.filter((x) => !x.images || x.images.length === 0);
    return [...withImg, ...noImg];
  }, [listings, sort]);

  const mapItems: MapItem[] = useMemo(
    () => listings
      .filter((x) => x.lat != null && x.lng != null)
      .map((x) => ({ id: x.id, lat: x.lat!, lng: x.lng!, label: shortPrice(x.price_vnd), title: x.title })),
    [listings],
  );

  function push(next: Record<string, string>) {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) usp.set(k, v);
    router.push("/search" + (usp.size ? "?" + usp.toString() : ""));
  }
  const submit = () => push({ ...f, sort });
  const clear = () => { setF({ q: "", deal: "", kind: "", province: "", district: "", ward: "", priceMin: "", priceMax: "", areaMin: "", bedrooms: "" }); router.push("/search"); };

  const sel = "inp appearance-none pr-8 cursor-pointer";
  const set = (k: string) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const v = e.target.value;
    setF((s) => k === "province" ? { ...s, province: v, district: "", ward: "" } : k === "district" ? { ...s, district: v, ward: "" } : { ...s, [k]: v });
  };

  return (
    <div>
      {/* ===== Thanh header kết quả ===== */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="prata text-xl md:text-2xl">
          Tìm Thấy {listings.length} Bất Động Sản
        </h1>
        <div className="ml-auto flex items-center gap-2">
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
          className="card rounded-2xl p-4 mb-5 shadow-sm"
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
            <label className="block">
              <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Quận/Huyện</span>
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
          <div className="flex gap-2 mt-4">
            <button className="btn btn-primary px-8" type="submit">Tìm kiếm</button>
            <button className="btn" type="button" onClick={clear}>Xóa bộ lọc</button>
          </div>
        </form>
      )}

      {/* ===== Kết quả + bản đồ ===== */}
      <div className={`grid gap-4 items-start ${showMap ? "lg:grid-cols-[1fr_420px]" : ""}`}>
        <div>
          {display.length ? (
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
              {display.map((x) => <ListingCard key={x.id} x={x} />)}
            </div>
          ) : (
            <div className="card rounded-2xl p-10 text-center">
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
    </div>
  );
}
