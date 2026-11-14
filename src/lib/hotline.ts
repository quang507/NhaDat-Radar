// Hotline/Zalo của Radar (chủ sàn) - tách khỏi components/TuVanRadar để component client dùng mà không vòng import (2/10)
export const HOTLINE = "0387365020";
export const HOTLINE_DISPLAY = "0387 365 020";
export const HOTLINE_NAME = "Lê Quang";
export const HOTLINE_ZALO = `https://zalo.me/${HOTLINE}`;

/**
 * Số Zalo mà nút "Chat qua Zalo" mở thẳng; null = phải qua popup để lại SĐT.
 * 14/11: tin của Radar mở thẳng Zalo Radar (số công khai, popup gần như không thu được SĐT nào);
 * tin cào chỉ mở thẳng sau khi đã mở khoá số người đăng gốc.
 */
export function soZaloMoThang(isRadar: boolean, zaloDaMoKhoa: string | null | undefined): string | null {
  return isRadar ? HOTLINE : zaloDaMoKhoa ?? null;
}

export const PHONE_QUICK_DOMAIN = "sdt.nhadatradar.local";
export const SDT_RE = /^0\d{8,10}$/;

/** "+84 909 123 456" / "(84) 909.123.456" -> "0909123456" */
export function chuanHoaSdt(s: string | null | undefined): string {
  return String(s || "").replace(/[\s.()-]/g, "").replace(/^(?:\+?84)0?/, "0");
}

/** "0387365020" -> "0387 365 020" */
export function dinhDangSdt(s: string | null | undefined): string {
  const so = chuanHoaSdt(s);
  if (/^0\d{9}$/.test(so)) return so.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3");
  if (/^0\d{10}$/.test(so)) return so.replace(/^(\d{4})(\d{3})(\d{4})$/, "$1 $2 $3");
  return String(s || "").trim();
}

/** Che 3 số cuối kiểu Batdongsan: "0387365020" -> "0387 365 ***" */
export function cheSdtDuoi(s: string | null | undefined): string {
  const goc = String(s || "").trim();
  const sach = goc.replace(/[\s.()-]/g, "").replace(/^(?:\+?84)0?/, "0");
  const che = SDT_RE.test(sach) ? sach.slice(0, -3) + "***" : sach;
  const m = che.match(/^(0\d{3})(\d{3})(.+)$/);
  if (m) return `${m[1]} ${m[2]} ${m[3]}`;
  if (goc.includes("*")) return goc;
  return "0xxx xxx ***";
}

export const HOTLINE_MASKED = "0387 365 ***";

export function emailTuSdt(sdt: string): string {
  return `${chuanHoaSdt(sdt)}@${PHONE_QUICK_DOMAIN}`;
}

export function tenHienThiTaiKhoan(email?: string | null): string {
  if (!email) return "";
  const duoi = `@${PHONE_QUICK_DOMAIN}`;
  if (email.toLowerCase().endsWith(duoi)) return dinhDangSdt(email.slice(0, -duoi.length));
  return email;
}
