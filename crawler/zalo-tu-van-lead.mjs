// ============================================================================
//  TƯ VẤN PHÒNG TỰ ĐỘNG & BÁO LEAD SANG ZALO ADMIN (0346689460)
//  Tích hợp vào Zalo bot chạy trên máy NUC / server.
// ============================================================================
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const chayCli = promisify(execFile);

// ID tài khoản Zalo nhận thông báo lead (0346689460 -> UID: 199426642744249709)
export const ADMIN_ZALO_UID = process.env.ZALO_ADMIN_UID || "199426642744249709";
export const ADMIN_PHONE = process.env.ZALO_ADMIN_PHONE || "0346689460";

// Cache chống spam tin báo sang Admin: cùng 1 khách + 1 căn phòng thì trong 30 phút chỉ báo 1 lần
const daBaoAdmin = new Map(); // key: `${fromId}_${listingId}` -> timestamp
const DEBOUNCE_TTL_MS = 30 * 60 * 1000;

// Format giá hiển thị
export function fmtGia(vnd, deal = "cho_thue") {
  if (!vnd) return "Thoả thuận";
  const s = deal === "cho_thue" ? "/tháng" : "";
  if (vnd >= 1e9) return (vnd / 1e9).toFixed(2).replace(/\.?0+$/, "") + " tỷ" + s;
  if (vnd >= 1e6) return (vnd / 1e6).toFixed(1).replace(/\.0$/, "").replace(".", ",") + " triệu" + s;
  return vnd.toLocaleString("vi-VN") + " đ" + s;
}

