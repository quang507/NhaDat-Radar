import { test, expect } from "@playwright/test";
import { fmtPrice, shortPrice, fmtPpm2, canonDistrict, fresh } from "../../src/lib/format";
import { hiRes, cleanImages } from "../../src/lib/img";

// Unit test các hàm thuần — chạy không cần mạng/trình duyệt.

test.describe("fmtPrice", () => {
  test("tỷ - bỏ số 0 thừa", () => {
    expect(fmtPrice(3_000_000_000)).toBe("3 tỷ");
    expect(fmtPrice(3_200_000_000)).toBe("3.2 tỷ");
    expect(fmtPrice(3_250_000_000)).toBe("3.25 tỷ");
  });
  test("triệu + hậu tố thuê", () => {
    expect(fmtPrice(6_500_000, "cho_thue")).toBe("6.5 triệu/th");
    expect(fmtPrice(12_000_000)).toBe("12 triệu");
  });
  test("null/0 -> Thoả thuận", () => {
    expect(fmtPrice(null)).toBe("Thoả thuận");
    expect(fmtPrice(0)).toBe("Thoả thuận");
  });
});

test.describe("shortPrice (pin bản đồ)", () => {
  test("làm tròn gọn", () => {
    expect(shortPrice(3_750_000_000)).toBe("3.8tỷ");
    expect(shortPrice(6_500_000)).toBe("7tr");
    expect(shortPrice(null)).toBe("TL");
  });
});

test.describe("fmtPpm2", () => {
  test("tr/m² và k/m²", () => {
    expect(fmtPpm2(45_700_000)).toBe("45.7 tr/m²");
    expect(fmtPpm2(120_000)).toBe("120k/m²");
  });
});

test.describe("canonDistrict", () => {
  test("bỏ chú thích sáp nhập trong ngoặc", () => {
    expect(canonDistrict("Quận 9 (P. Long Bình mới)")).toBe("Quận 9");
    expect(canonDistrict("Cầu Giấy")).toBe("Cầu Giấy");
    expect(canonDistrict(null)).toBe("");
  });
});

test.describe("fresh (tin mới bao lâu)", () => {
  test("các mốc thời gian", () => {
    expect(fresh(0)).toBe("vừa xong");
    expect(fresh(30)).toBe("30 phút trước");
    expect(fresh(120)).toBe("2 giờ trước");
    expect(fresh(2900)).toBe("2 ngày trước");
    expect(fresh(null)).toBe("");
  });
});

test.describe("hiRes (nâng ảnh phân giải cao)", () => {
  test("Mogi thumb-small -> bản gốc", () => {
    expect(hiRes("https://cloud.mogi.vn/images/thumb-small/abc.jpg"))
      .toBe("https://cloud.mogi.vn/images/abc.jpg");
  });
  test("Batdongsan crop -> resize lớn", () => {
    expect(hiRes("https://file4.batdongsan.com.vn/crop/283x141/2024/img.jpg"))
      .toBe("https://file4.batdongsan.com.vn/resize/1275x717/2024/img.jpg");
  });
  test("URL khác giữ nguyên", () => {
    const u = "https://scontent.fhan.fbcdn.net/photo.jpg";
    expect(hiRes(u)).toBe(u);
  });
});

test.describe("cleanImages (lọc ảnh rác)", () => {
  test("bỏ link album FB, object rác, chuỗi không phải URL", () => {
    const input = [
      "https://ok.com/a.jpg",
      "https://facebook.com/media/set/123",   // album, không phải ảnh
      { uri: "https://ok.com/b.jpg" },
      { junk: true },
      "not-a-url",
      null,
    ];
    expect(cleanImages(input as unknown[])).toEqual(["https://ok.com/a.jpg", "https://ok.com/b.jpg"]);
  });
});
