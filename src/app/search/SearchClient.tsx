"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ListingRow from "@/components/ListingRow";
import ListingCard from "@/components/ListingCard";
import { laTinDocQuyen } from "@/lib/doc-quyen";
import MapResults, { type MapItem } from "@/components/MapResults";
import SaveSearchButton from "@/components/SaveSearchButton";
import ChonSapXep from "@/components/ChonSapXep";
import { PROP, shortPrice } from "@/lib/format";
import { areaPath } from "@/lib/slug";
import { tinhCuGopVao } from "@/lib/sap-nhap";
import type { Listing } from "@/lib/types";
import PlaceSuggest, { buildPlaces, type Place } from "@/components/PlaceSuggest";
import RecentlyViewed, { RecentSearches, rememberSearch } from "@/components/RecentlyViewed";

export type GeoTree = Record<string, Record<string, string[]>>;

const PRICE_OPTS: [string, string][] = [
  ["", "Tất cả"], ["500000000", "500 triệu"], ["1000000000", "1 tỷ"], ["2000000000", "2 tỷ"],
  ["3000000000", "3 tỷ"], ["5000000000", "5 tỷ"], ["10000000000", "10 tỷ"], ["20000000000", "20 tỷ"],
];
// Giá THUÊ tính theo triệu/tháng - dùng chung thang tỷ của mua bán thì "Dưới 500 triệu" chọn ra
// toàn bộ tin thuê (vô nghĩa). Mốc theo thực tế: 3-5tr trọ, 10-20tr nhà nguyên căn/căn hộ,
// 50-100tr mặt bằng kinh doanh.
const RENT_OPTS: [string, string][] = [
  ["", "Tất cả"], ["3000000", "3 triệu/tháng"], ["5000000", "5 triệu/tháng"], ["10000000", "10 triệu/tháng"],
  ["15000000", "15 triệu/tháng"], ["20000000", "20 triệu/tháng"], ["50000000", "50 triệu/tháng"], ["100000000", "100 triệu/tháng"],
];
// deal rỗng (xem lẫn cả bán + thuê) thì giữ thang tỷ - đó là thang của phần tin áp đảo
const bangGia = (deal: string) => (deal === "cho_thue" ? RENT_OPTS : PRICE_OPTS);
const SORTS: [string, string][] = [
  ["", "Mới nhất"], ["score", "Điểm tin cao xếp trước"],
  ["price_asc", "Giá thấp đến cao"], ["price_desc", "Giá cao đến thấp"],
  ["ppm2_asc", "Giá/m² thấp đến cao"], ["ppm2_desc", "Giá/m² cao đến thấp"],
  ["area_asc", "Diện tích nhỏ đến lớn"], ["area_desc", "Diện tích lớn đến nhỏ"],
];
const AREA_OPTS: [string, string][] = [
  ["", "Diện tích"], ["30", "≥ 30 m²"], ["50", "≥ 50 m²"], ["80", "≥ 80 m²"], ["100", "≥ 100 m²"], ["150", "≥ 150 m²"],
];


