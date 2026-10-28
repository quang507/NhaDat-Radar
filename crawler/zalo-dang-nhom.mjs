// ============================================================================
//  ĐĂNG PHÒNG RỔ HÀNG LÊN NHÓM ZALO CHO THUÊ, THEO KHU VỰC (29/10/2026)
//
//  Acc Zalo clone của bot (zalo-bot.mjs) vừa đọc tin trong nhóm, vừa "trao đổi" lại bằng phòng
//  rổ hàng của chính Radar (EvoHome / HiFriendz - Radar là đầu mối). Không đăng lại tin cào của
//  người khác, không đăng vào nhóm mua bán (Radar không có hàng bán của mình).
//
//  Nhịp (để không bị coi là spam):
//    - mỗi nhóm tối đa 1 tin/ngày, giờ đăng rải ngẫu nhiên 08:30-19:30, các lượt cách nhau >= 25 phút
//    - mỗi lượt timer (15 phút) đăng TỐI ĐA 1 tin; cả ngày tối đa ZALO_DANG_TOI_DA (mặc định 10)
//    - chỉ phòng ĐÚNG khu vực của nhóm; một phòng không đăng lại vào cùng nhóm
//    - gửi lỗi -> dừng đăng 24 giờ + báo Telegram (bot đọc tin vẫn chạy bình thường)
//
//  Cấu hình nhóm: crawler/private/zalo-nhom.json (KHÔNG vào git - repo public)
//    { "nhom": [ { "id": "<mã nhóm>", "ten": "...", "loai": "thue" | "ban" | "ca_hai" | "chua_xep",
//                  "khu_vuc": ["Gò Vấp", "Quận 7", "Thủ Đức", "Dĩ An", "Hồ Chí Minh"],
//                  "kind": ["phong_tro", "can_ho"], "gia": [3, 5] } ] }   (kind bỏ trống = phòng trọ + căn hộ;
//                  gia = khoảng giá triệu/tháng cho nhóm chia theo mức giá, null = không chặn)
//    Chỉ nhóm "thue" / "ca_hai" có khu_vuc mới được đăng. "ban" và "chua_xep": bot chỉ đọc.
//
//  Chạy:
//    node --env-file=.env.local crawler/zalo-dang-nhom.mjs           một lượt (systemd timer gọi)
//    node --env-file=.env.local crawler/zalo-dang-nhom.mjs --thu     xem sẽ đăng gì, KHÔNG gửi
//    node --env-file=.env.local crawler/zalo-dang-nhom.mjs nhom      liệt kê nhóm acc đang ở, thêm nhóm
//                                                                    mới vào file cấu hình ("chua_xep")
// ============================================================================
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";

const chay = promisify(execFile);
const CLI = process.env.ZALO_CLI || "zalo-agent";
const FILE_NHOM = "crawler/private/zalo-nhom.json";
const FILE_TT = "crawler/private/zalo-dang-trang-thai.json";
const TOI_DA_NGAY = Number(process.env.ZALO_DANG_TOI_DA) || 10;
const CACH_PHUT = Number(process.env.ZALO_DANG_CACH_PHUT) || 25;
const GIO_DAU = 8.5, GIO_CUOI = 19.5;   // khung rải giờ đăng
const THU = process.argv.includes("--thu");
const HOTLINE = "0387365020";            // = src/lib/hotline.ts
const SITE = (process.env.NEXT_PUBLIC_SITE_URL && !/localhost|127\.0\.0\.1/.test(process.env.NEXT_PUBLIC_SITE_URL)
  ? process.env.NEXT_PUBLIC_SITE_URL : "https://nhadatradar.com").replace(/\/$/, "");
const TINH = ["Hồ Chí Minh", "Bình Dương", "Bà Rịa - Vũng Tàu"];

const gio = () => new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });   // "2026-10-29 08:30:00"
const homNay = () => gio().slice(0, 10);
const docJson = (f, macDinh) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return macDinh; } };
const ghiJson = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 2)); };

