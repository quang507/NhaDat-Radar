// Gán tin <-> dự án (21/8): dò TÊN dự án trong tiêu đề/địa chỉ tin rồi set listings.project_id.
// Vì sao cần: DB có 455 dự án nhưng 0 tin được gắn - trang dự án toàn rơi vào "tin cùng khu
// vực", còn trang tin không có đường bấm sang dự án. Chạy sau seed trong daily.mjs, idempotent
// (chỉ quét tin project_id còn null nên mỗi lượt chỉ tốn phần tin mới).
//
// Luật khớp THẬN TRỌNG - thà bỏ sót còn hơn gắn nhầm:
// - chỉ dò trong TIÊU ĐỀ + ĐỊA CHỈ, không dò mô tả ("gần Vinhomes Grand Park" là hàng xóm,
//   không phải tin trong dự án)
// - tên dự án phải >= 2 từ và >= 8 ký tự sau khi bỏ dấu ("Sunrise", "Vinhomes" trần khớp bừa)
// - trùng theo ranh giới từ, và phải CÙNG TỈNH khi cả hai bên có tỉnh
// - nhiều dự án cùng khớp -> lấy tên DÀI nhất (cụ thể nhất: "Vinhomes Grand Park" thắng "Vinhomes Grand")
import { createClient } from "@supabase/supabase-js";
import { canonProvince } from "./chung.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.log("gan-du-an: thiếu SUPABASE env -> bỏ qua."); process.exit(0); }
const sb = createClient(url, key, { auth: { persistSession: false } });

// bỏ dấu + thường hoá, mọi dấu câu thành khoảng trắng - so trùng tên không phụ thuộc cách viết
const mo = (s) => (s || "").toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d")
  .replace(/[^a-z0-9]+/g, " ").trim();

const { data: projs, error: e1 } = await sb.from("projects").select("id,name,province").eq("status", "published");
if (e1) { console.error("gan-du-an:", e1.message); process.exit(1); }
const ung = (projs ?? [])
  .map((p) => ({ ...p, key: mo(p.name) }))
  .filter((p) => p.key.length >= 8 && p.key.includes(" "))
  .sort((a, b) => b.key.length - a.key.length);
console.log(`gan-du-an: ${ung.length}/${projs?.length ?? 0} dự án đủ điều kiện tên để dò.`);

let quet = 0, gan = 0;
for (let from = 0; ; from += 1000) {
  const { data: page, error } = await sb.from("listings")
    .select("id,title,address,province").eq("status", "published").is("project_id", null)
    .order("id").range(from, from + 999);
  if (error) { console.error("gan-du-an:", error.message); break; }
  for (const x of page ?? []) {
    quet++;
    const vb = " " + mo(`${x.title || ""} ${x.address || ""}`) + " ";
    // Từ chỉ VỊ TRÍ đứng ngay trước tên = tin hàng xóm, không phải tin trong dự án
    // (đo lượt đầu 21/8: "sát Landmark 81", "kế bên Cityland Park Hills", "sau lưng Masteri
    // Thảo Điền" đều bị gắn nhầm). Cho phép chen 1 từ loại hình ("kế bên CC Masteri...").
    const gancanh = /(gan|sat|canh|ke ben|ben canh|lien ke|sau lung|doi dien|view|cach|truoc mat|gan ke|giap)\s+(cc|cchc|chung cu|du an|toa|khu|can ho)?\s*$/;
    const khop = [];
    for (const p of ung) {
      if (p.province && x.province && canonProvince(p.province) !== canonProvince(x.province)) continue;
      const idx = vb.indexOf(" " + p.key + " ");
      if (idx < 0) continue;
      if (gancanh.test(vb.slice(Math.max(0, idx - 22), idx + 1))) continue;
      khop.push(p);
      if (khop.length >= 3) break;
    }
    // khớp >= 3 dự án khác nhau = bài "danh sách dự án" của môi giới, không thuộc dự án nào
    const hit = khop.length >= 1 && khop.length <= 2 ? khop[0] : null;
    if (hit) {
      const { error: e2 } = await sb.from("listings").update({ project_id: hit.id }).eq("id", x.id);
      if (e2) console.error("gan-du-an: update lỗi", x.id, e2.message); else gan++;
    }
  }
  if (!page || page.length < 1000) break;
}
console.log(`gan-du-an: quét ${quet} tin chưa gán, gán được ${gan} tin vào dự án.`);
