import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envText = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export async function importPartner(partner = "evohome") {
  const filePath = `crawler/private/${partner}-rows.json`;
  if (!fs.existsSync(filePath)) {
    console.error(`Không tìm thấy file: ${filePath}`);
    return;
  }

  console.log(`\n=== BẮT ĐẦU NẠP RỔ HÀNG: ${partner.toUpperCase()} ===`);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const { rows, priv } = data;
  console.log(`Tổng số phòng trong file: ${rows.length}`);

  // Làm sạch dữ liệu trước khi upsert (loại bỏ generated column price_per_m2)
  const cleanRows = rows.map((r) => {
    const copy = { ...r };
    delete copy.price_per_m2;
    return copy;
  });

  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < cleanRows.length; i += BATCH_SIZE) {
    const rowBatch = cleanRows.slice(i, i + BATCH_SIZE);
    const privBatch = priv ? priv.slice(i, i + BATCH_SIZE) : [];

    const { error: err1 } = await sb.from("listings").upsert(rowBatch, { onConflict: "id" });
    if (err1) {
      console.error(`Lỗi upsert listings batch ${i} - ${i + rowBatch.length}:`, err1.message);
      break;
    }

    if (privBatch.length) {
      const { error: err2 } = await sb.from("listing_ro_hang").upsert(privBatch, { onConflict: "listing_id" });
      if (err2) {
        console.error(`Lỗi upsert listing_ro_hang batch ${i} - ${i + privBatch.length}:`, err2.message);
      }
    }

    inserted += rowBatch.length;
    if (inserted % 500 === 0 || inserted === cleanRows.length) {
      console.log(`Đã nạp ${inserted} / ${cleanRows.length} phòng...`);
    }
  }

  console.log(`✓ Hoàn tất nạp ${partner.toUpperCase()}: ${inserted} phòng thành công!`);
}

// Nếu gọi trực tiếp từ CLI: node scripts/import-ro-hang.mjs [evohome|hifriendz]
const target = process.argv[2] || "evohome";
if (process.argv[1].endsWith("import-ro-hang.mjs")) {
  importPartner(target).catch(console.error);
}
