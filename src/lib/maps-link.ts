// Đọc toạ độ từ link Google Maps (1/10, ô "Khoảng cách" của bộ lọc kiểu EvoHome).
// Nhận: ".../@10.77,106.69,17z", "...!3d10.77!4d106.69", "?q=10.77,106.69", "ll=", "query=", hoặc gõ thẳng "10.77, 106.69".
// Ưu tiên !3d!4d (toạ độ của chính địa điểm) hơn @ (tâm khung nhìn).
export function toaDoTuLink(s: string): { lat: number; lng: number } | null {
  const t = decodeURIComponent(String(s || "")).trim();
  const thu = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /[?&](?:q|ll|query|destination|center)=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/,
  ];
  for (const re of thu) {
    const m = t.match(re);
    if (m) {
      const lat = Number(m[1]), lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}

/** chỉ theo redirect tới host Google Maps (chặn SSRF: không cho server gọi URL tuỳ ý) */
export const laHostMaps = (h: string) =>
  /^(maps\.app\.goo\.gl|goo\.gl|(www\.|maps\.)?google\.(com|[a-z]{2})(\.[a-z]{2})?)$/i.test(h);
