// ============================================================================
//  Zalo bot (không cần OA/GPKD) - cầu nối zalo-agent-cli <-> NhaDat Radar.
//  Lắng nghe tin nhắn Zalo (acc clone, đăng nhập QR bằng zalo-agent-cli),
//  tin NHÓM: Gemini bóc tin BĐS -> lưu (không bao giờ trả lời trong nhóm).
//  chat 1-1: zalo-tu-van-lead.mjs - bot gợi ý câu trả lời cho admin, chỉ tự trả lời khi được bật cờ.
//
//  CHẠY TRÊN MÁY/VPS (giữ phiên đăng nhập), KHÔNG chạy trên Vercel.
//  Cài 1 lần:  npm i -g zalo-agent-cli   (rồi đăng nhập: zalo-agent login  -> quét QR)
//  Chạy:       node --env-file=.env.local crawler/zalo-bot.mjs
//
//  ⚠ Dùng tài khoản Zalo CLONE - API không chính thức có thể bị Zalo khoá.
// ============================================================================
import { spawn, execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { qualityGate, BDS_KEYWORD, PHONE_RE, AREA_HINT } from "./quality-gate.mjs";
import { canonProvince, quanTheoDB } from "./chung.mjs";
import { taoTuVan, ADMIN_ZALO_UID, BOT_TU_DONG_TRA_LOI_KHACH, soanTinSanKhach, timPhongPhuHop, TIEN_ICH, maPhong } from "./zalo-tu-van-lead.mjs";
import { taoKhoHoiThoai } from "./zalo-hoi-thoai.mjs";
import { taoCongGui, trongGioIm } from "./zalo-gui.mjs";
import { laBaiTimPhong, SYS_TIM, SCHEMA_TIM, chuanHoaNhuCau } from "./khach-tim.mjs";

// Windows: spawn/execFileSync KHÔNG chạy được shim .cmd của npm (ENOENT/EINVAL)
// -> tìm file bin thật của zalo-agent-cli trong npm global rồi gọi `node <bin>`.
function resolveZalo() {
  const override = process.env.ZALO_CLI;
  if (override && override.endsWith(".js")) return { exe: process.execPath, pre: [override] };
  if (process.platform !== "win32") return { exe: override || "zalo-agent", pre: [] };
  const roots = [
    path.join(process.env.APPDATA || "", "npm", "node_modules", "zalo-agent-cli"),
    path.join(path.dirname(process.execPath), "node_modules", "zalo-agent-cli"),
  ];
  for (const r of roots) {
    try {
      let bin = JSON.parse(readFileSync(path.join(r, "package.json"), "utf8")).bin;
      if (bin && typeof bin === "object") bin = bin["zalo-agent"] ?? Object.values(bin)[0];
      if (bin) return { exe: process.execPath, pre: [path.join(r, bin)] };
    } catch { /* thử root kế */ }
  }
  console.error("Không tìm thấy zalo-agent-cli (npm i -g zalo-agent-cli), hoặc đặt ZALO_CLI=đường dẫn src/index.js");
  process.exit(1);
}
const ZALO = resolveZalo();
const CLI = ZALO.exe; // + ZALO.pre trước args
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
// Quota Gemini free = 500 request/NGAY/key. Crawler FB dot 1 luot ~500 lenh nen no an
// het key1 -> bot phuc vu khach that bi doi. Nguyen tac: viec nen KHONG duoc doi viec truoc mat.
//  - Co ZALO_GEMINI_KEY  -> bot dung rieng key do truoc, crawler khong bao gio dung (xem facebook.mjs)
//  - Khong co            -> bot duyet danh sach NGUOC (key cuoi truoc), crawler duyet xuoi
//    -> voi 2 key: crawler dot key1, bot xai key2, chi dung do khi ca hai da can.
const _KEYS_CHUNG = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY2, process.env.GEMINI_API_KEY3,
  process.env.GEMINI_API_KEY4, process.env.GEMINI_API_KEY5].filter(Boolean);
const KEYS = [process.env.ZALO_GEMINI_KEY, ..._KEYS_CHUNG.reverse()].filter(Boolean);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Thiếu SUPABASE env (.env.local)"); process.exit(1); }
if (!KEYS.length) { console.error("Thiếu GEMINI_API_KEY* (.env.local) - bot không phân loại được tin"); process.exit(1); } // audit 16/8: trước im lặng chào hỏi mãi
const sb = createClient(url, key, { auth: { persistSession: false } });
// Nhóm acc clone có mặt nhưng KHÔNG phải nhóm BĐS (nhóm nội bộ, nhóm riêng) -> bot không đọc, không gửi
// Gemini. Mã nhóm để trong .env.local (repo public), cách nhau dấu phẩy: ZALO_BO_QUA_NHOM=id1,id2
const BO_QUA_NHOM = new Set((process.env.ZALO_BO_QUA_NHOM || "").split(/[\s,]+/).filter(Boolean));


function lamSachMoTa(text) {
  if (!text) return "";
  let res = String(text);
  res = res.split("\n")
    .filter((l) => !/(tuyển\s+(ctv|cộng\s+tác|nhân\s+viên)|hoa\s+hồng\s+\d+|chấm\s+(nhẹ|\.)|inbox\s+(để|nhận)|ib\s+(zalo|em|mình)\s+xem|kho\s+hàng\s+\d+|quỹ\s+căn|zalo\.me\/g\/)/iu.test(l))
    .join("\n");
  res = res.replace(/([\uD800-\uDBFF][\uDC00-\uDFFF])\1{2,}/g, "$1");
  res = res.replace(/\n{3,}/g, "\n\n").trim();
  return res;
}

