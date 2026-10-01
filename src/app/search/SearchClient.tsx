"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ListingRow from "@/components/ListingRow";
import DaiDocQuyen, { locDocQuyen } from "@/components/DaiDocQuyen";
import MapResults, { type MapItem } from "@/components/MapResults";
import SaveSearchButton from "@/components/SaveSearchButton";
import ChonSapXep from "@/components/ChonSapXep";
import ChipLoc from "@/components/ChipLoc";
import { PROP, shortPrice } from "@/lib/format";
import { areaPath } from "@/lib/slug";
import { tinhCuGopVao } from "@/lib/sap-nhap";
import type { Listing } from "@/lib/types";
import PlaceSuggest, { buildPlaces, type Place } from "@/components/PlaceSuggest";
import RecentlyViewed, { RecentSearches, rememberSearch } from "@/components/RecentlyViewed";
import { ChipQuan, SidebarKhuVuc, type DieuHuong } from "@/components/DieuHuongKhuVuc";

export type { DieuHuong };

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
// Hàng chip lọc nhanh (1/10, kiểu EvoHome): chọn theo KHOẢNG "min-max" (1 đầu rỗng = dưới/trên),
// thay cho "Dưới X" / "≥ X" - người tìm nhà nghĩ theo khoảng ("7 - 8 triệu", "20 - 30m²").
const KHOANG_GIA_THUE: [string, string][] = [
  ["", "Mọi mức giá"], ["-3000000", "Dưới 3 triệu"], ["3000000-5000000", "3 - 5 triệu"], ["5000000-7000000", "5 - 7 triệu"],
  ["7000000-10000000", "7 - 10 triệu"], ["10000000-15000000", "10 - 15 triệu"], ["15000000-20000000", "15 - 20 triệu"],
  ["20000000-50000000", "20 - 50 triệu"], ["50000000-", "Trên 50 triệu"],
];
const KHOANG_GIA_BAN: [string, string][] = [
  ["", "Mọi mức giá"], ["-1000000000", "Dưới 1 tỷ"], ["1000000000-2000000000", "1 - 2 tỷ"], ["2000000000-3000000000", "2 - 3 tỷ"],
  ["3000000000-5000000000", "3 - 5 tỷ"], ["5000000000-10000000000", "5 - 10 tỷ"], ["10000000000-20000000000", "10 - 20 tỷ"],
  ["20000000000-", "Trên 20 tỷ"],
];
const KHOANG_DT: [string, string][] = [
  ["", "Mọi diện tích"], ["-20", "Dưới 20m²"], ["20-30", "20 - 30m²"], ["30-50", "30 - 50m²"], ["50-70", "50 - 70m²"],
  ["70-100", "70 - 100m²"], ["100-150", "100 - 150m²"], ["150-", "Trên 150m²"],
];
const DEAL_OPTS: [string, string][] = [["", "Mua & thuê"], ["ban", "Mua bán"], ["cho_thue", "Cho thuê"]];
/** nhãn chip cho khoảng đang áp (kể cả khoảng gõ tay không nằm trong mốc) */
function nhanKhoang(min: string, max: string, fmt: (n: number) => string) {
  if (min && max) return `${fmt(Number(min))} - ${fmt(Number(max))}`;
  if (max) return `Dưới ${fmt(Number(max))}`;
  if (min) return `Trên ${fmt(Number(min))}`;
  return "";
}


