// BÁO CÁO GIÁ THUÊ PHÒNG TRỌ THEO QUẬN (3/10, SEO) - bài /tin-tuc/gia-thue-phong-tro-<quận> viết từ SỐ LIỆU
// THẬT của Radar (phòng đang cho thuê trong kho, giá trung vị theo loại/diện tích/phường, xu hướng 30 ngày).
// Nội dung "chỉ Radar có" -> Google chịu lập chỉ mục (khác tin cào trùng nguồn). Cập nhật mỗi ngày, cache 12h.
import { unstable_cache } from "next/cache";
import { createAnonClient } from "./supabase/anon";
import { getAreas } from "./geo";
import { slugify } from "./slug";

export const TINH_BAO_CAO = "Hồ Chí Minh";
export const NGUONG_TIN = 30;   // quận ít hơn chừng này phòng trọ đang cho thuê -> chưa đủ để viết báo cáo

const trungVi = (a: number[]) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const phanVi = (a: number[], p: number) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))))];
};

/** Danh sách quận đủ dữ liệu (theo bảng đếm đã cache), nhiều phòng trước */
export async function dsQuanBaoCao(): Promise<{ quan: string; slug: string; n: number }[]> {
  const { counts } = await getAreas();
  const tinh = counts[TINH_BAO_CAO];
  if (!tinh) return [];
  return Object.entries(tinh.districts)
    .map(([quan, c]) => ({ quan, slug: slugify(quan), n: c.kinds?.phong_tro?.cho_thue ?? 0 }))
    .filter((x) => x.n >= NGUONG_TIN)
    .sort((a, b) => b.n - a.n);
}

export type BaoCao = {
  quan: string; n: number; trungVi: number; p25: number; p75: number; giaM2: number | null;
  theoDienTich: { nhan: string; n: number; trungVi: number }[];
  theoPhuong: { phuong: string; n: number; trungVi: number }[];
  canHo: { n: number; trungVi: number } | null;
  xuHuong: { truoc: number; nay: number; pct: number } | null;
  capNhat: string;
};

export const layBaoCao = unstable_cache(
  async (quan: string): Promise<BaoCao | null> => {
    const sb = createAnonClient();
    const { data } = await sb.from("listings").select("price_vnd,area_m2,ward,kind")
      .eq("status", "published").eq("deal", "cho_thue").eq("province", TINH_BAO_CAO).eq("district", quan)
      .in("kind", ["phong_tro", "can_ho"]).gt("price_vnd", 500_000).lt("price_vnd", 100_000_000)
      .order("first_seen_at", { ascending: false }).limit(1000);
    const rows = (data ?? []) as { price_vnd: number; area_m2: number | null; ward: string | null; kind: string }[];
    const tro = rows.filter((r) => r.kind === "phong_tro");
    if (tro.length < NGUONG_TIN) return null;
    const gia = tro.map((r) => r.price_vnd);
    const m2 = tro.filter((r) => r.area_m2 && r.area_m2 >= 8 && r.area_m2 <= 80).map((r) => r.price_vnd / r.area_m2!);
    const nhom = (nhan: string, loc: (dt: number) => boolean) => {
      const g = tro.filter((r) => r.area_m2 && loc(r.area_m2)).map((r) => r.price_vnd);
      return g.length >= 5 ? { nhan, n: g.length, trungVi: trungVi(g)! } : null;
    };
    const theoDienTich = [nhom("Dưới 20 m²", (d) => d < 20), nhom("20 - 30 m²", (d) => d >= 20 && d < 30), nhom("Từ 30 m²", (d) => d >= 30)]
      .filter((x): x is NonNullable<typeof x> => !!x);
    const phuongMap = new Map<string, number[]>();
    for (const r of tro) if (r.ward) phuongMap.set(r.ward, [...(phuongMap.get(r.ward) ?? []), r.price_vnd]);
    const theoPhuong = [...phuongMap.entries()].filter(([, g]) => g.length >= 5)
      .map(([phuong, g]) => ({ phuong, n: g.length, trungVi: trungVi(g)! })).sort((a, b) => a.trungVi - b.trungVi).slice(0, 8);
    const ch = rows.filter((r) => r.kind === "can_ho").map((r) => r.price_vnd);

    // xu hướng 30 ngày từ price_history (giá/m² trung vị phòng trọ của quận, crawler/price-history.mjs ghi mỗi ngày)
    const { data: ls } = await sb.from("price_history").select("day,median_ppm2,n")
      .eq("province", TINH_BAO_CAO).eq("district", quan).eq("kind", "phong_tro").eq("deal", "cho_thue")
      .order("day", { ascending: true }).limit(120);
    const ds = (ls ?? []) as { day: string; median_ppm2: number; n: number }[];
    let xuHuong: BaoCao["xuHuong"] = null;
    if (ds.length >= 2) {
      const nay = ds[ds.length - 1], moc = Date.parse(nay.day) - 30 * 86400000;
      const truoc = [...ds].reverse().find((d) => Date.parse(d.day) <= moc) ?? ds[0];
      // Chỉ báo khi MẪU SO SÁNH ĐƯỢC: số phòng 2 thời điểm chênh không quá 1,5 lần và mức đổi <= 20%.
      // Đợt nhập lớn (2/10: +12.900 phòng HiFriendz giá cao hơn) làm trung vị nhảy 30-40% dù giá thuê
      // thật không đổi - đăng con số đó là sai sự thật.
      const tiLe = truoc.n > 0 ? nay.n / truoc.n : 0;
      const pct = truoc.median_ppm2 > 0 ? (nay.median_ppm2 - truoc.median_ppm2) / truoc.median_ppm2 : 0;
      if (truoc !== nay && truoc.median_ppm2 > 0 && tiLe >= 2 / 3 && tiLe <= 1.5 && Math.abs(pct) <= 0.2) {
        xuHuong = { truoc: truoc.median_ppm2, nay: nay.median_ppm2, pct: Math.round(((nay.median_ppm2 - truoc.median_ppm2) / truoc.median_ppm2) * 1000) / 10 };
      }
    }
    return {
      quan, n: tro.length, trungVi: trungVi(gia)!, p25: phanVi(gia, 25)!, p75: phanVi(gia, 75)!,
      giaM2: m2.length >= 10 ? Math.round(trungVi(m2)!) : null,
      theoDienTich, theoPhuong,
      canHo: ch.length >= 5 ? { n: ch.length, trungVi: trungVi(ch)! } : null,
      xuHuong, capNhat: new Date().toISOString(),
    };
  },
  ["bao-cao-gia-v2"],
  { revalidate: 43200, tags: ["listings"] },
);

/** "3.800.000" -> "3,8 triệu" */
export const trieu = (v: number) => `${(v / 1e6).toFixed(1).replace(/\.0$/, "").replace(".", ",")} triệu`;
export const thangNay = () => {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  return { thang: d.getMonth() + 1, nam: d.getFullYear() };
};
