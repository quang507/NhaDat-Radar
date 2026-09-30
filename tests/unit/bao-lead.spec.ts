import { test, expect } from "@playwright/test";
import { baoLeadMoi } from "../../src/lib/bao-lead";

// Email báo admin khi có lead (30/9). Giả lập fetch - không gửi thư thật, không cần mạng.
test("baoLeadMoi: tiêu đề có tên/SĐT/lịch hẹn, nội dung thoát HTML, gửi về LEAD_NOTIFY_EMAIL", async () => {
  const goi: { url: string; body: Record<string, unknown> }[] = [];
  const fetchCu = globalThis.fetch;
  process.env.RESEND_API_KEY = "test";
  process.env.LEAD_NOTIFY_EMAIL = "a@x.com, b@y.com";
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    goi.push({ url, body: JSON.parse(String(init.body)) });
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    await baoLeadMoi({ listing_id: null, name: "An <b>", phone: "0912 345 678", message: "[HẸN XEM Chiều 30/09/2026] Cho em xem tối nay" });
  } finally {
    globalThis.fetch = fetchCu;
  }
  expect(goi).toHaveLength(1);
  expect(goi[0].url).toBe("https://api.resend.com/emails");
  const b = goi[0].body as { to: string[]; subject: string; html: string };
  expect(b.to).toEqual(["a@x.com", "b@y.com"]);
  expect(b.subject).toContain("Hẹn xem");
  expect(b.subject).toContain("0912345678");
  expect(b.subject).toContain("Chiều 30/09/2026");
  expect(b.html).toContain("An &lt;b&gt;");          // tên khách không chèn được HTML
  expect(b.html).not.toContain("An <b>");
  expect(b.html).toContain("Cho em xem tối nay");
  expect(b.html).not.toContain("[HẸN XEM");           // tiền tố lịch đã tách ra dòng riêng
  expect(b.html).toContain('href="tel:0912345678"');
});

test("baoLeadMoi: thiếu RESEND_API_KEY thì bỏ qua êm, không gọi mạng", async () => {
  const fetchCu = globalThis.fetch; let goi = 0;
  delete process.env.RESEND_API_KEY;
  globalThis.fetch = (async () => { goi++; return new Response("{}"); }) as typeof fetch;
  try { await baoLeadMoi({ listing_id: null, name: "A", phone: "0912345678", message: "" }); } finally { globalThis.fetch = fetchCu; }
  expect(goi).toBe(0);
});
