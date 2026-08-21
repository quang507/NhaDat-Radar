// Hàm dùng chung cho mọi crawler - một chỗ duy nhất, cùng tinh thần với so-vn.mjs.
//
// Vì sao phải gom (trả nợ 20/8, review 19/8 chỉ ra): hash từng có 3 bản chép tay y hệt
// (facebook/guland/mogi), canonProvince có 4 bản ĐÃ TRÔI KHỎI NHAU - bản merge thiếu
// "tphcm" mà bản mogi có, nghĩa là cùng một tỉnh được chuẩn hoá khác nhau tuỳ nguồn
// và bộ lọc tỉnh trên web bị tách đôi. Chép tay lần 4 thì lần 5 cũng sẽ lệch tiếp.

// Hash 31 cổ điển. CẢNH BÁO: kết quả này nằm trong ID bền của DB ("fb-xxx", "gl-xxx",
// "mg-xxx") - đổi một ký tự trong hàm là mọi tin cũ bị coi là tin mới và nhân đôi toàn bộ
// dữ liệu. Muốn "cải tiến" hàm này thì phải kèm migration đổi ID, đừng sửa tại chỗ.
// (jitter trong geocode-all.mjs dùng biến thể >>>0 KHÔNG gộp vào đây: khác semantics
// signed/unsigned, đổi sẽ xê dịch toạ độ rải của toàn bộ tin đã ghim.)
export function hash31(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }

// Sửa chuỗi Unicode hỏng từ Gemini (soát 21/8): chỗ vá JSON lỗi trong facebook.mjs giữ
// nguyên văn bản đã hỏng, nên DB dính tỉnh ma ("\u01ồng Nai" tách khỏi "Đồng Nai") và
// "Thủ Đức" vỡ thành 6 bucket (ƌ/Ǝ/Ɓ thay cho Đ) - lọc theo khu vực là mất tin.
// 3 lớp vá: escape \uXXXX hợp lệ còn sót dạng chữ -> decode; escape cụt -> bỏ;
// các ký tự Phi châu Gemini hay băm chữ Đ/ư thành -> đổi lại. KHÔNG đụng nguyên âm có
// dấu ("Quựn" vs "Quận") - đoán kiểu đó dễ sửa sai chữ đúng.
export function suaChuHong(s) {
  if (typeof s !== "string" || !s) return s;
  return s
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u[0-9a-fA-F]{0,3}(?![0-9a-fA-F])/g, "")
    .replace(/[ƉƊƎƁ]/g, "Đ").replace(/ƌ/g, "Đ").replace(/Ű/g, "ư").replace(/ű/g, "ư");
}

// Chuẩn hoá tên tỉnh về đúng một dạng viết - hợp NHẤT của cả 4 bản copy cũ (lấy superset
// các alias: bản merge thiếu "tphcm", các bản mogi thiếu "sai gon" không dấu).
export function canonProvince(p) {
  const t = (p || "").toLowerCase();
  if (/hà nội|ha noi/.test(t)) return "Hà Nội";
  if (/hồ chí minh|ho chi minh|tphcm|hcm|sài gòn|sai gon/.test(t)) return "Hồ Chí Minh";
  if (/đà nẵng|da nang/.test(t)) return "Đà Nẵng";
  return p || null;
}
