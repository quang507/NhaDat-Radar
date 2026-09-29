import { test, expect } from "@playwright/test";

// 3 lỗi làm seed chết / mất dữ liệu hàng loạt (audit pipeline 22/9/2026), đều tái hiện được bằng dữ liệu thật:
//  1. `.slice(0, 1100)` cắt đôi emoji -> surrogate lẻ -> PostgREST từ chối cả lô insert (CI 19/9 fail thật).
//  2. số không hợp lệ ("5.99" từ model, 390đ từ "390 nghìn/m²") -> bigint lỗi / tin giá rác.
//  3. junk filter loại 17% tin chotot: "máy giặt/tủ lạnh/tủ quần áo" là tiện nghi phòng cho thuê.
const CRAWLER = "../../crawler/";

test("catChuoi: không bao giờ để lại nửa emoji", async () => {
  const { catChuoi, boSurrogateLe } = await import(CRAWLER + "chung.mjs");
  const s = "a".repeat(1099) + "🏠 nhà đẹp";           // emoji nằm đúng ở vị trí 1099-1100 (UTF-16)
  const cu = s.slice(0, 1100).charCodeAt(1099);           // cách cũ: còn lại nửa đầu (high surrogate) của emoji
  expect(cu >= 0xd800 && cu <= 0xdbff).toBe(true);
  const c = catChuoi(s, 1100);
  expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(c)).toBe(false);
  expect(Array.from(c).length).toBe(1100);
  expect(c.endsWith("🏠")).toBe(true);
  expect(boSurrogateLe("abc\uD83D")).toBe("abc");
  expect(boSurrogateLe("\uDC00x")).toBe("x");
  expect(boSurrogateLe("ok 🏠")).toBe("ok 🏠");
  // JSON của chuỗi đã làm sạch phải hợp lệ với Postgres (không còn \ud83d lẻ)
  expect(JSON.stringify({ d: c })).not.toMatch(/\\ud[89ab][0-9a-f]{2}"/i);
});

test("soNguyen/soThuc: số sai kiểu cột -> null thay vì làm seed chết", async () => {
  const { soNguyen, soThuc } = await import(CRAWLER + "chung.mjs");
  expect(soNguyen(5.99, { min: 1_000_000 })).toBeNull();          // model quên nhân 1e9
  expect(soNguyen(390, { min: 1_000_000 })).toBeNull();           // "390 nghìn/m²" của batdongsan
  expect(soNguyen(5_600_000_000.4, { min: 1_000_000 })).toBe(5_600_000_000);
  expect(soNguyen("7800000000", { min: 1_000_000 })).toBe(7_800_000_000);
  expect(soNguyen(NaN)).toBeNull();
  expect(soNguyen(-3)).toBeNull();
  expect(soNguyen(2.6, { max: 200 })).toBe(3);                     // bedrooms int
  expect(soThuc(52.5, { max: 1e6 })).toBe(52.5);
  expect(soThuc(0)).toBeNull();
  expect(soThuc("abc")).toBeNull();
});

test("junk filter: tin cho thuê thật có máy giặt/tủ lạnh/tủ quần áo KHÔNG bị loại", async () => {
  const { isJunk } = await import(CRAWLER + "junk.mjs");
  // tiêu đề thật lượt crawl 22/9 từng bị loại oan
  for (const t of [
    "CĂN HỘ MỚI XÂY - FULL NỘI THẤT - KẾ NHÀ GA T3 - MÁY GIẶT RIÊNG",
    "CHO THUÊ CĂN HỘ 2 PHÒNG NGỦ FULL NỘI THẤT ĐƯỜNG THỐNG NHẤT - GÒ VẤP",
    "CHO THUÊ PHÒNG CỬA SỔ BAN CÔNG ĐƯỜNG LÊ VĂN THỌ - GÒ VẤP",
  ]) expect(isJunk(t, "Phòng có máy giặt riêng, tủ lạnh, tủ quần áo, máy lạnh"), t).toBe(false);
  expect(isJunk("Bán nhà hẻm xe hơi 4x16m Gò Vấp", "Sổ hồng riêng, ngân hàng hỗ trợ vay vốn 70%")).toBe(false);
  expect(isJunk("Studio full nội thất Quận 3", "có máy giặt chung")).toBe(false);
  // lượt 2: các cách gọi phòng cho thuê mà regex đầu tiên còn sót
  for (const t of [
    "Duplex ban công,full nội thất, ngay ngã tư TĐ,Vicome Lê Văn Việt,UTE",
    "CHDV Cao Cấp - Nội Thất Xịn, Đầy Đủ Tiện Nghi - Ngay Cầu SG, NTHX",
    "Phòng mới xây ngay gần Bùi Viện siêu đẹp mới 100%",
    "Pass trọ 1395 Giải Phóng !!! PASS TRỌ GẤPPP",
  ]) expect(isJunk(t, "có máy giặt, tủ lạnh, kệ quần áo"), t).toBe(false);
  // nguồn đã phân loại là phòng trọ/căn hộ -> không bị loại vì đồ gia dụng dù tiêu đề không có từ khoá
  expect(isJunk("Nội thất xịn ngay trung tâm, giờ giấc tự do", "máy giặt riêng", "can_ho")).toBe(false);
  expect(isJunk("Nội thất xịn ngay trung tâm, giờ giấc tự do", "máy giặt riêng", "khac")).toBe(true);
});

test("junk filter: rác thật vẫn bị loại", async () => {
  const { isJunk } = await import(CRAWLER + "junk.mjs");
  expect(isJunk("Tuyển dụng nhân viên kinh doanh bất động sản lương cao", "")).toBe(true); // RAC_CUNG dù có chữ BĐS
  expect(isJunk("Thanh lý tủ lạnh Toshiba 180 lít giá rẻ", "còn mới 90%")).toBe(true);
  expect(isJunk("Hỗ trợ vay vốn mua nhà lãi suất thấp", "giải ngân nhanh trong ngày")).toBe(true);
  expect(isJunk("Đèn đường năng lượng mặt trời 200W", "bảo hành 2 năm")).toBe(true);
  expect(isJunk("Nhận thi công sơn nhà trọn gói", "")).toBe(true);
  expect(isJunk("ib em", "")).toBe(true);
});
