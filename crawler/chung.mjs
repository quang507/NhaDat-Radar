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

// Chuẩn hoá tên tỉnh về đúng một dạng viết - hợp NHẤT của cả 4 bản copy cũ (lấy superset
// các alias: bản merge thiếu "tphcm", các bản mogi thiếu "sai gon" không dấu).
export function canonProvince(p) {
  const t = (p || "").toLowerCase();
  if (/hà nội|ha noi/.test(t)) return "Hà Nội";
  if (/hồ chí minh|ho chi minh|tphcm|hcm|sài gòn|sai gon/.test(t)) return "Hồ Chí Minh";
  if (/đà nẵng|da nang/.test(t)) return "Đà Nẵng";
  return p || null;
}
