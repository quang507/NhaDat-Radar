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

const imagesSource = [
  { file: "C:/Users/quang/.gemini/antigravity/brain/b0f0a836-af44-474a-a280-d499ec839d40/.user_uploaded/media_1791304383819.png", name: "hem-o-to.png" },
  { file: "C:/Users/quang/.gemini/antigravity/brain/b0f0a836-af44-474a-a280-d499ec839d40/.user_uploaded/media_1791304361079.png", name: "phong-ngu-tret.png" },
  { file: "C:/Users/quang/.gemini/antigravity/brain/b0f0a836-af44-474a-a280-d499ec839d40/.user_uploaded/media_1791304374047.png", name: "phong-ngu-lau.png" },
  { file: "C:/Users/quang/.gemini/antigravity/brain/b0f0a836-af44-474a-a280-d499ec839d40/.user_uploaded/media_1791304367467.png", name: "cau-thang-btct.png" },
];

async function uploadImages() {
  const uploadedUrls = [];
  for (const img of imagesSource) {
    if (!fs.existsSync(img.file)) {
      console.warn("Không tìm thấy file:", img.file);
      continue;
    }
    const buf = fs.readFileSync(img.file);
    const destPath = `listings/tan-binh-lang-cha-ca/${img.name}`;
    const { data, error } = await sb.storage.from("uploads").upload(destPath, buf, {
      contentType: "image/png",
      upsert: true,
    });
    if (error) {
      console.error(`Lỗi upload ${img.name}:`, error);
    } else {
      uploadedUrls.push(`${SUPABASE_URL}/storage/v1/object/public/uploads/${destPath}`);
      console.log(`Uploaded ${img.name} ->`, destPath);
    }
  }
  return uploadedUrls;
}

const description = `💎 HIẾM CÓ KHÓ TÌM: NHÀ ĐẸP TÂN BÌNH HẺM Ô TÔ SÁT CỬA - SÁT VÒNG XOAY LĂNG CHA CẢ & TRUNG TÂM TRIỂN LÃM - GIÁ CHỈ NHỈNH 4.5 TỶ TL

Sở hữu ngay căn nhà riêng kết cấu BTCT kiên cố tọa lạc tại lõi trung tâm Quận Tân Bình. Vị trí đắc địa đón đầu hạ tầng tỷ đô: cạnh Nhà ga T3 Sân bay Tân Sơn Nhất và Tuyến Metro Bến Thành - Tham Lương sắp vận hành.

📐 THÔNG SỐ VÀNG & KẾT CẤU KIÊN CỐ:
- Diện tích đất: 38.7 m² (Ngang 4.3m x Dài 9m) - mặt tiền ngang rộng rãi 4.3m cực kỳ thoáng sáng, phong thủy vượng tài.
- Diện tích sàn sử dụng: ~77.4 m².
- Kết cấu: 1 Trệt + 1 Lầu đúc bê tông cốt thép (BTCT) chắc chắn, nhà giữ gìn sạch sẽ.
- Công năng thiết kế tối ưu:
  • Tầng trệt: Phòng khách rộng thoáng, bếp nấu ấm cúng, 1 WC tiện nghi, chỗ để xe thoải mái.
  • Tầng lầu: 2 Phòng ngủ riêng biệt có cửa sổ và ban công đón ánh sáng tự nhiên mát mẻ, 1 WC tầng lầu.
  • Cầu thang đúc kiên cố, tay vịn inox sang trọng.

🚗 HẺM THÔNG THOÁNG - Ô TÔ VÀO SÁT CỬA:
- Hẻm rộng rãi, thông suốt các nhánh, ô tô chạy thẳng vào tận cửa nhà.
- Khu dân cư hiện hữu, dân trí cao, an ninh tuyệt đối, không gian yên tĩnh thích hợp gia đình an cư lâu dài hoặc khai thác cho thuê giữ tiền.

📍 VỊ TRÍ KIM CƯƠNG - TRUNG TÂM KẾT NỐI:
- Vị trí vàng ngay Trung tâm Triển Lãm Quốc Tế Tân Bình, sát Vòng xoay Lăng Cha Cả, Công viên Hoàng Văn Thụ chỉ 2 phút di chuyển.
- Kết nối giao thông siêu thuận tiện ra các tuyến đường huyết mạch: Hoàng Văn Thụ, Lê Văn Sỹ, Cộng Hòa, thông thẳng bờ kè Hoàng Sa - Trường Sa sang Phú Nhuận, Quận 3, Quận 10 chỉ 5-10 phút.
- Tiện ích ngập tràn bán kính 300m: Chợ Phạm Văn Hai, Trung tâm Đệ Nhất Khách Sạn, Trường THPT Nguyễn Thượng Hiền, CĐ Lý Tự Trọng, Bệnh viện Thống Nhất, sân bay Tân Sơn Nhất.

📜 PHÁP LÝ CHUẨN CHỈNH:
- Sổ hồng riêng hoàn công đầy đủ, pháp lý sạch, không quy hoạch lộ giới, công chứng sang tên ngay trong ngày.
- Giá bán: 4 Tỷ 600 Triệu (Thương lượng trực tiếp chính chủ, hỗ trợ vay ngân hàng).

☎️ LIÊN HỆ XEM NHÀ & THƯƠNG LƯỢNG GIÁ TỐT NHẤT:
- Hotline / Zalo Radar Nhà Đất: 0346 689 460 (Xem nhà thực tế 24/7, hỗ trợ thủ tục pháp lý trọn gói).`;

