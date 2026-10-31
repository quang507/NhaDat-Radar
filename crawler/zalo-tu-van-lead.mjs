// ============================================================================
//  TƯ VẤN PHÒNG TỰ ĐỘNG & BÁO LEAD SANG ZALO ADMIN (0346689460)
//  Hỗ trợ: Song ngữ (Việt - Anh), nhớ ngữ cảnh hội thoại, giải đáp FAQ chi tiết.
// ============================================================================
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const chayCli = promisify(execFile);

// ID tài khoản Zalo nhận thông báo lead (0346689460 -> UID: 199426642744249709)
export const ADMIN_ZALO_UID = process.env.ZALO_ADMIN_UID || "199426642744249709";
export const ADMIN_PHONE = process.env.ZALO_ADMIN_PHONE || "0346689460";
const SITE_URL = "https://nhadatradar.com";

// Cache chống spam tin báo sang Admin: cùng 1 khách + 1 căn phòng thì trong 30 phút chỉ báo 1 lần
const daBaoAdmin = new Map(); // key: `${fromId}_${listingId}` -> timestamp
const DEBOUNCE_TTL_MS = 30 * 60 * 1000;

// Bộ nhớ ngữ cảnh hội thoại: Lưu căn phòng khách vừa hỏi trong 4 tiếng
const nguCanhKhach = new Map(); // key: fromId -> { tin, roHang, luc: timestamp }
const CONTEXT_TTL_MS = 4 * 60 * 60 * 1000;

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

// Nhận diện câu hỏi bằng Tiếng Anh
export function laTiengAnh(text) {
  if (!text) return false;
  // Có dấu tiếng Việt thì chắc chắn là tiếng Việt
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text)) {
    return false;
  }
  const tuTiengAnh = /\b(is|are|this|available|unit|room|apartment|studio|rent|price|floor|which|where|when|can|view|viewing|visit|see|today|tomorrow|location|pet|pets|cat|cats|dog|dogs|fee|fees|deposit|contract|hello|hi|please|thank|thanks)\b/i;
  return tuTiengAnh.test(text);
}

