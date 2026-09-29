import { test, expect } from "@playwright/test";

// Audit pipeline 22/9: (1) cache geocode ghi "không tìm thấy" VĨNH VIỄN và không thử biến thể ->
// "Thành phố Thủ Đức, Hồ Chí Minh" hỏng mãi (đo thật trên Nominatim), 96/170 khoá là null;
// (2) cờ giá lệch ngưỡng cứng ±28% gắn cờ 22% số tin (bán nhà phố 30%).
const CRAWLER = "../../crawler/";

test("bienTheKhoa: thử bỏ tiền tố cấp hành chính, giữ nguyên quận đánh số", async () => {
  const { bienTheKhoa } = await import(CRAWLER + "geocode-all.mjs");
  expect(bienTheKhoa("Thành phố Thủ Đức, Hồ Chí Minh")).toEqual(["Thành phố Thủ Đức, Hồ Chí Minh", "Thủ Đức, Hồ Chí Minh"]);
  expect(bienTheKhoa("Quận 7, Hồ Chí Minh")).toEqual(["Quận 7, Hồ Chí Minh"]);      // "7, Hồ Chí Minh" là vô nghĩa
  expect(bienTheKhoa("Phường Tân Hưng, Quận 7, Hồ Chí Minh")).toContain("Tân Hưng, Quận 7, Hồ Chí Minh");
  expect(bienTheKhoa("Huyện Nhà Bè, Hồ Chí Minh")[1]).toBe("Nhà Bè, Hồ Chí Minh");
});

test("docDuong: không nuốt từ nối vào cuối tên đường", async () => {
  const { docDuong } = await import(CRAWLER + "doc-dia-chi.mjs");
  expect(docDuong("Bán nhà đường Tô Ngọc Vân Gần chợ Thủ Đức")).toBe("Tô Ngọc Vân");
  expect(docDuong("hẻm xe hơi đường Lê Văn Việt cách ngã tư 200m")).toBe("Lê Văn Việt");
  expect(docDuong("nhà mặt tiền đường Nguyễn Trãi")).toBe("Nguyễn Trãi");
  expect(docDuong("đường Võ Thị Sáu ngay trung tâm")).toBe("Võ Thị Sáu");           // tên đường có "Thị" vẫn nguyên
});

test("cờ giá: hàng rào IQR chỉ gắn cờ giá thật sự dị thường", async () => {
  const { nguongGiaLech, coLech, CUM_TOI_THIEU } = await import(CRAWLER + "gop.mjs");
  // cụm nhà phố: giá/m² tản rộng nhưng bình thường - ngưỡng cứng ±28% sẽ gắn cờ 2 đầu
  const nhaPho = [60, 70, 80, 90, 100, 110, 130, 150, 170, 200].map((v) => v * 1e6);
  const ng = nguongGiaLech(nhaPho);
  expect(coLech(60e6, ng)).toBeNull();                 // -45% so với trung vị nhưng trong hàng rào
  expect(coLech(200e6, ng)).toBeNull();
  expect(coLech(20e6, ng)).toMatchObject({ reason: "thap_hon" });   // ngoài hàng rào -> vẫn cờ
  expect(coLech(600e6, ng)).toMatchObject({ reason: "cao_hon" });
  // cụm đồng đều (căn hộ cùng toà): hàng rào hẹp -> lệch vừa phải đã là dị thường
  const canHo = [48, 49, 50, 50, 50, 51, 52, 52, 53, 54].map((v) => v * 1e6);
  const ng2 = nguongGiaLech(canHo);
  expect(coLech(100e6, ng2)).toMatchObject({ reason: "cao_hon" });
  expect(coLech(52e6, ng2)).toBeNull();
  // cụm quá nhỏ -> không kết luận
  expect(nguongGiaLech(new Array(CUM_TOI_THIEU - 1).fill(50e6))).toBeNull();
  expect(coLech(1e9, null)).toBeNull();
});
