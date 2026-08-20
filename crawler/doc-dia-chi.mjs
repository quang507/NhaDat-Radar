// Đọc TÊN ĐƯỜNG từ nội dung bài đăng, cho những nguồn không có sẵn trường địa chỉ
// (Facebook, chotot, mogi). Ghim theo đường sát hơn ghim theo phường/quận rất nhiều.
//
// Bài Facebook viết rất lộn xộn nên CHỈ nhận khi có MỐC rõ ràng đứng trước tên đường
// ("đường", "hẻm", "ngõ", "HXH", "mặt tiền", "số 12"). Đoán mò kiểu bắt mọi cụm viết hoa
// sẽ ra "Lotte Mart", "Cityland", "Sổ Hồng Riêng" - vừa sai vừa nhiều.
//
// An toàn kể cả khi đọc sai: geo.mjs bắt kết quả geocode phải khớp cả tên địa danh lẫn tỉnh,
// nên một tên đường bịa ra sẽ tra không thấy rồi tự lùi về phường/quận - chứ không ghim bậy.

// MOC phải có BIÊN hai đầu và xếp DÀI TRƯỚC NGẮN (review /ultrareview):
//  - không biên: "mt" khớp bên trong "Công ty TNHH MTV..." -> capture "V Địa Ốc Sài"
//  - "mt" đứng trước "mtkd" thì nhánh "mtkd" không bao giờ tới lượt -> "MTKD Nguyễn Trãi" cụt đầu
// Mỗi khoá rác sinh ra ở đây bị geo-cache.json ghi null VĨNH VIỄN, nên sai chỗ này rất đắt.
const MOC = "(?<!\\p{L})(?:địa chỉ|đ/c|toạ lạc|tọa lạc|nằm trên|mặt tiền|mtkd|đường|hẻm|hxh|ngõ|ngách|phố|mt)(?!\\p{L})";

// tên đường: 1-4 từ, mỗi từ bắt đầu bằng chữ HOA (hoặc là số như "Tỉnh lộ 10", "Số 51")
const TU = "[A-ZĐÀ-Ỹ][a-zà-ỹA-ZĐÀ-Ỹ.]*|\\d+[A-Za-z]?(?:/\\d+)?";
// Cửa sổ 4 từ KHÔNG được nuốt sang phần hành chính: "đường Số 10 Linh Xuân Thủ Đức" từng ra
// "10 Linh Xuân Thủ" (cắt giữa tên quận) -> khoá geocode vô nghĩa, tra hỏng rồi cache null.
// "Thị" phải là "Thị trấn"/"Thị xã", KHÔNG để trần: "Nguyễn Thị Búp", "Võ Thị Sáu", "Huỳnh Thị Nở"
// là tên đường cực phổ biến - chặn trần sẽ cắt cụt thành "Nguyễn", "Võ", "Huỳnh" (đo trên tin thật).
const HANH_CHINH = "(?:Phường|Quận|Huyện|Xã|Thị\\s+(?:trấn|xã)|TP\\.?|Tỉnh|P\\.|Q\\.|H\\.)";
const TU_TIEP = `(?!${HANH_CHINH}(?!\\p{L}))(?:${TU})`;
// KHÔNG nuốt chữ "Số": "Đường Số 7" là TÊN THẬT của hàng trăm tuyến ở HCM (Bình Tân, Q7, Thủ Đức).
// Bỏ nó đi thì khoá còn "7 Bình Tân" - geo.mjs kiểm tên sẽ loại, cả họ đường đánh số mất tầng ĐƯỜNG.
const RE_DUONG = new RegExp(`${MOC}\\s*((?:${TU})(?:\\s+${TU_TIEP}){0,3})`, "iu");

// "12 Nguyễn Trãi", "68 Đội Cấn" - số nhà đứng ngay trước tên đường
const RE_SO_NHA = new RegExp(`(?:^|[.,;\\n])\\s*(\\d{1,4}(?:/\\d{1,3})?)\\s+((?:${TU})(?:\\s+(?:${TU})){1,3})`, "u");