export default function SearchClient({
  listings, geo, params, newToday = 0, total,
}: {
  listings: Listing[];
  geo: GeoTree;
  params: Record<string, string | undefined>;
  newToday?: number; // số tin Radar thấy lần đầu từ 0h hôm nay (cùng bộ lọc)
  total?: number;    // tổng thật theo bộ lọc (danh sách chỉ tải 200)
}) {
  const router = useRouter();
  const [showFilter, setShowFilter] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(Boolean(params.legal || params.direction || params.areaMin || params.bedrooms)); // NN/g #7: nâng cao mở sẵn nếu đang dùng
  const [showMap, setShowMap] = useState(false);
  const [f, setF] = useState({
    q: params.q || "", deal: params.deal || "", kind: params.kind || "",
    province: params.province || "", district: params.district || "", ward: params.ward || "",
    priceMin: params.priceMin || "", priceMax: params.priceMax || "",
    areaMin: params.areaMin || "", bedrooms: params.bedrooms || "",
    legal: params.legal || "", direction: params.direction || "",   // bộ lọc nâng cao (môi giới / nhà đầu tư)
  });
  const places = useMemo(() => buildPlaces(geo), [geo]);
  const pickPlace = (p: Place) => {
    const next = { ...f, q: "", province: p.province, district: p.district || "", ward: p.ward || "" };
    setF(next); push(next);
  };
  const sort = params.sort || "";
  // Công tắc "địa chỉ mới sau sáp nhập" (kiểu batdongsan): BẬT = duyệt Tỉnh -> Phường mới
  // (hệ 2 cấp, bỏ quận); TẮT = duyệt theo quận cũ như thói quen thị trường.
  const [newAddr, setNewAddr] = useState(params.newAddr === "1");
  const own = params.own === "1"; // chỉ tin chính chủ tự đăng
  // Bộ lọc ĐÃ ÁP (đúng theo URL = đúng theo kết quả đang hiển thị). Chip/toggle/sort và nút
  // 🔔 phải xuất phát từ đây chứ KHÔNG phải từ f: f còn chứa những gì đang chọn dở trong
  // panel chưa bấm "Tìm kiếm" - bản cũ đổi sắp xếp là âm thầm áp luôn bộ lọc gõ dở, và
  // popup 🔔 mô tả một bộ lọc khác với kết quả trên màn hình.
  const goc = {
    q: params.q || "", deal: params.deal || "", kind: params.kind || "",
    province: params.province || "", district: params.district || "", ward: params.ward || "",
    priceMin: params.priceMin || "", priceMax: params.priceMax || "",
    areaMin: params.areaMin || "", bedrooms: params.bedrooms || "",
    legal: params.legal || "", direction: params.direction || "",
  };
  // Tỉnh cũ được gộp thêm vào kết quả khi bật "Địa chỉ mới sau sáp nhập" (xem lib/sap-nhap)
  const gomThem = useMemo(() => (f.province ? tinhCuGopVao(f.province) : []), [f.province]);

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

  // Tin ĐỘC QUYỀN (FB + Zalo, xem lib/doc-quyen) tách lên DẢI RIÊNG đầu kết quả, thẻ to hơn
  // (21/8): nguồn không trang nào khác có = hàng bán được, cho đứng vị trí đẹp nhất.
  // Lấy tối đa 6 tin đầu theo thứ tự đang sắp; phần độc quyền còn lại nằm chung danh sách.
  const docQuyen = useMemo(() => display.filter((x) => laTinDocQuyen(x)).slice(0, 6), [display]);
  const conLai = useMemo(() => {
    const idsTrenDai = new Set(docQuyen.map((x) => x.id));
    return display.filter((x) => !idsTrenDai.has(x.id));
  }, [display, docQuyen]);

  // Phân trang kiểu batdongsan: 20 tin/trang, đổi lọc thì về trang 1 (dải độc quyền đứng
  // ngoài phân trang - luôn hiện ở mọi trang)
  const PER_PAGE = 20;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(conLai.length / PER_PAGE);
  useEffect(() => { setPage(1); }, [listings]);
  useEffect(() => { if (page > 1) window.scrollTo({ top: 0, behavior: "smooth" }); }, [page]);

  const mapItems: MapItem[] = useMemo(
    () => listings
      .filter((x) => x.lat != null && x.lng != null)
      .map((x) => ({ id: x.id, lat: x.lat!, lng: x.lng!, label: shortPrice(x.price_vnd), title: x.title })),
    [listings],
  );

  function push(next: Record<string, string>) {
    // Chưa chọn Bán/Thuê thì UI khoảng giá đang hiển thị thang TỶ (bán) nhưng truy vấn lại
    // gộp cả hai loại -> "Dưới 500 triệu" kéo nguyên kho tin thuê 3-100tr/tháng vào kết quả.
    // Lọc giá ở trạng thái đó nghĩa là đang tìm MUA -> ép deal=ban cho khớp thang đã hiện.
    if ((next.priceMin || next.priceMax) && !next.deal) next = { ...next, deal: "ban" };
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) usp.set(k, v);
    if (newAddr && !("newAddr" in next)) usp.set("newAddr", "1");
    if (own && !("own" in next)) usp.set("own", "1");
    if (sort && !("sort" in next)) usp.set("sort", sort); // chip/toggle không làm mất sort đang chọn
    const href = "/search" + (usp.size ? "?" + usp.toString() : "");
    // NN/g #6: nhớ tìm kiếm gần đây (nhãn ngắn dễ nhận ra)
    const label = [next.deal === "cho_thue" ? "Thuê" : next.deal === "ban" ? "Mua" : "", next.kind ? (PROP as Record<string, string>)[next.kind] : "", next.ward || next.district || next.province || next.q || "toàn quốc", next.priceMax ? "≤" + shortPrice(Number(next.priceMax)) : ""].filter(Boolean).join(" · ");
    if (usp.size) rememberSearch(label, href);
    router.push(href);
  }
  const submit = () => push({ ...f, sort });
  const clear = () => { setNewAddr(false); setF({ q: "", deal: "", kind: "", province: "", district: "", ward: "", priceMin: "", priceMax: "", areaMin: "", bedrooms: "", legal: "", direction: "" }); router.push("/search"); };

  const sel = "inp appearance-none pr-8 cursor-pointer";
  const set = (k: string) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const v = e.target.value;
    // Đổi Bán <-> Cho thuê thì XOÁ mức giá đã chọn: hai chế độ dùng hai thang khác nhau
    // (tỷ vs triệu/tháng) - giữ "dưới 20 tỷ" khi sang thuê là bộ lọc vô nghĩa, ngược lại
    // "dưới 10 triệu" khi sang mua bán thì ra 0 tin mà người dùng không hiểu vì sao.
    setF((s) => k === "province" ? { ...s, province: v, district: "", ward: "" } : k === "district" ? { ...s, district: v, ward: "" } : k === "deal" ? { ...s, deal: v, priceMin: "", priceMax: "" } : { ...s, [k]: v });
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
          <p className="text-xs text-[var(--ink-soft)] mt-0.5">
            {newToday > 0 ? <><b className="text-emerald-600">{newToday.toLocaleString("vi-VN")} tin mới hôm nay</b> · </> : null}
            Hiện có <b>{(total ?? listings.length).toLocaleString("vi-VN")}</b> bất động sản{(total ?? 0) > listings.length ? ` (đang hiển thị ${listings.length} tin mới nhất - thu hẹp bộ lọc để xem đúng phần bạn cần)` : ""}.
          </p>
          {/* Nói rõ vì sao lọc "Hồ Chí Minh" lại ra tin ghi Bình Dương - không thì khách tưởng lọc sai */}
          {newAddr && gomThem.length > 0 && (
            <p className="text-xs text-[var(--ink-soft)] mt-1">
              Theo địa giới 2025, kết quả gồm cả tin còn ghi <b>{gomThem.join(", ")}</b> (đã sáp nhập vào {f.province}).
            </p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <SaveSearchButton filters={goc} />
          {/* dropdown tự vẽ thay <select> trần: list option của select do HĐH vẽ, không ăn CSS web */}
          <ChonSapXep options={SORTS} value={sort} onChange={(v) => push({ ...goc, sort: v })} />
        </div>
      </div>

      {/* ===== Thanh tìm 1 dòng + Xem bản đồ (kiểu batdongsan) ===== */}
      <div className="flex gap-2 mb-2">
        <form
          className="flex flex-1 card rounded-lg overflow-visible relative"
          onSubmit={(e) => { e.preventDefault(); submit(); }}
        >
          <input
            className="flex-1 px-4 py-2.5 bg-transparent outline-none text-sm min-w-0 rounded-l-lg"
            value={f.q}
            onChange={set("q")}
            placeholder="Gõ quận/phường (VD: Q7, Bình Thạnh), đường, dự án…"
            autoComplete="off"
          />
          {/* NN/g #5: gợi ý địa danh thật, nhận cả viết tắt Q7 -> Quận 7 */}
          <PlaceSuggest value={f.q} places={places} onPick={pickPlace} />
          <button className="bg-brand text-white font-semibold text-sm px-4 sm:px-6 hover:bg-brand-ink transition whitespace-nowrap rounded-r-lg" type="submit" aria-label="Tìm kiếm">
            <span className="sm:hidden">🔍</span><span className="hidden sm:inline">Tìm kiếm</span>
          </button>
        </form>
        {/* Bản đồ chỉ render ở lg+ (MapResults hidden lg:block) -> ẩn nút ở màn nhỏ, tránh nút bấm không có tác dụng (UX audit) */}
        <button
          className={`hidden lg:inline-flex btn text-sm font-semibold whitespace-nowrap ${showMap ? "!bg-[var(--accent)] !border-[var(--accent)] !text-white" : "!text-[var(--accent)] !border-[var(--accent)]"}`}
          aria-pressed={showMap}
          onClick={() => setShowMap((v) => !v)}
        >
          {showMap ? "Đóng bản đồ" : "Xem bản đồ"}
        </button>
      </div>

      <RecentSearches />

      {/* ===== Hàng chip lọc nhanh (cấp CƠ BẢN - người tìm nhà vãng lai) ===== */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
        <button
          className={`btn text-sm ${showFilter ? "!border-brand !text-brand" : ""}`}
          aria-expanded={showFilter}
          onClick={() => setShowFilter((v) => !v)}
        >
          Lọc{(() => { const n = [f.province, f.district, f.ward, f.kind, f.priceMin, f.priceMax, f.areaMin, f.bedrooms, f.legal, f.direction].filter(Boolean).length; return n ? ` (${n})` : ""; })()}
        </button>
        {/* chip xuất phát từ goc (bộ đã áp), không phải f (còn lẫn lựa chọn gõ dở trong panel) */}
        <select className={`${sel} !w-auto`} value={goc.kind}
          onChange={(e) => push({ ...goc, kind: e.target.value })}>
          <option value="">Loại nhà đất</option>
          {Object.entries(PROP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={`${sel} !w-auto`} value={goc.priceMax}
          onChange={(e) => push({ ...goc, priceMax: e.target.value })}>
          <option value="">Khoảng giá</option>
          {bangGia(goc.deal).slice(1).map(([v, l]) => <option key={v} value={v}>Dưới {l}</option>)}
          {/* giá đang áp không nằm trong mốc (gõ tay ở ô nâng cao) -> vẫn phải hiện, không thì chip trống như chưa lọc */}
          {goc.priceMax && !bangGia(goc.deal).some(([v]) => v === goc.priceMax) && (
            <option value={goc.priceMax}>Dưới {shortPrice(Number(goc.priceMax))}</option>
          )}
        </select>
        <select className={`${sel} !w-auto`} value={goc.areaMin}
          onChange={(e) => push({ ...goc, areaMin: e.target.value })}>
          {AREA_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          {/* diện tích gõ tay (VD 75) không có trong mốc -> thêm option động cho chip khỏi trống */}
          {goc.areaMin && !AREA_OPTS.some(([v]) => v === goc.areaMin) && (
            <option value={goc.areaMin}>≥ {goc.areaMin} m²</option>
          )}
        </select>
        <button
          role="switch" aria-checked={!!own}
          className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-soft)]"
          onClick={() => push({ ...goc, own: own ? "" : "1" } as Record<string, string>)}
        >
          <span className={`w-9 h-5 rounded-full transition relative ${own ? "bg-emerald-500" : "bg-[var(--line-strong)]"}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${own ? "left-[18px]" : "left-0.5"}`} />
          </span>
          Tin chính chủ tự đăng
        </button>
        <button
          role="switch" aria-checked={!!newAddr}
          className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-soft)]"
          onClick={() => push({ ...goc, district: "", ward: "", newAddr: newAddr ? "" : "1" })}
          title="Bật: duyệt theo Tỉnh → Phường (hệ 2 cấp) và lọc theo địa giới 2025 - chọn Hồ Chí Minh sẽ gồm cả tin còn ghi Bình Dương / Bà Rịa - Vũng Tàu."
        >
          <span className={`w-9 h-5 rounded-full transition relative ${newAddr ? "bg-brand" : "bg-[var(--line-strong)]"}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${newAddr ? "left-[18px]" : "left-0.5"}`} />
          </span>
          Địa chỉ mới sau sáp nhập
        </button>
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
                {bangGia(f.deal).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Giá đến</span>
              <select className={sel} value={f.priceMax} onChange={set("priceMax")}>
                {bangGia(f.deal).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          {/* NN/g #7: cấp NÂNG CAO - môi giới / nhà đầu tư (diện tích, PN, hướng, pháp lý) ẩn mặc định để người vãng lai không rối */}
          <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="mt-3 text-sm font-semibold text-brand flex items-center gap-1">
            {showAdvanced ? "▾" : "▸"} Bộ lọc nâng cao <span className="text-xs font-normal text-[var(--ink-soft)]">(diện tích, phòng ngủ, hướng, pháp lý)</span>
          </button>
          {showAdvanced && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-3 pt-3 border-t border-[var(--line)]">
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
              <label className="block">
                <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Hướng</span>
                <select className={sel} value={f.direction} onChange={set("direction")}>
                  <option value="">Tất cả</option>
                  {["Đông", "Tây", "Nam", "Bắc", "Đông Nam", "Đông Bắc", "Tây Nam", "Tây Bắc"].map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Pháp lý</span>
                <select className={sel} value={f.legal} onChange={set("legal")}>
                  <option value="">Tất cả</option>
                  <option value="sổ">Đã có sổ (hồng/đỏ)</option>
                  <option value="hợp đồng">Hợp đồng mua bán</option>
                  <option value="thổ cư">Thổ cư</option>
                </select>
              </label>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
            <button className="btn btn-primary px-8" type="submit">Tìm kiếm</button>
            <button className="btn" type="button" onClick={clear}>Xóa bộ lọc</button>
          </div>
        </form>
      )}

      {/* ===== Kết quả + bản đồ ===== */}
      <div className={`grid gap-4 items-start ${showMap && mapItems.length > 0 ? "lg:grid-cols-[1fr_420px]" : ""}`}>
        {/* min-w-0 BẮT BUỘC: mô tả trong ListingRow dùng line-clamp (-webkit-box) -> bề rộng nội tại = cả đoạn text
            chưa xuống dòng -> cột 1fr phình (đo được 2190px ở viewport 1400) đẩy cột bản đồ 420px ra NGOÀI màn hình.
            Sự cố 17/8: "Xem bản đồ" bấm không thấy gì. */}
        <div className="min-w-0">
          {display.length ? (
            <>
              {docQuyen.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-baseline gap-2 mb-2">
                    <h2 className="font-bold">⭐ Tin độc quyền Radar</h2>
                    <span className="text-xs text-[var(--ink-soft)]">không có trên các trang BĐS khác · liên hệ qua Radar</span>
                  </div>
                  <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
                    {docQuyen.map((x) => (
                      <div key={x.id} className="relative">
                        <span className="absolute top-2 left-2 z-10 text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-brand text-white shadow">⭐ Độc quyền</span>
                        <ListingCard x={x} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-3">
                {conLai.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((x) => <ListingRow key={x.id} x={x} />)}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-5">
                  <button className="btn !px-3 text-sm" disabled={page <= 1} aria-label="Trang trước" onClick={() => setPage((p) => p - 1)}>‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
                    .map((n, i, arr) => (
                      <span key={n} className="flex items-center gap-1.5">
                        {i > 0 && arr[i - 1] !== n - 1 && <span className="text-[var(--ink-faint)]">…</span>}
                        <button
                          className={`btn !px-3.5 text-sm ${n === page ? "!bg-brand !text-white !border-brand" : ""}`}
                          aria-label={`Trang ${n}`} aria-current={n === page ? "page" : undefined}
                          onClick={() => setPage(n)}
                        >{n}</button>
                      </span>
                    ))}
                  <button className="btn !px-3 text-sm" disabled={page >= totalPages} aria-label="Trang sau" onClick={() => setPage((p) => p + 1)}>›</button>
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

      {/* NN/g #6: tin đã xem gần đây (localStorage) */}
      <RecentlyViewed />

      {/* ===== Tìm kiếm phổ biến (kiểu footer SEO batdongsan) ===== */}
      {(() => {
        // Chưa chọn tỉnh -> lấy tỉnh NHIỀU TIN NHẤT trong kết quả (trước lấy provinces[0] = sort() ->
        // luôn ra "Bà Rịa - Vũng Tàu" chỉ vì đứng đầu bảng chữ cái, 17/8)
        const topProv = (() => {
          const c = new Map<string, number>();
          for (const x of listings) if (x.province) c.set(x.province, (c.get(x.province) || 0) + 1);
          return [...c.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        })();
        const prov = f.province || topProv || (geo["Hồ Chí Minh"] ? "Hồ Chí Minh" : provinces[0]);
        const ds = prov && geo[prov] ? Object.keys(geo[prov]).sort().slice(0, 12) : [];
        if (!ds.length) return null;
        return (
          <section className="mt-10 card rounded-xl p-5">
            <h2 className="font-bold text-sm mb-3">Tìm kiếm nhiều tại {prov}</h2>
            <div className="flex flex-wrap gap-2">
              {/* Link thật (bot crawl được) tới trang SEO khu vực /nha-dat-ban/[tinh]/[quan] */}
              {ds.map((d) => (
                <Link
                  key={d}
                  href={areaPath(f.deal === "cho_thue" ? "cho_thue" : "ban", prov, d)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--line)] hover:border-brand hover:text-brand transition"
                >
                  {dealWord} nhà đất {d}
                </Link>
              ))}
              <Link href={areaPath(f.deal === "cho_thue" ? "cho_thue" : "ban", prov)} className="text-xs px-2.5 py-1.5 rounded-lg border border-brand text-brand font-semibold">
                Toàn {prov} ›
              </Link>
            </div>
          </section>
        );
      })()}
    </div>
  );
}