async function cli(args) {
  const { stdout } = await chay(CLI, ["--json", ...args], { timeout: 120_000, maxBuffer: 20 * 1024 * 1024 });
  return stdout;
}

// ---- nhom: đồng bộ danh sách nhóm acc đang ở vào file cấu hình ----------------------------------
if (process.argv[2] === "nhom") {
  const out = await cli(["group", "list"]);
  const ds = JSON.parse(out.slice(out.indexOf("[")));
  const cfg = docJson(FILE_NHOM, { nhom: [] });
  const co = new Map(cfg.nhom.map((g) => [g.id, g]));
  let moi = 0;
  for (const g of ds) {
    if (co.has(g.threadId)) { co.get(g.threadId).ten = g.name; continue; }
    cfg.nhom.push({ id: g.threadId, ten: g.name, loai: "chua_xep", khu_vuc: [] });
    moi++;
  }
  ghiJson(FILE_NHOM, cfg);
  const dangO = new Set(ds.map((g) => g.threadId));
  for (const g of cfg.nhom) {
    console.log(`${dangO.has(g.id) ? " " : "x"} ${g.loai.padEnd(8)} ${g.id}  ${g.ten}${g.khu_vuc?.length ? "  [" + g.khu_vuc.join(", ") + "]" : ""}`);
  }
  console.log(`\n${ds.length} nhóm acc đang ở · thêm mới ${moi} nhóm ("chua_xep" = chưa đăng, sửa ${FILE_NHOM}) · x = acc đã rời nhóm`);
  process.exit(0);
}

// ---- một lượt đăng ------------------------------------------------------------------------------
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const cfg = docJson(FILE_NHOM, null);
if (!cfg) { console.log(`Chưa có ${FILE_NHOM} - chạy "zalo-dang-nhom.mjs nhom" rồi xếp loại nhóm`); process.exit(0); }
const nhomDang = cfg.nhom.filter((g) => ["thue", "ca_hai"].includes(g.loai) && g.khu_vuc?.length);

const tt = docJson(FILE_TT, { daDang: {} });
const bayGio = gio();
if (tt.tamDungDen && tt.tamDungDen > bayGio) { console.log(`[${bayGio}] tạm dừng đăng tới ${tt.tamDungDen} (${tt.lyDo})`); process.exit(0); }

// đầu ngày: rải giờ đăng ngẫu nhiên cho từng nhóm, các mốc cách nhau >= CACH_PHUT
if (tt.ngay !== homNay()) {
  const n = nhomDang.length;
  const khung = (GIO_CUOI - GIO_DAU) * 60;
  const buoc = n ? Math.max(CACH_PHUT, khung / n) : khung;
  const tron = [...nhomDang].sort(() => Math.random() - 0.5);
  tt.ngay = homNay();
  tt.lich = {};
  tt.homNay = [];
  tron.forEach((g, i) => {
    const phut = GIO_DAU * 60 + Math.min(khung, i * buoc + Math.random() * Math.max(0, buoc - CACH_PHUT));
    tt.lich[g.id] = `${String(Math.floor(phut / 60)).padStart(2, "0")}:${String(Math.floor(phut % 60)).padStart(2, "0")}`;
  });
}
const gioPhut = bayGio.slice(11, 16);
const daDangHomNay = new Set(tt.homNay || []);
const toi = nhomDang
  .filter((g) => tt.lich[g.id] && tt.lich[g.id] <= gioPhut && !daDangHomNay.has(g.id))
  .sort((a, b) => tt.lich[a.id].localeCompare(tt.lich[b.id]));

if (THU) {
  console.log(`Lịch hôm nay: ${nhomDang.map((g) => `${tt.lich[g.id] || "-"} ${g.ten}`).join(" | ") || "(không có nhóm cho thuê nào có khu vực)"}`);
}
const lanCuoi = tt.lanCuoi ? Date.parse(tt.lanCuoi) : 0;
const chuaDuCach = Date.now() - lanCuoi < CACH_PHUT * 60_000;
if (!THU && (!toi.length || chuaDuCach || daDangHomNay.size >= TOI_DA_NGAY)) {
  if (tt.ngay) ghiJson(FILE_TT, tt);
  process.exit(0);
}

