// Đổi URL ảnh/video rổ hàng ĐÃ CÓ trong listings sang /m của Radar (3/11) - tin mới do crawler/ro-hang-evohome.mjs
// tự đổi lúc nhập. Chạy SAU khi bản có rewrites /m (next.config.mjs) đã lên production, không thì ảnh vỡ.
//
//   node --env-file=.env.local scripts/che-media-cu.mjs          # chỉ đếm
//   node --env-file=.env.local scripts/che-media-cu.mjs --ghi    # ghi thật
import { createClient } from "@supabase/supabase-js";
import { cheMedia, conLoNguon } from "../crawler/che-media.mjs";

const GHI = process.argv.includes("--ghi");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let tu = 0, soTin = 0, soDoi = 0, conLo = 0;
for (;;) {
  const { data, error } = await sb.from("listings").select("id, images").eq("source", "ro_hang").order("id").range(tu, tu + 999);
  if (error) throw error;
  if (!data.length) break;
  tu += data.length;
  const doi = [];
  for (const x of data) {
    const moi = (x.images || []).map(cheMedia);
    conLo += moi.filter(conLoNguon).length;
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
console.log(`${tu} tin rổ hàng · ${soTin} tin cần đổi (${soDoi} URL) · còn lộ nguồn sau khi đổi: ${conLo}${GHI ? " · ĐÃ GHI" : " · chạy thử, thêm --ghi để ghi"}`);
