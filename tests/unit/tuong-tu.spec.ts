import { test, expect } from "@playwright/test";
import { tinhDiemTuongDong, type ThongSoTinGoc } from "@/lib/tuong-tu";
import type { Listing } from "@/lib/types";

test.describe("tinhDiemTuongDong: thuật toán xếp hạng tin tương đồng (FR-31)", () => {
  const tinGoc: ThongSoTinGoc = {
    id: "goc-1",
    deal: "ban",
    kind: "nha",
    province: "Hồ Chí Minh",
    district: "Tân Phú",
    ward: "Phường Tây Thạnh",
    price_vnd: 4_000_000_000,
    area_m2: 50,
    bedrooms: 3,
  };

  test("Cùng phường + cùng loại + sát giá nhận điểm cao nhất", () => {
    const ungVien = {
      id: "uv-1",
      deal: "ban",
      kind: "nha",
      province: "Hồ Chí Minh",
      district: "Tân Phú",
      ward: "Phường Tây Thạnh",
      price_vnd: 4_200_000_000,
      bedrooms: 3,
      source: "ro_hang",
    } as unknown as Listing;

    const { diem, lyDo } = tinhDiemTuongDong(ungVien, tinGoc);
    // 4 (cùng phường) + 3 (cùng kind) + 3 (sát giá <= 15%) + 1.5 (3PN) + 1 (ro_hang) = 12.5
    expect(diem).toBeGreaterThanOrEqual(10);
    expect(lyDo).toContain("Cùng Phường Tây Thạnh");
  });

  test("Khác phường nhưng cùng quận nhận điểm trung bình", () => {
    const ungVien = {
      id: "uv-2",
      deal: "ban",
      kind: "nha",
      province: "Hồ Chí Minh",
      district: "Tân Phú",
      ward: "Phường Sơn Kỳ",
      price_vnd: 4_500_000_000,
      bedrooms: 2,
    } as unknown as Listing;

    const { diem, lyDo } = tinhDiemTuongDong(ungVien, tinGoc);
    // 2 (cùng quận) + 3 (cùng kind) + 1.5 (tương đương <= 30%) = 6.5
    expect(diem).toBeGreaterThan(5);
    expect(lyDo).toContain("Cùng Tân Phú");
  });
});
