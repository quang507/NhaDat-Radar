import "server-only"; // 2/11 (audit): chặn lỡ import vào client component
// SERVER-ONLY: cây khu vực + đếm, cache 10 phút. (Helper thuần canonDistrict/shortPrice/fmtPpm2/startOfDayVN nằm ở lib/format.ts
// để client component dùng được.) Audit 16/8: home/search/khu vực/sitemap/đăng tin mỗi request tự select 2-5k dòng để dựng
// cùng một cây Tỉnh->Quận->Phường; AreaLanding còn gọi 2 lần (metadata + page).
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { canonDistrict } from "@/lib/format";
import { truyVanVoiRetry } from "@/lib/cols";
import { kiemCayRpc } from "@/lib/cay-khu-vuc";

export type Deal = "ban" | "cho_thue";
/** kind -> { ban, cho_thue } (trang /nha-dat-ban/[tinh]/[quan]/[loai] + sitemap) */
export type KindCount = Record<string, { ban: number; cho_thue: number }>;
export type AreaTree = {
  /** Tỉnh -> Quận -> [Phường] (select phụ thuộc + autosuggest) */
  geo: Record<string, Record<string, string[]>>;
  /** Số tin theo tỉnh/quận, tách bán/thuê, kèm đếm theo LOẠI BĐS (trang khu vực, sitemap, chip) */
  counts: Record<string, { ban: number; cho_thue: number; kinds: KindCount; districts: Record<string, { ban: number; cho_thue: number; kinds: KindCount }> }>;
  total: number;
  sources: number;
  districtCount: number;
};

type Nhom = { province: string | null; district: string | null; deal: string; kind: string | null; n: number };
type PhuongRow = { province: string | null; district: string | null; ward: string | null };

/** Dựng cây từ các nhóm đếm (đã gộp ở DB) + danh sách phường riêng */
function dungCay(nhom: Nhom[], phuong: PhuongRow[], srcs: Iterable<string>, total: number): AreaTree {
  const geo: AreaTree["geo"] = {};
  const counts: AreaTree["counts"] = {};
  for (const r of nhom) {
    const p = (r.province || "").trim(); if (!p) continue;
    const deal = (r.deal === "cho_thue" ? "cho_thue" : "ban") as Deal;
    const n = Number(r.n) || 0;
    geo[p] ??= {}; counts[p] ??= { ban: 0, cho_thue: 0, kinds: {}, districts: {} };
    counts[p][deal] += n;
    const kind = (r.kind || "").trim();
    if (kind) { counts[p].kinds[kind] ??= { ban: 0, cho_thue: 0 }; counts[p].kinds[kind][deal] += n; }
    const d = canonDistrict((r.district || "").trim());
    if (!d) continue;
    geo[p][d] ??= [];
    counts[p].districts[d] ??= { ban: 0, cho_thue: 0, kinds: {} };
    counts[p].districts[d][deal] += n;
    if (kind) { counts[p].districts[d].kinds[kind] ??= { ban: 0, cho_thue: 0 }; counts[p].districts[d].kinds[kind][deal] += n; }
  }
  // CHỈ lấy phường từ cột ward thật (soát 21/8: phường "chế" từ hậu tố district làm dropdown mọc phường ảo)
  for (const r of phuong) {
    const p = (r.province || "").trim(), d = canonDistrict((r.district || "").trim()), w = (r.ward || "").trim();
    if (!p || !d || !w || !geo[p]?.[d]) continue;
    if (!geo[p][d].includes(w)) geo[p][d].push(w);
  }
  let districtCount = 0;
  for (const p of Object.keys(geo)) for (const d of Object.keys(geo[p])) { geo[p][d].sort(); districtCount++; }
  return { geo, counts, total, sources: new Set(srcs).size, districtCount };
}

async function fetchAreas(): Promise<AreaTree> {
  const sb = createAdminClient(); // chỉ đọc published, không phụ thuộc user -> cache chung an toàn
  // 3/10 (egress) & 14/11 (Hướng B): đếm sẵn ở DB bằng rpc cay_khu_vuc (migration 033). Lỗi DB thì ném lỗi, không cache cây rỗng.
  const { data } = await truyVanVoiRetry(() => sb.rpc("cay_khu_vuc"), "areas:rpc");
  const c = kiemCayRpc(data);
  return dungCay(
    c.c.map(([province, district, deal, kind, n]) => ({ province, district, deal, kind, n })),
    c.w.map(([province, district, ward]) => ({ province, district, ward })),
    c.s,
    Number(c.t) || 0,
  );
}

export const getAreas = unstable_cache(
  fetchAreas,
  ["areas-v7"],
  { revalidate: 21600, tags: ["areas"] },
);

export const getAreasDaily = unstable_cache(
  fetchAreas,
  ["areas-daily-v2"],
  { revalidate: 86400, tags: ["areas"] },
);
