import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";

// TOẠ ĐỘ DỰ ÁN để tìm "quanh dự án X" (26/10). ~2.300 dự án (nhập từ kho AI Ơi Nhà Đất), ~2.170 có toạ độ.
// Cột geo là geography -> PostgREST trả EWKB dạng hex; giải ở đây thay vì thêm cột lat/lng (không cần migration).
export type DuAnToaDo = { id: string; slug: string | null; name: string; district: string | null; province: string | null; address: string | null; lat: number; lng: number };

/** EWKB hex của POINT (có/không SRID) -> {lat, lng}; null nếu không đọc được */
export function docToaDoWkb(hex: unknown): { lat: number; lng: number } | null {
  if (typeof hex !== "string" || hex.length < 42) return null;
  try {
    const b = Buffer.from(hex, "hex");
    const le = b[0] === 1;
    const loai = le ? b.readUInt32LE(1) : b.readUInt32BE(1);
    const o = loai & 0x20000000 ? 9 : 5; // có SRID thì thêm 4 byte
    const lng = le ? b.readDoubleLE(o) : b.readDoubleBE(o), lat = le ? b.readDoubleLE(o + 8) : b.readDoubleBE(o + 8);
    return Number.isFinite(lat) && Number.isFinite(lng) && lat && lng ? { lat, lng } : null;
  } catch { return null; }
}

export function khoangCachKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// Bảng nhẹ (id, tên, quận, toạ độ) - cache 6 giờ: dự án chỉ đổi khi chạy scripts/nhap-du-an-aioi.mjs
export const layDuAnToaDo = unstable_cache(
  async (): Promise<DuAnToaDo[]> => {
    const sb = createAnonClient();
    const ra: DuAnToaDo[] = [];
    for (let tu = 0; ; tu += 1000) {
      const { data, error } = await sb.from("projects").select("id,slug,name,district,province,address,geo")
        .eq("status", "published").not("geo", "is", null).not("images", "eq", "{}")
        .order("name").range(tu, tu + 999);
      if (error) throw new Error(`layDuAnToaDo: ${error.message}`);
      for (const p of data ?? []) {
        const td = docToaDoWkb(p.geo);
        if (td) ra.push({ id: p.id, slug: p.slug, name: p.name, district: p.district, province: p.province, address: p.address, ...td });
      }
      if ((data ?? []).length < 1000) return ra;
    }
  },
  ["du-an-toa-do-v1"],
  { revalidate: 21600, tags: ["projects"] },
);

// So khớp không dấu: "nyah binh tay" khớp "Ny'ah Bình Tây"
export const chuanTen = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").replace(/['’`]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
// tiền tố hay gõ thêm/bớt trước tên dự án
const TIEN_TO = /^(du an|khu do thi|kdt|khu dan cu|kdc|can ho|chung cu|toa nha|the)\s+/;
const goc = (s: string) => chuanTen(s).replace(TIEN_TO, "");

/** Gợi ý theo chuỗi gõ dở (ô tìm kiếm): khớp đầu tên > đầu từ > chứa; tối đa n */
export function goiYDuAn(ds: DuAnToaDo[], q: string, n = 6) {
  const k = goc(q);
  if (k.length < 2) return [];
  const diem = (p: DuAnToaDo) => {
    const t = goc(p.name);
    if (t === k) return 100;
    if (t.startsWith(k)) return 80;
    if (` ${t}`.includes(` ${k}`)) return 60;
    if (t.includes(k)) return 40;
    const tu = k.split(" ");
    return tu.length > 1 && tu.every((w) => t.includes(w)) ? 30 : 0;
  };
  return ds.map((p) => ({ p, s: diem(p) })).filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.p.name.length - b.p.name.length).slice(0, n).map((x) => x.p);
}

/** Tên dự án nằm TRONG một câu ("tìm trọ gần ny'ah bình tây dưới 4tr") - lấy khớp DÀI nhất, nguyên từ.
 *  Bỏ tên quá ngắn/chung chung (< 6 ký tự hoặc 1 từ) để "the sun", "green" không bắt nhầm câu thường. */
export function duAnTrongCau(ds: DuAnToaDo[], cau: string): DuAnToaDo | null {
  const c = ` ${chuanTen(cau)} `;
  let tot: DuAnToaDo | null = null, dai = 0;
  for (const p of ds) {
    const t = goc(p.name);
    if (t.length < 6 || !t.includes(" ")) continue;
    if (t.length > dai && c.includes(` ${t} `)) { tot = p; dai = t.length; }
  }
  return tot;
}
