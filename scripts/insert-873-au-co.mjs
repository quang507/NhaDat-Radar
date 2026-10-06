import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import fs from "fs";

// Đọc key từ .env.local an toàn
const envLocal = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
const getEnv = (k) => process.env[k] || (envLocal.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim();

const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const listingId = crypto.randomUUID();
const now = new Date().toISOString();

// Upload ảnh đã che số điện thoại lên Supabase Storage
const localImagePath = "C:/Users/quang/.gemini/antigravity/brain/b0f0a836-af44-474a-a280-d499ec839d40/media_873_au_co_masked.png";
const storagePath = `listings/873-au-co/mat-tien.png`;

async function uploadImage() {
  if (!fs.existsSync(localImagePath)) {
    console.error("Không tìm thấy file ảnh đã che số:", localImagePath);
    process.exit(1);
  }
  const fileBuffer = fs.readFileSync(localImagePath);
  const { data, error } = await sb.storage.from("uploads").upload(storagePath, fileBuffer, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) {
    console.error("Lỗi upload ảnh:", error);
    process.exit(1);
  }
  console.log("Upload ảnh thành công:", data);
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/uploads/${storagePath}`;
  return publicUrl;
}

const description = `🔥 SIÊU PHẨM TÒA NHÀ MẶT TIỀN ÂU CƠ TÂN PHÚ - DIỆN TÍCH KHỦNG 6.1 x 45M (274.5m²) - 1 TRỆT 4 LẦU CÓ THANG MÁY - BÁN HOẶC CHO THUÊ 70TR/THÁNG

Cơ hội đầu tư BĐS dòng tiền và khai thác thương mại đỉnh cao ngay trục đường huyết mạch Âu Cơ, Phường Tân Sơn Nhì, Quận Tân Phú. Tòa nhà bề thế quy mô 5 tầng kiên cố, trang bị thang máy hiện đại, mặt tiền rộng thoáng kinh doanh đa ngành nghề sầm uất ngày đêm.

📐 THÔNG SỐ VÀNG & KẾT CẤU BỀ THẾ:
- Diện tích đất: 274.5 m² (Ngang 6.1m x Dài 45m) - khuôn đất dài sâu cực hiếm, phong thủy thịnh vượng tài lộc.
- Diện tích sàn sử dụng: ~1.250 m² sàn xây dựng.
- Kết cấu: 1 Trệt + 4 Lầu (Tổng 5 tầng đúc BTCT kiên cố).
- Tiện ích đặc biệt: Đã lắp đặt thang máy tốc độ cao vận hành êm ái, hệ thống PCCC tiêu chuẩn.
- Công năng khai thác cực kỳ đa dạng:
  • Showroom trưng bày nội thất, ô tô, điện máy, thời trang.
  • Thẩm mỹ viện, Spa, Nha khoa, Phòng khám đa khoa quốc tế.
  • Trụ sở văn phòng công ty, Ngân hàng, Trung tâm đào tạo / Anh ngữ.
  • Cải tạo chuỗi Căn hộ dịch vụ (CHDV) cao cấp cho chuyên gia, thu dòng tiền khủng hàng tháng.

📍 VỊ TRÍ KIM CƯƠNG TRÊN TRỤC ÂU CƠ - TÂN PHÚ:
- Tọa lạc tại đoạn đẹp nhất đường Âu Cơ, Phường Tân Sơn Nhì, Quận Tân Phú.
- Tuyến đường thương mại sầm uất, lưu lượng giao thông tấp nập kết nối Tân Bình - Tân Phú - Quận 10 - Quận 11.
- Gần kề các giao lộ lớn: Trường Chinh, Trương Vĩnh Ký, Lũy Bán Bích, Ba Vân. Khu vực tập trung chuỗi thương hiệu lớn, ngân hàng, trường học, bệnh viện.

📜 PHÁP LÝ CHUẨN CHỈNH:
- Sổ hồng riêng chính chủ, đã hoàn công đầy đủ, pháp lý minh bạch 100%.
- Sẵn sàng công chứng sang tên ngay trong ngày.

💰 GIÁ BÁN & CHÍNH SÁCH THUÊ:
- Giá bán: 38 Tỷ VNĐ (Có thương lượng trực tiếp, hỗ trợ vay ngân hàng hạn mức cao).
- Giá cho thuê: 70 Triệu / tháng (Hợp đồng dài hạn, tạo dòng tiền ổn định).

☎️ LIÊN HỆ XEM NHÀ & LÀM VIỆC TRỰC TIẾP:
- Hotline / Zalo Radar Nhà Đất: 0346 689 460 (Hỗ trợ 24/7, dẫn xem thực tế và hỗ trợ đàm phán giá tốt nhất).`;

async function main() {
  const imageUrl = await uploadImage();
  console.log("Image URL:", imageUrl);

  const listingData = {
    id: listingId,
    source: "ro_hang",
    source_site: "radar",
    deal: "ban",
    kind: "nha",
    title: "Bán / Cho Thuê Tòa Nhà Mặt Tiền Âu Cơ, Tân Sơn Nhì, Tân Phú (6.1x45m, 274.5m²) - 1 Trệt 4 Lầu Thang Máy",
    description: description,
    price_vnd: 38000000000,
    area_m2: 274.5,
    bedrooms: 8,
    bathrooms: 6,
    floors: 5,
    province: "Hồ Chí Minh",
    district: "Quận Tân Phú",
    ward: "Phường Tân Sơn Nhì",
    address: "Mặt tiền 87x Âu Cơ, Phường Tân Sơn Nhì, Quận Tân Phú",
    lat: 10.79685,
    lng: 106.63640,
    contact_name: "Radar Nhà Đất",
    contact_phone: "0346689460",
    phone_masked: "0346 689 xxx",
    ai_score: 99,
    trust_score: 100,
    poster_role_guess: "chu_nha",
    poster_reasons: ["Hàng độc quyền Radar - Mặt tiền thương mại khủng 274.5m² có thang máy"],
    status: "published",
    first_seen_at: now,
    posted_at: now,
    last_seen_at: now,
    crawl_count: 1,
    source_count: 1,
    amenities: ["parking", "elevator", "ac", "security", "terrace"],
    specs: {
      "Mặt tiền": "6.1m",
      "Chiều dài": "45m",
      "Diện tích đất": "274.5 m²",
      "Diện tích sàn": "~1.250 m²",
      "Kết cấu": "1 trệt 4 lầu (5 tầng BTCT)",
      "Thang máy": "Có thang máy hiện đại",
      "Pháp lý": "Sổ hồng hoàn công đầy đủ",
      "Giá thuê": "70 triệu / tháng",
      "Giá bán": "38 tỷ (thương lượng)",
      "Phù hợp": "Showroom, Thẩm mỹ viện, Văn phòng, CHDV, Spa, Ngân hàng"
    },
    images: [imageUrl]
  };

  const roHangData = {
    listing_id: listingId,
    partner: "doc_quyen",
    exact_address: "873 Âu Cơ, Phường Tân Sơn Nhì, Quận Tân Phú, TP.HCM",
    exact_lat: 10.79685,
    exact_lng: 106.63640,
    commission: "Hoa hồng môi giới chuẩn sàn",
    unit_code: "873 Âu Cơ",
    raw: {
      dia_chi_chinh_xac: "873 Âu Cơ, Phường Tân Sơn Nhì, Quận Tân Phú",
      gia_ban: "38 Tỷ (thương lượng)",
      gia_thue: "70 Triệu / tháng",
      dien_tich: "6.1 x 45m (274.5 m²)",
      ket_cau: "Trệt + 4 Lầu, có thang máy",
      phap_ly: "Sổ hồng hoàn công",
      sdt_chu_nha_banner: "0898.538.385 (C. Duy) - 0931.444.207 (A. Nhan)",
      sdt_nguoi_gui_tin: "0987.005.605 - 0932.42.31.31",
      contact_real: "0987005605, 0932423131, 0898538385, 0931444207",
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