// ---- Gemini phân loại (giống lib/ai.ts) ----
const PROMPT = `Bạn là trợ lý Zalo của sàn nhà đất. Đọc tin nhắn và trả về DUY NHẤT 1 JSON:
{"intent":"dang_tin"|"hoi_tin"|"hoi_sau"|"xem_nha"|"sua_tin"|"khac","reply_hint":string,"ref_index":number|null,
 "sua":{"ma_tin":string|null,"price_vnd":number|null,"area_m2":number|null,"bedrooms":number|null,"bathrooms":number|null,"floors":number|null,"mo_ta_them":string|null},
 "listing":{"title":string,"price_vnd":number|null,"area_m2":number|null,"bedrooms":number|null,"bathrooms":number|null,"floors":number|null,"listing_type":"ban"|"cho_thue","property_type":"nha"|"dat"|"can_ho"|"mat_bang"|"phong_tro"|"khac","province":string|null,"district":string|null,"ward":string|null,"legal":string|null,"direction":string|null,"furnishing":string|null,"amenities":string[],"contact_phone":string|null,"specs":object|null,"poster_role":"chinh_chu"|"moi_gioi"|"khong_ro"},
 "query":{"listing_type":"ban"|"cho_thue"|null,"property_type":string|null,"province":string|null,"district":string|null,"ward":string|null,"price_min":number|null,"price_max":number|null,"area_min":number|null}}
dang_tin: họ RAO 1 BĐS. hoi_tin: họ TÌM nhà theo tiêu chí (khu vực/giá/loại). hoi_sau: họ hỏi CHI TIẾT về MỘT CĂN CỤ THỂ đã nhắc trong hội thoại hoặc có link/mã - xem sổ đỏ, pháp lý, quy hoạch, xin thêm ảnh, thương lượng giá, "căn số 2 còn không". xem_nha: họ muốn ĐI XEM TRỰC TIẾP / hẹn lịch xem một căn ("cho tôi xem nhà", "cuối tuần qua coi được không") - ưu tiên xem_nha hơn hoi_sau khi họ ngỏ ý đến tận nơi. sua_tin: NGƯỜI ĐĂNG muốn SỬA/BỔ SUNG tin của chính họ đã đăng ("sửa giá 5,5 tỷ", "đổi diện tích 80m2", "bổ sung: có gác lửng, 3PN") - điền vào "sua": ma_tin là mã 8 ký tự nếu họ nhắc, các trường số nếu họ đổi, mo_ta_them là phần bổ sung tự do. ref_index: số thứ tự căn họ nhắc (1-4) nếu họ nói rõ ("căn 2", "cái thứ nhất"), không thì null. khac: chào/khác. Giá quy về VND (3tr5->3500000, 6 tỷ->6000000000). Không bịa.
specs: các ĐẶC ĐIỂM RIÊNG người bán có ghi, dạng {"nhãn tiếng Việt":"giá trị"}. Bộ nhãn THEO TỪNG DÒNG BĐS:
- nha (nhà thổ cư): Ngang, Dài, DT đất, DT sàn, Thổ cư, Kết cấu ("1 trệt 2 lầu 1 tum"), Đường trước nhà ("hẻm xe hơi 6m" / "mặt tiền đường 12m"), Vị trí ("góc 2 mặt tiền", "hẻm cụt"), Năm xây, Hiện trạng ("đang cho thuê 15tr/th", "nhà mới")
- can_ho: Dự án, Block/Tháp, Tầng, Mã căn, Loại căn (studio/1PN+1/duplex/penthouse/officetel), DT tim tường, DT thông thuỷ, Hướng cửa, Hướng ban công, View ("view sông", "view nội khu"), Phí quản lý, Năm bàn giao, Sổ (sổ hồng / HĐMB / chờ sổ)
- dat (đất nền): Mặt tiền, Chiều dài, Thổ cư (m²), Loại đất (ONT/ODT/CLN/SKC/lúa), Đường vào (rộng mấy mét, nhựa hay đá), Lô/Thửa/Tờ bản đồ, Quy hoạch, Hiện trạng ("đã san lấp", "có nhà cấp 4", "trồng cây")
- mat_bang: Ngang, Dài, DT sàn, Số tầng, Vị trí ("góc 2 mặt tiền", "gần chợ/trường"), Ngành phù hợp ("F&B, thời trang"), Hiện trạng ("đang trống", "sang lại nội thất"), Giá sang nhượng
- phong_tro: DT phòng, Gác lửng ("có gác"/"không gác"), Máy lạnh, WC riêng/chung, Ban công/Cửa sổ, Nuôi thú cưng ("cho nuôi"/"không"), Giờ giấc ("tự do"/"khóa cửa"), Chung chủ ("không chung chủ"/"chung chủ"), Điện (đ/kWh), Nước (đ/người hoặc đ/m³), Phí xe (đ/tháng hoặc free), Phí quản lý, Gần trường/địa danh ("gần ĐH Hutech", "cách Làng ĐH 500m")
- tin CHO THUÊ (mọi loại) thêm: Tiền cọc, Thời hạn HĐ, Phí quản lý, Điện, Nước, Phí xe, Nuôi pet, Bao gồm
poster_role: "chinh_chu" nếu họ nói "chính chủ", "nhà mình/bác/chị còn phòng", "miễn trung gian/không qua môi giới"; "moi_gioi" nếu xưng "bên em", "kho hàng", "quỹ căn", "ib zalo giỏ hàng", hoa hồng; còn lại "khong_ro".
amenities: nhận các nhãn chuẩn: ban_cong, cua_so, gac_lung, thang_may, gio_tu_do, khong_chung_chu, nuoi_pet, may_lanh, tu_lanh, may_giat, may_nuoc_nong, bao_ve, khoa_van_tay, ho_boi, phong_gym, noi_that_day_du.
CHỈ lấy thứ họ ghi rõ, không có thì null/bỏ nhãn - tuyệt đối không bịa. direction là hướng nhà/đất (Đông, Tây Nam...), furnishing là nội thất, legal là pháp lý, bedrooms/bathrooms/floors là số PN/WC/tầng - các trường riêng này đừng lặp lại trong specs.`;

// Gọi Gemini trả JSON - dùng chung cho classify + bóc specs từ đáp án Cầu Nối
async function goiGeminiJSON(prompt) {
  for (const k of KEYS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${k}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0 } }) });
      if (res.status === 429) continue;
      const j = await res.json();
      return JSON.parse(j?.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
    } catch { /* xoay key */ }
    finally { clearTimeout(timer); }
  }
  return null;
}

async function classify(text) {
  return (await goiGeminiJSON(PROMPT + "\n\n--- TIN NHẮN ---\n" + text)) ?? { intent: "khac" };
}

// ---- Chat 1-1 với khách: trạng thái bền + cổng gửi duy nhất + bộ tư vấn (xem zalo-tu-van-lead.mjs) ----
const chayCli = (args) => new Promise((resolve, reject) =>
  execFile(CLI, [...ZALO.pre, "--json", ...args], { timeout: 30_000, windowsHide: true }, (err, stdout) => (err ? reject(err) : resolve(stdout))));
const khoHoiThoai = taoKhoHoiThoai({ sb });
const congGui = taoCongGui({ cli: chayCli });
const tuVan = taoTuVan({ sb, kho: khoHoiThoai, cong: congGui, goiAI: goiGeminiJSON });
console.log(`Chat 1-1: ${BOT_TU_DONG_TRA_LOI_KHACH ? "bot được tự trả lời câu hỏi dữ kiện" : "bot chỉ gợi ý cho admin (ZALO_AUTO_REPLY_KHACH tắt)"}`);

