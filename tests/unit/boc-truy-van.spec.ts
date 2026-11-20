import { test, expect } from "@playwright/test";
import { bocTruyVanBDS } from "@/lib/boc-truy-van";
import { duAnTrongCau, type DuAnToaDo } from "@/lib/du-an";

test.describe("bocTruyVanBDS: bóc tách ngôn ngữ tự nhiên BĐS tiếng Việt", () => {
  test("Bóc chuẩn phòng trọ, quận, giá triệu", () => {
    const res = bocTruyVanBDS("phòng trọ bình thạnh dưới 4tr");
    expect(res.coKetQua).toBe(true);
    expect(res.loc.deal).toBe("cho_thue");
    expect(res.loc.kind).toBe("phong_tro");
    expect(res.loc.district).toBe("Bình Thạnh");
    expect(res.loc.province).toBe("Hồ Chí Minh");
    expect(res.loc.price_max).toBe(4_000_000);
  });

  test("Bóc chuẩn nhà hẻm xe hơi, khoảng giá tỷ, Tân Phú", () => {
    const res = bocTruyVanBDS("nhà tân phú 3-5 tỷ hxh");
    expect(res.coKetQua).toBe(true);
    expect(res.loc.deal).toBe("ban");
    expect(res.loc.kind).toBe("nha");
    expect(res.loc.district).toBe("Tân Phú");
    expect(res.loc.access).toBe("hxh");
    expect(res.loc.price_min).toBe(3_000_000_000);
    expect(res.loc.price_max).toBe(5_000_000_000);
  });

  test("Bóc chuẩn căn hộ 2PN Quận 7 tầm 3 tỷ", () => {
    const res = bocTruyVanBDS("căn hộ 2pn quận 7 tầm 3 tỷ");
    expect(res.coKetQua).toBe(true);
    expect(res.loc.kind).toBe("can_ho");
    expect(res.loc.district).toBe("Quận 7");
    expect(res.loc.bedrooms).toBe(2);
    expect(res.loc.price_approx).toBe(3_000_000_000);
  });

  test("Bóc tiếng lóng 'tỏi' và đường phố", () => {
    const res = bocTruyVanBDS("nhà 8 tỏi rưỡi đường Quang Trung Gò Vấp");
    expect(res.coKetQua).toBe(true);
    expect(res.loc.district).toBe("Gò Vấp");
    expect(res.loc.price_approx).toBe(8_500_000_000);
    expect(res.loc.street).toContain("Quang Trung");
  });

  test("Bóc giá thuê theo tháng '15tr/tháng'", () => {
    const res = bocTruyVanBDS("thuê chung cư 15tr/tháng");
    expect(res.coKetQua).toBe(true);
    expect(res.loc.deal).toBe("cho_thue");
    expect(res.loc.kind).toBe("can_ho");
    expect(res.loc.price_approx).toBe(15_000_000);
  });

  test("Bóc cụm từ '5 tới 8 tỷ'", () => {
    const res = bocTruyVanBDS("nhà 5 tới 8 tỷ");
    expect(res.loc.price_min).toBe(5_000_000_000);
    expect(res.loc.price_max).toBe(8_000_000_000);
  });

  test("AOND địa danh & dự án: Khu Bcons City đường Thống Nhất làng Đại học dưới 8 triệu khớp Dĩ An, không nhầm Làng Đại Học Nhà Bè", () => {
    const cau = "Khu Bcons City , đường Thống Nhất làng Đại học có căn nào dưới 8 triệu ko";
    const res = bocTruyVanBDS(cau);
    expect(res.loc.deal).toBe("cho_thue");
    expect(res.loc.district).toBe("Dĩ An");
    expect(res.loc.province).toBe("Bình Dương");
    expect(res.loc.price_max).toBe(8_000_000);
    expect(res.loc.street).toBe("Thống Nhất");

    const dsDuAn: DuAnToaDo[] = [
      { id: "1", slug: "lang-dai-hoc", name: "Làng Đại Học", district: "Huyện Nhà Bè", province: "Hồ Chí Minh", address: "Phước Kiển", lat: 10.7, lng: 106.7 },
      { id: "2", slug: "bcons-city", name: "Bcons City", district: "Thành Phố Dĩ An", province: "Bình Dương", address: "Thống Nhất", lat: 10.89, lng: 106.79 },
    ];
    const khop = duAnTrongCau(dsDuAn, cau);
    expect(khop?.name).toBe("Bcons City");
  });
});