async function main() {
  const images = await uploadImages();
  console.log("Images count:", images.length);

  const listingData = {
    id: listingId,
    source: "ro_hang",
    source_site: "radar",
    deal: "ban",
    kind: "nha",
    title: "Bán Nhà Hẻm Ô Tô Sát Cửa TT Triển Lãm Tân Bình, Vòng Xoay Lăng Cha Cả (4.3x9m) - 1 Lầu BTCT Giá Nhỉnh 4.5 Tỷ TL",
    description: description,
    price_vnd: 4600000000,
    area_m2: 38.7,
    bedrooms: 2,
    bathrooms: 2,
    floors: 2,
    province: "Hồ Chí Minh",
    district: "Quận Tân Bình",
    ward: "Phường 4",
    address: "Hẻm ô tô Hoàng Văn Thụ, Phường 4, Quận Tân Bình",
    lat: 10.79620,
    lng: 106.65780,
    contact_name: "Radar Nhà Đất",
    contact_phone: "0346689460",
    phone_masked: "0346 689 xxx",
    ai_score: 98,
    trust_score: 100,
    poster_role_guess: "chu_nha",
    poster_reasons: ["Hàng độc quyền Radar - Sát Lăng Cha Cả hẻm ô tô giá nhỉnh 4.5 tỷ"],
    status: "published",
    first_seen_at: now,
    posted_at: now,
    last_seen_at: now,
    crawl_count: 1,
    source_count: 1,
    amenities: ["parking", "balcony", "kitchen", "ac", "water_heater"],
    specs: {
      "Mặt tiền": "4.3m",
      "Chiều dài": "9m",
      "Diện tích đất": "38.7 m²",
      "Diện tích sàn": "~77.4 m²",
      "Kết cấu": "1 trệt 1 lầu (đúc BTCT)",
      "Đường vào": "Hẻm ô tô vào sát cửa",
      "Phòng ngủ": "2 phòng ngủ thoáng",
      "Phòng vệ sinh": "2 tolet",
      "Vị trí nổi bật": "Sát Vòng xoay Lăng Cha Cả, TT Triển Lãm Tân Bình, cạnh Ga T3 Sân bay",
      "Pháp lý": "Sổ hồng riêng, hoàn công đầy đủ"
    },
    images: images
  };

  const roHangData = {
    listing_id: listingId,
    partner: "doc_quyen",
    exact_address: "Hẻm ô tô sát cửa, gần Trung tâm Triển lãm Tân Bình & Lăng Cha Cả, Phường 4, Quận Tân Bình, TP.HCM",
    exact_lat: 10.79620,
    exact_lng: 106.65780,
    commission: "Hoa hồng môi giới chuẩn sàn",
    unit_code: "Tân Bình - Lăng Cha Cả 4.3x9m",
    raw: {
      vi_tri_chinh_xac: "Hẻm ô tô sát cửa gần Trung tâm Triển lãm Tân Bình, Vòng xoay Lăng Cha Cả, Phường 4, Tân Bình",
      gia_chao: "Nhỉnh 4.5 Tỷ (thương lượng)",
      dien_tich: "4.3 x 9m (38.7 m²)",
      ket_cau: "1 trệt 1 lầu đúc BTCT",
      phap_ly: "Sổ hồng hoàn chỉnh",
      contact_real: "0383446543",
      chu_nha_phone: "0383446543",
      nguon: "Chính chủ gửi độc quyền - Radar ăn hoa hồng"
    },
    updated_at: now
  };

  const { data: d1, error: e1 } = await sb.from("listings").insert(listingData).select("id, title, price_vnd").single();
  if (e1) {
    console.error("Lỗi insert listing:", e1);
    process.exit(1);
  }
  console.log("Listing inserted successfully:", d1);

  const { data: d2, error: e2 } = await sb.from("listing_ro_hang").insert(roHangData).select().single();
  if (e2) {
    console.error("Lỗi insert ro_hang:", e2);
    process.exit(1);
  }
  console.log("Ro hang inserted successfully:", d2);
  console.log("PUBLIC URL: https://nhadatradar.com/listings/" + listingId);
}

main();