/** Loại tin Zalo -> "chu" | "anh" | "sticker" | "giong_noi" | "video" | "tep" | "vi_tri" | "khac" */
function kieuTin(msgType, laAnh, text) {
  if (laAnh || /photo|image/i.test(msgType)) return "anh";
  if (/sticker/i.test(msgType)) return "sticker";
  if (/voice/i.test(msgType)) return "giong_noi";
  if (/video/i.test(msgType)) return "video";
  if (/file/i.test(msgType)) return "tep";
  if (/location/i.test(msgType)) return "vi_tri";
  if (/call/i.test(msgType) || /cuộc gọi/i.test(text)) return "cuoc_goi";
  return text ? "chu" : "khac";
}

const KIND = ["nha", "dat", "can_ho", "mat_bang", "phong_tro", "khac"];

// ---- NHỚ ẢNH khách gửi để ghép vào tin đăng (20/8) ----
// Đo trên DB: 0/45 tin Zalo có ảnh - vì zca-js gửi ảnh thành SỰ KIỆN RIÊNG, không đính kèm
// tin nhắn chữ, mà code cũ vứt sự kiện ảnh đi (bot còn hứa "em ghép với ảnh" - hứa suông).
// Cách ghép: nhớ ảnh theo khoá (thread | người gửi) trong TTL ngắn, khi CÙNG người đó gửi
// dòng chữ mô tả thì lấy ra đính vào tin. Group dùng uidFrom nên KHÔNG ghép nhầm ảnh của
// người khác đang chat cùng lúc; quá TTL thì ảnh tự hết hạn, không dính sang tin sau.
const anhCho = new Map();               // key -> { urls: [], luc: ms }
const ANH_TTL_MS = Number(process.env.ZALO_ANH_TTL_MS || 3 * 60_000);
const ANH_TOI_DA = 12;
function nhoAnh(key, url) {
  const o = anhCho.get(key) || { urls: [], luc: 0 };
  if (!o.urls.includes(url)) o.urls.push(url);
  // giữ 12 ảnh ĐẦU (bản cũ splice giữ 12 cuối - album 20 ảnh mất luôn ảnh mặt tiền chụp trước)
  if (o.urls.length > ANH_TOI_DA) o.urls.length = ANH_TOI_DA;
  o.luc = Date.now();
  anhCho.set(key, o);
  if (anhCho.size > 500) { const c = Date.now(); for (const [k, v] of anhCho) if (c - v.luc > ANH_TTL_MS) anhCho.delete(k); }
}
function layAnh(key) {
  // CHỈ ĐỌC, không xoá: tin nhắn chữ có thể trượt cổng chất lượng (khách phải gửi bổ sung)
  // - xoá ngay lúc đọc thì lần gửi lại mất sạch ảnh. Xoá bằng xoaAnh() sau khi LƯU thành công.
  const o = anhCho.get(key);
  if (!o || Date.now() - o.luc > ANH_TTL_MS) { anhCho.delete(key); return []; }
  return o.urls;
}
const xoaAnh = (key) => anhCho.delete(key);

// ẢNH ĐẾN MUỘN (21/8): khi khách gửi "1 dòng chữ + album ảnh" trong CÙNG một tin nhắn,
// zca-js gửi CHỮ TRƯỚC rồi mới upload từng ảnh (sendMessage tách text ra await trước
// handleAttachment). Bot lưu tin ngay khi thấy chữ -> ảnh về sau không còn chỗ ghép.
// Giải pháp: nhớ id tin VỪA lưu theo khoá người gửi; ảnh về trong TTL thì update thẳng
// cột images của tin đó thay vì nằm chờ trong anhCho đến hết hạn rồi bay.
const tinVua = new Map(); // khoaAnh -> { id, luc, urls }
function ghepAnhMuon(khoaAnh, url) {
  const t = tinVua.get(khoaAnh);
  if (!t || Date.now() - t.luc > ANH_TTL_MS) { tinVua.delete(khoaAnh); return false; }
  if (!t.urls.includes(url) && t.urls.length < ANH_TOI_DA) t.urls.push(url);
  t.luc = Date.now();
  sb.from("listings").update({ images: t.urls }).eq("id", t.id)
    .then(({ error }) => console.log(error ? `  (ghép ảnh muộn lỗi: ${error.message})` : `  ✓ +1 ảnh vào tin vừa đăng (${t.urls.length} ảnh)`));
  return true;
}