// Phân tích số tầng từ mã phòng unit_code
export function giaiNghiaTang(unitCode) {
  if (!unitCode || unitCode === "-") return "Tầng thấp trong toà nhà";
  const code = String(unitCode).toUpperCase().trim();
  if (/^(0|G|TRỆT|TRET)/.test(code)) return "Tầng trệt (Ground floor)";
  const cleaned = code.replace(/^(P|PHÒNG|PHONG)[\s.]*/i, "").replace(/^\.+/, "").trim();
  const m = cleaned.match(/^([1-9])(?:\d{1,2}[A-Z]?|[A-Z]|$)/);
  if (m) {
    const tang = Number(m[1]);
    return `Lầu ${tang} (Floor ${tang})`;
  }
  return `Phòng ${unitCode}`;
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

// Soạn câu trả lời cho khách (Hỗ trợ song ngữ, FAQ chi tiết, không lộ đối tác/số nhà thật)
export function soanTraLoiKhach(tin, roHang, textKhach = "") {
  const isEn = laTiengAnh(textKhach);
  const t = textKhach.toLowerCase();
  const specs = tin.specs || {};
  const giaVnd = fmtGia(tin.price_vnd, tin.deal);
  const dt = tin.area_m2 ? `${tin.area_m2}m²` : "25m²";
  const loai = specs["Loại phòng"] || (tin.kind === "can_ho" ? "Căn hộ" : "Studio");
  const noiThat = specs["Nội thất"] || "Cơ bản";
  const diaChi = [tin.address, tin.district].filter(Boolean).join(", ");
  const tang = giaiNghiaTang(roHang?.unit_code);

  // ----------------------------------------------------
  // TRƯỜNG HỢP: KHÁCH HỎI TIẾNG ANH (ENGLISH SUPPORT)
  // ----------------------------------------------------
  if (isEn) {
    // 1. Hỏi tầng (floor)
    if (/\b(floor|level|which floor|what floor)\b/i.test(t)) {
      return `This unit is on ${tang} (Room ${roHang?.unit_code || "10B"}). It is very convenient for moving in and daily access.\nWould you like to come and view it today or tomorrow?`;
    }
    // 2. Hỏi thú cưng (pet)
    if (/\b(pet|pets|cat|cats|dog|dogs)\b/i.test(t)) {
      return `Regarding pets: The building policy requires asking management in advance based on your pet's size and breed. If you have a small pet, please let us know so we can check with the landlord for you!`;
    }
    // 3. Hỏi chi phí (cost / fees / bill)
    if (/\b(fee|fees|cost|electricity|water|wifi|park|bill)\b/i.test(t)) {
      return `Here are the building utility fees:\n• Electricity: 4,000 VND/kWh\n• Water: 100,000 VND/person/month\n• Service fee: ~200,000 VND/room\n• Motorbike parking: Free (up to 2 bikes)\n• 24/7 access with fingerprint lock.`;
    }
    // 4. Mặc định / Hỏi chi tiết tổng quan / còn phòng không (available)
    return `Yes, this unit is still available!\n\nUnit details:\n• Rent: ${giaVnd} (1-month deposit, 1-year lease)\n• Size & Type: ${dt} ${loai}\n• Floor: ${tang}\n• Furnishing: ${noiThat} (A/C, bed, mattress, wardrobe, kitchen cabinet, private bathroom)\n• Location: ${diaChi}\n• Building amenities: 24/7 access, fingerprint lock, shared washing machine.\n\nWhen are you planning to move in, and would you like to schedule a viewing today or tomorrow?`;
  }

  // ----------------------------------------------------
  // TRƯỜNG HỢP: KHÁCH HỎI TIẾNG VIỆT
  // ----------------------------------------------------
  // 1. Hỏi tầng mấy
  if (/tầng mấy|lầu mấy|ở lầu|ở tầng|thang bộ|thang máy/i.test(t)) {
    return `Dạ căn này ở ${tang} nhé anh/chị ơi (đi lại rất tiện, không lo chờ thang). Anh/chị có tiện ghé xem phòng thực tế hôm nay hay mai không ạ?`;
  }

  // 2. Hỏi thú cưng / chó mèo
  if (/thú cưng|chó|mèo|pet/i.test(t)) {
    return `Dạ về nuôi thú cưng: Quy định toà nhà cần hỏi trước ban quản lý tuỳ theo loại và kích thước bé. Nếu mình nuôi bé ngoan và giữ vệ sinh sạch sẽ, anh/chị nhắn em bé loại gì để em xin ý kiến quản lý toà giúp mình nhé ạ!`;
  }

  // 3. Hỏi giá / cọc
  if (/giá|bao nhiêu|nhiêu tiền|cọc|tiền cọc/i.test(t) && !/địa chỉ|ở đâu|xem|nội thất/i.test(t)) {
    return `Dạ căn này giá thuê niêm yết là ${giaVnd} ạ.\n• Tiền cọc thông thường là 1 tháng, hợp đồng 12 tháng.\n• Vị trí: ${diaChi}.\nAnh/chị dự kiến ngày nào dọn vào để em hỗ trợ nhé!`;
  }

  // 4. Hỏi nội thất / đồ đạc
  if (/nội thất|đồ đạc|máy lạnh|tủ lạnh|máy giặt|giường/i.test(t)) {
    return `Dạ phòng đã có sẵn: ${noiThat} (máy lạnh, giường nệm, tủ áo, kệ bếp, WC riêng).\n• Tiện ích toà: Khoá vân tay an ninh, giờ giấc tự do, máy giặt sân phơi chung.\n• Giá thuê: ${giaVnd}.\nAnh/chị có tiện ghé qua xem trực tiếp hôm nay hay ngày mai không ạ?`;
  }

  // 5. Hỏi chi phí (điện, nước, xe)
  if (/điện|nước|phí|dịch vụ|xe|gửi xe/i.test(t)) {
    return `Dạ chi phí toà nhà như sau ạ:\n• Điện: 4.000đ/kWh\n• Nước: 100.000đ/người\n• Phí dịch vụ: ~200.000đ/phòng\n• Gửi xe: Miễn phí xe máy\n• Giờ giấc tự do 24/7.\nAnh/chị cần xem phòng thực tế nhắn em giờ nhé!`;
  }

  // 6. Mặc định (Khách gửi link / hỏi còn phòng không / hỏi chi tiết tổng quan)
  return `Dạ căn này hiện vẫn còn trống nhé anh/chị ơi!\n\nThông tin chi tiết căn:\n• Diện tích: ${dt} (${loai})\n• Vị trí tầng: ${tang}\n• Giá thuê: ${giaVnd}\n• Nội thất: ${noiThat}\n• Khu vực: ${diaChi}\n• Toà nhà an ninh, khoá vân tay, giờ giấc ra vào tự do 24/7.\n\nAnh/chị dự kiến khi nào dọn vào và muốn ghé xem phòng thực tế lúc nào để em sắp xếp quản lý đón mình ạ?`;
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
  const linkWeb = `${SITE_URL}/listings/${tin.id}`;

  return `Khách đang quan tâm căn này nè:
• Tên căn / Mã web: ${tin.title} (${maWeb})
• Mã nguồn nội bộ: Phòng ${unitCode} - [${doiTac}]${hoaHong}
• Giá / Khu vực: ${gia} - ${diaChiWeb}${diaChiThat}
• Khách hàng: ${tenKhach} (Zalo UID: ${uidKhach})
• Link xem nhanh: ${linkWeb}
👉 Check Zalo con nha!`;
}

// Soạn tin báo lịch hẹn xem phòng sang Admin
export function soanTinHenXem({ tin, roHang, khachInfo, textHen }) {
  const maWeb = "RH" + tin.id.replace(/-/g, "").slice(0, 6).toUpperCase();
  const unitCode = roHang?.unit_code || "Chưa rõ phòng";
  const tenKhach = khachInfo.name || "Khách Zalo";

  return `⏰ KHÁCH ĐẶT LỊCH XEM PHÒNG:
• Khách: ${tenKhach} (UID: ${khachInfo.uid || khachInfo.id})
• Căn: ${tin.title} (${maWeb} - Phòng ${unitCode})
• Lời nhắn hẹn: "${textHen.trim()}"
👉 Vào Zalo chốt giờ hẹn với khách ngay nha!`;
}

// Xử lý sự kiện tin nhắn Zalo 1-1
export async function xuLyTinNhan11({ fromId, senderName, text, sb, cliFn }) {
  if (!text || !fromId) return;

  const dinhDanh = trichXuatDinhDanh(text);
  let phongHienTai = null;

  // 1. Nếu tin nhắn có link / mã phòng -> Tìm phòng và cập nhật bộ nhớ phiên
  if (dinhDanh) {
    const p = await traCuuPhong(sb, dinhDanh);
    if (p?.tin) {
      phongHienTai = p;
      nguCanhKhach.set(fromId, { ...p, luc: Date.now() });
    }
  } else {
    // 2. Nếu tin nhắn KHÔNG có mã phòng -> Kiểm tra bộ nhớ phiên gần nhất (trong vòng 4 tiếng)
    const context = nguCanhKhach.get(fromId);
    if (context && Date.now() - context.luc < CONTEXT_TTL_MS) {
      phongHienTai = context;
      // Cập nhật lại thời gian tương tác gần nhất
      context.luc = Date.now();
    }
  }

  // NẾU XÁC ĐỊNH ĐƯỢC PHÒNG KHÁCH ĐANG NÓI TỚI
  if (phongHienTai?.tin) {
    const { tin, roHang } = phongHienTai;

    // A. Báo sang Zalo Admin nếu là lần đầu quan tâm căn này (debounce 30 phút)
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

    // B. Kiểm tra nếu khách có ý định hẹn giờ xem phòng cụ thể
    const laHenXem = /(xem|coi|qua coi|hôm nay|ngày mai|chiều|sáng|tối|viewing|visit|see|tomorrow|today|pm|am)/i.test(text)
      && /(mấy giờ|lúc|khoảng|\d{1,2}h|\d{1,2}:\d{2}|chiều nay|tối nay|sáng mai|chiều mai)/i.test(text);

    if (laHenXem) {
      const tinHen = soanTinHenXem({
        tin,
        roHang,
        khachInfo: { id: fromId, uid: fromId, name: senderName },
        textHen: text,
      });
      console.log(`[Appointment Alert] Bắn tin HẸN XEM sang Admin Zalo...`);
      await cliFn(["msg", "send", "-t", "0", ADMIN_ZALO_UID, tinHen]).catch((e) => {
        console.error("[Appointment Alert Error] Gửi Admin lỗi:", e.message);
      });
    }

    // C. Trả lời tự động cho khách (Song ngữ + FAQ phù hợp)
    const phanHoi = soanTraLoiKhach(tin, roHang, text);
    await cliFn(["msg", "send", "-t", "0", String(fromId), phanHoi]).catch((e) => {
      console.error(`[Reply Error] Gửi khách ${fromId} lỗi:`, e.message);
    });
    return;
  }

  // TRƯỜNG HỢP: Khách nhắn chung mà chưa từng hỏi căn nào
  const isEn = laTiengAnh(text);
  if (isEn) {
    const phanHoiEn = `Hello! I'm the assistant at NhaDat Radar.\nWhich district or area are you looking for an apartment in, and what is your monthly budget? I will find the best available rooms for you!`;
    await cliFn(["msg", "send", "-t", "0", String(fromId), phanHoiEn]).catch(() => {});
    return;
  }

  if (/phòng|thuê|căn hộ|chung cư|nhà|chào|alo|hello|hi\b/i.test(text)) {
    const phanHoiChung = `Dạ em chào anh/chị! Em là trợ lý trực của NhaDat Radar.\nAnh/chị đang quan tâm căn phòng nào trên web nhadatradar.com, hoặc cần tìm phòng khu vực nào, ngân sách tầm bao nhiêu để em lọc căn trống đẹp nhất gửi mình nhé ạ!`;
    await cliFn(["msg", "send", "-t", "0", String(fromId), phanHoiChung]).catch(() => {});
  }
}
