import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envLocal = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
const getEnv = (k) => process.env[k] || (envLocal.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim();

const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE credentials");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function uploadFile(localPath, storagePath, contentType = "image/jpeg") {
  if (!fs.existsSync(localPath)) {
    console.error("File not found:", localPath);
    return null;
  }
  const buffer = fs.readFileSync(localPath);
  const { data, error } = await sb.storage.from("uploads").upload(storagePath, buffer, {
    contentType,
    upsert: true
  });
  if (error) {
    console.error(`Upload error ${storagePath}:`, error.message);
    return null;
  }
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/uploads/${storagePath}`;
  console.log(`✓ Uploaded ${storagePath} -> ${publicUrl}`);
  return publicUrl;
}

async function fixPhanAnh() {
  console.log("\n--- Fixing 137 Phan Anh ---");
  const img1 = "C:/Users/quang/.gemini/antigravity/brain/b0f0a836-af44-474a-a280-d499ec839d40/.user_uploaded/media_1791251725804.jpg";
  const img2 = "C:/Users/quang/.gemini/antigravity/brain/b0f0a836-af44-474a-a280-d499ec839d40/.user_uploaded/media_1791251729592.jpg";

  const url1 = await uploadFile(img1, "listings/137-phan-anh/nha-01.jpg");
  const url2 = await uploadFile(img2, "listings/137-phan-anh/nha-02.jpg");

  const images = [url1, url2].filter(Boolean);
  if (!images.length) {
    console.error("No images uploaded for Phan Anh");
    return;
  }

  // Find Phan Anh listing
  const { data: rows } = await sb.from("listings").select("id").ilike("title", "%137 Phan Anh%");
  if (rows && rows.length > 0) {
    for (const r of rows) {
      const { error } = await sb.from("listings").update({ images }).eq("id", r.id);
      if (error) console.error("Update listing error:", error.message);
      else console.log(`✓ Updated Phan Anh listing ${r.id} with ${images.length} images`);
    }
  }
}

async function fixTranVanCan() {
  console.log("\n--- Fixing 73/6 Trần Văn Cẩn ---");
  const dir = "D:/Nhadatradar.com/NhaDat-Radar/public/listings/73-tran-van-can";
  const files = [
    "house_01.jpg",
    "house_02.jpg",
    "house_03.jpg",
    "house_04.jpg",
    "house_05.jpg",
    "so_hong_trang_2_clean.jpg"
  ];

  const images = [];
  for (const f of files) {
    const local = path.join(dir, f);
    const url = await uploadFile(local, `listings/73-tran-van-can/${f}`);
    if (url) images.push(url);
  }

  const { data: rows } = await sb.from("listings").select("id").ilike("title", "%Trần Văn Cẩn%");
  if (rows && rows.length > 0) {
    for (const r of rows) {
      const { error } = await sb.from("listings").update({ images }).eq("id", r.id);
      if (error) console.error("Update listing error:", error.message);
      else console.log(`✓ Updated Trần Văn Cẩn listing ${r.id} with ${images.length} images`);
    }
  }
}

async function main() {
  await fixPhanAnh();
  await fixTranVanCan();
  console.log("\n=== ALL VIP IMAGES FIXED AND UPLOADED! ===");
}

main().catch(console.error);