// ---- GƯƠNG ẢNH VỀ KHO (21/8; 12/11 dời sang máy 146 để tránh trần Storage/Egress Supabase Free) ----
// Ảnh tin Zalo đang trỏ thẳng link CDN Zalo (photo.talk.zdn.vn) - link đó CÓ HẠN, Zalo thu
// hồi là tin trắng ảnh hàng loạt. Quét định kỳ: tin zalo nào còn ảnh CDN thì tải về thư mục
// công khai `anh-zalo` trên máy 146 (Tailscale Funnel :8443) rồi thay link trong DB; nếu chạy
// ở máy không có thư mục media cục bộ thì dự phòng đẩy lên bucket `anh-zalo` Supabase.
const KHO_ANH = "anh-zalo";
const MEDIA_DIR = process.env.RADAR_MEDIA_DIR || "C:\\radar\\media";
const MEDIA_BASE_URL = (process.env.RADAR_MEDIA_BASE_URL || "https://nuc.tail19b567.ts.net:8443").replace(/\/+$/, "");
const laAnhCDN = (u) => /^https?:\/\//.test(u) && !u.includes("/storage/v1/object/public/") && !u.startsWith(`${MEDIA_BASE_URL}/`);
let dangGuong = false;
async function guongAnhVeKho(tatCa = false) {
  if (dangGuong) return; // lượt trước còn chạy thì thôi, đừng chồng
  dangGuong = true;
  try {
    let q = sb.from("listings").select("id,images").in("source", ["zalo_oa", "zalo_miniapp"])
      .neq("images", "{}").order("created_at", { ascending: false }).limit(tatCa ? 1000 : 60);
    if (!tatCa) q = q.gte("created_at", new Date(Date.now() - 2 * 864e5).toISOString());
    const { data } = await q;
    for (const tin of data ?? []) {
      if (!(tin.images || []).some(laAnhCDN)) continue;
      const moi = [];
      let doi = false;
      for (let i = 0; i < tin.images.length; i++) {
        const u = tin.images[i];
        if (!laAnhCDN(u)) { moi.push(u); continue; }
        try {
          const urlChuan = u.replace(/(zdn\.vn)\/jpg\//, "$1/");
          let res = await fetch(urlChuan);
          if (!res.ok && urlChuan !== u) res = await fetch(u);
          if (!res.ok) throw new Error("HTTP " + res.status);
          const loai = res.headers.get("content-type") || "image/jpeg";
          let buf = Buffer.from(await res.arrayBuffer());
          if (buf.length < 1000 || buf.length > 8 * 1024 * 1024) throw new Error("cỡ lạ " + buf.length);
          const extGoc = loai.includes("png") ? "png" : "jpg";
          let ext = extGoc;
          let mime = loai.includes("png") ? "image/png" : "image/jpeg";
          // Nén sang WebP 960px trước khi đưa vào bucket anh-zalo (giảm ~40-60% Storage + Egress gói Free)
          try {
            const { default: sharp } = await import("sharp");
            const out = await sharp(buf)
              .rotate()
              .resize(960, 960, { fit: "inside", withoutEnlargement: true })
              .webp({ quality: 74, effort: 5 })
              .toBuffer();
            if (out.length >= 1500 && out.length < buf.length) {
              buf = out;
              ext = "webp";
              mime = "image/webp";
            }
          } catch { /* sharp lỗi ảnh dị -> giữ nguyên bản gốc */ }
          const duongDan = `${tin.id}/${i}.${ext}`;
          if (existsSync(MEDIA_DIR)) {
            const dest = path.join(MEDIA_DIR, KHO_ANH, tin.id, `${i}.${ext}`);
            await fsp.mkdir(path.dirname(dest), { recursive: true });
            await fsp.writeFile(dest, buf);
            moi.push(`${MEDIA_BASE_URL}/${KHO_ANH}/${duongDan}`);
          } else {
            const { error } = await sb.storage.from(KHO_ANH).upload(duongDan, buf, {
              contentType: mime,
              cacheControl: "31536000",
              upsert: true,
            });
            if (error) throw error;
            moi.push(sb.storage.from(KHO_ANH).getPublicUrl(duongDan).data.publicUrl);
          }
          doi = true;
        } catch (e) {
          moi.push(u.replace(/(zdn\.vn)\/jpg\//, "$1/")); // gỡ /jpg/ để web load được ngay
          console.log(`  (gương ảnh lỗi ${tin.id}/${i}: ${e.message})`);
        }
      }
      if (doi) {
        const { error } = await sb.from("listings").update({ images: moi }).eq("id", tin.id);
        console.log(error ? `  (ghi link kho lỗi: ${error.message})` : `  ✓ gương ${moi.filter((u) => !laAnhCDN(u)).length}/${moi.length} ảnh về kho cho tin ${tin.id.slice(0, 8)}`);
      }
    }
  } catch (e) { console.error("guongAnhVeKho:", e.message); }
  finally { dangGuong = false; }
}
// khởi động: quét TOÀN BỘ tin zalo cũ một lần (bù ~60 tin đã đăng bằng link CDN),
// sau đó 5 phút/lượt chỉ quét tin 2 ngày gần nhất (ảnh đến muộn đã ghép xong trước đó)
setTimeout(() => guongAnhVeKho(true), 15_000);
setInterval(() => guongAnhVeKho(false), 5 * 60_000);

// Tên quận có thật trong DB [[tỉnh, quận, số tin]] - để quy "Gò Vấp" (Gemini) về "Quận Gò Vấp" (quanTheoDB).
// Đếm lại 6 giờ/lần; rpc lỗi thì dùng bản cũ (lần đầu lỗi -> rỗng, tin vẫn lưu với tên đã canonDistrict).
let demQuan = [], demQuanLuc = 0;
async function layDemQuan() {
  if (Date.now() - demQuanLuc < 6 * 3600_000) return demQuan;
  demQuanLuc = Date.now();
  const { data, error } = await sb.rpc("cay_khu_vuc");
  if (!error && Array.isArray(data?.c)) demQuan = data.c.map(([p, d, , , n]) => [p, d, n]);
  else console.error("[quan] rpc cay_khu_vuc lỗi:", error?.message);
  return demQuan;
}

// Lưu 1 BĐS vào DB (dùng cho cả DM đăng tin lẫn tin bóc từ group)
async function saveListing(L, text, { fromGroup, images, khoaAnh } = {}) {
  // 29/10: chuẩn hoá tỉnh/quận như merge.mjs - trước ghi nguyên văn Gemini, DB tách "Gò Vấp" khỏi "Quận Gò Vấp"
  const province = canonProvince(L.province ?? null);
  const quan = quanTheoDB(L.district, province, await layDemQuan());
  const { data, error } = await sb.from("listings").insert({
    source: fromGroup ? "zalo_miniapp" : "zalo_oa",
    source_site: fromGroup ? "zalo_group" : "zalo_bot",
    title: L.title || text.slice(0, 80), description: text,
    images: (images || []).slice(0, ANH_TOI_DA),   // link CDN Zalo (photo.talk.zdn.vn) - công khai, SafeImg tự ẩn nếu chết
    price_vnd: L.price_vnd ?? null, area_m2: L.area_m2 ?? null, bedrooms: L.bedrooms ?? null,
    deal: L.listing_type === "ban" ? "ban" : "cho_thue",
    kind: KIND.includes(L.property_type || "") ? L.property_type : "khac",
    province, district: quan.district, ward: L.ward ?? quan.wardHint ?? null,
    legal_status: L.legal ?? null, amenities: L.amenities || [], contact_phone: L.contact_phone ?? null,
    // đặc điểm riêng theo loại BĐS (21/8): cùng các cột tin guland dùng -> trang chi tiết tự
    // hiện bảng "Đặc điểm bất động sản", có gì hiện nấy, không có thì thôi
    bathrooms: L.bathrooms ?? null, floors: L.floors ?? null,
    direction: L.direction ?? null, furnishing: L.furnishing ?? null,
    // chỉ nhận value chuỗi/số - LLM mà trả object lồng nhau thì React bên trang chi tiết
    // không render được object con (crash), cắt tối đa 15 dòng cho bảng gọn
    specs: (() => {
      if (!L.specs || typeof L.specs !== "object" || Array.isArray(L.specs)) return null;
      const s = Object.fromEntries(Object.entries(L.specs)
        .filter(([, v]) => typeof v === "string" || typeof v === "number").slice(0, 15));
      return Object.keys(s).length ? s : null;
    })(),
    ai_score: (L.poster_role === "chinh_chu" || /chính\s*chủ|nhà\s*(mình|bác|chị|anh)\s*(còn\s*trống|cho\s*thuê)|không\s*qua\s*(môi\s*giới|trung\s*gian)/iu.test(text)) ? 90 : (fromGroup ? 70 : 85),
    poster_role_guess: L.poster_role || (/chính\s*chủ|nhà\s*(mình|bác|chị|anh)\s*(còn\s*trống|cho\s*thuê)|không\s*qua\s*(môi\s*giới|trung\s*gian)/iu.test(text) ? "chinh_chu" : "khong_ro"),
    status: "published", // 17/8: bỏ duyệt trước - lên thẳng, admin gỡ tin rác ngay trên trang tin
    first_seen_at: new Date().toISOString(), // thiếu là tin không vào email alert + rơi cuối sort "Mới nhất"
    // thread Zalo của người đăng - "Cầu Nối" cần nó để relay câu hỏi của khách mua sang
    // (DM là fromId trơn; tin group là "gid|uid" - không DM người lạ được, đi đường admin)
    zalo_thread: khoaAnh ? String(khoaAnh) : null,
  }).select("id").single();
  // lưu xong: nhả ảnh đang giữ + nhớ id tin để ảnh đến muộn còn đắp vào (xem ghepAnhMuon)
  if (!error && khoaAnh) {
    xoaAnh(khoaAnh);
    tinVua.set(khoaAnh, { id: data.id, luc: Date.now(), urls: (images || []).slice(0, ANH_TOI_DA) });
    // Đồng bộ CRM: Seller, Deal lead, và Reminder follow-up
    if (!fromGroup) {
      crmUpsertSeller({
        zaloId: khoaAnh,
        phone: L.contact_phone || null,
        name: "Chủ nhà Zalo",
        listingId: data.id,
        sellerType: "ccrb",
      }).then((sellerId) => {
        if (sellerId) {
          sb.from("listings").update({ seller_id: sellerId }).eq("id", data.id);
          crmCreateDeal({ listingId: data.id, stage: "lead", priceVnd: L.price_vnd ?? null });
          crmCreateReminder({
            kind: "follow_up",
            sellerId,
            listingId: data.id,
            note: `Hỏi thăm tình trạng tin mới đăng "${(L.title || "").slice(0, 50)}"`,
          });
        }
      }).catch(() => {});
    }
  }
  return { error, id: data?.id ?? null };
}

// ---- Xử lý tin từ GROUP: chỉ bóc data BĐS, KHÔNG trả lời (tránh spam group) ----
const lichSuHarvestNgay = [];
const MAX_HARVEST_NGAY = Number(process.env.ZALO_MAX_HARVEST_NGAY || 50); // Giảm 1 nửa (từ 100 xuống 50 tin/ngày)

async function harvestGroup(text, anh = [], khoaAnh = null) {
  if (text.length < 40) return; // tin ngắn/chat vặt -> bỏ
  const nowMs = Date.now();
  while (lichSuHarvestNgay.length && nowMs - lichSuHarvestNgay[0] > 24 * 3600_000) lichSuHarvestNgay.shift();
  if (lichSuHarvestNgay.length >= MAX_HARVEST_NGAY) return; // Đạt giới hạn 50 tin/ngày -> dừng bóc thêm
  const ai = await classify(text);
  if (ai.intent === "dang_tin" && ai.listing) {
    // Cổng chất lượng 17/8 (bỏ duyệt tay): thiếu từ khoá BĐS / SĐT / khu vực -> bỏ, không đăng
    // Cong NOI LONG cho tin GROUP (20/8, do tu log pm2: 13 tin truot cong = 8 thieu khu vuc,
    // 4 thieu SDT, 1 khong phai BDS -> mat ~30% tin that). Nguoi viet trong group viet kieu
    // chat - khu vuc thuong nam o TEN GROUP chu khong o bai. Van bat buoc "la tin BDS",
    // nhung chi can MOT trong hai (SDT hoac khu vuc). DM giu cong chat nhu cu vi bot con
    // nhac duoc nguoi gui bo sung; group thi bot im lang nen loai la mat han.
    const vanBan = (ai.listing.title || "") + "\n" + text;
    if (!BDS_KEYWORD.test(vanBan)) { console.log("  - bo (khong phai tin BDS)"); return; }
    const coSdt = PHONE_RE.test(vanBan);
    // "khu vực" phải là TRƯỜNG THẬT bóc được (district/province) chứ không nhận AREA_HINT
    // trơ trong văn bản nữa: hint mà AI không bóc ra được trường nào thì tin lưu với
    // province=null + district=null (+ có khi không SĐT) - lên web không lọc được theo khu
    // vực, không liên hệ được, đúng loại tin merge.mjs cố tình loại (soát 21/8).
    const coKhuVuc = !!(ai.listing.district || ai.listing.province);
    if (!coSdt && !coKhuVuc) { console.log("  - bo (thieu ca SDT lan khu vuc boc duoc)"); return; }

    // Chống giá mồi / giá ảo: phòng riêng không thể dưới 1.2tr (trừ KTX / sleepbox)
    const gia = ai.listing.price_vnd;
    const laKtxSleepbox = /ktx|k[ýy]\s*t[úu]c\s*x[áa]|sleepbox|giường|ở\s*ghép/iu.test(vanBan);
    if (gia && gia < 1_200_000) {
      if (!laKtxSleepbox) {
        console.log(`  - bo (gia ao < 1.2tr khong phai ktx): ${gia}d -> "${ai.listing.title}"`);
        return;
      }
      if (ai.listing.specs) ai.listing.specs["Loại hình"] = "Ký túc xá / Giường tầng";
    }

    const cleanDesc = lamSachMoTa(text);
    const { error } = await saveListing(ai.listing, cleanDesc || text, { fromGroup: true, images: anh, khoaAnh });
    if (!error) {
      lichSuHarvestNgay.push(Date.now());
      console.log(`  ✓ bóc được 1 tin BĐS từ group (${lichSuHarvestNgay.length}/${MAX_HARVEST_NGAY} tin hôm nay)${anh.length ? ` (+${anh.length} ảnh)` : ""} -> đã đăng`);
    } else {
      console.log("  (lưu lỗi: " + error.message + ")");
    }
  }
}

// ---- SĂN KHÁCH TÌM PHÒNG TRONG NHÓM: Thả tim + Rep ngắn nhóm + Nhắn riêng 2 căn ----
const daTuongTacKhach = new Map(); // senderId -> ms
const nhomVuaTuongTac = new Map(); // groupId -> ms
const lichSuOutreachNgay = [];     // [ms]
const MAX_OUTREACH_NGAY = Number(process.env.ZALO_MAX_OUTREACH_NGAY || 10);
const GIAN_CACH_NHOM_MS = 15 * 60_000;
const GIAN_CACH_KHACH_MS = 14 * 24 * 3600_000;

// Nạp danh sách nhóm từ zalo-nhom.json để suy luận khu vực khi khách nhắn trong nhóm chuyên biệt mà không ghi tên Quận
const thongTinNhom = new Map();
try {
  const rawNhom = JSON.parse(readFileSync(new URL("./private/zalo-nhom.json", import.meta.url), "utf8"));
  for (const g of rawNhom?.nhom || []) {
    if (g.id) thongTinNhom.set(String(g.id), g);
  }
} catch { /* không bắt buộc nếu chưa có file */ }

async function sanKhachGroup({ msgId, cliMsgId, groupId, senderId, senderName, text }) {
  if (!text || text.length < 10) return;
  // Lớp 1: Lọc thô regex chống tốn quota + chặn cứng tin rao bán/cho thuê/môi giới
  if (!laBaiTimPhong(text)) return;

  const nowMs = Date.now();
  // Khung giờ nghỉ ban đêm (22h30 - 07h30)
  if (trongGioIm(nowMs, [22, 7])) {
    console.log(`[Săn khách] Đang trong giờ nghỉ đêm -> bỏ qua tương tác: "${text.slice(0, 40)}"`);
    return;
  }

  // Giữ an toàn nick: kiểm tra hạn mức
  while (lichSuOutreachNgay.length && nowMs - lichSuOutreachNgay[0] > 24 * 3600_000) {
    lichSuOutreachNgay.shift();
  }
  if (lichSuOutreachNgay.length >= MAX_OUTREACH_NGAY) {
    console.log(`[Săn khách] Đạt hạn mức an toàn (${MAX_OUTREACH_NGAY} khách/ngày) -> tạm dừng`);
    return;
  }
  if (daTuongTacKhach.has(senderId) && nowMs - daTuongTacKhach.get(senderId) < GIAN_CACH_KHACH_MS) {
    return;
  }
  if (nhomVuaTuongTac.has(groupId) && nowMs - nhomVuaTuongTac.get(groupId) < GIAN_CACH_NHOM_MS) {
    return;
  }

  console.log(`🎯 [Săn khách] Phát hiện khách tìm phòng từ ${senderName} (${senderId}): "${text.slice(0, 50)}"`);

  // Lấy bối cảnh nhóm (nếu có) để AI và bước lọc biết khách đang hỏi trong nhóm khu vực nào
  const nhomInfo = thongTinNhom.get(String(groupId));
  const khuVucNhom = (nhomInfo?.khu_vuc || []).filter((k) => !/^(Hồ Chí Minh|TP\.?\s*HCM|Bình Dương)$/i.test(k));
  const boiCanhNhom = nhomInfo
    ? `\n\n--- BỐI CẢNH NHÓM ZALO ---\nTên nhóm: ${nhomInfo.ten || ""}${khuVucNhom.length ? `\nKhu vực mặc định của nhóm: ${khuVucNhom.join(", ")}` : ""}`
    : "";

  // Lớp 2: AI Gemini bóc tách nhu cầu (kèm kiểm định đúng người đi thuê thật)
  const prompt = `${SYS_TIM}\n${SCHEMA_TIM}\n\n--- BÀI ĐĂNG TÌM PHÒNG TRONG NHÓM ZALO ---\n${text}${boiCanhNhom}`;
  const aiRaw = await goiGeminiJSON(prompt);
  const nhuCau = chuanHoaNhuCau(aiRaw);
  if (!nhuCau || nhuCau.deal !== "thue") {
    console.log("  - bỏ (AI xác định không phải khách tìm thuê thật)");
    return;
  }
  if ((!nhuCau.quan || !nhuCau.quan.length) && khuVucNhom.length) {
    nhuCau.quan = [...khuVucNhom];
  }

  // Khớp phòng trong kho Supabase với bộ lọc đa tầng thông minh (theo loại phòng, giá, quận)
  let canKhop = [];
  try {
    canKhop = await timPhongPhuHop({ sb, nhuCau, limit: 2 });
  } catch (err) {
    console.error("[Săn khách] Lỗi tìm phòng khớp:", err.message);
  }

  // Đánh dấu thời gian tương tác
  daTuongTacKhach.set(senderId, nowMs);
  nhomVuaTuongTac.set(groupId, nowMs);
  lichSuOutreachNgay.push(nowMs);

  const { repNhom, tinRieng } = soanTinSanKhach({ senderName, nhuCau, canKhop });

  // Bước 1: Thả tim tin nhắn của khách trong group
  if (msgId) {
    try {
      await congGui.react(msgId, groupId, "/-heart", { type: "1", cliMsgId });
      console.log(`  ✓ Thả tim tin nhắn của ${senderName}`);
    } catch (e) {
      console.error("  (thả tim lỗi:", e.message, ")");
    }
  }

  // Bước 2: Rep ngắn vào group kèm mention
  try {
    const mentionSpec = `0:${senderId}:${senderName.length + 1}`;
    await congGui.gui(groupId, repNhom, { loai: "khach_tu_dong", type: "1", mention: mentionSpec });
    console.log(`  ✓ Đã rep nhóm cho ${senderName}`);
  } catch (e) {
    console.error("  (rep nhóm lỗi:", e.message, ")");
  }

  // Bước 3: Nhắn tin riêng 1-1 cho khách
  try {
    await congGui.gui(senderId, tinRieng, { loai: "khach_tu_dong", type: "0" });
    console.log(`  ✓ Đã gửi tin nhắn riêng cho ${senderName}`);
  } catch (e) {
    console.error("  (nhắn riêng lỗi:", e.message, ")");
  }

  // Báo thẻ về Zalo Admin (gọn 1 tin, không rườm rà)
  try {
    const theAdmin = `🎯 Có khách tìm phòng: ${senderName}\n` +
      `Nhu cầu: ${nhuCau.tom_tat || (nhuCau.quan?.length ? nhuCau.quan.join(", ") : "tìm phòng")}\n` +
      `Em đã nhắn cho họ ${canKhop.length} căn rồi, anh tiếp quản tiếp nhé!\n` +
      `Gõ "K${senderId.slice(-4)} <câu>" nếu muốn chat tiếp với khách.`;
    await congGui.gui(ADMIN_ZALO_UID, theAdmin, { loai: "admin" });
  } catch (e) {
    console.error("  (báo admin lỗi:", e.message, ")");
  }
}

// ---- CRM SYNC (Tự động đồng bộ khách hàng, lịch xem, deals vào CRM) ----

async function crmUpsertSeller({ zaloId, phone = null, name = null, listingId = null, sellerType = "ccrb" }) {
  try {
    if (!zaloId && !phone) return null;
    let s = null;
    if (zaloId) {
      const { data } = await sb.from("sellers").select("id").eq("zalo_user_id", String(zaloId)).maybeSingle();
      s = data;
    }
    if (!s && phone) {
      const { data } = await sb.from("sellers").select("id").eq("phone", phone).maybeSingle();
      s = data;
    }
    if (s) {
      const upd = {};
      if (phone) upd.phone = phone;
      if (name && name !== "Chủ nhà Zalo") upd.name = name;
      if (listingId) upd.active_listing_id = listingId;
      await sb.from("sellers").update(upd).eq("id", s.id);
      return s.id;
    }
    const { data: created } = await sb.from("sellers").insert({
      name: name || "Chủ nhà Zalo",
      phone: phone || null,
      zalo_user_id: zaloId ? String(zaloId) : null,
      seller_type: ["ccrb", "nmg"].includes(sellerType) ? sellerType : "unknown",
      active_listing_id: listingId || null,
    }).select("id").single();
    return created?.id ?? null;
  } catch (err) {
    console.error("crmUpsertSeller err:", err.message);
    return null;
  }
}



async function crmCreateDeal({ listingId, buyerId = null, stage = "lead", priceVnd = null }) {
  try {
    if (!listingId) return;
    await sb.from("deals").insert({
      listing_id: listingId,
      buyer_id: buyerId,
      stage,
      price_vnd: priceVnd,
    });
  } catch (err) {
    console.error("crmCreateDeal err:", err.message);
  }
}

async function crmCreateReminder({ kind = "follow_up", buyerId = null, sellerId = null, listingId = null, note, dueAt = null }) {
  try {
    if (!note) return;
    await sb.from("reminders").insert({
      kind,
      buyer_id: buyerId,
      seller_id: sellerId,
      listing_id: listingId,
      note,
      due_at: dueAt || new Date().toISOString(),
      status: "pending",
    });
  } catch (err) {
    console.error("crmCreateReminder err:", err.message);
  }
}

// Lắng nghe tin nhắn đến (stream JSON qua stdout)
function startListener() {
  console.log("Zalo bot: bắt đầu lắng nghe... (Ctrl+C để dừng)");
  // --json là option TOÀN CỤC của zalo-agent-cli -> đặt TRƯỚC listen. KHÔNG dùng --no-self: cần thấy tin
  // người thật chat tay từ máy khác để bot nhường (tiếng vọng của chính bot do zalo-gui.mjs lọc).
  // --auto-accept: tự đồng ý kết bạn để người lạ nhắn được cho bot
  // windowsHide: chưa `zalo-agent login` thì listen chết ngay -> vòng restart 5s, mỗi lần spawn bật 1 cửa sổ
  // CMD nảy lên màn hình liên tục (sự cố 17/8). Ẩn cửa sổ để lỗi chỉ nằm trong log pm2.
  // -e chỉ nghe "message", bỏ auto-accept và không tự động duyệt bạn
  const child = spawn(CLI, [...ZALO.pre, "--json", "listen", "-e", "message", "-f", "all"], { stdio: ["ignore", "pipe", "inherit"], windowsHide: true });
  child.on("error", (e) => console.error("spawn zalo-agent lỗi:", e.message)); // CLI thiếu/ENOENT -> không văng uncaught (audit 16/8)

  // Xử lý 1 event (async). Chạy TUẦN TỰ qua hàng đợi promise - handler 'data' cũ là async + await trong vòng lặp
  // trên biến buf dùng chung -> chunk kế vào giữa chừng làm hỏng/lặp dòng JSON (audit 16/8).
  async function handleEvent(ev) {
    const d = ev.data ?? ev; // CLI có thể bọc event zca-js trong {type/event, data:{...}}
    const fromId = ev.threadId ?? d.threadId ?? d.uidFrom ?? d.idTo ?? d.sender?.id ?? d.from;
    const raw = d.content ?? d.text ?? d.message?.text ?? "";
    const msgType0 = String(d.msgType ?? ev.msgType ?? "");
    const laAnh = /photo|image|chat\.photo/i.test(msgType0) && raw && typeof raw === "object";
    // Chú thích ảnh Zalo: zca-js gửi caption qua field "desc" (sendMessage.js:263) - tin ĐẾN
    // gần như chắc chắn cũng mang "desc". Đo thật 21/8 11:45: description/title đều rỗng mà
    // khách có viết caption -> thử đủ các tên field, và log keys khi vẫn trượt để lần sau
    // biết chính xác (đừng đoán thêm lần thứ ba).
    const text = (typeof raw === "string" ? raw
      : laAnh ? raw?.desc ?? raw?.description ?? raw?.caption ?? raw?.title ?? ""
      : raw?.text ?? raw?.title ?? "").toString().trim();
    if (laAnh && !text) console.log(`  (chat.photo không thấy caption - fields: ${Object.keys(raw).join(",")})`);
    const isSelf = ev.isSelf ?? d.isSelf ?? d.self ?? false;
    // zca-js: ThreadType 0=User, 1=Group (số) - kèm các biến thể chuỗi để chắc ăn
    const t = ev.type ?? ev.threadType ?? d.threadType ?? d.type;
    const isGroup = (ev.isGroup ?? d.isGroup ?? false) || t === 1 || t === "1" || t === "group";
    if (!fromId) return;

    // CHAT 1-1 -> zalo-tu-van-lead.mjs. Tin "tự gửi" là tiếng vọng của bot HOẶC người thật chat tay
    // từ điện thoại/PC (cổng gửi phân biệt); tin từ Zalo admin là lệnh "K1234 ...".
    if (!isGroup) {
      const kieu = kieuTin(msgType0, laAnh, text);
      try {
        if (isSelf) await tuVan.tuGuiNhan({ uid: ev.threadId ?? d.threadId ?? d.idTo ?? fromId, chu: text, kieu });
        else if (String(fromId) === ADMIN_ZALO_UID) await tuVan.adminNhan({ chu: text });
        else {
          const ten = d.dName || d.sender?.name || d.displayName || d.name || null;
          console.log(`← [1-1 ${fromId}${ten ? ` (${ten})` : ""}] ${text ? text.slice(0, 80) : `[${kieu}]`}`);
          await tuVan.khachNhan({ uid: fromId, ten, chu: text, kieu });
        }
      } catch (e) { console.error("tư vấn 1-1 lỗi:", e.message); }
      return;
    }
    if (isSelf) return;
    if (BO_QUA_NHOM.has(String(fromId))) return;

    // Khoá ghép ảnh-với-chữ: group phải kèm NGƯỜI GỬI (uidFrom) - không thì ảnh của người A
    // đang chat cùng lúc bị ghép vào tin của người B.
    const khoaAnh = d.uidFrom ? `${fromId}|${d.uidFrom}` : null;

    // Sự kiện ẢNH: nhớ lại BẤT KỂ có chú thích hay không (bản cũ chỉ nhớ khi không có chữ).
    // Nếu là ảnh về MUỘN của tin vừa lưu (Zalo gửi chữ trước, album sau) thì đắp thẳng vào tin.
    if (laAnh && khoaAnh) {
      let url = raw.href || raw.oriUrl || raw.hdUrl || raw.normalUrl || raw.thumbUrl || raw.thumb || null;
      if (url) url = String(url).replace(/(zdn\.vn)\/jpg\//, "$1/");
      if (url && !ghepAnhMuon(khoaAnh, String(url))) {
        nhoAnh(khoaAnh, String(url));
        console.log(`← [${khoaAnh}] +1 ảnh (đang giữ chờ ghép)`);
      }
    }
    if (!text) return;

    // CHỈ CÀO TIN TỪ GROUP:
    console.log(`← (group ${fromId}) ${text.slice(0, 60)}`);
    await harvestGroup(text, layAnh(khoaAnh), khoaAnh);
    if (d.uidFrom && String(d.uidFrom) !== ADMIN_ZALO_UID) {
      const msgId = d.msgId || d.id || ev.msgId || null;
      const cliMsgId = d.cliMsgId || d.msgId || d.id || null;
      const senderName = d.dName || d.sender?.name || d.displayName || d.name || "bạn";
      await sanKhachGroup({ msgId, cliMsgId, groupId: fromId, senderId: d.uidFrom, senderName, text });
    }
  }

  let buf = "", queue = Promise.resolve();
  child.stdout.on("data", (chunk) => {           // đồng bộ: chỉ cắt dòng + đẩy vào hàng đợi
    buf += chunk.toString();
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
      if (!line || !line.startsWith("{")) continue; // bỏ dòng banner/cảnh báo không phải JSON
      let ev; try { ev = JSON.parse(line); } catch { continue; }
      queue = queue.then(() => handleEvent(ev)).catch((e) => console.error("xử lý event lỗi:", e.message));
    }
  });
  child.on("exit", (code) => { console.error("zalo-agent listen thoát, code", code, "- thử chạy lại sau 5s"); setTimeout(startListener, 5000); });
}

// ---- BÁO LEAD MỚI TỪ WEB VỀ ZALO CHÍNH CỦA ADMIN ----
const KEY_LEAD_TS = "zalo_last_lead_ts";
let dangKiemLead = false;
const dinhGiaGon = (v, deal) => (!v ? "Thoả thuận" : v >= 1e9 ? `${(v / 1e9).toFixed(2).replace(/\.?0+$/, "")} tỷ` : `${(v / 1e6).toFixed(1).replace(/\.0$/, "")} tr${deal === "cho_thue" ? "/th" : ""}`);

async function kiemTraLeadMoi() {
  if (dangKiemLead) return;
  dangKiemLead = true;
  try {
    const { data: cfg } = await sb.from("app_config").select("value").eq("key", KEY_LEAD_TS).maybeSingle();
    let lastTs = cfg?.value?.ts;
    if (!lastTs) {
      lastTs = new Date(Date.now() - 5 * 60_000).toISOString();
      await sb.from("app_config").upsert({ key: KEY_LEAD_TS, value: { ts: lastTs }, updated_at: new Date().toISOString() });
    }
    const { data: leads, error } = await sb
      .from("leads")
      .select("id, listing_id, name, phone, message, created_at")
      .gt("created_at", lastTs)
      .order("created_at", { ascending: true })
      .limit(10);
    if (error || !leads?.length) return;

    for (const lead of leads) {
      let tin = null, rieng = null;
      if (lead.listing_id) {
        const [{ data: t }, { data: r }] = await Promise.all([
          sb.from("listings").select("id, title, price_vnd, deal, district, source").eq("id", lead.listing_id).maybeSingle(),
          sb.from("listing_ro_hang").select("exact_address, unit_code, commission").eq("listing_id", lead.listing_id).maybeSingle(),
        ]);
        tin = t; rieng = r;
      }
      const sdt = String(lead.phone || "").replace(/[\s.-]/g, "");
      const dong = [
        `📞 KHÁCH ĐỂ LẠI SĐT TỪ WEB!`,
        `• SĐT/Zalo: ${sdt}${lead.name && lead.name !== "Khách bấm hiện số" ? ` (${lead.name})` : ""}`,
        tin ? `• Tin: ${tin.title} · ${dinhGiaGon(tin.price_vnd, tin.deal)}${tin.source === "ro_hang" ? ` [${maPhong(tin.id)}]` : ""}` : null,
        rieng?.exact_address ? `• 🔒 Đ/c thật: ${rieng.exact_address}${rieng.unit_code ? ` · Mã căn: ${rieng.unit_code}` : ""}${rieng.commission ? ` · HH: ${rieng.commission}` : ""}` : null,
        lead.message && !lead.message.includes("Bấm 'hiện số'") ? `• Ghi chú: ${String(lead.message).slice(0, 140)}` : null,
        tin ? `• Link: https://nhadatradar.com/listings/${tin.id}` : null,
      ].filter(Boolean).join("\n");

      const res = await congGui.gui(ADMIN_ZALO_UID, dong, { loai: "admin" });
      if (res?.ok) {
        console.log(`✓ Đã báo lead ${sdt} về Zalo chính`);
        await sb.from("app_config").upsert({ key: KEY_LEAD_TS, value: { ts: lead.created_at }, updated_at: new Date().toISOString() });
      } else {
        console.warn(`⚠ Không gửi được lead ${sdt} về Zalo:`, res?.lyDo || "lỗi cli");
        break;
      }
    }
  } catch (e) {
    console.error("kiemTraLeadMoi lỗi:", e.message);
  } finally {
    dangKiemLead = false;
  }
}

// Đăng tin lên nhóm đã chuyển sang crawler/zalo-dang-nhom.mjs (29/10: theo khu vực, 1 tin/nhóm/ngày, chỉ rổ hàng).
if (process.argv[2] === "post") { console.error("Chế độ post đã bỏ - dùng: node --env-file=.env.local crawler/zalo-dang-nhom.mjs"); process.exit(1); }
await khoHoiThoai.napTatCa(); // hội thoại đang dở (người đang chat, khách đang chờ) sống qua restart
setInterval(() => tuVan.nhacViec().catch((e) => console.error("nhắc việc lỗi:", e.message)), 60_000);
setInterval(() => kiemTraLeadMoi().catch((e) => console.error("kiểm lead lỗi:", e.message)), 20_000);
startListener();
