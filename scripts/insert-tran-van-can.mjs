import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

import fs from "fs";
import path from "path";

// Đọc key từ .env.local an toàn, không commit secret
const envLocal = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
const getEnv = (k) => process.env[k] || (envLocal.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim();

const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const listingId = crypto.randomUUID();
const now = new Date().toISOString();

const description = `🔥 SIÊU PHẨM NHÀ PHỐ TÂN PHÚ XÂY MỚI 100% - THIẾT KẾ THÔNG TẦNG HIỆN ĐẠI - DỌN VÀO Ở NGAY

Tọa lạc tại vị trí trung tâm Phường Phú Thạnh, Quận Tân Phú, căn nhà phố sang trọng sở hữu kết cấu bề thế, không gian sống tràn ngập ánh sáng tự nhiên với giếng trời thông thoáng và nội thất hoàn thiện cao cấp.

📐 THÔNG SỐ VÀNG & KẾT CẤU BỀ THẾ:
- Diện tích đất công nhận: 59.9 m² (Ngang 4.20m x Dài 13.46m) - khuôn đất vuông vức phong thủy vượng tài lộc.
- Diện tích sàn sử dụng: 184.3 m² (Diện tích xây dựng tầng 1: 49.1 m²).
- Kết cấu: 1 Trệt + 1 Lửng + 2 Lầu + Sân Thượng trước sau (Đúc bê tông cốt thép kiên cố).
- Công năng hoàn hảo:
  • Tầng trệt: Gara để xe rộng rãi, phòng khách thông tầng trần cao gắn đèn chùm pha lê lộng lẫy, phòng bếp hiện đại kèm hệ tủ cao cấp & máy rửa chén âm tủ, giếng trời sau nhà lấy gió mát tự nhiên.
  • Tầng lửng: Không gian sinh hoạt chung / phòng làm việc view ngắm trọn phòng khách sang trọng với lan can kính uốn cong tinh tế.
  • Lầu 1 & Lầu 2: Gồm 4 phòng ngủ Master khép kín cực kỳ rộng rãi, ban công đón nắng gió, cửa sổ thoáng khí.
  • Tổng cộng: 4 Phòng ngủ, 5 WC trang bị thiết bị vệ sinh nhập khẩu cao cấp.
  • Tầng thượng: Phòng thờ trang nghiêm, khu giặt sấy riêng biệt, sân thượng trước & sau rộng rãi thích hợp trồng cây cảnh, tiệc BBQ thư giãn cuối tuần.

📍 VỊ TRÍ ĐẮC ĐỊA & TIỆN ÍCH LIỀN KỀ:
- Hẻm 73 Trần Văn Cẩn an ninh, yên tĩnh, dân trí cao, camera giám sát 24/7.
- Kết nối giao thông cực kỳ thuận tiện ra các trục đường chính: Lương Thế Vinh, Thoại Ngọc Hầu, Lũy Bán Bích, Hòa Bình.
- Bán kính 500m đầy đủ mọi tiện ích sống: Chợ Phú Thạnh, siêu thị Co.opmart Thoại Ngọc Hầu, trường học các cấp (TH Võ Thị Sáu, THCS Thoại Ngọc Hầu), UBND Quận Tân Phú, Công viên Đầm Sen chỉ 5 phút di chuyển.

📜 PHÁP LÝ CHUẨN CHỈNH - SỔ HỒNG HOÀN CÔNG 2026:
- Sổ hồng riêng chính chủ hoàn công đầy đủ mới nhất tháng 07/2026 (Số vào sổ cấp GCN: CN 4971).
- Đất ở đô thị lâu dài, ranh mốc tọa độ chuẩn chỉ, không dính quy hoạch lộ giới, công chứng sang tên ngay trong ngày.

💰 GIÁ BÁN & CHÍNH SÁCH:
- Giá chào bán: 8 Tỷ VNĐ (Có thương lượng trực tiếp chính chủ, hỗ trợ vay ngân hàng lãi suất ưu đãi).
- Cam kết: Hình ảnh thực tế và video quay thật 100% tại nhà.

☎️ LIÊN HỆ XEM NHÀ & ĐÀM PHÁN CHÍNH CHỦ:
- Hotline / Zalo Radar Nhà Đất: 0346 689 460 (Hỗ trợ xem nhà 24/7, tư vấn pháp lý và đàm phán giá tốt nhất).`;

const listingData = {
  id: listingId,
  source: "ro_hang",
  source_site: "radar",
  deal: "ban",
  kind: "nha",
  title: "Bán Nhà Phố Tân Phú Mới 100% (4.2x13.5m) - 1 Trệt 1 Lửng 2 Lầu ST - Hẻm 73 Trần Văn Cẩn, Phú Thạnh",
  description: description,
  price_vnd: 8000000000,
  area_m2: 59.9,
  bedrooms: 4,
  bathrooms: 5,
  floors: 4,
  direction: "dong_nam",
  legal_status: "Sổ hồng riêng hoàn công 2026",
  furnishing: "Nội thất cao cấp, có máy rửa chén âm tủ",
  province: "Hồ Chí Minh",
  district: "Quận Tân Phú",
  ward: "Phường Phú Thạnh",
  address: "Hẻm 73/•• Trần Văn Cẩn, Phường Phú Thạnh, Quận Tân Phú",
  lat: 10.76235,
  lng: 106.62895,
  contact_name: "Radar Nhà Đất",
  contact_phone: "0346689460",
  ai_score: 99,
  trust_score: 100,
  poster_role_guess: "chu_nha",
  poster_reasons: ["Hàng độc quyền Radar - Sổ hồng hoàn công 2026 đã thẩm định"],
  status: "published",
  first_seen_at: now,
  posted_at: now,
  last_seen_at: now,
  crawl_count: 1,
  source_count: 1,
  amenities: ["parking", "balcony", "terrace", "kitchen", "water_heater", "ac", "security"],
  specs: {
    "Mặt tiền": "4.2m",
    "Chiều dài": "13.46m",
    "Diện tích đất": "59.9 m²",
    "Diện tích sàn": "184.3 m²",
    "Diện tích xây dựng tầng 1": "49.1 m²",
    "Kết cấu": "1 trệt, 1 lửng, 2 lầu, sân thượng (BTCT)",
    "Phòng ngủ": "4 phòng ngủ khép kín",
    "Phòng vệ sinh": "5 WC cao cấp",
    "Năm hoàn công": "Tháng 07/2026",
    "Pháp lý": "Sổ hồng riêng (CN 4971), công chứng ngay",
    "Hiện trạng": "Nhà mới 100%, dọn vào ở liền"
  },
  images: [
    "https://dlpedtfmbtuxmgrdnhij.supabase.co/storage/v1/object/public/uploads/listings/73-tran-van-can/mat-tien.jpg",
    "https://dlpedtfmbtuxmgrdnhij.supabase.co/storage/v1/object/public/uploads/listings/73-tran-van-can/phong-khach-thong-tang.jpg",
    "https://dlpedtfmbtuxmgrdnhij.supabase.co/storage/v1/object/public/uploads/listings/73-tran-van-can/bep-cao-cap.jpg",
    "https://dlpedtfmbtuxmgrdnhij.supabase.co/storage/v1/object/public/uploads/listings/73-tran-van-can/tang-tret-gieng-troi.jpg",
    "https://dlpedtfmbtuxmgrdnhij.supabase.co/storage/v1/object/public/uploads/listings/73-tran-van-can/khong-gian-tret.jpg",
    "https://dlpedtfmbtuxmgrdnhij.supabase.co/storage/v1/object/public/uploads/listings/73-tran-van-can/so-do-thua-dat.jpg",
    "https://dlpedtfmbtuxmgrdnhij.supabase.co/storage/v1/object/public/videos/listings/73-tran-van-can/walkthrough.mp4"
  ]
};

const roHangData = {
  listing_id: listingId,
  partner: "doc_quyen",
  exact_address: "73/6 Trần Văn Cẩn, Phường Phú Thạnh, Quận Tân Phú, TP.HCM",
  exact_lat: 10.76235,
  exact_lng: 106.62895,
  commission: "1% (80.000.000 VNĐ)",
  unit_code: "Sổ hồng CN 4971",
  raw: {
    chu_so_huu: "Bà NGUYỄN THỊ MAI KA",
    cccd: "091191004878",
    thua_dat: 336,
    to_ban_do: 215,
    so_vao_so: "CN 4971",
    so_seri: "AA 09510006",
    ngay_cap: "10/07/2026",
    dia_chi_cu: "MPN 137/5 Lương Thế Vinh",
    hoa_hong: "1% (80.000.000 VNĐ)",
    chu_nha_phone: "0903778817",
    contact_real: "0903778817",
    nguon: "Chính chủ gửi độc quyền - Radar ăn hoa hồng"
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
