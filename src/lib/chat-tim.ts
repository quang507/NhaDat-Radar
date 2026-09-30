// Tìm tin cho chatbot (30/9) - tách khỏi api/chat/route.ts để unit test được (không cần Gemini).
//
// Sự cố 30/9: khách hỏi "đường phạm hữu lầu có phòng trọ nào không" -> DB có 4 phòng rổ hàng trên
// Phạm Hữu Lầu nhưng bot trả "chưa có". Vì: (1) từ khoá chỉ tìm trong TIÊU ĐỀ, (2) AI giữ chữ "đường"
// -> "%đường phạm hữu lầu%" không khớp tiêu đề "…gần số 40 Phạm Hữu Lầu…", (3) 0 kết quả -> nhảy sang tìm
// ngữ nghĩa ra phòng chỗ khác, rồi AI kết luận "không có".

/** Bỏ chữ đệm đầu cụm địa danh ("đường", "phố", "hẻm", "gần"...) - tiêu đề/địa chỉ hiếm khi ghi kèm */
export function lamSachTuKhoa(kw: string | null | undefined): string {
  let s = String(kw ?? "").replace(/[%_*,()]/g, " ").replace(/\s+/g, " ").trim();
  // lặp vì có thể chồng nhiều chữ: "gần đường ..."
  for (let i = 0; i < 3; i++) {
    s = s.replace(/^(khu vực|khu|gần|ngay|mặt tiền|mặt đường|đường|phố|hẻm|hẽm|ngõ|kiệt|tuyến|quanh|tại|ở)(\s+|$)/i, "");
  }
  return s.length >= 2 ? s : "";
}

export type BoLoc = {
  deal?: string | null; kind?: string | null; province?: string | null; district?: string | null;
  price_min?: number | null; price_max?: number | null; bedrooms?: number | null; keyword?: string | null;
};

/**
 * Các mức NỚI bộ lọc khi không ra kết quả, từ chặt tới lỏng. Mỗi mức kèm câu nói thật với khách
 * ("không có đúng … - đây là …") để bot không báo "không có" lúc thật ra đang đưa tin gần đúng,
 * và cũng không đưa tin chỗ khác mà im lặng như thể khớp.
 * Từ khoá (tên đường/dự án) là thứ khách để ý nhất -> giữ tới gần cuối; bỏ giá trước, rồi loại/phòng ngủ.
 */
export function cacMucNoi(b: BoLoc): { loc: BoLoc; ghiChu: string | null }[] {
  const muc: { loc: BoLoc; ghiChu: string | null }[] = [{ loc: b, ghiChu: null }];
  const co = (v: unknown) => v != null && v !== "";
  if (co(b.price_min) || co(b.price_max)) muc.push({ loc: { ...b, price_min: null, price_max: null }, ghiChu: "không có tin đúng mức giá bạn muốn - đây là các tin cùng khu vực, giá khác" });
  if (co(b.kind) || co(b.bedrooms)) muc.push({ loc: { ...b, price_min: null, price_max: null, kind: null, bedrooms: null }, ghiChu: "không có đúng loại bạn tìm - đây là các loại nhà đất khác cùng khu vực" });
  if (co(b.keyword) && (co(b.district) || co(b.province))) {
    muc.push({ loc: { ...b, price_min: null, price_max: null, keyword: null }, ghiChu: `không có tin nào ghi "${b.keyword}" - đây là các tin gần đó trong ${b.district || b.province}` });
  }
  return muc;
}
