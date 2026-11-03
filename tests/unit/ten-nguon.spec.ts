import { test, expect } from "@playwright/test";
import { tenNguon, tenTrang } from "../../src/lib/ro-hang";

// 3/11 (UX audit #7): thẻ tin từng hiện thô "zalo_group" / "batdongsan.com.vn"
test("tenTrang: source_site -> nhãn khách đọc được", () => {
  expect(tenTrang("zalo_group")).toBe("Nhóm Zalo");
  expect(tenTrang("zalo_bot")).toBe("Nhóm Zalo");
  expect(tenTrang("facebook")).toBe("Nhóm Facebook");
  expect(tenTrang("chotot")).toBe("Chợ Tốt");
  expect(tenTrang("batdongsan.com.vn")).toBe("Batdongsan");
  expect(tenTrang("mogi.vn")).toBe("Mogi");
  expect(tenTrang("guland.vn")).toBe("Guland");
  expect(tenTrang(null)).toBe("Tin web");
});

test("tenNguon: rổ hàng không lộ tên đối tác, tin tự đăng ghi Tự đăng", () => {
  expect(tenNguon({ source: "ro_hang", source_site: "radar" })).toBe("Đã xác minh");
  expect(tenNguon({ source: "crawl", source_site: "hifriendz" })).toBe("Đã xác minh");
  expect(tenNguon({ source: "agent", source_site: null })).toBe("Tự đăng");
  expect(tenNguon({ source: "crawl", source_site: "zalo_group" })).toBe("Nhóm Zalo");
});
