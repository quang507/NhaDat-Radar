// Làm sạch innerText bài Facebook (dùng chung: facebook.mjs khi cào + script dọn DB).
// Sự cố 17/8: mô tả tin FB trên web toàn "Facebook Facebook Facebook…" (alt của ảnh bị chặn tải),
// chuỗi chống cào của FB tách từng chữ 1 dòng ("p͏\nt͏\ne͏…" — có U+034F chèn giữa), và chữ UI
// ("Theo dõi", "Xem thêm", "Viết bình luận công khai…", "Chỉ báo trạng thái online"…).

// Dòng UI Facebook (so khớp CẢ DÒNG, không phân biệt hoa thường)
const UI_LINE = new RegExp("^(?:" + [
  "facebook", "theo dõi", "đang theo dõi", "xem thêm", "ẩn bớt", "nhắn tin", "tác giả", "miễn phí", "trả lời",
  "chỉ báo trạng thái online", "đang hoạt động", "thích", "bình luận", "chia sẻ", "gửi", "gửi tin nhắn", "sao chép liên kết",
  "người đóng góp nổi bật", "người kiểm duyệt", "quản trị viên", "thành viên mới", "thành viên", "bạn bè", "người theo dõi",
  "nhóm công khai", "nhóm riêng tư", "đã chia sẻ với nhóm công khai", "đã chia sẻ với công khai",
  "tất cả cảm xúc:.*", "\\d+ (?:lượt )?(?:thích|bình luận|chia sẻ|lượt xem).*",
  "\\d+\\s*(?:giờ|phút|ngày|tuần|tháng|năm)(?: trước)?", "vừa xong", "hôm qua", "·", "•", "\\.", "…",
  "chỉnh sửa", "đã chỉnh sửa", "được tài trợ", "sắp xếp bảng feed nhóm theo.*", "bài niêm yết hàng đầu", "hoạt động mới đây",
  "\\+\\d+", "@mọi người", "@all", "xem bản dịch", "đánh giá bản dịch này",   // "+2" = số ảnh còn lại của album
].join("|") + ")$", "i");

// Từ dòng này trở đi là phần BÌNH LUẬN / thanh tương tác của FB -> cắt bỏ hết phía sau
const CUT_FROM = /^(?:viết bình luận(?: công khai)?[.…]*|xem thêm bình luận|xem \d+ bình luận.*|bình luận phù hợp nhất|xem tất cả \d+ bình luận|xem thêm phản hồi|\d+ (?:lượt )?bình luận|thích\s*·\s*trả lời.*)$/i;

// Đuôi "… Xem thêm" FB gắn khi cắt bài dài (nội dung sau đó bị ẩn -> chỉ bỏ nhãn)
const SEE_MORE_TAIL = /\s*(?:…|\.{3})?\s*xem thêm$/i;

// Ký tự vô hình / kết hợp mà FB chèn để phá copy: U+034F (COMBINING GRAPHEME JOINER), zero-width, BOM, soft hyphen
const INVISIBLE = new RegExp("[" + String.fromCharCode(0x034F, 0x200B, 0x200C, 0x200D, 0x200E, 0x200F, 0x2060, 0xFEFF, 0x00AD) + "]", "g"); // U+034F CGJ, zero-width, BOM, soft hyphen

export function cleanFbText(raw) {
  if (!raw) return "";
  // NFKC: chữ "kiểu" Unicode toán học (𝐁𝐀́𝐍 𝐍𝐇𝐀̀, 𝟔 𝐓𝐀̂̀𝐍𝐆…) người đăng dùng cho nổi -> về chữ thường,
  // không thì cổng chất lượng / Gemini không nhận ra "bán nhà". Tiếng Việt NFC không đổi.
  const lines = String(raw).normalize("NFKC").replace(/\r/g, "").split("\n").map((l) => l.replace(INVISIBLE, "").trim());
  const out = [];
  let shortRun = [];                        // gom chuỗi dòng 2 ký tự liên tiếp (chuỗi chống cào)
  const flushShort = () => {
    // ≥ 5 dòng 2 ký tự liên tiếp = chuỗi rác chống cào -> bỏ hẳn; ít hơn có thể là danh sách thật -> giữ
    if (shortRun.length && shortRun.length < 5) out.push(...shortRun);
    shortRun = [];
  };
  for (let l of lines) {
    if (!l) { flushShort(); if (out.length && out[out.length - 1] !== "") out.push(""); continue; }
    if (CUT_FROM.test(l)) { flushShort(); break; }          // vào phần bình luận -> dừng hẳn
    if (UI_LINE.test(l)) { flushShort(); continue; }
    if (l.length <= 1) continue;                            // 1 ký tự lẻ (số like, chữ chống cào) -> luôn bỏ
    if (l.length === 2) { shortRun.push(l); continue; }
    flushShort();
    l = l.replace(SEE_MORE_TAIL, "").trim();
    if (l) out.push(l);
  }
  flushShort();
  // 1-2 dòng đầu thường là tên người đăng + "·" — không phải nội dung nhưng khó phân biệt chắc chắn nên giữ.
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