/** "Gò Vấp" -> các cách DB ghi quận ("Quận Gò Vấp", "TP. Thủ Đức"...); "Thủ Đức" gồm cả Quận 2 / Quận 9 cũ */
function bienTheQuan(ten) {
  const goc = ten.replace(/^(Quận|Huyện|TP\.|Thành phố|Thị xã|TX\.)\s+/i, "").trim();
  const ds = [ten, goc, `Quận ${goc}`, `Huyện ${goc}`, `TP. ${goc}`, `Thị xã ${goc}`, `TX. ${goc}`];
  if (/^thủ đức$/i.test(goc)) ds.push("Quận 2", "Quận 9");
  return [...new Set(ds)];
}

async function phongChoNhom(g) {
  const kind = g.kind?.length ? g.kind : ["phong_tro", "can_ho"];
  // phòng đã vào nhóm này, hoặc đã đăng ở nhóm khác hôm nay (hai nhóm cùng khu vực không nhận cùng một phòng)
  const daDang = new Set([
    ...(tt.daDang[g.id] || []).map((x) => x.id),
    ...Object.values(tt.daDang).flat().filter((x) => x.luc.startsWith(homNay())).map((x) => x.id),
  ]);
  const gop = new Map();
  for (const kv of g.khu_vuc) {
    let q = sb.from("listings")
      .select("id,title,price_vnd,area_m2,ward,district,province,kind,images,specs,amenities")
      .eq("source", "ro_hang").eq("status", "published").eq("deal", "cho_thue").in("kind", kind);
    q = TINH.includes(kv) ? q.eq("province", kv) : q.in("district", bienTheQuan(kv));
    // nhóm chia theo mức giá ("Phòng trọ Bình Thạnh 3x-4x"): gia = [từ, đến] triệu, null = không chặn
    if (g.gia?.[0] != null) q = q.gte("price_vnd", g.gia[0] * 1e6);
    if (g.gia?.[1] != null) q = q.lt("price_vnd", g.gia[1] * 1e6);
    const { data, error } = await q.order("first_seen_at", { ascending: false }).limit(150);
    if (error) throw new Error(error.message);
    for (const x of data) gop.set(x.id, x);
  }
  // ưu tiên phòng có >= 3 ảnh, mới vào rổ; chọn ngẫu nhiên trong 15 phòng đầu để các nhóm không trùng nhau
  const ung = [...gop.values()].filter((x) => !daDang.has(x.id) && (x.images || []).filter(laAnh).length >= 3);
  const top = ung.slice(0, 15);
  return top.length ? top[Math.floor(Math.random() * top.length)] : null;
}

const laAnh = (u) => !/\.(mp4|mov|webm|m3u8)(\?|$)/i.test(String(u));
const maPhong = (id) => "RH" + id.replace(/-/g, "").slice(0, 6).toUpperCase();   // = src/lib/ro-hang.ts
const trieu = (v) => (v >= 1e6 ? (Math.round(v / 1e5) / 10).toString().replace(".", ",") + " triệu" : Math.round(v / 1e3) + "k");

function noiDung(x) {
  const s = x.specs || {};
  const chiPhi = [["Điện", s["Điện"]], ["Nước", s["Nước"]], ["Phí quản lý", s["Phí quản lý"]], ["Gửi xe", s["Gửi xe"] || s["Tiền xe"]], ["Cọc", s["Tiền cọc"]]]
    .filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
  return [
    `🏠 ${x.title}`,
    `💰 ${trieu(x.price_vnd)}/tháng${x.area_m2 ? ` · ${String(x.area_m2).replace(".", ",")} m²` : ""}`,
    `📍 ${[x.ward, x.district].filter(Boolean).join(", ")}`,
    chiPhi.length ? `🧾 ${chiPhi.join(" · ")}` : "",
    s["Nội thất"] ? `🛋 Nội thất: ${String(s["Nội thất"]).replace(/^Nội thất\s*/i, "").toLowerCase()}` : "",
    `🔑 Mã: ${maPhong(x.id)}`,
    `👉 Xem đủ ảnh, vị trí, chi phí: ${SITE}/listings/${x.id}`,
    `📞 Zalo/Hotline Radar: ${HOTLINE} (nhắn mã phòng để hẹn xem)`,
  ].filter(Boolean).join("\n");
}

