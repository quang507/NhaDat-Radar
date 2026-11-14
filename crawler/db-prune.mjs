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

// 2. Chuyển sang 'gone' — CÙNG luật với crawler/daily.mjs. Trước đây 7 ngày cho MỌI nguồn, lệch luật
//    5 ngày (web) / 10 ngày (nguồn máy nhà) của daily.mjs -> tin FB/batdongsan còn sống bị hạ sớm.
//    Chia batch 100 để né URL length limit.
const HOME_ONLY = ["facebook.com", "facebook", "batdongsan.com.vn"];
// 14/11: tin chưa có last_seen_at thì .lt("last_seen_at") không bao giờ khớp -> sống mãi. 276 tin cào chèn
// một lượt ngày 8/10 không có mốc này, Chợ Tốt xoá tin rồi mà web vẫn hiện, ảnh chết. Bù mốc như crawler/daily.mjs
// (lúc cào / thấy lần đầu / lúc tạo) trước khi lọc.
{
  const nulls = [];
  for (let from = 0; ; from += 1000) { // PostgREST cắt 1000/lần
    const { data, error } = await sb.from("listings").select("id,crawled_at,first_seen_at,created_at").eq("source", "crawl").is("last_seen_at", null).order("id").range(from, from + 999);
    if (error) { console.error("Lỗi đọc tin thiếu last_seen_at:", error.message); break; }
    nulls.push(...(data || [])); if (!data || data.length < 1000) break;
  }
  for (let i = 0; i < nulls.length; i += 20)
    await Promise.all(nulls.slice(i, i + 20).map((r) => sb.from("listings").update({ last_seen_at: r.crawled_at || r.first_seen_at || r.created_at }).eq("id", r.id)));
  if (nulls.length) console.log(`(bù last_seen_at cho ${nulls.length} tin thiếu mốc)`);
}
const goneCutoff = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
const goneCutoffHome = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString();
const nhomGone = [
  (q) => q.or(`source_site.is.null,source_site.not.in.(${HOME_ONLY.map((s) => `"${s}"`).join(",")})`).lt("last_seen_at", goneCutoff),
  (q) => q.in("source_site", HOME_ONLY).lt("last_seen_at", goneCutoffHome),
];
let markGone = 0;
for (const locNhom of nhomGone) {
  while (true) {
    const { data: batch, error: bErr } = await locNhom(
      sb.from("listings").select("id").eq("source", "crawl").eq("status", "published"),
    ).limit(100);
    if (bErr) { console.error("Lỗi đọc batch gone:", bErr.message); break; }
    if (!batch || !batch.length) break;
    const ids = batch.map((r) => r.id);
    const { error: uErr } = await sb.from("listings").update({ status: "gone" }).in("id", ids);
    if (uErr) { console.error("Lỗi update batch gone:", uErr.message); break; }
    markGone += ids.length;
  }
}
console.log(`✓ Đã chuyển sang 'gone': ${markGone} tin`);

// 3+4. TIN CŨ -> "DÒNG MỘ" thay vì XOÁ CỨNG (2/10, SEO). Xoá hẳn thì URL /listings/<id> thành 404 - Search
//    Console đo 2/10: 3.876 trang 404. Giờ giữ dòng nhẹ (id, deal, kind, tỉnh, quận, tiêu đề) và bỏ phần nặng
//    (mô tả, ảnh, specs, embedding...) -> trang tin chuyển hướng 301 về trang khu vực (listings/[id]/page.tsx).
//    Mỗi dòng mộ ~0,5 KB - vài nghìn dòng/tháng không đáng kể so với trần 500 MB.
//    Luật thời gian giữ nguyên: không thấy lại > 45 ngày, hoặc đã 'gone' > 21 ngày.
const hardCutoff = new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString();
const gonePurgeCutoff = new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString();
const MO = { status: "gone", description: null, images: [], amenities: [], specs: null, embedding: null,
  address: null, contact_phone: null, phone_masked: null, poster_reasons: null };
const conNang = "description.not.is.null,images.neq.{}";   // chưa thành dòng mộ -> khỏi ghi lại mỗi lượt
let soMo = 0;
for (const loc of [
  (q) => q.lt("last_seen_at", hardCutoff),
  (q) => q.eq("status", "gone").lt("last_seen_at", gonePurgeCutoff),
]) {
  const { count, error } = await loc(sb.from("listings").update(MO, { count: "exact" }).eq("source", "crawl").or(conNang));
  if (error) console.error("Lỗi chuyển dòng mộ:", error.message);
  else soMo += count || 0;
}
console.log(`✓ Chuyển ${soMo} tin cũ thành dòng mộ (giữ URL để chuyển hướng 301, bỏ phần nặng)`);

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

// 6b. Nhật ký xem SĐT (migration 037) - Chính sách bảo mật cam kết lưu tối đa 180 ngày.
// Bảng chưa có (chưa chạy 037) thì bỏ qua, không làm hỏng các bước dọn khác.
const { count: xsDeleted, error: e6 } = await sb.from("xem_sdt").delete({ count: "exact" }).lt("ngay", oldPriceDay);
if (e6) console.error("Bỏ qua dọn xem_sdt:", e6.message);
else console.log(`✓ Đã dọn nhật ký xem SĐT quá 180 ngày: ${xsDeleted || 0} dòng`);

// 7. Đếm lại sau khi dọn
const { count: totalAfter } = await sb.from("listings").select("*", { count: "exact", head: true });
const { count: pubAfter } = await sb.from("listings").select("*", { count: "exact", head: true }).eq("status", "published");
const { count: goneAfter } = await sb.from("listings").select("*", { count: "exact", head: true }).eq("status", "gone");
console.log("=== KẾT QUẢ DỌN DẸP HOÀN TẤT ===");
console.log(`Hiện trạng sau dọn: Tổng ${totalAfter} tin (Published: ${pubAfter}, Gone: ${goneAfter})`);
console.log(`Số tin đã được xoá giải phóng khỏi database: ${(totalBefore || 0) - (totalAfter || 0)} tin!`);
