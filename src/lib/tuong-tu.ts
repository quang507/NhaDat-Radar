// Thuật toán gợi ý BĐS / Phòng tương tự (FR-31)
// So sánh theo: Cùng khu vực (phường/quận) > Khoảng giá tương đồng (0.7x - 1.3x) > Cùng loại hình & số phòng

import { createAnonClient } from "@/lib/supabase/anon";
import { LISTING_THE_COLS } from "@/lib/cols";
import type { Listing } from "@/lib/types";

export type ListingTuongTu = Listing & {
  diemTuongDong: number;
  lyDoGoiY: string;
};

export type ThongSoTinGoc = {
  id: string;
  deal: string;
  kind?: string | null;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  price_vnd?: number | null;
  area_m2?: number | null;
  bedrooms?: number | null;
};

/**
 * Tính điểm tương đồng giữa tin ứng viên và tin gốc
 */
export function tinhDiemTuongDong(ungVien: Listing, goc: ThongSoTinGoc): { diem: number; lyDo: string } {
  let diem = 0;
  const lyDoArr: string[] = [];

  // 1. Vị trí
  if (goc.ward && ungVien.ward && ungVien.ward.toLowerCase() === goc.ward.toLowerCase()) {
    diem += 4;
    lyDoArr.push(`Cùng ${goc.ward}`);
  } else if (goc.district && ungVien.district && ungVien.district.toLowerCase() === goc.district.toLowerCase()) {
    diem += 2;
    lyDoArr.push(`Cùng ${goc.district}`);
  }

  // 2. Loại hình
  if (goc.kind && ungVien.kind === goc.kind) {
    diem += 3;
  }

  // 3. Mức giá
  if (goc.price_vnd && ungVien.price_vnd) {
    const tiLe = Math.abs(ungVien.price_vnd - goc.price_vnd) / goc.price_vnd;
    if (tiLe <= 0.15) {
      diem += 3;
      lyDoArr.push("Tầm giá rất sát");
    } else if (tiLe <= 0.3) {
      diem += 1.5;
      lyDoArr.push("Tầm giá tương đương");
    }
  }

  // 4. Số phòng ngủ
  if (goc.bedrooms && ungVien.bedrooms && goc.bedrooms === ungVien.bedrooms) {
    diem += 1.5;
    lyDoArr.push(`${goc.bedrooms} phòng ngủ`);
  }

  // 5. Rổ hàng xác minh
  if (ungVien.source === "ro_hang" || ungVien.source === "agent") {
    diem += 1;
  }

  return { diem, lyDo: lyDoArr.slice(0, 2).join(" · ") || "Phù hợp nhu cầu" };
}

/**
 * Tìm các tin tương tự nhất từ Supabase cho một tin đăng cụ thể
 */
export async function layTinTuongTu(
  goc: ThongSoTinGoc,
  gioiHan: number = 4
): Promise<ListingTuongTu[]> {
  if (!goc || !goc.id) return [];
  const sb = createAnonClient();

  // Khoảng giá từ 0.7x đến 1.3x
  const giaGoc = Number(goc.price_vnd);
  const giaMin = giaGoc > 0 ? Math.round(giaGoc * 0.7) : null;
  const giaMax = giaGoc > 0 ? Math.round(giaGoc * 1.3) : null;

  let q = sb
    .from("listings")
    .select(LISTING_THE_COLS)
    .eq("status", "published")
    .eq("deal", goc.deal || "ban")
    .neq("id", goc.id)
    .not("images", "eq", "{}");

  // Giới hạn theo tỉnh/thành nếu có
  if (goc.province) {
    q = q.eq("province", goc.province);
  }

  // Ưu tiên cùng quận nếu có
  if (goc.district) {
    q = q.eq("district", goc.district);
  }

  // Giới hạn khoảng giá
  if (giaMin) q = q.gte("price_vnd", giaMin);
  if (giaMax) q = q.lte("price_vnd", giaMax);

  // Kéo ứng viên
  const { data: candidates, error } = await q
    .order("ai_score", { ascending: false, nullsFirst: false })
    .limit(16);

  if (error || !candidates || candidates.length === 0) {
    // Nếu quá ít kết quả cùng quận + khoảng giá hẹp, mở rộng bỏ lọc giá
    if (goc.district) {
      const { data: fallback } = await sb
        .from("listings")
        .select(LISTING_THE_COLS)
        .eq("status", "published")
        .eq("deal", goc.deal || "ban")
        .eq("district", goc.district)
        .neq("id", goc.id)
        .not("images", "eq", "{}")
        .order("ai_score", { ascending: false, nullsFirst: false })
        .limit(8);

      const dsFallback = ((fallback ?? []) as unknown as Listing[]).map((u) => {
        const { diem, lyDo } = tinhDiemTuongDong(u, goc);
        return { ...u, diemTuongDong: diem, lyDoGoiY: lyDo };
      });
      return dsFallback.sort((a, b) => b.diemTuongDong - a.diemTuongDong).slice(0, gioiHan);
    }
    return [];
  }

  const dsKetQua: ListingTuongTu[] = (candidates as unknown as Listing[]).map((u) => {
    const { diem, lyDo } = tinhDiemTuongDong(u, goc);
    return { ...u, diemTuongDong: diem, lyDoGoiY: lyDo };
  });

  // Sắp xếp theo điểm tương đồng cao nhất
  return dsKetQua.sort((a, b) => b.diemTuongDong - a.diemTuongDong).slice(0, gioiHan);
}
