// ĐẨY "KHÁCH TÌM PHÒNG" LÊN DB (2/10): crawler/facebook-demand.json (facebook.mjs ghi) -> bảng khach_tim
// (migration 032). Trùng bài (cùng link / cùng đoạn đầu nội dung) thì bỏ qua nhờ khoá unique `khoa`.
// Nhân viên xử lý ở /admin?tab=san-khach.
//
//   node --env-file=.env.local crawler/san-khach.mjs      (daily.mjs --fb-only tự gọi sau bước Facebook)
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { PHONE_RE } from "./quality-gate.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const FILE = new URL("./facebook-demand.json", import.meta.url);
if (!fs.existsSync(FILE)) { console.log("san-khach: chưa có facebook-demand.json - bỏ qua"); process.exit(0); }
const { khach = [], crawled_at } = JSON.parse(fs.readFileSync(FILE, "utf8"));
if (!khach.length) { console.log("san-khach: 0 bài khách tìm phòng"); process.exit(0); }

const sb = createClient(url, key, { auth: { persistSession: false } });
const rows = khach.map((k) => ({
  nguon: "facebook",
  url: k.url || null,
  khoa: k.url || String(k.text || "").slice(0, 120),
  ten: k.author || null,
  sdt: (String(k.text || "").match(PHONE_RE)?.[0] || "").replace(/[\s.\-]/g, "") || null,
  noi_dung: String(k.text || "").slice(0, 2000),
  nhu_cau: k.nc || {},
  dang_luc: k.time || crawled_at || null,
}));
let moi = 0;
for (let i = 0; i < rows.length; i += 100) {
  const { data, error } = await sb.from("khach_tim").upsert(rows.slice(i, i + 100), { onConflict: "khoa", ignoreDuplicates: true }).select("id");
  if (error) {
    console.error("san-khach: ghi lỗi:", error.message, error.code === "PGRST205" || /khach_tim/.test(error.message) ? "(chưa chạy migration 032_khach_tim.sql?)" : "");
    process.exit(1);
  }
  moi += data?.length || 0;
}
console.log(`✓ san-khach: ${moi} khách mới (bỏ ${rows.length - moi} bài đã có) -> /admin?tab=san-khach`);