async function taiAnh(x) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zalo-dang-"));
  const tep = [];
  for (const [i, u] of (x.images || []).filter(laAnh).slice(0, 4).entries()) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(20_000) });
      const loai = r.headers.get("content-type") || "";
      if (!r.ok || !loai.startsWith("image/")) continue;
      const f = path.join(dir, `${i}.${loai.includes("png") ? "png" : loai.includes("webp") ? "webp" : "jpg"}`);
      fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
      tep.push(f);
    } catch { /* ảnh lỗi thì bỏ ảnh đó */ }
  }
  return { dir, tep };
}

async function baoTelegram(text) {
  const { TELEGRAM_BOT_TOKEN: t, TELEGRAM_CHAT_ID: c } = process.env;
  if (!t || !c) return;
  try { await fetch(`https://api.telegram.org/bot${t}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: c, text }) }); } catch { /* không chặn */ }
}

if (THU) {
  for (const g of nhomDang) {
    const x = await phongChoNhom(g);
    console.log(`\n===== ${tt.lich[g.id]} → ${g.ten} [${g.khu_vuc.join(", ")}]`);
    console.log(x ? noiDung(x) + `\n(${(x.images || []).filter(laAnh).slice(0, 4).length} ảnh)` : "(không có phòng hợp khu vực chưa đăng)");
  }
  process.exit(0);
}

// đăng ĐÚNG MỘT nhóm: nhóm có giờ sớm nhất đã tới
const g = toi[0];
const x = await phongChoNhom(g);
if (!x) {
  console.log(`[${bayGio}] ${g.ten}: không còn phòng hợp khu vực chưa đăng - bỏ hôm nay`);
  tt.homNay = [...daDangHomNay, g.id];
  ghiJson(FILE_TT, tt);
  process.exit(0);
}
const { dir, tep } = await taiAnh(x);
let out = "", loi = null;
try {
  out = tep.length
    ? await cli(["msg", "send-image", "-t", "1", "-m", noiDung(x), g.id, ...tep])
    : await cli(["msg", "send", "-t", "1", g.id, noiDung(x)]);
  if (out.includes("✗") || !out.includes("{")) loi = out.replace(/\u001b\[[0-9;]*m/g, "").trim().slice(0, 300) || "CLI không trả kết quả";
} catch (e) {
  loi = e.message.slice(0, 300);
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

if (loi) {
  tt.tamDungDen = new Date(Date.now() + 24 * 3600_000).toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
  tt.lyDo = `gửi vào "${g.ten}" lỗi: ${loi}`;
  ghiJson(FILE_TT, tt);
  console.error(`[${bayGio}] LỖI ${tt.lyDo} -> dừng đăng 24 giờ`);
  await baoTelegram(`⚠️ Bot Zalo Radar dừng đăng nhóm 24 giờ.\nNhóm: ${g.ten}\nLỗi: ${loi}\nBot đọc tin vẫn chạy. Kiểm tra acc clone có bị Zalo hạn chế không.`);
  process.exit(1);
}

tt.homNay = [...daDangHomNay, g.id];
tt.lanCuoi = new Date().toISOString();
tt.daDang[g.id] = [{ id: x.id, luc: bayGio }, ...(tt.daDang[g.id] || [])].slice(0, 300);
ghiJson(FILE_TT, tt);
console.log(`[${bayGio}] ✓ ${g.ten} ← ${maPhong(x.id)} ${x.title} (${tep.length} ảnh) · hôm nay ${tt.homNay.length}/${Math.min(nhomDang.length, TOI_DA_NGAY)}`);