export default function SearchClient({
  listings, geo, params, newToday = 0, total, dieuHuong = null,
}: {
  listings: Listing[];
  geo: GeoTree;
  params: Record<string, string | undefined>;
  newToday?: number; // số tin Radar thấy lần đầu từ 0h hôm nay (cùng bộ lọc)
  total?: number;    // tổng thật theo bộ lọc (danh sách chỉ tải 200)
  dieuHuong?: DieuHuong | null; // loại + quận kèm số tin của 1 tỉnh (server tính, xem search/page.tsx)
}) {
  const router = useRouter();
  const [showFilter, setShowFilter] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(Boolean(params.legal || params.direction || params.areaMin || params.areaMax || params.bedrooms)); // NN/g #7: nâng cao mở sẵn nếu đang dùng
  const [showMap, setShowMap] = useState(false);
  const [f, setF] = useState({
    q: params.q || "", deal: params.deal || "", kind: params.kind || "",
    province: params.province || "", district: params.district || "", ward: params.ward || "",
    priceMin: params.priceMin || "", priceMax: params.priceMax || "",
    areaMin: params.areaMin || "", areaMax: params.areaMax || "", bedrooms: params.bedrooms || "",
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
    areaMin: params.areaMin || "", areaMax: params.areaMax || "", bedrooms: params.bedrooms || "",
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
  // locDocQuyen ưu tiên tin ZALO trước FB - lý do "lúc thấy lúc không" trước đây là FB đông
  // hơn chiếm hết 6 slot. Phần độc quyền còn lại nằm chung danh sách.
  const docQuyen = useMemo(() => locDocQuyen(display, 6), [display]);
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

  // Bảng lọc trên điện thoại mở toàn màn hình -> khoá cuộn trang nền (sm+ là khối thường, không khoá)
  useEffect(() => {
    if (!showFilter || window.matchMedia("(min-width: 640px)").matches) return;
    const cu = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = cu; };
  }, [showFilter]);
  // số bộ lọc ĐANG ÁP (theo URL) - badge "Lọc (n)"
  // khoảng giá / diện tích tính 1 bộ lọc dù có cả 2 đầu
  const soLoc = [goc.province, goc.district, goc.ward, goc.kind, goc.priceMin || goc.priceMax, goc.areaMin || goc.areaMax, goc.bedrooms, goc.legal, goc.direction, own ? "1" : ""].filter(Boolean).length;
  const khoangGia = goc.deal === "cho_thue" ? KHOANG_GIA_THUE : KHOANG_GIA_BAN;
  const giaDangAp = goc.priceMin || goc.priceMax ? `${goc.priceMin}-${goc.priceMax}` : "";
  const dtDangAp = goc.areaMin || goc.areaMax ? `${goc.areaMin}-${goc.areaMax}` : "";
  const nhanGia = nhanKhoang(goc.priceMin, goc.priceMax, shortPrice);
  const nhanDt = nhanKhoang(goc.areaMin, goc.areaMax, (n) => `${n}m²`);
  // "a-b" -> {min, max}; chuỗi rỗng = bỏ lọc
  const tachKhoang = (v: string) => { const [a = "", b = ""] = v.split("-"); return [a, b]; };

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
  const clear = () => { setNewAddr(false); setF({ q: "", deal: "", kind: "", province: "", district: "", ward: "", priceMin: "", priceMax: "", areaMin: "", areaMax: "", bedrooms: "", legal: "", direction: "" }); router.push("/search"); };

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
          <p className="sm:hidden text-xs text-[var(--ink-soft)] mt-0.5 tabular-nums">
            <b>{(total ?? listings.length).toLocaleString("vi-VN")}</b> tin
            {newToday > 0 ? <> · <b className="text-emerald-600">{newToday.toLocaleString("vi-VN")} mới hôm nay</b></> : null}
          </p>
          <p className="hidden sm:block text-xs text-[var(--ink-soft)] mt-0.5">
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
        <div className="ml-auto hidden sm:flex items-center gap-2">
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

      {/* Điện thoại (29/9, kiểu Mogi): 1 hàng Lọc (n) · Sắp xếp · 🔔 - chip loại/giá/DT + 2 công tắc
          chuyển vào bảng lọc, trước đây chiếm nửa màn đầu trước khi thấy tin nào */}
      <div className="sm:hidden flex items-center gap-2 mb-3">
        <button
          className={`btn text-sm font-semibold ${soLoc ? "!border-brand !text-brand" : ""}`}
          aria-expanded={showFilter}
          onClick={() => setShowFilter(true)}
        >
          ⚙ Lọc{soLoc ? ` (${soLoc})` : ""}
        </button>
        <ChonSapXep options={SORTS} value={sort} onChange={(v) => push({ ...goc, sort: v })} />
        <span className="ml-auto"><SaveSearchButton filters={goc} compact /></span>
      </div>

      <RecentSearches />

      {/* ===== Hàng chip lọc nhanh (cấp CƠ BẢN - người tìm nhà vãng lai) ===== */}
      <div className="hidden sm:flex flex-wrap items-center gap-2 mb-4 text-sm">
        {/* 1/10 kiểu EvoHome: chip xổ xuống có ✓ + badge, khoảng đang áp hiện thành nhãn có ✕ để gỡ nhanh.
            chip xuất phát từ goc (bộ đã áp), không phải f (còn lẫn lựa chọn gõ dở trong panel) */}
        <ChipLoc label="Mua & thuê" options={DEAL_OPTS} value={goc.deal}
          onChange={(v) => push({ ...goc, deal: v, priceMin: "", priceMax: "" })} />
        <ChipLoc label="Loại nhà đất" options={[["", "Tất cả loại"], ...Object.entries(PROP)]} value={goc.kind}
          onChange={(v) => push({ ...goc, kind: v })} />
        <ChipLoc label="Diện tích" badge
          options={dtDangAp && !KHOANG_DT.some(([v]) => v === dtDangAp) ? [...KHOANG_DT, [dtDangAp, nhanDt]] : KHOANG_DT}
          value={dtDangAp}
          onChange={(v) => { const [a, b] = tachKhoang(v); push({ ...goc, areaMin: a, areaMax: b }); }} />
        <ChipLoc label={goc.deal === "cho_thue" ? "Giá thuê" : "Khoảng giá"} badge
          options={giaDangAp && !khoangGia.some(([v]) => v === giaDangAp) ? [...khoangGia, [giaDangAp, nhanGia]] : khoangGia}
          value={giaDangAp}
          onChange={(v) => { const [a, b] = tachKhoang(v); push({ ...goc, priceMin: a, priceMax: b }); }} />
        {(nhanDt || nhanGia) && (
          <span className="flex items-center gap-1.5 text-xs text-[var(--ink-soft)]">
            {[[nhanDt, { areaMin: "", areaMax: "" }], [nhanGia, { priceMin: "", priceMax: "" }]].filter(([n]) => n).map(([n, bo]) => (
              <button key={n as string} type="button" title="Bỏ lọc này"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand/10 text-brand font-semibold hover:bg-brand/20"
                onClick={() => push({ ...goc, ...(bo as Record<string, string>) })}>
                {n as string} <span aria-hidden>✕</span>
              </button>
            ))}
          </span>
        )}
        <button
          className={`h-10 px-4 rounded-lg border text-sm font-semibold flex items-center gap-2 transition
            ${showFilter || soLoc ? "border-brand text-brand bg-brand/5" : "border-[var(--line-strong)] bg-[var(--surface)] hover:border-brand"}`}
          aria-expanded={showFilter}
          onClick={() => setShowFilter((v) => !v)}
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M3 6h9M15 6h2M3 14h2M8 14h9" strokeLinecap="round" /><circle cx="13.5" cy="6" r="1.8" /><circle cx="6.5" cy="14" r="1.8" />
          </svg>
          Bộ lọc
          {soLoc > 0 && <span className="grid place-items-center w-5 h-5 rounded-full bg-brand text-white text-[0.7rem] font-bold">{soLoc}</span>}
        </button>
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

      {dieuHuong && !newAddr && (
        <ChipQuan dh={dieuHuong} district={goc.district}
          onPick={(d) => push({ ...goc, province: dieuHuong.province, district: d, ward: "" })} />
      )}

      {/* ===== Bộ lọc ===== */}
      {showFilter && (
        <form
          className="card p-4 shadow-sm fixed inset-0 z-[60] overflow-y-auto rounded-none pb-28
            sm:static sm:inset-auto sm:z-auto sm:overflow-visible sm:rounded-lg sm:mb-5 sm:pb-4"
          onSubmit={(e) => { e.preventDefault(); submit(); }}
        >
          {/* Điện thoại: bảng lọc toàn màn hình - tiêu đề + nút đóng + 2 công tắc (sm+ ở hàng chip) */}
          <div className="sm:hidden flex items-center mb-4">
            <h2 className="font-bold text-lg">Bộ lọc</h2>
            <button type="button" className="ml-auto w-10 h-10 grid place-items-center text-xl" aria-label="Đóng bộ lọc" onClick={() => setShowFilter(false)}>✕</button>
          </div>
          <div className="sm:hidden flex flex-col gap-3 mb-4 pb-4 border-b border-[var(--line)]">
            <button
              type="button" role="switch" aria-checked={!!own}
              className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-soft)]"
              onClick={() => push({ ...goc, own: own ? "" : "1" } as Record<string, string>)}
            >
              <span className={`w-9 h-5 rounded-full transition relative shrink-0 ${own ? "bg-emerald-500" : "bg-[var(--line-strong)]"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${own ? "left-[18px]" : "left-0.5"}`} />
              </span>
              Tin chính chủ tự đăng
            </button>
            <button
              type="button" role="switch" aria-checked={!!newAddr}
              className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-soft)]"
              onClick={() => push({ ...goc, district: "", ward: "", newAddr: newAddr ? "" : "1" })}
            >
              <span className={`w-9 h-5 rounded-full transition relative shrink-0 ${newAddr ? "bg-brand" : "bg-[var(--line-strong)]"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${newAddr ? "left-[18px]" : "left-0.5"}`} />
              </span>
              Địa chỉ mới sau sáp nhập
            </button>
          </div>
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
                {f.priceMin && !bangGia(f.deal).some(([v]) => v === f.priceMin) && <option value={f.priceMin}>{shortPrice(Number(f.priceMin))}</option>}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Giá đến</span>
              <select className={sel} value={f.priceMax} onChange={set("priceMax")}>
                {bangGia(f.deal).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                {f.priceMax && !bangGia(f.deal).some(([v]) => v === f.priceMax) && <option value={f.priceMax}>{shortPrice(Number(f.priceMax))}</option>}
              </select>
            </label>
          </div>
          {/* NN/g #7: cấp NÂNG CAO - môi giới / nhà đầu tư (diện tích, PN, hướng, pháp lý) ẩn mặc định để người vãng lai không rối */}
          <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="mt-3 text-sm font-semibold text-brand flex items-center gap-1">
            {showAdvanced ? "▾" : "▸"} Bộ lọc nâng cao <span className="text-xs font-normal text-[var(--ink-soft)]">(diện tích, phòng ngủ, hướng, pháp lý)</span>
          </button>
          {showAdvanced && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mt-3 pt-3 border-t border-[var(--line)]">
              <label className="block">
                <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Diện tích tối thiểu (m²)</span>
                <input className="inp" type="number" min={0} value={f.areaMin} onChange={set("areaMin")} placeholder="VD: 50" />
              </label>
              <label className="block">
                <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Diện tích tối đa (m²)</span>
                <input className="inp" type="number" min={0} value={f.areaMax} onChange={set("areaMax")} placeholder="VD: 100" />
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
          <div className="fixed bottom-0 inset-x-0 z-[61] flex gap-3 p-4 border-t border-[var(--line)] bg-[var(--surface)]
            sm:static sm:z-auto sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2 sm:p-0 sm:mt-4 sm:border-0 sm:bg-transparent">
            <button className="btn sm:order-2" type="button" onClick={clear}>Xóa bộ lọc</button>
            <button className="btn btn-primary flex-1 sm:flex-none px-8 sm:order-1" type="submit">
              <span className="sm:hidden">Xem kết quả</span><span className="hidden sm:inline">Tìm kiếm</span>
            </button>
          </div>
        </form>
      )}

      {/* ===== Kết quả + bản đồ ===== */}
      {/* cột phải lg+: bản đồ khi bật "Xem bản đồ", còn lại là sidebar Loại/Quận kèm số tin (kiểu Mogi, 29/9) */}
      <div className={`grid gap-4 items-start ${showMap && mapItems.length > 0 ? "lg:grid-cols-[1fr_420px]" : dieuHuong ? "lg:grid-cols-[minmax(0,1fr)_280px]" : ""}`}>
        {/* min-w-0 BẮT BUỘC: mô tả trong ListingRow dùng line-clamp (-webkit-box) -> bề rộng nội tại = cả đoạn text
            chưa xuống dòng -> cột 1fr phình (đo được 2190px ở viewport 1400) đẩy cột bản đồ 420px ra NGOÀI màn hình.
            Sự cố 17/8: "Xem bản đồ" bấm không thấy gì. */}
        <div className="min-w-0">
          {display.length ? (
            <>
              <DaiDocQuyen listings={display} />
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
        {showMap && mapItems.length > 0 ? (
          <div className="hidden lg:block sticky top-20 h-[calc(100vh-7rem)]">
            <MapResults items={mapItems} />
          </div>
        ) : dieuHuong ? (
          <SidebarKhuVuc dh={dieuHuong} dealWord={dealWord} kind={goc.kind} district={goc.district} anQuan={newAddr}
            onKind={(k) => push({ ...goc, kind: k })}
            onDistrict={(d) => push({ ...goc, province: dieuHuong.province, district: d, ward: "" })} />
        ) : null}
      </div>

      {/* NN/g #6: tin đã xem gần đây (localStorage) */}
      <RecentlyViewed />

      {/* ===== Tìm kiếm phổ biến (kiểu footer SEO batdongsan) =====
          Link thật (bot crawl được) tới trang khu vực /nha-dat-ban/[tinh]/[quan]. 29/9: xếp theo SỐ TIN
          kèm số đếm (trước: 12 quận đầu bảng chữ cái, không số) - dùng chung dữ liệu với sidebar. */}
      {dieuHuong && dieuHuong.districts.length > 0 && (
        <section className="mt-10 card rounded-xl p-5">
          <h2 className="font-bold text-sm mb-3">Tìm kiếm nhiều tại {dieuHuong.province}</h2>
          <div className="flex flex-wrap gap-2">
            {dieuHuong.districts.slice(0, 12).map(([d, n]) => (
              <Link
                key={d}
                href={areaPath(f.deal === "cho_thue" ? "cho_thue" : "ban", dieuHuong.province, d)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--line)] hover:border-brand hover:text-brand transition"
              >
                {dealWord} nhà đất {d} <span className="text-[var(--ink-faint)] tabular-nums">({n.toLocaleString("vi-VN")})</span>
              </Link>
            ))}
            <Link href={areaPath(f.deal === "cho_thue" ? "cho_thue" : "ban", dieuHuong.province)} className="text-xs px-2.5 py-1.5 rounded-lg border border-brand text-brand font-semibold">
              Toàn {dieuHuong.province} ›
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
