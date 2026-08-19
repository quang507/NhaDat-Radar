import { test, expect } from "@playwright/test";

// Ghim hành vi của các bộ phân tích văn bản tiếng Việt trong crawler/.
//
// VÌ SAO CÓ FILE NÀY (review /ultrareview): `npm test` (playwright --project=unit) đã chạy sẵn trong
// .github/workflows/e2e.yml nhưng tests/unit chỉ có format.spec.ts — KHÔNG một hàm crawler nào được
// phủ. Hệ quả: commit 4dade2d nhét 5 byte BACKSPACE (0x08) vào giữa các regex, làm chúng KHÔNG BAO
// GIỜ khớp, và lỗi đó sống sót trọn một commit mà không ai biết. Một dòng expect dưới đây đã đủ
// đánh trượt nó ngay ngày đầu.
//
// Mọi chuỗi ở đây đều là ca THẬT lấy từ dữ liệu đã cào hoặc là tên đường/địa danh có thật.
// Dùng dynamic import vì crawler là ESM .mjs còn test là .ts.

const CRAWLER = "../../crawler/";

test("loaiBds: địa danh chứa chữ 'đất' KHÔNG được ép thành loại đất", async () => {
  const { loaiBds } = await import(CRAWLER + "guland.mjs");
  // Ca THẬT trong combined.json: tên xã cướp mất phân loại của một tin kho/xưởng.
  // Biên chữ KHÔNG cứu được ca này (tiếng Việt tách âm tiết -> "đất" vẫn là token độc lập),
  // phải chặn theo ngữ cảnh "sau đơn vị hành chính".
  expect(loaiBds("Cho thuê Kho, nhà xưởng 5000m2 giá 370 triệu tại - Chọn - Xã Đất Cuốc Huyện Bắc Tân Uyên")).toBe("mat_bang");
  expect(loaiBds("Bán nhà mặt tiền Huyện Đất Đỏ Bà Rịa Vũng Tàu")).toBe("nha");
  expect(loaiBds("Bán nhà Xã Đất Mũi Cà Mau")).toBe("nha");
  // "nhà VÀ đất" là bán nhà kèm đất, không phải bán đất
  expect(loaiBds("CHÍNH CHỦ BÁN NHÀ VÀ ĐẤT 220M2, SHR")).toBe("nha");
  // "nền tảng" không phải bất động sản — chú thích cũ khai đã chặn nhưng thực ra chưa
  expect(loaiBds("Nền tảng đầu tư bất động sản Guland")).toBe("khac");
  // odt|ont không biên thì khớp vào tên dự án ngoại văn
  expect(loaiBds("Bán shophouse Belmont Residence")).toBe("mat_bang");
  expect(loaiBds("Bán nhà phố Piedmont")).toBe("nha");
  // và vẫn phải nhận đúng tin đất thật
  expect(loaiBds("Bán đất nền dự án Waterfront City")).toBe("dat");
  expect(loaiBds("Bán đất thổ cư 100m2 Củ Chi")).toBe("dat");
  expect(loaiBds("Bán lô đất 5x20 Bình Chánh")).toBe("dat");
  // "kho" trần từng khớp "khoảng"/"khu" -> 44 tin xếp nhầm (18/8)
  expect(loaiBds("Cho thuê kho 500m2 Bình Chánh")).toBe("mat_bang");
  expect(loaiBds("Bán căn hộ Vinhomes Grand Park")).toBe("can_ho");
});

test("docDuong: đọc được tên đường thật mà bộ lọc từng chặn nhầm", async () => {
  const { docDuong } = await import(CRAWLER + "doc-dia-chi.mjs");
  // âm tiết trong danh sách chặn cũ nhưng là TÊN RIÊNG có thật
  expect(docDuong("mặt tiền Nguyễn Thông quận 3")).toBe("Nguyễn Thông");
  expect(docDuong("bán nhà đường Hải Phòng Đà Nẵng")).toContain("Hải Phòng");
  expect(docDuong("nhà mặt tiền Hướng Dương Phú Mỹ Hưng Quận 7")).toContain("Hướng Dương");
  expect(docDuong("bán nhà đường Lê Văn Sổ Hóc Môn")).toContain("Lê Văn Sổ");
  // blacklist LOAI từng neo ^ nên loại cả đường có thật bắt đầu bằng từ chỉ loại BĐS
  expect(docDuong("Bán nhà mặt tiền Đất Thánh, phường 6 Tân Bình")).toBe("Đất Thánh");
  expect(docDuong("Bán nhà phố Nhà Thờ, Hoàn Kiếm Hà Nội")).toBe("Nhà Thờ");
  expect(docDuong("đường Lô Tư, Bình Tân")).toBe("Lô Tư");
  // "Triệu" là họ, không phải đơn vị tiền
  expect(docDuong("đường Số 5 Triệu Việt Vương Hà Nội")).toContain("Triệu Việt");
  // tên có "Thị" (Nguyễn Thị / Võ Thị) không được cắt cụt thành "Võ"
  expect(docDuong("bán nhà mặt tiền Võ Thị Sáu Quận 3")).toContain("Võ Thị Sáu");
});

