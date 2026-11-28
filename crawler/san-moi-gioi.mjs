// SĂN KHÁCH CỦA MÔI GIỚI (14/11/2026) - bài "Khách em cần 1PN Q2 tầm 10tr" trong nhóm Zalo môi giới.
// Trước đây khach-tim.mjs bỏ hẳn loại bài này (chỉ nhận người tự đi thuê), trong khi phần lớn bài "tìm phòng"
// ở các nhóm Radar tham gia là môi giới tìm hộ khách. Anh Quang chốt 14/11: Radar nhận hợp tác chia hoa hồng.
//
// Luồng: lọc thô regex -> AI bóc nhu cầu -> khớp CHẶT rổ hàng (đúng quận, đúng tầm giá) -> thẻ báo Zalo admin
// kèm câu mời hợp tác soạn sẵn. Bot KHÔNG tự nhắn môi giới: anh Quang gõ "K1234 1" để gửi câu soạn sẵn
// (hoặc "K1234 <câu>") qua acc Radar - giữ acc clone khỏi bị Zalo khoá vì nhắn hàng loạt.

import { maPhong, fmtGia } from "./zalo-tu-van-lead.mjs";

// "Khách em cần…", "Khách Hàn ở gia đình tìm 2pn…", "Tìm giúp khách…", "ACE có căn … gửi em"
const MG_TIM = new RegExp([
  "(khách|khach)(\\s+[\\p{L}\\d/]+){0,5}?\\s+(cần|can|tìm|tim|kiếm|kiem|muốn|muon|đang tìm|dang tim)\\b",
  "(khách|khach)\\s*(cần|can|tìm|tim)\\b",
  "(tìm|tim|kiếm|kiem)\\s*(giúp|giùm|gium|hộ|ho)\\s*(khách|khach)",
  "(ace|anh chị|anh chi|a\\/c|ac)\\s*(nào\\s*)?(có|co|nắm|nam)\\s*(căn|can|phòng|phong|hàng|hang)[^\\n]{0,60}(gửi|gui|ib|inbox|báo|bao)\\s*(em|mình|minh)",
].join("|"), "iu");

// giọng ĐANG RAO hàng (cho thuê/bán) -> không phải đi tìm hàng
const MG_RAO = new RegExp([
  "cần cho thuê|can cho thue|chính chủ cho thuê|chinh chu cho thue",
  "còn trống|con trong|phòng trống|phong trong|sẵn phòng|sẵn căn|sẵn chìa|trống sẵn",
  "bên em (có|còn)|em (có|còn) (phòng|căn)|giỏ hàng|gio hang|quỹ căn|bảng giá",
  "giá thuê\\s*:|giá\\s*:\\s*\\d|lh\\s*:|liên hệ\\s*:",
  "bán nhanh|cần bán|can ban|chuyển nhượng|sẵn sổ|sổ hồng",
].join("|"), "iu");

/** Bài môi giới đi tìm hàng cho khách (lọc thô, rẻ, trước khi gọi AI) */
export function laBaiMoiGioiTimHang(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length < 10 || t.length > 600) return false;
  return MG_TIM.test(t) && !MG_RAO.test(t);
}

export const SYS_MG = `Bạn đọc tin nhắn trong nhóm Zalo của dân môi giới bất động sản ở Việt Nam.
Việc: nhận ra tin MÔI GIỚI/SALE ĐANG TÌM HÀNG CHO KHÁCH CỦA HỌ ("Khách em cần...", "Khách Hàn gia đình tìm 2PN...", "Tìm giúp khách...", "ACE có căn... gửi em").
QUY TẮC:
1. is_demand=true khi người viết đang tìm chỗ để THUÊ (hoặc MUA) cho khách, kể cả khi họ là môi giới.
2. is_demand=false khi người viết đang RAO hàng (cho thuê, bán, báo giá căn trống, đăng giỏ hàng, sang nhượng).
3. deal="thue" nếu khách cần thuê, "mua" nếu khách cần mua.
4. Ngân sách ghi "10tr", "10-12 củ", "500$" thì đổi ra VNĐ/tháng (1$ khoảng 25.000đ).
5. Không ghi quận nhưng có tên dự án/toà nhà (Estella, Sunwah Pearl, The River...) hoặc BỐI CẢNH NHÓM ở cuối thì suy ra quận.`;

const boDau = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();

