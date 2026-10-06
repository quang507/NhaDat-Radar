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
  { file: "C:/Users/quang/.gemini/antigravity/brain/b0f0a836-af44-474a-a280-d499ec839d40/.user_uploaded/media_1791304468708.jpg", name: "mat-tien-cau-dat.jpg" },
  { file: "C:/Users/quang/.gemini/antigravity/brain/b0f0a836-af44-474a-a280-d499ec839d40/.user_uploaded/media_1791304463804.jpg", name: "duong-vao-khu-dan-cu.jpg" },
  { file: "C:/Users/quang/.gemini/antigravity/brain/b0f0a836-af44-474a-a280-d499ec839d40/.user_uploaded/media_1791304474095.png", name: "quy-hoach-dat-o-xay-dung-moi.png" },
  { file: "C:/Users/quang/.gemini/antigravity/brain/b0f0a836-af44-474a-a280-d499ec839d40/.user_uploaded/media_1791304478378.jpg", name: "duong-da-nha-dan-xung-quanh.jpg" },
];

async function uploadImages() {
  const uploadedUrls = [];
  for (const img of imagesSource) {
    if (!fs.existsSync(img.file)) {
      console.warn("Không tìm thấy file:", img.file);
      continue;
    }
    const buf = fs.readFileSync(img.file);
    const destPath = `listings/cu-chi-nhuan-duc-970m/${img.name}`;
    const contentType = img.name.endsWith(".png") ? "image/png" : "image/jpeg";
    const { data, error } = await sb.storage.from("uploads").upload(destPath, buf, {
      contentType,
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

const description = `🌿 CƠ HỘI ĐẦU TƯ ĐẤT VƯỜN CỦ CHI GIÁ RẺ CHỈ 1.3 TRIỆU/M² - DIỆN TÍCH KHỦNG 970M² (10x80M) - Ô TÔ VÀO TẬN ĐẤT - QUY HOẠCH ĐẤT NHÓM Ở XÂY DỰNG MỚI

Bán nhanh lô đất vườn vuông vức tại khu vực giáp ranh Xã Nhuận Đức và Xã Trung Lập Hạ, Huyện Củ Chi, TP.HCM. Vị trí đắc địa, xung quanh toàn nhà dân hiện hữu, không khí trong lành, đường ô tô vào tận đất - lý tưởng làm nhà vườn nghỉ dưỡng ven đô, trang trại mini hoặc đầu tư đón sóng hạ tầng Tây Bắc.

📐 THÔNG SỐ VÀNG & HIỆN TRẠNG KHU ĐẤT:
- Diện tích: 970 m² (Mặt tiền ngang 10m x Chiều dài gần 100m, khuôn đất 10x80m nở hậu).
- Mặt tiền ngang 10m rộng thênh thang, ranh mốc cắm cọc bê tông rõ ràng, đất cao ráo bằng phẳng.
- Đã đổ sẵn cầu bê tông cốt thép kiên cố xe hơi 7 chỗ chạy thẳng vào trong đất.
- Đường thông thoáng, kết nối hạ tầng giao thông thuận tiện.

🗺 QUY HOẠCH ĐẮC ĐỊA - TIỀM NĂNG TĂNG GIÁ VƯỢT TRỘI:
- Bản vẽ quy hoạch chuẩn chỉ 1/2000: Thuộc Thửa 668, mặt tiền Đường số 01, nằm trọn trong khu vực **"ĐẤT NHÓM Ở XÂY DỰNG MỚI"**.
- Đủ điều kiện chuyển đổi mục đích lên thổ cư theo kế hoạch sử dụng đất, biên độ lợi nhuận cực kỳ cao khi lên thổ cư.
- Khu dân cư hiện hữu đông đúc, nhà cao tầng, biệt thự vườn xung quanh, điện nước đầy đủ.

📍 VỊ TRÍ & TIỆN ÍCH LIỀN KỀ:
- Tọa lạc tại khu giáp ranh Nhuận Đức & Trung Lập Hạ, Huyện Củ Chi.
- Kết nối nhanh ra Tỉnh Lộ 7, Tỉnh Lộ 2, Hương Lộ 2, Cao tốc TP.HCM - Mộc Bài sắp triển khai.
- Bán kính 1.5 - 2km đầy đủ chợ, trường học các cấp, trạm y tế, UBND xã.

📜 PHÁP LÝ & GIÁ BÁN:
- Pháp lý: Sổ hồng riêng chính chủ, ranh giới rõ ràng, công chứng sang tên ngay trong ngày.
- Giá bán nhanh: 1 Tỷ 280 Triệu (Còn bớt lộc cho khách thiện chí).
- Đơn giá chỉ ~1.32 triệu/m² - mức giá đáy thị trường cho một lô đất TP.HCM gần 1.000m²!

☎️ LIÊN HỆ XEM ĐẤT & LÀM VIỆC CHÍNH CHỦ:
- Hotline / Zalo Radar Nhà Đất: 0346 689 460 (Dẫn xem đất thực tế 24/7, kiểm tra quy hoạch miễn phí).`;

async function main() {
  const images = await uploadImages();
  console.log("Uploaded images count:", images.length);

  const listingData = {
    id: listingId,
    source: "ro_hang",
    source_site: "radar",
    deal: "ban",
    kind: "dat",
    title: "Bán Đất Vườn Củ Chi 970m² (10x80m) Đường Ô Tô Tới Đất - QH Đất Ở Xây Dựng Mới Giá Chỉ 1.28 Tỷ",
    description: description,
    price_vnd: 1280000000,
    area_m2: 970,
    province: "Hồ Chí Minh",
    district: "Huyện Củ Chi",
    ward: "Xã Trung Lập Hạ",
    address: "Đường số 1 (giáp Nhuận Đức), Xã Trung Lập Hạ, Huyện Củ Chi",
    lat: 11.08250,
    lng: 106.46850,
    contact_name: "Radar Nhà Đất",
    contact_phone: "0346689460",
    phone_masked: "0346 689 xxx",
    ai_score: 98,
    trust_score: 100,
    poster_role_guess: "chu_nha",
    poster_reasons: ["Hàng độc quyền Radar - 970m² Củ Chi QH đất ở xây dựng mới giá chỉ 1.28 tỷ"],
    status: "published",
    first_seen_at: now,
    posted_at: now,
    last_seen_at: now,
    crawl_count: 1,
    source_count: 1,
    amenities: ["parking"],
    specs: {
      "Mặt tiền": "10m",
      "Chiều dài": "80m - 97m",
      "Diện tích đất": "970 m²",
      "Loại đất": "Đất trồng cây (Quy hoạch Đất nhóm ở xây dựng mới)",
      "Đường vào": "Đường ô tô tới đất, có cầu bê tông vào tận nơi",
      "Dân cư": "Xung quanh toàn nhà dân hiện hữu, an ninh",
      "Pháp lý": "Sổ hồng riêng chính chủ",
      "Tiềm năng": "Lên thổ cư làm nhà vườn nghỉ dưỡng, trang trại, đón cao tốc Mộc Bài"
    },
    images: images
  };

  const roHangData = {
    listing_id: listingId,
    partner: "doc_quyen",
    exact_address: "Thửa 668, Đường số 01 giáp Nhuận Đức, Xã Trung Lập Hạ, Huyện Củ Chi, TP.HCM",
    exact_lat: 11.08250,
    exact_lng: 106.46850,
    commission: "Hoa hồng môi giới chuẩn sàn",
    unit_code: "Củ Chi - Thửa 668 (970m²)",
    raw: {
      dia_chi_chinh_xac: "Thửa 668, Đường số 01, Xã Trung Lập Hạ (giáp Nhuận Đức), Huyện Củ Chi",
      thua_dat: 668,
      gia_chao: "1 Tỷ 280 Triệu (còn bớt)",
      dien_tich: "10 x 80m = 970 m²",
      quy_hoach: "Đất nhóm ở xây dựng mới",
      sdt_nguoi_gui_tin: "0901828258",
      contact_real: "0901828258",
      chu_nha_phone: "0901828258",
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
