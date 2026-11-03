"use client";

// Phía trình duyệt: báo 1 sự kiện quan tâm (xem / gọi / zalo / chia sẻ / lưu) -> /api/su-kien, và gửi
// song song sang Google Analytics 4 (đã gắn ở layout) để xem biểu đồ tổng.
// sendBeacon: vẫn gửi được khi trang đang chuyển đi (bấm tel:/zalo.me), không chặn thao tác của khách.
type Loai = "xem" | "goi" | "zalo" | "chia_se" | "luu";

function maKhach(): string | null {
  try {
    let id = localStorage.getItem("ndr_khach");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("ndr_khach", id); }
    return id;
  } catch { return null; }   // chặn localStorage (ẩn danh) -> vẫn ghi, chỉ không gom theo khách
}

// 3/11 (UX audit #16): nguồn truy cập của PHIÊN - chốt ở trang đầu vào (utm_source mất sau khi khách bấm sang
// trang khác, nên đọc ngay lúc module nạp). Chỉ tên miền referrer, không lưu đường dẫn / từ khoá.
function nguonPhien(): string | null {
  try {
    const daCo = sessionStorage.getItem("ndr_nguon");
    if (daCo) return daCo;
    const utm = new URLSearchParams(location.search).get("utm_source");
    let host = "";
    try { host = document.referrer ? new URL(document.referrer).hostname : ""; } catch { /* referrer hỏng */ }
    const n = (utm || (!host ? "truc_tiep" : host.endsWith(location.hostname) ? "noi_bo" : host.replace(/^(www|m|l|lm)./, "")))
      .toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40) || "khac";
    sessionStorage.setItem("ndr_nguon", n);
    return n;
  } catch { return null; }
}
if (typeof window !== "undefined") nguonPhien();

const thietBi = () => (innerWidth < 768 ? "dt" : innerWidth < 1024 ? "tablet" : "pc");

export function baoSuKien(loai: Loai, listingId?: string | null) {
  try {
    if (navigator.webdriver) return;   // bộ test E2E / bot trình duyệt: không đếm (3/10)
    const body = JSON.stringify({ loai, listingId: listingId || null, khach: maKhach(), nguon: nguonPhien(), thietBi: thietBi() });
    if (!navigator.sendBeacon?.("/api/su-kien", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/su-kien", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
    }
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    w.gtag?.("event", `ndr_${loai}`, { listing_id: listingId || undefined });
  } catch { /* đo đạc không được làm hỏng thao tác */ }
}

/**
 * Chỉ báo Google Analytics (2/10) - cho chuyển đổi mà DB đã tự ghi phía server (đặt lịch, để lại SĐT)
 * hoặc ý định chưa phải chuyển đổi (bấm "Đặt lịch" trên thẻ). Tên sự kiện ndr_* để lọc gọn trong GA.
 */
export function baoGA(ten: string, thamSo: Record<string, string | number | undefined> = {}) {
  try {
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    w.gtag?.("event", ten, thamSo);
  } catch { /* đo đạc không được làm hỏng thao tác */ }
}
