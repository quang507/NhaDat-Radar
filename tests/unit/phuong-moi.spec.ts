import { test, expect } from "@playwright/test";
import { phuongMoi, cauHoiChonPhuong } from "../../src/lib/phuong-moi";

// Quy đổi phường cũ -> mới (sáp nhập 01/7/2025, bảng NSO trong data/sap-nhap-phuong-2025.json).
// Ca thật 28/10: chủ nhà ghi "125 Bình Long, Bình Hưng Hòa A, Bình Tân" mà bot vẫn bắt nhớ "tên phường mới".

test("phường bị chia: Bình Hưng Hòa A -> cho chọn Bình Hưng Hòa / Bình Trị Đông", () => {
  const kq = phuongMoi("Bình Hưng Hòa A", "Bình Tân", "Hồ Chí Minh");
  expect(kq.cu?.ten).toBe("Phường Bình Hưng Hòa A");
  expect(kq.chac).toBeNull();
  expect(kq.ungVien.map((x) => x.ten).sort()).toEqual(["Phường Bình Hưng Hòa", "Phường Bình Trị Đông"]);
  expect(cauHoiChonPhuong(kq)).toContain("Bình Hưng Hòa, Bình Trị Đông");
});

test("gộp trọn: điền thẳng, không hỏi", () => {
  expect(phuongMoi("Bình Hưng Hòa B", "Q. Bình Tân", "TP.HCM").chac?.ten).toBe("Phường Bình Tân");
  expect(phuongMoi("Phường Trúc Bạch", "Ba Đình", "Hà Nội").chac?.ten).toBe("Phường Ba Đình");
  expect(phuongMoi("Dĩ An", "TP. Dĩ An", "Bình Dương").chac).toMatchObject({ ten: "Phường Dĩ An", tinh: "Thành phố Hồ Chí Minh" });
  expect(cauHoiChonPhuong(phuongMoi("Bình Hưng Hòa B", "Bình Tân", "HCM"))).toBeNull();
});

test("gõ kiểu thị trường: không dấu, viết tắt, số có số 0", () => {
  expect(phuongMoi("binh hung hoa b", "binh tan", "hcm").chac?.ten).toBe("Phường Bình Tân");
  expect(phuongMoi("P.01", "Q.3", "Hồ Chí Minh").chac?.ten).toBe("Phường Bàn Cờ");
  expect(phuongMoi("phuong 1", "quan 10", "sai gon").chac?.ten).toBe("Phường Vườn Lài");
});

test("tên trùng nhiều quận mà thiếu quận -> không đoán, trả danh sách để hỏi quận", () => {
  const kq = phuongMoi("Phường 1", null, "Hồ Chí Minh");
  expect(kq.cu).toBeNull();
  expect(kq.chac).toBeNull();
  expect(kq.trungTen.length).toBeGreaterThan(5);
  // tên chỉ có ở 1 nơi thì không cần quận
  expect(phuongMoi("Bình Hưng Hòa B", null, "Hồ Chí Minh").chac?.ten).toBe("Phường Bình Tân");
});

test("chia diện tích nhưng toàn bộ dân cư sang 1 xã -> nhà dân chắc chắn thuộc xã đó", () => {
  const kq = phuongMoi("Đồng Tâm", "Mỹ Đức", "Hà Nội");
  expect(kq.ungVien.length).toBe(2);
  expect(kq.chac?.ten).toBe("Xã Phúc Sơn");
});

test("không có trong bảng -> trả rỗng, không ném lỗi", () => {
  const kq = phuongMoi("Phường Không Tồn Tại", "Quận 99", "Hồ Chí Minh");
  expect(kq).toEqual({ cu: null, chac: null, ungVien: [], trungTen: [] });
});
