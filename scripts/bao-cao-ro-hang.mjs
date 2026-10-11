import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envText = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("==================================================");
  console.log("      📊 BÁO CÁO RỔ HÀNG NHADAT RADAR HIỆN TẠI     ");
  console.log("==================================================");

  const bySource = {};
  const byStatus = {};
  const byDistrict = {};
  let total = 0;

  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("listings")
      .select("source, source_site, status, district, price_vnd, deal")
      .range(from, from + 999);
    if (error) throw error;
    if (!data.length) break;
    total += data.length;

    for (const r of data) {
      const srcKey = (r.source || "khác") + " / " + (r.source_site || "none");
      bySource[srcKey] = (bySource[srcKey] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      if (r.status === "published") {
        const d = r.district || "Chưa rõ quận";
        byDistrict[d] = (byDistrict[d] || 0) + 1;
      }
    }
    if (data.length < 1000) break;
  }

  console.log(`\n📌 TỔNG SỐ TIN TRONG HỆ THỐNG: ${total.toLocaleString("vi-VN")} phòng/căn`);
  console.log(`   • Đang hiển thị (published): ${(byStatus["published"] || 0).toLocaleString("vi-VN")} căn`);
  console.log(`   • Đã cho thuê (gone):        ${(byStatus["gone"] || 0).toLocaleString("vi-VN")} căn`);
  console.log(`   • Tạm ẩn thiếu ảnh (hidden):  ${(byStatus["hidden"] || 0).toLocaleString("vi-VN")} căn`);

  console.log("\n📦 PHÂN BỔ THEO NGUỒN RỔ HÀNG:");
  for (const [src, count] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`   • ${src.padEnd(28)} : ${count.toLocaleString("vi-VN")} căn`);
  }

  console.log("\n📍 TOP 10 KHU VỰC NHIỀU PHÒNG TRỐNG NHẤT:");
  const top = Object.entries(byDistrict).sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [dist, count] of top) {
    console.log(`   • ${dist.padEnd(20)} : ${count.toLocaleString("vi-VN")} phòng`);
  }

  console.log("\n🌐 Xem trực tiếp trên web: https://nhadatradar.com/search");
  console.log("==================================================");
}

run().catch(console.error);