/** "Quận 2", "Q2", "TP. Thủ Đức", "Thủ Đức" -> khoá so sánh; Q2/Q9/Thủ Đức gộp chung (đã sáp nhập) */
export function khoaQuan(s) {
  let k = boDau(s).replace(/^(thanh pho|tp\.?|quan|huyen|q\.?)\s*/, "").replace(/\s+/g, " ").trim();
  if (/^(2|9|thu duc|thu thiem|thao dien|an phu|an khanh)$/.test(k)) k = "thu duc";
  return k;
}

/** Loại căn khách cần: {pn:N} | "studio" | "gac" | "nha" | "mb" | null (đọc từ tóm tắt + yêu cầu của AI) */
export function loaiKhachCan(nhuCau) {
  const s = boDau(`${nhuCau?.tom_tat || ""} ${(nhuCau?.yeu_cau || []).join(" ")}`);
  const pn = s.match(/(\d)\s*-?\s*(\d\s*)?(pn|phong ngu|bedroom|br)\b/);
  if (pn) return { pn: Number(pn[1]) };
  if (/studio|\bstu\b/.test(s)) return "studio";
  if (/gac|duplex/.test(s)) return "gac";
  if (nhuCau?.loai_phong === "mat_bang" || /mat bang|kinh doanh|kiot/.test(s)) return "mb";
  if (nhuCau?.loai_phong === "nha" || /nguyen can|nha pho/.test(s)) return "nha";
  return null;
}

/** Loại của 1 căn rổ hàng theo specs "Loại phòng" */
export function loaiCuaCan(c) {
  const s = boDau(c?.specs?.["Loại phòng"] || c?.specs?.["Loại hình"] || "");
  const pn = s.match(/(\d)\s*phong ngu/);
  if (pn) return { pn: Number(pn[1]) };
  if (/gac|duplex/.test(s)) return "gac";
  if (/nguyen can/.test(s)) return "nha";
  if (/mat bang|kiot/.test(s)) return "mb";
  if (/studio|^phong|can ho/.test(s)) return "studio";
  return null;
}

const hopLoai = (can, loai) => {
  if (!can) return false;
  if (typeof loai === "object") return typeof can === "object" && (loai.pn >= 3 ? can.pn >= 3 : can.pn === loai.pn);
  if (loai === "studio" || loai === "gac") return can === "studio" || can === "gac";
  return can === loai;
};

/**
 * Lọc CHẶT căn khớp: đúng quận (bắt buộc), đúng loại căn (số phòng ngủ / studio / gác), giá trong tầm ±15%.
 * Khách không nói loại thì phải có giá mới gửi. timPhongPhuHop() có bước "lấy đại căn mới nhất" khi không
 * tìm ra - với môi giới, gửi gác lửng 4tr cho khách cần 3PN là mất uy tín, nên không khớp thì không báo.
 */
export function locCanKhop(dsCan, nhuCau, toiDa = 3) {
  const quan = (nhuCau?.quan || []).map(khoaQuan).filter(Boolean);
  if (!quan.length) return [];
  const loai = loaiKhachCan(nhuCau);
  if (!loai && !nhuCau?.gia_den && !nhuCau?.gia_tu) return [];
  const tu = nhuCau?.gia_tu ? nhuCau.gia_tu * 0.85 : 0;
  const den = nhuCau?.gia_den ? nhuCau.gia_den * 1.15 : Infinity;
  return (dsCan || []).filter((c) => {
    if (!quan.includes(khoaQuan(c.district))) return false;
    if (loai && !hopLoai(loaiCuaCan(c), loai)) return false;
    const gia = Number(c.price_vnd) || 0;
    return gia > 0 && gia >= tu && gia <= den;
  }).slice(0, toiDa);
}

// tên quận trong DB ứng với 1 khoá (Thủ Đức gồm cả dòng cũ ghi Quận 2 / Quận 9)
const tenQuanDB = (k) => (k === "thu duc" ? ["Thủ Đức", "Quận 2", "Quận 9"] : [k]);

