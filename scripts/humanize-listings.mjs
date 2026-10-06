import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envLocal = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
const getEnv = (k) => process.env[k] || (envLocal.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim();

const sb = createClient(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));

const des1 = `Nhà xây mới hoàn toàn tại hẻm 73 Trần Văn Cẩn, phường Phú Thạnh, quận Tân Phú. Nhà đúc bê tông cốt thép kiên cố gồm 1 trệt, 1 lửng, 2 lầu và sân thượng trước sau, hiện để trống có thể dọn vào ở ngay.

Thông tin chi tiết:
- Diện tích đất: 59,9 m² (ngang 4,2m x dài 13,46m, đất vuông vức).
- Diện tích sàn sử dụng: 184,3 m² (diện tích xây dựng tầng 1 là 49,1 m²).
- Bố trí các tầng:
  + Tầng trệt: chỗ để xe, phòng khách thông tầng trần cao gắn đèn chùm, khu bếp có sẵn tủ kệ và máy rửa chén âm tủ, giếng trời lấy sáng phía sau.
  + Tầng lửng: không gian sinh hoạt chung hoặc làm việc, lan can kính nhìn xuống phòng khách.
  + Lầu 1 và lầu 2: 4 phòng ngủ có nhà vệ sinh riêng, ban công và cửa sổ thoáng gió.
  + Sân thượng: phòng thờ, khu giặt phơi, sân trước và sân sau rộng rãi.
  + Tổng cộng: 4 phòng ngủ, 5 nhà vệ sinh.

Vị trí và tiện ích:
Hẻm 73 Trần Văn Cẩn rộng, sạch sẽ, khu dân cư yên tĩnh. Vị trí này nằm sát đường Lương Thế Vinh và Thoại Ngọc Hầu, đi sang Lũy Bán Bích hay Hòa Bình mất khoảng 3 phút. Trong bán kính 500m có chợ Phú Thạnh, siêu thị Co.opmart và trường học các cấp.

Pháp lý và giá bán:
Sổ hồng riêng chính chủ, hoàn công đầy đủ tháng 7/2026 (số vào sổ CN 4971), đất ở đô thị lâu dài, không vướng quy hoạch lộ giới.
Giá bán: 8 tỷ (thương lượng trực tiếp với chủ nhà).
Liên hệ xem nhà thực tế: 0346 689 460 (Radar Nhà Đất).`;

const des2 = `Nhà 1 trệt 1 lầu tại hẻm 137 Phan Anh, khu phố 12, phường Bình Trị Đông, quận Bình Tân, vị trí giáp ranh quận Tân Phú. Nhà hiện để trống, sạch sẽ, có thể dọn vào ở ngay.

Thông tin chi tiết:
- Diện tích đất: 40,8 m² (ngang 3,4m x dài 12m).
- Diện tích sàn sử dụng: khoảng 82 m².
- Kết cấu: 1 trệt, 1 lầu đúc kiên cố.
- Công năng: tầng trệt có sân để xe, phòng khách, bếp và 1 nhà vệ sinh; tầng lầu có 2 phòng ngủ, ban công phía trước và 1 nhà vệ sinh.

Vị trí và tiện ích:
Nhà nằm trong hẻm 137 Phan Anh, cách ngã tư Bốn Xã khoảng 2 phút chạy xe, thuận tiện di chuyển sang đường Thoại Ngọc Hầu, Hòa Bình, Lê Văn Quới và Hương Lộ 2. Khu vực gần chợ Phan Anh, bách hóa, trường học và cách công viên Đầm Sen khoảng 5 phút.

Pháp lý và giá bán:
Sổ hồng riêng chính chủ, mua bán công chứng ngay trong ngày.
Giá bán: 3 tỷ 300 triệu (thương lượng trực tiếp với chủ nhà, hỗ trợ vay ngân hàng).
Liên hệ xem nhà: 0346 689 460 (Radar Nhà Đất).`;

async function run() {
  const t1 = "Bán nhà 4 tầng hẻm 73 Trần Văn Cẩn, phường Phú Thạnh, Tân Phú (4,2 x 13,5m)";
  const { error: e1 } = await sb.from("listings").update({ title: t1, description: des1 }).eq("id", "b3135d59-527d-487f-89a5-88f3732db6a4");
  console.log("Update 1:", e1 ? e1.message : "Success");

  const t2 = "Bán nhà 1 trệt 1 lầu hẻm 137 Phan Anh, Bình Trị Đông, Bình Tân (3,4 x 12m)";
  const { error: e2 } = await sb.from("listings").update({ title: t2, description: des2 }).eq("id", "1753230a-d623-49a3-8ded-b529fc3688ee");
  console.log("Update 2:", e2 ? e2.message : "Success");
}

run();