// Bóc tách mã phòng từ URL web nhadatradar hoặc text
export function trichXuatDinhDanh(text) {
  if (!text) return null;
  const s = String(text).trim();

  // 1. Link web: nhadatradar.com/listings/<uuid>
  const matchUrl = s.match(/nhadatradar\.com\/listings\/([0-9a-fA-F-]{36})/i);
  if (matchUrl) return { kieu: "uuid", giaTri: matchUrl[1].toLowerCase() };

  // 2. UUID trực tiếp
  const matchUuid = s.match(/\b([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\b/);
  if (matchUuid) return { kieu: "uuid", giaTri: matchUuid[1].toLowerCase() };

  // 3. Mã hiển thị trên web: RH04458E / rh04458e
  const matchRH = s.match(/\b(RH[0-9a-fA-F]{6})\b/i);
  if (matchRH) return { kieu: "ma_rh", giaTri: matchRH[1].toUpperCase() };

  // 4. Mã tin gốc rổ hàng (HiFriendz: LST-xxxx)
  const matchLST = s.match(/\b(LST-[a-zA-Z0-9_-]{10,})\b/);
  if (matchLST) return { kieu: "source_id", giaTri: matchLST[1] };

  return null;
}

// Tra cứu dữ liệu phòng từ Supabase (bảng listings + bảng listing_ro_hang)
export async function traCuuPhong(sb, dinhDanh) {
  if (!dinhDanh) return null;
  let q = sb.from("listings").select(`
    id, title, price_vnd, area_m2, kind, deal, address, ward, district, province,
    specs, amenities, source, source_site, source_post_id
  `);

  if (dinhDanh.kieu === "uuid") {
    q = q.eq("id", dinhDanh.giaTri);
  } else if (dinhDanh.kieu === "source_id") {
    q = q.eq("source_post_id", dinhDanh.giaTri);
  } else if (dinhDanh.kieu === "ma_rh") {
    const p = dinhDanh.giaTri.toLowerCase().replace(/^rh/, "");
    q = q.gte("id", `${p}00-0000-0000-0000-000000000000`)
         .lte("id", `${p}ff-ffff-ffff-ffff-ffffffffffff`);
  }

  const { data: tin, error } = await q.maybeSingle();
  if (error || !tin) return null;

  // Tra cứu dữ liệu nguồn nội bộ (mã phòng, toà nhà, địa chỉ thật, hoa hồng)
  const { data: roHang } = await sb.from("listing_ro_hang")
    .select("partner, unit_code, exact_address, commission, raw")
    .eq("listing_id", tin.id)
    .maybeSingle();

  return { tin, roHang };
}

// Soạn câu trả lời cho khách (tự nhiên, không lộ tên đối tác / số nhà thật)
export function soanTraLoiKhach(tin, textKhach = "") {
  const t = textKhach.toLowerCase();
  const specs = tin.specs || {};
  const gia = fmtGia(tin.price_vnd, tin.deal);
  const dt = tin.area_m2 ? `${tin.area_m2}m²` : "rộng rãi";
  const loai = specs["Loại phòng"] || (tin.kind === "can_ho" ? "Căn hộ" : "Studio/Phòng trọ");
  const noiThat = specs["Nội thất"] || "Cơ bản";
  const diaChi = [tin.address, tin.district].filter(Boolean).join(", ");

  // 1. Khách hỏi riêng về giá / cọc
  if (/giá|bao nhiêu|nhiêu tiền|cọc|tiền cọc/i.test(t) && !/địa chỉ|ở đâu|xem|nội thất/i.test(t)) {
    return `Dạ căn này giá thuê niêm yết là ${gia} ạ.\n• Tiền cọc thông thường là 1 tháng, hợp đồng 12 tháng.\n• Vị trí: ${diaChi}.\nAnh/chị muốn qua xem phòng thực tế lúc nào để em hỗ trợ nhé!`;
  }

  // 2. Khách hỏi về nội thất / tiện nghi
  if (/nội thất|đồ đạc|máy lạnh|tủ lạnh|máy giặt|giường/i.test(t)) {
    return `Dạ phòng đã có sẵn: ${noiThat}.\n• Tiện ích toà: Khoá vân tay an ninh, giờ giấc tự do, máy giặt/sân phơi chung.\n• Giá thuê: ${gia}.\nAnh/chị có tiện ghé qua xem trực tiếp hôm nay hay ngày mai không ạ?`;
  }

  // 3. Khách hỏi chi phí (điện, nước, xe)
  if (/điện|nước|phí|dịch vụ|xe|gửi xe/i.test(t)) {
    return `Dạ chi phí toà nhà như sau ạ:\n• Điện: 4.000đ/kWh\n• Nước: 100.000đ/người\n• Phí dịch vụ: ~200.000đ/phòng\n• Gửi xe: Miễn phí xe máy\n• Giờ giấc tự do 24/7.\nAnh/chị cần xem phòng thực tế nhắn em giờ nhé!`;
  }

  // 4. Mặc định (Khách gửi link / hỏi còn phòng không / hỏi chi tiết tổng quan)
  return `Dạ căn này hiện vẫn còn trống nhé anh/chị ơi!\n\nThông tin chi tiết căn:\n• Diện tích: ${dt} (${loai})\n• Giá thuê: ${gia}\n• Nội thất: ${noiThat}\n• Khu vực: ${diaChi}\n• Toà nhà an ninh, khoá vân tay, giờ giấc ra vào tự do 24/7.\n\nAnh/chị dự kiến khi nào dọn vào và muốn ghé xem phòng thực tế lúc nào để em sắp xếp quản lý đón mình ạ?`;
}

// Soạn tin nhắn cảnh báo gửi Zalo Admin (0346689460)
export function soanTinBaoAdmin({ tin, roHang, khachInfo }) {
  const maWeb = "RH" + tin.id.replace(/-/g, "").slice(0, 6).toUpperCase();
  const unitCode = roHang?.unit_code || "Chưa rõ phòng";
  const doiTac = (roHang?.partner || "Rổ hàng").toUpperCase();
  const gia = fmtGia(tin.price_vnd, tin.deal);
  const diaChiWeb = [tin.address, tin.district].filter(Boolean).join(", ");
  const diaChiThat = roHang?.exact_address ? `\n• Đ/c thật: ${roHang.exact_address}` : "";
  const hoaHong = roHang?.commission ? `\n• Hoa hồng: ${roHang.commission}` : "";
  const tenKhach = khachInfo.name || "Khách Zalo";
  const uidKhach = khachInfo.uid || khachInfo.id || "-";

  return `Khách đang quan tâm căn này nè:
• Tên căn / Mã web: ${tin.title} (${maWeb})
• Mã nguồn nội bộ: Phòng ${unitCode} - [${doiTac}]${hoaHong}
• Giá / Khu vực: ${gia} - ${diaChiWeb}${diaChiThat}
• Khách hàng: ${tenKhach} (Zalo UID: ${uidKhach})
👉 Check Zalo con nha!`;
}

// Xử lý sự kiện tin nhắn Zalo 1-1
export async function xuLyTinNhan11({ fromId, senderName, text, sb, cliFn }) {
  if (!text || !fromId) return;

  const dinhDanh = trichXuatDinhDanh(text);

  // Khách gửi link hoặc mã phòng cụ thể
  if (dinhDanh) {
    const phong = await traCuuPhong(sb, dinhDanh);
    if (phong?.tin) {
      const { tin, roHang } = phong;

      // 1. Báo sang Zalo Admin nếu chưa báo trong 30 phút qua
      const leadKey = `${fromId}_${tin.id}`;
      const now = Date.now();
      if (!daBaoAdmin.has(leadKey) || now - daBaoAdmin.get(leadKey) > DEBOUNCE_TTL_MS) {
        daBaoAdmin.set(leadKey, now);
        const tinAdmin = soanTinBaoAdmin({
          tin,
          roHang,
          khachInfo: { id: fromId, uid: fromId, name: senderName },
        });

        console.log(`[Lead Alert] Bắn tin sang Admin Zalo UID ${ADMIN_ZALO_UID}...`);
        await cliFn(["msg", "send", "-t", "0", ADMIN_ZALO_UID, tinAdmin]).catch((e) => {
          console.error("[Lead Alert Error] Gửi sang Admin lỗi:", e.message);
        });
      }

      // 2. Trả lời tự động cho khách
      const phanHoi = soanTraLoiKhach(tin, text);
      await cliFn(["msg", "send", "-t", "0", String(fromId), phanHoi]).catch((e) => {
        console.error(`[Reply Error] Gửi khách ${fromId} lỗi:`, e.message);
      });
      return;
    }
  }

  // Khách nhắn chung (chưa có mã phòng)
  // Chỉ phản hồi nếu là câu hỏi tìm phòng hoặc chào hỏi
  if (/phòng|thuê|căn hộ|chung cư|nhà|chào|alo|hello|hi\b/i.test(text)) {
    const phanHoiChung = `Dạ em chào anh/chị! Em là trợ lý trực của NhaDat Radar.\nAnh/chị đang quan tâm căn phòng nào trên web nhadatradar.com, hoặc cần tìm phòng khu vực nào, ngân sách tầm bao nhiêu để em lọc căn trống đẹp nhất gửi mình nhé ạ!`;
    await cliFn(["msg", "send", "-t", "0", String(fromId), phanHoiChung]).catch((e) => {
      console.error(`[General Reply Error] Gửi ${fromId} lỗi:`, e.message);
    });
  }
}