/** Tra rổ hàng đang cho thuê đúng quận, đúng tầm giá; xếp căn sát ngân sách lên trước */
export async function timCanChoMoiGioi({ sb, nhuCau, toiDa = 3 }) {
  const quan = [...new Set((nhuCau?.quan || []).map(khoaQuan).filter(Boolean))];
  if (!sb || !quan.length) return [];
  const mau = quan.flatMap(tenQuanDB).map((t) => `district.ilike.%${t.replace(/[,()%]/g, "")}%`);
  let q = sb.from("listings").select("id, title, price_vnd, area_m2, ward, district, specs")
    .eq("source", "ro_hang").eq("deal", "cho_thue").eq("status", "published").or(mau.join(","));
  // studio/gác chiếm ~80% rổ hàng: khách cần 1-3PN / nhà / mặt bằng thì lọc theo kind để không bị studio đè hết 200 dòng
  const loai = loaiKhachCan(nhuCau);
  if (typeof loai === "object") q = q.eq("kind", "can_ho");
  else if (loai === "nha") q = q.eq("kind", "nha");
  else if (loai === "mb") q = q.eq("kind", "mat_bang");
  if (nhuCau.gia_tu) q = q.gte("price_vnd", Math.round(nhuCau.gia_tu * 0.85));
  if (nhuCau.gia_den) q = q.lte("price_vnd", Math.round(nhuCau.gia_den * 1.15));
  const { data, error } = await q.order("first_seen_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  const mucTieu = nhuCau.gia_den || nhuCau.gia_tu || 0;
  const khop = locCanKhop(data, nhuCau, 200);
  if (mucTieu) khop.sort((a, b) => Math.abs(a.price_vnd - mucTieu) - Math.abs(b.price_vnd - mucTieu));
  return khop.slice(0, toiDa);
}

const moTaCan = (c) => {
  const loai = c.specs?.["Loại phòng"] || c.specs?.["Loại hình"] || "";
  const dt = c.area_m2 ? `${c.area_m2}m²` : "";
  const khu = [c.ward, c.district].filter(Boolean).join(", ");
  return [maPhong(c.id), fmtGia(c.price_vnd), [loai, dt].filter(Boolean).join(" "), khu].filter(Boolean).join(" · ");
};

/** Câu mời hợp tác gửi môi giới (anh Quang duyệt bằng "K1234 1") */
export function soanTinHopTac({ senderName, canKhop }) {
  const ten = senderName ? `Chào ${senderName}, ` : "Chào anh/chị, ";
  const ds = canKhop.map((c) => `- ${moTaCan(c)}\n  https://nhadatradar.com/listings/${c.id}`).join("\n");
  return `${ten}em bên Radar, thấy anh/chị đang tìm hàng cho khách. Bên em đang có ${canKhop.length} căn hợp:\n${ds}\n` +
    `Hình trên link là hình thật, có ghi đủ điện nước. Bên em hợp tác chia hoa hồng, anh/chị cần thêm video hay lịch xem thì nhắn em nhé.`;
}

/** Thẻ báo Zalo admin */
export function soanTheMoiGioi({ senderName, tenNhom, text, nhuCau, canKhop, ma, daGui = false, gioDem = false, lyDoLoi = "" }) {
  const dong = [
    `🤝 Môi giới có khách: ${senderName || "?"}${tenNhom ? ` · nhóm ${tenNhom}` : ""}`,
    `"${String(text || "").replace(/\s+/g, " ").trim().slice(0, 220)}"`,
  ];
  if (nhuCau?.tom_tat) dong.push(`Nhu cầu: ${nhuCau.tom_tat}`);
  dong.push(`Căn Radar khớp:`, ...canKhop.map((c) => `• ${moTaCan(c)}`));
  if (daGui) {
    dong.push(`✓ Bot đã tự gửi câu mời hợp tác qua tin riêng 1-1.`);
    dong.push(`(Muốn nhắn thêm gõ: "${ma} <câu>")`);
  } else if (gioDem) {
    dong.push(`🌙 Đang giờ nghỉ đêm (22h-7h) nên bot chưa tự gửi tin.`);
    dong.push(`Gõ "${ma} 1" gửi câu mời hợp tác soạn sẵn · "${ma} <câu>" để tự nhắn.`);
  } else if (lyDoLoi) {
    dong.push(`⚠️ Tự gửi tin riêng lỗi (${lyDoLoi}).`);
    dong.push(`Gõ "${ma} 1" gửi câu mời hợp tác soạn sẵn · "${ma} <câu>" để tự nhắn.`);
  } else {
    dong.push(`Gõ "${ma} 1" gửi câu mời hợp tác soạn sẵn · "${ma} <câu>" để tự nhắn.`);
  }
  return dong.join("\n");
}

/** Cùng người đăng cùng một yêu cầu vào nhiều nhóm -> chỉ báo 1 lần */
export function khoaTrung(senderId, text) {
  return `${senderId}|${boDau(text).replace(/[^a-z0-9]/g, "").slice(0, 60)}`;
}
