import { test, expect } from "@playwright/test";
import { cheSoVanBan, locMoTaTrungLap } from "../../src/lib/doc-quyen";

// 2/11: regex che SĐT từng cắt cả giá ("1.500.000.000" -> "1.500.0***"). Giá phải giữ nguyên, SĐT mọi kiểu viết phải bị che.
test("cheSoVanBan: giữ nguyên giá, che SĐT", () => {
  for (const gia of ["Giá 1.500.000.000 đ", "Giá 3.500.000đ/tháng", "Cọc 10,000,000", "DT 100m2, 2.000.000.000"]) {
    expect(cheSoVanBan(gia)).toBe(gia);
  }
  for (const sdt of ["0909.123.456", "0388 999 111", "0909123456", "+84 909 123 456", "84909123456"]) {
    const ra = cheSoVanBan(`Gọi ${sdt} nhé`);
    expect(ra).toContain("***");
    expect(ra.replace(/\D/g, "").length).toBeLessThan(5);
  }
  expect(cheSoVanBan("P.302 0909123456")).toBe("P.302 0909*** (liên hệ qua Radar)");
  expect(cheSoVanBan("LH 0909123456", false)).toBe("LH 0909*** (bấm Xem SĐT)");
});

test("locMoTaTrungLap: cắt bỏ khối chi phí dịch vụ, điều khoản và giá lặp lại", () => {
  const sample = `🏠 Cho thuê Studio tại Tôn Thất Thuyết, Q4.
• Diện tích: 25 m²
• Giá thuê: 6.3 triệu/tháng
📌 CHI PHÍ DỊCH VỤ:
• Điện: 4.000 đ/kWh
• Nước: 130.000 đ
• Gửi xe: Miễn phí 1 xe
📋 ĐIỀU KHOẢN:
• Tiền cọc: 1 tháng
• Số người ở: Tối đa 2 người
• Giờ giấc: Tự do
✨ TIỆN NGHI PHÒNG:
• Cửa sổ
• Full nội thất

💬 Hẹn xem phòng thực tế miễn phí qua Radar.`;

  const cleaned = locMoTaTrungLap(sample);
  expect(cleaned).toContain("🏠 Cho thuê Studio tại Tôn Thất Thuyết, Q4.");
  expect(cleaned).toContain("✨ TIỆN NGHI PHÒNG:");
  expect(cleaned).toContain("• Cửa sổ");
  expect(cleaned).toContain("💬 Hẹn xem phòng thực tế miễn phí qua Radar.");

  // Không còn các khối lặp lại
  expect(cleaned).not.toContain("CHI PHÍ DỊCH VỤ");
  expect(cleaned).not.toContain("Điện: 4.000 đ/kWh");
  expect(cleaned).not.toContain("ĐIỀU KHOẢN");
  expect(cleaned).not.toContain("Tiền cọc: 1 tháng");
  expect(cleaned).not.toContain("• Diện tích: 25 m²");
  expect(cleaned).not.toContain("• Giá thuê: 6.3 triệu/tháng");
});