// những cụm KHÔNG phải tên đường tuy hay đứng sau mốc
// review 19/8: \b la ASCII - sau chu co dau ("nha","gia","chu") khong bao gio la bien,
// hon nua blacklist vo hieu. Dung (?!\p{L}) nhu quality-gate.mjs da tu tai lieu hoa.
//
// review /ultrareview: bản `^`-anchor loại ứng viên chỉ vì TỪ ĐẦU trùng danh sách, mà nhiều
// đường có thật bắt đầu đúng bằng những từ đó - Đất Thánh (Tân Bình), Nhà Thờ (Hoàn Kiếm),
// Lô Tư (Bình Tân), Giá Rai (Bạc Liêu). Vì loại bỏ là bỏ luôn cả pattern (không có lần thử
// thứ hai), mất mát là vĩnh viễn. Giờ chỉ loại khi ứng viên TOÀN BỘ là từ mô tả:
//   "Đất Nền" -> loại   |   "Đất Thánh" -> giữ (Thánh không nằm trong danh sách)
const TU_MO_TA = "xe hơi|ô tô|oto|rộng|lớn|nhỏ|cụt|nhựa|bê tông|trước nhà|kinh doanh|đẹp|vip|sạch|mới"
  + "|chính chủ|sổ hồng|sổ đỏ|giá|dt|diện tích|nhà|đất|căn|lô|nền|bán|cho thuê|cần|liên hệ|lh|chủ|em|anh|chị";
const LOAI = new RegExp(`^(?:${TU_MO_TA})(?:\\s+(?:${TU_MO_TA}))*$`, "iu");

const don = (s) => (s || "")
  .replace(/[.,;:!?)\]]+$/, "")
  .replace(/\s+/g, " ")
  .trim();

