// Đổi URL ảnh/video rổ hàng ĐÃ CÓ trong listings từ /m của Radar về URL gốc của đối tác (5/11, lý do: crawler/che-media.mjs).
// Tin mới do crawler/ro-hang-evohome.mjs ghi thẳng URL gốc. Chạy SAU khi bản crawler mới đã lên main, không thì lượt
// nhập kế tiếp của máy 146 ghi lại /m.
//
//   node --env-file=.env.local scripts/che-media-cu.mjs          # chỉ đếm
//   node --env-file=.env.local scripts/che-media-cu.mjs --ghi    # ghi thật
import { createClient } from "@supabase/supabase-js";
import { veGoc } from "../crawler/che-media.mjs";

const GHI = process.argv.includes("--ghi");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let tu = 0, soTin = 0, soDoi = 0, conM = 0;
for (;;) {
  const { data, error } = await sb.from("listings").select("id, images").eq("source", "ro_hang").order("id").range(tu, tu + 999);
  if (error) throw error;
  if (!data.length) break;
  tu += data.length;
  const doi = [];
  for (const x of data) {
    const moi = (x.images || []).map(veGoc);
    conM += moi.filter((u) => typeof u === "string" && u.includes("nhadatradar.com/m/")).length;
    if (moi.every((u, i) => u === x.images[i])) continue;
    soTin++; soDoi += moi.filter((u, i) => u !== x.images[i]).length;
    doi.push({ id: x.id, images: moi });
  }
  // 20 lệnh update song song - ~18k tin, chạy tuần tự mất cả tiếng
  for (let i = 0; GHI && i < doi.length; i += 20) {
    const kq = await Promise.all(doi.slice(i, i + 20).map((d) => sb.from("listings").update({ images: d.images }).eq("id", d.id)));
    const loi = kq.find((r) => r.error);
    if (loi) throw loi.error;
  }
  if (GHI) console.log(`  đã ghi ${tu} tin đầu`);
}
console.log(`${tu} tin rổ hàng · ${soTin} tin cần đổi (${soDoi} URL) · còn URL /m sau khi đổi: ${conM}${GHI ? " · ĐÃ GHI" : " · chạy thử, thêm --ghi để ghi"}`);
