import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envText = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("=== BẮT ĐẦU QUÉT VÀ ẨN TIN BỊ CHẾT ẢNH TRÊN NGUỒN ===");
  const { data: crawlListings } = await sb
    .from("listings")
    .select("id, title, source_site, images")
    .eq("source", "crawl")
    .eq("status", "published");

  console.log(`Tìm thấy ${crawlListings.length} tin crawl published...`);

  const deadIds = [];
  for (const item of crawlListings) {
    const firstImg = item.images?.[0];
    if (!firstImg) {
      deadIds.push(item.id);
      continue;
    }
    try {
      const res = await fetch(firstImg, { method: "HEAD" });
      if (res.status === 404) {
        deadIds.push(item.id);
      }
    } catch {
      deadIds.push(item.id);
    }
  }

  console.log(`Phát hiện ${deadIds.length} tin bị chết ảnh (404). Tiến hành chuyển sang status='hidden'...`);

  for (let i = 0; i < deadIds.length; i += 50) {
    const batch = deadIds.slice(i, i + 50);
    const { error } = await sb.from("listings").update({ status: "hidden" }).in("id", batch);
    if (error) {
      console.error("Lỗi ẩn batch:", error.message);
    }
  }

  console.log(`✓ Đã ẩn thành công ${deadIds.length} tin hỏng ảnh!`);
}

run().catch(console.error);