test("docDuong: bóc token bề rộng thay vì vứt cả ứng viên", async () => {
  const { docDuong } = await import(CRAWLER + "doc-dia-chi.mjs");
  expect(docDuong("Bán nhà hẻm 5m Nguyễn Thái Sơn, Gò Vấp")).toBe("Nguyễn Thái Sơn");
  expect(docDuong("hẻm 8m Nguyễn Duy Trinh Quận 2")).toBe("Nguyễn Duy Trinh");
  expect(docDuong("đường 12m Phạm Văn Đồng")).toBe("Phạm Văn Đồng");
  expect(docDuong("Bán nhà MTKD Nguyễn Trãi 5x20")).toBe("Nguyễn Trãi");
});

test("docDuong: mốc phải có biên và xếp dài trước ngắn", async () => {
  const { docDuong } = await import(CRAWLER + "doc-dia-chi.mjs");
  // "mt" không được khớp bên trong "MTV"
  expect(docDuong("Công ty TNHH MTV Địa Ốc Sài Gòn bán nhà quận 7")).toBeNull();
  // mốc "nằm trên" nuốt chữ "đường" -> vẫn phải tìm được mốc "đường" chồng lấn phía sau
  expect(docDuong("Nhà nằm trên đường Nguyễn Văn Linh")).toBe("Nguyễn Văn Linh");
  // ứng viên đầu bị loại thì phải sang KHỚP kế tiếp, không bỏ cả pattern
  expect(docDuong("Đường rộng 8m, nhà ở đường Nguyễn Trãi")).toBe("Nguyễn Trãi");
  // "Số N" là tên đường thật ở HCM -> không được nuốt chữ "Số"
  expect(docDuong("Cần bán gấp căn nhà đường Số 7 Bình Tân")).toContain("Số 7");
});

test("docDuong: vẫn từ chối thứ không phải tên đường", async () => {
  const { docDuong } = await import(CRAWLER + "doc-dia-chi.mjs");
  expect(docDuong("bán đất nền giá rẻ")).toBeNull();
  expect(docDuong("nhà 4 tầng 5 phòng ngủ")).toBeNull();
  expect(docDuong("")).toBeNull();
});

test("PHONE_RE: không được cắt SĐT ra từ giữa một dãy số dài", async () => {
  const { PHONE_RE } = await import(CRAWLER + "quality-gate.mjs");
  expect("LH 0908123456".match(PHONE_RE)?.[0]).toBe("0908123456");
  expect("Goi 0987 654 321 gap".match(PHONE_RE)?.[0]).toBe("0987 654 321");
  expect("LH +84908123456".match(PHONE_RE)?.[0]).toBe("+84908123456");
  // các dãy số KHÔNG phải SĐT
  expect("So tai khoan 19001234567890 Techcombank".match(PHONE_RE)).toBeNull();
  expect("Gia 8.500.000.000 VND".match(PHONE_RE)).toBeNull();
  expect("CCCD 079201012345 cap ngay".match(PHONE_RE)).toBeNull();
});

test("biên Unicode B/E phải được export và hoạt động với chữ có dấu", async () => {
  const { B, E, tuKhoa } = await import(CRAWLER + "quality-gate.mjs");
  expect(B).toBe("(?<!\\p{L})");
  expect(E).toBe("(?!\\p{L})");
  // \b của JS là ASCII nên vô dụng với tiếng Việt — đây là lý do B/E tồn tại
  expect(tuKhoa("kho").test("cho thuê kho 500m2")).toBe(true);
  expect(tuKhoa("kho").test("khoảng cách gần")).toBe(false);
  expect(tuKhoa("nhà").test("bán nhà quận 7")).toBe(true);
});

test("hai bản quality-gate (.mjs cho crawler / .ts cho webhook Zalo) không được lệch nhau", async () => {
  // Header của CẢ HAI file đều ghi "sửa 1 nơi thì sửa nơi kia" — nhưng lời nhắc bằng chú thích
  // không chặn được gì. Đợt vá PHONE_RE đầu tiên sửa .mjs mà bỏ quên .ts, để nguyên lỗi cắt-SĐT-
  // từ-giữa-dãy-số trên đường USER-FACING (mọi tin nhắn vào Zalo OA đi qua qualityGate).
  // Ca này biến "contract" đó thành thứ CI kiểm được.
  const mjs = await import(CRAWLER + "quality-gate.mjs");
  const ts = await import("../../src/lib/quality-gate");
  for (const ten of ["PHONE_RE", "BDS_KEYWORD", "AREA_HINT"] as const) {
    expect(String(ts[ten]), `${ten} lệch giữa bản .ts và .mjs`).toBe(String(mjs[ten]));
  }
  // và bản .ts phải thật sự chặn được dãy số không phải SĐT
  expect(ts.qualityGate("Bán nhà quận 7, số tài khoản 19001234567890")).toBe("không có SĐT");
  expect(ts.qualityGate("Bán nhà quận 7, LH 0908123456")).toBeNull();
});

test("soVN: dấu chấm là ngăn nghìn hay thập phân tuỳ vị trí", async () => {
  const { soVN } = await import(CRAWLER + "so-vn.mjs");
  // ngăn nghìn: đứng trước ĐÚNG 3 chữ số
  expect(soVN("8.500.000.000")).toBe(8500000000);
  expect(soVN("1.200")).toBe(1200);
  // thập phân — đây là ca từng làm giá lệch 10 lần ở batdongsan.mjs
  expect(soVN("4.2")).toBe(4.2);
  expect(soVN("3.05")).toBe(3.05);
  expect(soVN("28,8")).toBe(28.8);
  expect(soVN("950")).toBe(950);
  expect(soVN("")).toBeNull();
});
