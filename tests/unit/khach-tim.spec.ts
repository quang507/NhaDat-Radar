import { test, expect } from "@playwright/test";
import { laBaiTimPhong, chuanHoaNhuCau } from "../../crawler/khach-tim.mjs";

// Săn khách tìm phòng (2/10): lọc thô bài "cần tìm phòng" trong nhóm FB trước khi gọi AI
test("laBaiTimPhong: nhận bài khách tìm phòng", () => {
  for (const t of [
    "Mình cần tìm phòng trọ Gò Vấp tầm 3tr, có gác, dọn vào đầu tháng 11 ạ",
    "Ai có phòng Q7 gần Lotte cho em xin info với, 2 người, dưới 5tr",
    "can thue phong tro binh thanh 3tr5 co may lanh",
    "Em đang tìm căn hộ mini Phú Nhuận 1PN, ngân sách 7-8 triệu",
    "Tìm người ở ghép quận 10, nữ, 1tr8/tháng",
    "Ai có phòng cho thuê khu Bách Khoa không ạ, em sinh viên",
  ]) expect(laBaiTimPhong(t), t).toBe(true);
});

test("laBaiTimPhong: bỏ bài rao cho thuê / không liên quan", () => {
  for (const t of [
    "Chính chủ cho thuê phòng 25m2 Bình Thạnh, giá thuê: 4tr, còn trống 2 phòng, LH 0909xxxxxx",
    "Bên em còn 3 căn studio Quận 7 full nội thất, nhận khách ở liền",
    "Thanh lý bàn ghế văn phòng giá rẻ",
    "ok",
  ]) expect(laBaiTimPhong(t), t).toBe(false);
});

test("chuanHoaNhuCau: đổi đơn vị giá, đảo khoảng, bỏ bài không phải khách", () => {
  expect(chuanHoaNhuCau({ is_demand: false })).toBeNull();
  const n = chuanHoaNhuCau({ is_demand: true, deal: "thue", districts: ["Quận Gò Vấp"], budget_min: 4, budget_max: 3, kind: "phong_tro", summary: "x" });
  expect(n).toMatchObject({ deal: "thue", quan: ["Quận Gò Vấp"], gia_tu: 3_000_000, gia_den: 4_000_000, loai_phong: "phong_tro" });
  expect(chuanHoaNhuCau({ is_demand: true, budget_min: 5_000_000 })?.gia_den).toBe(6_000_000);
});
