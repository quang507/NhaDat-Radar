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

export function baoSuKien(loai: Loai, listingId?: string | null) {
  try {
    const body = JSON.stringify({ loai, listingId: listingId || null, khach: maKhach() });
    if (!navigator.sendBeacon?.("/api/su-kien", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/su-kien", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
    }
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    w.gtag?.("event", `ndr_${loai}`, { listing_id: listingId || undefined });
  } catch { /* đo đạc không được làm hỏng thao tác */ }
}
