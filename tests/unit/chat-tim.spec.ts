import { test, expect } from "@playwright/test";
import { lamSachTuKhoa, cacMucNoi } from "../../src/lib/chat-tim";

// Sự cố 30/9: "đường phạm hữu lầu có phòng trọ nào không" -> bot báo không có dù DB có 4 phòng.
test("lamSachTuKhoa: bỏ chữ đệm 'đường/phố/hẻm/gần' đầu cụm, rửa ký tự phá ilike/or", () => {
  expect(lamSachTuKhoa("đường Phạm Hữu Lầu")).toBe("Phạm Hữu Lầu");
  expect(lamSachTuKhoa("gần đường Nguyễn Văn Linh")).toBe("Nguyễn Văn Linh");
  expect(lamSachTuKhoa("Hẻm Lê Văn Sỹ")).toBe("Lê Văn Sỹ");
  expect(lamSachTuKhoa("Vinhomes Central Park")).toBe("Vinhomes Central Park");
  expect(lamSachTuKhoa("a%b,(c)")).toBe("a b c");
  expect(lamSachTuKhoa("đường")).toBe("");
  expect(lamSachTuKhoa(null)).toBe("");
});

test("cacMucNoi: chặt -> lỏng, bỏ giá trước, từ khoá giữ tới cuối, mức nới nào cũng có câu nói thật", () => {
  const m = cacMucNoi({ deal: "cho_thue", kind: "phong_tro", province: "Hồ Chí Minh", price_max: 3e6, keyword: "Phạm Hữu Lầu" });
  expect(m[0]).toEqual({ loc: expect.objectContaining({ price_max: 3e6, kind: "phong_tro", keyword: "Phạm Hữu Lầu" }), ghiChu: null });
  expect(m[1].loc).toMatchObject({ price_max: null, kind: "phong_tro", keyword: "Phạm Hữu Lầu" });
  expect(m[2].loc).toMatchObject({ kind: null, keyword: "Phạm Hữu Lầu" });
  expect(m[3].loc).toMatchObject({ keyword: null, province: "Hồ Chí Minh" });
  expect(m.slice(1).every((x) => !!x.ghiChu)).toBe(true);
  expect(m[3].ghiChu).toContain("Phạm Hữu Lầu");
});

test("cacMucNoi: không có gì để nới thì chỉ 1 mức; có từ khoá nhưng không có khu vực thì không bỏ từ khoá", () => {
  expect(cacMucNoi({ deal: "ban" })).toHaveLength(1);
  const m = cacMucNoi({ keyword: "Landmark 81" });
  expect(m.every((x) => x.loc.keyword === "Landmark 81")).toBe(true);
});
