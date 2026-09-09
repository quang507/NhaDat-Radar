import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

console.log("=== BẮT ĐẦU DỌN DẸP VÀ TỐI ƯU SUPABASE DATABASE ===");

// 1. Đếm hiện trạng trước khi dọn
const { count: totalBefore } = await sb.from("listings").select("*", { count: "exact", head: true });
const { count: pubBefore } = await sb.from("listings").select("*", { count: "exact", head: true }).eq("status", "published");
const { count: goneBefore } = await sb.from("listings").select("*", { count: "exact", head: true }).eq("status", "gone");
console.log(`Hiện trạng trước dọn: Tổng ${totalBefore} tin (Published: ${pubBefore}, Gone: ${goneBefore})`);

// 2. Chuyển sang 'gone' các tin crawl không thấy lại > 7 ngày (chia batch 100 để né URL length limit)
const goneCutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
let markGone = 0;
while (true) {
  const { data: batch, error: bErr } = await sb.from("listings")
    .select("id")
    .eq("source", "crawl").eq("status", "published").lt("last_seen_at", goneCutoff)
    .limit(100);
  if (bErr) { console.error("Lỗi đọc batch gone:", bErr.message); break; }
  if (!batch || !batch.length) break;
  const ids = batch.map((r) => r.id);
  const { error: uErr } = await sb.from("listings").update({ status: "gone" }).in("id", ids);
  if (uErr) { console.error("Lỗi update batch gone:", uErr.message); break; }
  markGone += ids.length;
}
console.log(`✓ Đã chuyển sang 'gone': ${markGone} tin`);

// 3. Xoá cứng các tin crawl cũ hơn 21 ngày không thấy lại
const hardCutoff = new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString();
const { count: purgedHard, error: e2 } = await sb.from("listings").delete({ count: "exact" })
  .eq("source", "crawl").lt("last_seen_at", hardCutoff);
if (e2) console.error("Lỗi xoá cứng >21 ngày:", e2.message);
else console.log(`✓ Đã xoá vĩnh viễn tin quá 21 ngày: ${purgedHard || 0} tin`);

// 4. Xoá các tin đã 'gone' quá 7 ngày
const gonePurgeCutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
const { count: purgedGone, error: e3 } = await sb.from("listings").delete({ count: "exact" })
  .eq("source", "crawl").eq("status", "gone").lt("last_seen_at", gonePurgeCutoff);
if (e3) console.error("Lỗi xoá tin gone >7 ngày:", e3.message);
else console.log(`✓ Đã xoá vĩnh viễn tin gone quá 7 ngày: ${purgedGone || 0} tin`);

// 5. Giải phóng embedding vector(768) cho các tin đã 'gone' còn lại (giảm tải HNSW / RAM)
let nullEmbedding = 0;
while (true) {
  const { data: batch, error: bErr } = await sb.from("listings")
    .select("id")
    .eq("status", "gone").not("embedding", "is", null)
    .limit(100);
  if (bErr) { console.error("Lỗi đọc batch embedding:", bErr.message); break; }
  if (!batch || !batch.length) break;
  const ids = batch.map((r) => r.id);
  const { error: uErr } = await sb.from("listings").update({ embedding: null }).in("id", ids);
  if (uErr) { console.error("Lỗi update batch embedding:", uErr.message); break; }
  nullEmbedding += ids.length;
}
console.log(`✓ Đã giải phóng embedding vector cho tin gone: ${nullEmbedding} tin`);

// 6. Dọn lịch sử giá cũ hơn 180 ngày
const oldPriceDay = new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString().slice(0, 10);
const { count: phDeleted, error: e5 } = await sb.from("price_history").delete({ count: "exact" }).lt("day", oldPriceDay);
if (e5) console.error("Lỗi dọn price_history:", e5.message);
else console.log(`✓ Đã dọn lịch sử giá quá 180 ngày: ${phDeleted || 0} dòng`);

// 7. Đếm lại sau khi dọn
const { count: totalAfter } = await sb.from("listings").select("*", { count: "exact", head: true });
const { count: pubAfter } = await sb.from("listings").select("*", { count: "exact", head: true }).eq("status", "published");
const { count: goneAfter } = await sb.from("listings").select("*", { count: "exact", head: true }).eq("status", "gone");
console.log("=== KẾT QUẢ DỌN DẸP HOÀN TẤT ===");
console.log(`Hiện trạng sau dọn: Tổng ${totalAfter} tin (Published: ${pubAfter}, Gone: ${goneAfter})`);
console.log(`Số tin đã được xoá giải phóng khỏi database: ${(totalBefore || 0) - (totalAfter || 0)} tin!`);
