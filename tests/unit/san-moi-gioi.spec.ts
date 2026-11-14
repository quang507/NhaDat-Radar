import { test, expect } from "@playwright/test";
import { laBaiMoiGioiTimHang, khoaQuan, locCanKhop, soanTheMoiGioi, soanTinHopTac, khoaTrung } from "../../crawler/san-moi-gioi.mjs";
import { laBaiTimPhong } from "../../crawler/khach-tim.mjs";

// 14/11: bài môi giới tìm hàng hộ khách (lấy từ log bot Zalo máy 146, 5-14/11) - trước đây bị bỏ
test("laBaiMoiGioiTimHang: nhận bài môi giới tìm hàng cho khách", () => {
  for (const t of [
    "Khách Hàn ở gia đình tìm 2pn thuê ưu tiên Estella , Thao Dien",
    "Khách NNN tìm 1PN fnt Sunwah Pearl giá tốt, move in tháng 12",
    "Q4 Khách TQ cần Studio 1 năm đi xem ngày mai. Ngân sách 12tr",
    "Khách người nước ngoài cần tìm studio/1 phòng ngủ Bình Thạnh",
    "Khách nữ tìm thuê 2PN full nội thất Quận 7 tầm 15tr",
    "Khách em cần 1pn Q2 tầm 10tr, dọn vào đầu tháng",
    "Tìm giúp khách căn studio Gò Vấp dưới 7tr",
    "ACE nào có căn 2PN Thảo Điền tầm 20tr gửi em nhé",
  ]) expect(laBaiMoiGioiTimHang(t), t).toBe(true);
});

test("laBaiMoiGioiTimHang: bỏ bài rao hàng và bài người thuê tự tìm", () => {
  for (const t of [
    "BE 2pn, full nt Giá thuê: 12tr LH: 0328896597",
    "Bên em có căn 2PN Estella còn trống, khách cần xem ib em",
    "Cần cho thuê studio Quận 7 full nội thất, khách xem liền",
    "Mình cần tìm phòng trọ Gò Vấp tầm 3tr, có gác, dọn vào đầu tháng 11 ạ",
    "Ai có phòng Q7 gần Lotte cho em xin info với, 2 người, dưới 5tr",
  ]) expect(laBaiMoiGioiTimHang(t), t).toBe(false);
  // bài người thuê tự tìm vẫn đi luồng săn khách cũ
  expect(laBaiTimPhong("Mình cần tìm phòng trọ Gò Vấp tầm 3tr, có gác, dọn vào đầu tháng 11 ạ")).toBe(true);
});

test("khoaQuan: gộp Q2/Q9/Thủ Đức, bỏ tiền tố", () => {
  expect(khoaQuan("Quận 2")).toBe("thu duc");
  expect(khoaQuan("TP. Thủ Đức")).toBe("thu duc");
  expect(khoaQuan("Q9")).toBe("thu duc");
  expect(khoaQuan("Quận 7")).toBe("7");
  expect(khoaQuan("Quận Bình Thạnh")).toBe("binh thanh");
  expect(khoaQuan("Bình Thạnh")).toBe("binh thanh");
});

const can = (id: string, district: string, price_vnd: number) => ({ id, district, price_vnd, area_m2: 25, ward: null, specs: { "Loại phòng": "Studio" } });

test("locCanKhop: chỉ giữ căn đúng quận và trong tầm giá, không có quận thì không gửi", () => {
  const ds = [can("a1111111-0000", "Quận 7", 9_000_000), can("b2222222-0000", "Quận 7", 20_000_000),
    can("c3333333-0000", "Quận 1", 9_500_000), can("d4444444-0000", "TP. Thủ Đức", 10_000_000)];
  expect(locCanKhop(ds, { quan: ["Quận 7"], gia_tu: 8_000_000, gia_den: 10_000_000 }).map((c) => c.id)).toEqual(["a1111111-0000"]);
  expect(locCanKhop(ds, { quan: ["Quận 2"], gia_tu: null, gia_den: null, tom_tat: "Khách cần studio" }).map((c) => c.id)).toEqual(["d4444444-0000"]);
  expect(locCanKhop(ds, { quan: [], gia_tu: 8_000_000, gia_den: 10_000_000 })).toEqual([]);
  // không nói loại căn, không nói giá -> quá mơ hồ, không gửi
  expect(locCanKhop(ds, { quan: ["Quận 7"], gia_tu: null, gia_den: null })).toEqual([]);
});

test("locCanKhop: khớp đúng số phòng ngủ (lỗi chạy thử 14/11: khách 3-4PN bị gợi ý gác lửng 4tr)", () => {
  const loai = (id: string, l: string, gia: number) => ({ ...can(id, "TP. Thủ Đức", gia), specs: { "Loại phòng": l } });
  const ds = [loai("g1", "Gác lửng", 4_000_000), loai("p1", "1 Phòng ngủ", 9_700_000),
    loai("p2", "2 Phòng ngủ", 15_000_000), loai("p3", "3 Phòng ngủ", 30_000_000)];
  const ids = (tom_tat: string) => locCanKhop(ds, { quan: ["Thủ Thiêm", "Quận 2"], gia_tu: null, gia_den: null, tom_tat }).map((c) => c.id);
  expect(ids("Khách Canada tìm thuê căn hộ 3-4 phòng ngủ khu Thủ Thiêm")).toEqual(["p3"]);
  expect(ids("Khách tìm 2PN Vista Verde nội thất cơ bản")).toEqual(["p2"]);
  expect(ids("Khách cần studio hoặc gác")).toEqual(["g1"]);
});

test("thẻ admin và câu mời hợp tác: có mã K, mã phòng, link, không có ngoặc vuông hay gạch dài", () => {
  const canKhop = [can("a1b2c3d4-e5f6-0000-0000-000000000000", "Quận 7", 9_000_000)];
  const the = soanTheMoiGioi({ senderName: "Jenny", tenNhom: "CĐ Môi Giới", text: "Khách em cần studio Q7 9tr", nhuCau: { tom_tat: "Studio Q7 khoảng 9 triệu" }, canKhop, ma: "K1234" });
  expect(the).toContain("Jenny");
  expect(the).toContain("RHA1B2C3");
  expect(the).toContain('"K1234 1"');
  const moi = soanTinHopTac({ senderName: "Jenny", canKhop });
  expect(moi).toContain("https://nhadatradar.com/listings/a1b2c3d4-e5f6-0000-0000-000000000000");
  expect(moi).toContain("chia hoa hồng");
  expect(moi).not.toMatch(/\[[^\]]+\]|—/); // "K1234 1" bị chặn nếu gợi ý còn [..]; Humanizer cấm gạch dài
});

test("khoaTrung: cùng người cùng bài dán nhiều nhóm thì trùng khoá", () => {
  expect(khoaTrung("1", "Khách Hàn tìm 2PN Estella!")).toBe(khoaTrung("1", "khách hàn  tìm 2pn estella"));
  expect(khoaTrung("1", "Khách Hàn tìm 2PN")).not.toBe(khoaTrung("2", "Khách Hàn tìm 2PN"));
});
