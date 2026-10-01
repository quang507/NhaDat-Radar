import { test, expect } from "@playwright/test";
import { cheDiaChi } from "../../crawler/che-dia-chi.mjs";

// Che số nhà rổ hàng kiểu EvoHome (1/10): chỉ che phần nhỏ nhất, KHÔNG đổi số chính sang hẻm khác
test("cheDiaChi: hẻm giữ số chính, che các nhánh", () => {
  expect(cheDiaChi("86/23/2 Thích Quảng Đức")).toBe("86/•• Thích Quảng Đức");
  expect(cheDiaChi("588/37 Huỳnh Tấn Phát")).toBe("588/•• Huỳnh Tấn Phát");
  expect(cheDiaChi("886/39A-886/39B Lê Đức Thọ")).toBe("886/•• Lê Đức Thọ");
  expect(cheDiaChi("Hẻm 12/5 Lê Lợi")).toBe("12/•• Lê Lợi");
});

test("cheDiaChi: mặt tiền che chữ số cuối", () => {
  expect(cheDiaChi("166 Nguyễn Thái Sơn")).toBe("16• Nguyễn Thái Sơn");
  expect(cheDiaChi("18-20 Phan Xích Long")).toBe("1• Phan Xích Long");
  expect(cheDiaChi("90Bis Trần Quang Khải")).toBe("9• Trần Quang Khải");
  expect(cheDiaChi("7 Lê Lợi")).toBe("Đầu đường Lê Lợi");
});

test("cheDiaChi: không lộ số nhà thật, thiếu tên đường thì rỗng", () => {
  for (const s of ["86/23/2 Thích Quảng Đức", "166 Nguyễn Thái Sơn", "588/37 Huỳnh Tấn Phát"]) {
    expect(cheDiaChi(s)).not.toContain(s.split(" ")[0]);
  }
  expect(cheDiaChi("Hẻm Lê Lợi")).toBe("Khu vực Lê Lợi");
  expect(cheDiaChi("86/23/2")).toBe("");
});
