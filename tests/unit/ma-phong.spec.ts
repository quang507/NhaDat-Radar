import { test, expect } from "@playwright/test";
import { maPhong, khoangIdTuMa } from "../../src/lib/ro-hang";

const ID = "193625b4-c0c1-473d-aa87-d196d155c00a";

test("maPhong: RH + 6 ký tự đầu id, viết hoa", () => {
  expect(maPhong(ID)).toBe("RH193625");
  expect(maPhong("ab-cdef12-0000")).toBe("RHABCDEF");
});

test("khoangIdTuMa: khách gõ hoa/thường, có/không RH đều ra đúng khoảng chứa id", () => {
  for (const ma of ["RH193625", "rh193625", " 193625 "]) {
    const k = khoangIdTuMa(ma)!;
    expect(k, ma).not.toBeNull();
    expect(ID >= k[0] && ID <= k[1], ma).toBe(true);
  }
  expect(khoangIdTuMa(maPhong(ID))).toEqual(khoangIdTuMa("193625"));
});

test("khoangIdTuMa: mã sai -> null (không lọc bừa cả bảng)", () => {
  for (const ma of ["", "RH", "RH12345", "RH1234567", "RHXYZ123", "1936'--"]) expect(khoangIdTuMa(ma), ma).toBeNull();
});
