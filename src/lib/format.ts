export function fmtPrice(v: number | null, deal?: string): string {
  if (!v) return "Thoả thuận";
  const suffix = deal === "cho_thue" ? "/th" : "";
  if (v >= 1e9) {
    const t = v / 1e9;
    return (t % 1 ? t.toFixed(2).replace(/\.?0+$/, "") : String(t)) + " tỷ" + suffix;
  }
  if (v >= 1e6) return (Math.round(v / 1e5) / 10).toString().replace(/\.0$/, "") + " triệu" + suffix;
  return Math.round(v / 1e3) + "k";
}

/** Nhãn giá ngắn cho pin bản đồ / chip: 3.75 tỷ -> "3.8tỷ", 6.5tr -> "7tr" (audit 16/8: từng lặp ở page.tsx & SearchClient) */
export function shortPrice(v: number | null): string {
  if (!v) return "TL";
  if (v >= 1e9) { const t = v / 1e9; return (t % 1 ? t.toFixed(1) : String(t)) + "tỷ"; }
  return Math.round(v / 1e6) + "tr";
}

/** 45.700.000 -> "45.7 tr/m²" · 120.000 -> "120k/m²" (từng lặp ở chi tiết tin & AreaLanding) */
export const fmtPpm2 = (v: number) => (v >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, "") + " tr/m²" : Math.round(v / 1e3) + "k/m²");

/** "Quận 9 (P. Long Bình mới)" -> "Quận 9" (từng lặp ở 5 file) */
export const canonDistrict = (s: string | null | undefined) => (s || "").replace(/\s*\([^)]*\)\s*$/, "").trim();

/** 0h hôm nay theo giờ Việt Nam (ISO) — "N tin mới hôm nay" */
export function startOfDayVN(): string {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() - 7 * 3600 * 1000).toISOString();
}

export function fresh(min: number | null): string {
  if (min == null) return "";
  const m = Math.max(0, min);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${Math.round(m)} phút trước`;
  if (m < 1440) return `${Math.round(m / 60)} giờ trước`;
  return `${Math.round(m / 1440)} ngày trước`;
}

export const PROP: Record<string, string> = {
  nha: "Nhà", dat: "Đất nền", can_ho: "Căn hộ",
  mat_bang: "Mặt bằng", phong_tro: "Phòng trọ", khac: "Nhà đất khác",
};

export const AMEN: Record<string, string> = {
  pet: "🐾 Thú cưng", furnished: "🛋 Nội thất", ac: "❄ Máy lạnh", parking: "🅿 Chỗ để xe",
  security: "🔒 An ninh", near_market: "📍 Gần trung tâm", elevator: "🛗 Thang máy", corner: "📐 Lô góc",
  pool: "🏊 Hồ bơi", gym: "🏋 Gym", school: "🏫 Trường học", park: "🌳 Công viên", mall: "🛍 TTTM",
};

// gradient thumbnail theo loại (khi chưa có ảnh crawl)
export function thumb(kind: string): { bg: string; icon: string } {
  const map: Record<string, [string, string, string]> = {
    nha: ["#3B82F6", "#1E40AF", "🏠"], dat: ["#10B981", "#047857", "🌳"],
    can_ho: ["#8B5CF6", "#5B21B6", "🏢"], mat_bang: ["#F59E0B", "#B45309", "🏬"],
    phong_tro: ["#EC4899", "#9D174D", "🚪"], khac: ["#64748B", "#334155", "🏘️"],
  };
  const c = map[kind] || map.khac;
  return { bg: `linear-gradient(135deg, ${c[0]}, ${c[1]})`, icon: c[2] };
}
