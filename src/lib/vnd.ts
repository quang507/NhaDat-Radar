// "8 tỷ", "8,5 tỷ", "12 triệu", "12tr/tháng", "8000000000" -> VND.
// Người VN nghĩ bằng tỷ/triệu, không phải 10 số 0 (UX audit 16/8: ô giá cũ bắt nhập số thô -> dễ sai 1 số 0 = sai giá 10 lần).
export function parseVnd(raw: string): number | null {
  const t = raw.toLowerCase().replace(/\s+/g, " ").trim();
  if (!t) return null;
  const numStr = (t.match(/[\d.,]+/) || [""])[0];
  // "8.500.000.000" (dấu chấm ngăn nghìn) vs "8.5 tỷ" (dấu chấm thập phân): nếu mọi nhóm sau dấu chấm đủ 3 số -> ngăn nghìn
  const thousandSep = /^\d{1,3}(\.\d{3})+$/.test(numStr);
  const num = parseFloat(thousandSep ? numStr.replace(/\./g, "") : numStr.replace(",", "."));
  if (!num || num <= 0) return null;
  // đơn vị = phần chữ ngay sau số ("12tr/tháng" -> "tr", "8,5 tỷ" -> "tỷ", "8000000000" -> "")
  const unit = (t.slice(t.indexOf(numStr) + numStr.length).match(/^\s*([a-zà-ỹ]+)/) || ["", ""])[1];
  if (/^(tỷ|ty|ti|t)$/.test(unit)) return Math.round(num * 1e9);
  if (/^(triệu|trieu|tr|m)$/.test(unit)) return Math.round(num * 1e6);
  if (/^(nghìn|ngàn|nghin|ngan|k)$/.test(unit)) return Math.round(num * 1e3);
  return Math.round(num); // đã là VND
}

export function fmtVndWords(v: number | null): string {
  if (!v) return "";
  if (v >= 1e9) return (v / 1e9).toFixed(2).replace(/\.?0+$/, "") + " tỷ";
  if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, "") + " triệu";
  return v.toLocaleString("vi-VN") + " đ";
}
