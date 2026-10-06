import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import fs from "fs";

// Đọc key an toàn từ .env.local
const envLocal = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
const getEnv = (k) => process.env[k] || (envLocal.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim();

const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const listingId = crypto.randomUUID();
const now = new Date().toISOString();

const description = `🔥 NHÀ ĐẸP BÌNH TÂN GIÁ HIẾM DƯỚI 3.5 TỶ - HẺM 137 PHAN ANH GIÁP TÂN PHÚ - 1 TRỆT 1 LẦU Ở NGAY

Cơ hội sở hữu nhà riêng phân khúc tài chính vàng 3 tỷ nhỉnh tại khu vực sầm uất giáp ranh Quận Tân Phú. Nhà trống sẵn sàng bàn giao, vị trí an ninh, cực kỳ thích hợp cho gia đình trẻ an cư lạc nghiệp hoặc đầu tư giữ tiền cho thuê.

📐 THÔNG SỐ VÀNG & KẾT CẤU GỌN GÀNG:
- Diện tích: 40.8 m² (Ngang 3.4m x Dài 12m).
- Diện tích sàn sử dụng: ~81.6 m².
- Kết cấu: 1 Trệt, 1 Lầu kiên cố.
- Công năng bố trí hợp lý:
  • Tầng trệt: Sân để xe máy, phòng khách thoáng sáng, bếp rộng rãi, 1 tolet tiện nghi.
  • Tầng lầu: 2 Phòng ngủ riêng biệt, ban công đón gió mát, 1 tolet tầng lầu.
- Hiện trạng: Nhà trống sạch sẽ, dọn đồ vào ở ngay không cần sửa chữa.

📍 VỊ TRÍ ĐẮC ĐỊA - KẾT NỐI KHU VỰC:
- Hẻm 137 Phan Anh, Khu phố 12, Phường Bình Trị Đông, Quận Bình Tân.
- Vị trí giáp ranh Quận Tân Phú: chỉ 2 phút ra Ngã Tư Bốn Xã, kết nối trực tiếp các tuyến đường huyết mạch Thoại Ngọc Hầu, Hòa Bình, Lê Văn Quới, Hương Lộ 2.
- Tiện ích bán kính 500m: Chợ Phan Anh, Bách Hóa Xanh, siêu thị Co.opmart, hệ thống trường học các cấp, cách Đầm Sen chỉ 5-7 phút di chuyển.

📜 PHÁP LÝ & GIÁ BÁN:
- Pháp lý: Sổ hồng riêng chính chủ, pháp lý chuẩn chỉnh, sang tên công chứng nhanh chóng.
- Giá bán: 3 Tỷ 300 Triệu (Thương lượng chính chủ, hỗ trợ vay ngân hàng).
- Đơn giá chỉ ~80.8 triệu/m² - mức giá cực tốt so với mặt bằng khu vực!

☎️ LIÊN HỆ XEM NHÀ & THƯƠNG LƯỢNG CHÍNH CHỦ:
- Hotline / Zalo Radar Nhà Đất: 0346 689 460 (Xem nhà thực tế 24/7, hỗ trợ đàm phán giá tốt nhất).`;

const listingData = {
  id: listingId,
  source: "ro_hang",
  source_site: "radar",
  deal: "ban",
  kind: "nha",
  title: "Bán Nhà Hẻm 137 Phan Anh, Bình Trị Đông, Bình Tân (3.4x12m) - 1 Trệt 1 Lầu Giá Chỉ 3.3 Tỷ TL",
  description: description,
  price_vnd: 3300000000,
  area_m2: 40.8,
  bedrooms: 2,
  bathrooms: 2,
  floors: 2,
  province: "Hồ Chí Minh",
  district: "Quận Bình Tân",
  ward: "Phường Bình Trị Đông",
  address: "Hẻm 137/•• Phan Anh, Phường Bình Trị Đông, Quận Bình Tân",
  lat: 10.77250,
  lng: 106.62215,
  contact_name: "Radar Nhà Đất",
  contact_phone: "0346689460",
  ai_score: 98,
  trust_score: 100,
  poster_role_guess: "chu_nha",
  poster_reasons: ["Hàng độc quyền Radar - Giá tốt dưới 3.5 tỷ giáp Tân Phú"],
  status: "published",
  first_seen_at: now,
  posted_at: now,
  last_seen_at: now,
  crawl_count: 1,
  source_count: 1,
  amenities: ["parking", "balcony", "kitchen"],
  specs: {
    "Mặt tiền": "3.4m",
    "Chiều dài": "12m",
    "Diện tích đất": "40.8 m²",
    "Diện tích sàn": "81.6 m²",
    "Kết cấu": "1 trệt 1 lầu",
    "Phòng ngủ": "2 phòng ngủ",
    "Phòng vệ sinh": "2 tolet",
    "Hiện trạng": "Nhà trống, dọn vào ở ngay",
    "Pháp lý": "Sổ hồng riêng, công chứng ngay"
  },
  images: []
};

const roHangData = {
  listing_id: listingId,
  partner: "doc_quyen",
  exact_address: "137/69 Phan Anh, khu phố 12, Phường Bình Trị Đông, Quận Bình Tân, TP.HCM",
  exact_lat: 10.77250,
  exact_lng: 106.62215,
  commission: "1% (33.000.000 VNĐ)",
  unit_code: "137/69 Phan Anh",
  raw: {
    dia_chi_chinh_xac: "137/69 Phan Anh, khu phố 12, Phường Bình Trị Đông, Quận Bình Tân",
    hoa_hong: "1% (33.000.000 VNĐ)",
    nguon: "Chính chủ gửi độc quyền - Radar ăn hoa hồng",
    gia_chao: "3 tỷ 300 triệu (thương lượng)"
  },
  updated_at: now
};

async function insert() {
  const { data: d1, error: e1 } = await sb.from("listings").insert(listingData).select("id, title, price_per_m2").single();
  if (e1) {
    console.error("Error inserting listing:", e1);
    process.exit(1);
  }
  console.log("Listing inserted successfully:", d1);

  const { data: d2, error: e2 } = await sb.from("listing_ro_hang").insert(roHangData).select().single();
  if (e2) {
    console.error("Error inserting ro hang:", e2);
    process.exit(1);
  }
  console.log("Ro hang inserted successfully:", d2);
  console.log("PUBLIC URL: https://nhadatradar.com/listings/" + listingId);
}

insert();