/** Trả về tên đường đọc được, hoặc null. */
export function docDuong(text) {
  const t = String(text || "").replace(/\s+/g, " ");
  if (!t) return null;

  for (const re of [RE_DUONG, RE_SO_NHA]) {
    // Duyệt MỌI khớp, không chỉ khớp đầu: review /ultrareview - `match` chỉ lấy khớp ĐẦU TIÊN, và
    // mỗi lần bị loại lại nhảy sang REGEX kế tiếp chứ không phải KHỚP kế tiếp. Hậu quả đo được:
    // ứng viên RE_DUONG bị loại rơi xuống RE_SO_NHA rồi cào lại đúng câu đó ra khoá tệ hơn -
    // "mặt tiền 25m Chợ Lớn P.11 Quận 6" -> "11 Quận 6" (số phường + quận, không phải đường);
    // "Đường rộng 8m, nhà ở đường Nguyễn Trãi" -> null dù đường hợp lệ nằm ngay phía sau.
    //
    // Lùi lastIndex về m.index+1 khi bị loại (thay vì matchAll nhảy qua cả khớp) để tìm được khớp
    // CHỒNG LẤN: "Nhà nằm trên đường Nguyễn Văn Linh" - mốc "nằm trên" khớp trước và nuốt luôn chữ
    // "đường" phía sau, nên nếu bỏ qua cả khớp thì mốc "đường" thật không bao giờ tới lượt.
    const reG = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    for (let m; (m = reG.exec(t)) !== null; reG.lastIndex = m.index + 1) {
      // RE_SO_NHA có 2 nhóm (số nhà + tên), RE_DUONG có 1
      let ten = don(m[2] ? `${m[1]} ${m[2]}` : m[1]);
      // MỌI từ phải bắt đầu bằng chữ HOA (hoặc là số) - tên riêng viết hoa, còn chữ thường
      // lọt vào là câu văn chứ không phải tên đường ("hông tứ hướng th", "623 để được").
      // Co /i cua RE lam TU khop ca chu thuong -> capture nuot them duoi cau ("Nguyen Trai
      // rong 8m", "Vanh Dai 3 gia"). Cat o tu KHONG viet hoa dau tien - phan truoc moi la ten
      // rieng. Dung \p{Lu} that: [A-ZĐÀ-Ỹ] tuong la hoa nhung dai À-Ỹ (U+00C0-U+1EF8) chua
      // CA chu thuong co dau nen "đẹp" van lot (do that 19/8).
      const tu = ten.split(/\s+/);
      const viTriThuong = tu.findIndex((w) => !/^[\p{Lu}0-9]/u.test(w));
      if (viTriThuong === 0) continue;
      if (viTriThuong > 0) ten = tu.slice(0, viTriThuong).join(" ");
      // Bề rộng hẻm/đường dính vào tên: "hẻm 5m Nguyễn Thái Sơn", "12m Đặng Thuỳ Trâm",
      // "Tân Mai 11m". review /ultrareview: bản cũ VỨT CẢ ứng viên ở nhánh `m(?!\p{L})` -
      // đo trên 1043 tin không có address: mất 27 lượt đọc đường, được 0. Bóc token rồi thử lại.
      // cũng bóc token kích thước đuôi dạng "5x20"/"4x" ("MTKD Nguyễn Trãi 5x20"): giữ được tên
      // đường thay vì loại cả cụm ở bộ lọc đơn vị phía dưới.
      ten = don(ten.replace(/^\d+\s*m(?!\p{L})\s*/iu, "")
        .replace(/\s*\d+\s*m(?!\p{L})$/iu, "")
        .replace(/\s*\d+\s*x\s*\d*$/iu, ""));
      if (!ten || ten.length < 4 || ten.length > 60) continue;
      if (LOAI.test(ten)) continue;
      if (/^\d+$/.test(ten)) continue;              // toàn số -> không phải tên đường
      // có đơn vị đo lẫn vào -> là mô tả kích thước, không phải tên đường
      // ("4 TẦNG", "trước Nhà 3m thông", "lộ nhựa 220m MĐS")
      // review /ultrareview: `tầng`/`lầu`/`pn`/`wc` từng để TRẦN trong khi `m`/`ty`/`tr` được cấp
      // biên - mà `tỷ` KHÔNG được `ty(?!\p{L})` bao vì `ỷ` != `y`. Nay cấp biên cho TẤT CẢ.
      // Đã BỎ `triệu|tỷ`: /i không phân biệt được đơn vị tiền với danh từ riêng, nên chúng chặn
      // nhầm đường thật - "Số 5 Triệu Việt Vương" (Hà Nội), "Triệu Quang Phục". Cụm giá lọt vào
      // cửa sổ 4 từ viết hoa là rất hiếm, còn tên đường họ Triệu thì không.
      // `x\d*` chứ không `x\d`: TU khớp "5x" rồi dừng (không có dấu cách trước "20"), nên
      // "MTKD Nguyễn Trãi 5x20" từng lọt ra "Nguyễn Trãi 5x".
      if (/\d\s*(?:m2|m²|m|tầng|lầu|ty|tr|pn|wc|x\d*)(?!\p{L})/iu.test(ten)) continue;
      // Danh sách chặn phải neo theo CỤM TỪ, không phải âm tiết trần: tiếng Việt tách âm tiết
      // bằng khoảng trắng nên âm tiết trần khớp thẳng vào TÊN RIÊNG. review /ultrareview đo được
      // các đường thật bị mất trắng: Nguyễn Thông (Q3), Hải Phòng, Hướng Dương (Q7), Đường Ngang,
      // Phòng Không Không Quân (HN), Lê Văn Sổ, Nguyễn Thị Được. Các từ chức năng viết thường
      // (để/được/có/là/và) đã bị luật CHỮ HOA phía trên cắt rồi, giữ lại ở đây chỉ gây hại.
      if (/(?<!\p{L})(?:tầng|lầu|wc|phòng\s*(?:ngủ|khách|tắm|bếp)|sổ\s*(?:hồng|đỏ|riêng)|giá\s*(?:rẻ|tốt|bán)|hướng\s*(?:đông|tây|nam|bắc))(?!\p{L})/iu.test(ten)) continue;
      return ten;
    }
  }
  return null;
}
