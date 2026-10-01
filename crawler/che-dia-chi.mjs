// CHE SỐ NHÀ rổ hàng kiểu EvoHome (1/10): chỉ che PHẦN NHỎ NHẤT của số nhà, giữ số chính để khách
// biết đúng hẻm/đoạn đường - trước đây làm tròn số chính ("86/23/2" -> "Hẻm gần số 80") là chỉ sang
// một hẻm khác, có khi cách cả trăm mét.
//   hẻm      "86/23/2 Thích Quảng Đức"  -> "86/•• Thích Quảng Đức"   (giữ số hẻm chính, che các nhánh)
//   mặt tiền "166 Nguyễn Thái Sơn"      -> "16• Nguyễn Thái Sơn"     (che chữ số cuối)
//   số 1 chữ số "7 Lê Lợi"             -> "Đầu đường Lê Lợi"
//   không số "Hẻm Lê Lợi"               -> "Khu vực Lê Lợi"
// Số nhà VN rất tạp: "18-20", "7A1", "90Bis", "886/39A-886/39B", "01-02 F2 Đường DN4" -> bóc CẢ CỤM token
// đầu có chữ số (chỉ gồm chữ/số/"/"/"-"), phần còn lại là tên đường. Không ra tên đường -> "".

const gon = (s) => String(s || "").replace(/\s+,/g, ",").replace(/\s+/g, " ").trim();

export function cheDiaChi(dauDiaChi) {
  const toks = gon(dauDiaChi).split(" ");
  if (/^(hẻm|hem|h\.|số|so)$/i.test(toks[0])) toks.shift();
  const cumSo = [];
  while (toks.length && /\d/.test(toks[0]) && /^[\w/-]+$/.test(toks[0])) cumSo.push(toks.shift());
  const duong = gon(toks.join(" "));
  if (!duong) return "";
  if (!cumSo.length) return /\d/.test(duong.split(" ")[0]) ? "" : `Khu vực ${duong}`;
  const dau = cumSo[0];
  const chinh = (dau.match(/\d+/) || [""])[0];
  // hẻm: "86/23/2", "886/39A-886/39B" -> giữ số trước dấu "/" đầu tiên
  if (dau.includes("/")) return `${chinh || dau.split("/")[0]}/•• ${duong}`;
  // mặt tiền: che chữ số cuối của số chính ("166" -> "16•", "18-20" -> "1•", "90Bis" -> "9•")
  if (chinh.length >= 2) return `${chinh.slice(0, -1)}• ${duong}`;
  return `Đầu đường ${duong}`;
}
