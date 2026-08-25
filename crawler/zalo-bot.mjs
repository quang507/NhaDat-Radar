// ============================================================================
//  Zalo bot (không cần OA/GPKD) - cầu nối zalo-agent-cli <-> NhaDat Radar.
//  Lắng nghe tin nhắn Zalo (acc clone, đăng nhập QR bằng zalo-agent-cli),
//  phân loại bằng Gemini -> ghi tin (dang_tin) / tra DB trả lời (hoi_tin).
//
//  CHẠY TRÊN MÁY/VPS (giữ phiên đăng nhập), KHÔNG chạy trên Vercel.
//  Cài 1 lần:  npm i -g zalo-agent-cli   (rồi đăng nhập: zalo-agent login  -> quét QR)
//  Chạy:       node --env-file=.env.local crawler/zalo-bot.mjs
//
//  ⚠ Dùng tài khoản Zalo CLONE - API không chính thức có thể bị Zalo khoá.
// ============================================================================
import { spawn, execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { qualityGate, BDS_KEYWORD, PHONE_RE, AREA_HINT } from "./quality-gate.mjs";

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

// Link gửi cho khách phải là domain public - .env.local dev hay đặt localhost nên phải lọc
const rawSite = process.env.NEXT_PUBLIC_SITE_URL || "";
const SITE = rawSite && !/localhost|127\.0\.0\.1/.test(rawSite) ? rawSite.replace(/\/$/, "") : "https://nhadatradar.com";
const PROP = { nha: "Nhà", dat: "Đất nền", can_ho: "Căn hộ", mat_bang: "Mặt bằng", phong_tro: "Phòng trọ", khac: "Nhà đất khác" };
function fmtPrice(v, deal) {
  if (!v) return "Thoả thuận";
  const s = deal === "cho_thue" ? "/th" : "";
  if (v >= 1e9) return (v / 1e9).toFixed(2).replace(/\.?0+$/, "") + " tỷ" + s;
  if (v >= 1e6) return Math.round(v / 1e6) + " triệu" + s;
  return Math.round(v / 1e3) + "k";
}

// ---- Gemini phân loại (giống lib/ai.ts) ----
const PROMPT = `Bạn là trợ lý Zalo của sàn nhà đất. Đọc tin nhắn và trả về DUY NHẤT 1 JSON:
{"intent":"dang_tin"|"hoi_tin"|"hoi_sau"|"xem_nha"|"sua_tin"|"khac","reply_hint":string,"ref_index":number|null,
 "sua":{"ma_tin":string|null,"price_vnd":number|null,"area_m2":number|null,"bedrooms":number|null,"bathrooms":number|null,"floors":number|null,"mo_ta_them":string|null},
 "listing":{"title":string,"price_vnd":number|null,"area_m2":number|null,"bedrooms":number|null,"bathrooms":number|null,"floors":number|null,"listing_type":"ban"|"cho_thue","property_type":"nha"|"dat"|"can_ho"|"mat_bang"|"phong_tro"|"khac","province":string|null,"district":string|null,"ward":string|null,"legal":string|null,"direction":string|null,"furnishing":string|null,"amenities":string[],"contact_phone":string|null,"specs":object|null},
 "query":{"listing_type":"ban"|"cho_thue"|null,"property_type":string|null,"province":string|null,"district":string|null,"ward":string|null,"price_min":number|null,"price_max":number|null,"area_min":number|null}}
dang_tin: họ RAO 1 BĐS. hoi_tin: họ TÌM nhà theo tiêu chí (khu vực/giá/loại). hoi_sau: họ hỏi CHI TIẾT về MỘT CĂN CỤ THỂ đã nhắc trong hội thoại hoặc có link/mã - xem sổ đỏ, pháp lý, quy hoạch, xin thêm ảnh, thương lượng giá, "căn số 2 còn không". xem_nha: họ muốn ĐI XEM TRỰC TIẾP / hẹn lịch xem một căn ("cho tôi xem nhà", "cuối tuần qua coi được không") - ưu tiên xem_nha hơn hoi_sau khi họ ngỏ ý đến tận nơi. sua_tin: NGƯỜI ĐĂNG muốn SỬA/BỔ SUNG tin của chính họ đã đăng ("sửa giá 5,5 tỷ", "đổi diện tích 80m2", "bổ sung: có gác lửng, 3PN") - điền vào "sua": ma_tin là mã 8 ký tự nếu họ nhắc, các trường số nếu họ đổi, mo_ta_them là phần bổ sung tự do. ref_index: số thứ tự căn họ nhắc (1-4) nếu họ nói rõ ("căn 2", "cái thứ nhất"), không thì null. khac: chào/khác. Giá quy về VND (3tr5->3500000, 6 tỷ->6000000000). Không bịa.
specs: các ĐẶC ĐIỂM RIÊNG người bán có ghi, dạng {"nhãn tiếng Việt":"giá trị"}. Bộ nhãn THEO TỪNG DÒNG BĐS:
- nha (nhà thổ cư): Ngang, Dài, DT đất, DT sàn, Thổ cư, Kết cấu ("1 trệt 2 lầu 1 tum"), Đường trước nhà ("hẻm xe hơi 6m" / "mặt tiền đường 12m"), Vị trí ("góc 2 mặt tiền", "hẻm cụt"), Năm xây, Hiện trạng ("đang cho thuê 15tr/th", "nhà mới")
- can_ho: Dự án, Block/Tháp, Tầng, Mã căn, Loại căn (studio/1PN+1/duplex/penthouse/officetel), DT tim tường, DT thông thuỷ, Hướng cửa, Hướng ban công, View ("view sông", "view nội khu"), Phí quản lý, Năm bàn giao, Sổ (sổ hồng / HĐMB / chờ sổ)
- dat (đất nền): Mặt tiền, Chiều dài, Thổ cư (m²), Loại đất (ONT/ODT/CLN/SKC/lúa), Đường vào (rộng mấy mét, nhựa hay đá), Lô/Thửa/Tờ bản đồ, Quy hoạch, Hiện trạng ("đã san lấp", "có nhà cấp 4", "trồng cây")
- mat_bang: Ngang, Dài, DT sàn, Số tầng, Vị trí ("góc 2 mặt tiền", "gần chợ/trường"), Ngành phù hợp ("F&B, thời trang"), Hiện trạng ("đang trống", "sang lại nội thất"), Giá sang nhượng
- phong_tro: DT phòng, Gác lửng, Máy lạnh, WC riêng/chung, Cửa sổ, Giữ xe, Giờ giấc ("tự do", "khoá 23h"), Ở ghép, Điện (đ/kWh), Nước (đ/người hoặc đ/m³), Wifi/rác
- tin CHO THUÊ (mọi loại) thêm: Tiền cọc ("cọc 2 tháng"), Thời hạn HĐ tối thiểu, Phí quản lý, Điện, Nước, Bao gồm ("free wifi + rác")
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

// Đáp án của seller thường chứa ĐẶC ĐIỂM mới ("hướng Đông Nam, sổ hồng riêng, hẻm 6m") -
// bóc và ĐẮP vào tin: web hiện luôn trong "Chi tiết bất động sản", buyer sau khỏi hỏi lại.
// Đây là mảnh "AI tự đưa thông tin vào DB" của spec Cầu Nối (F3 - tích luỹ hồ sơ).
async function dapSpecsTuDapAn(listingId, cauHoi, dapAn) {
  try {
    const r = await goiGeminiJSON(`Từ cặp hỏi-đáp về một bất động sản, trả về DUY NHẤT JSON {"specs":{"nhãn tiếng Việt":"giá trị"},"direction":string|null,"legal":string|null,"bedrooms":number|null,"bathrooms":number|null,"floors":number|null}. Chỉ trích thông tin NÓI RÕ trong câu ĐÁP (hướng, pháp lý, số phòng ngủ/WC/tầng, mặt tiền, đường vào, phí, tình trạng...), không suy diễn; không có gì thì specs rỗng và các trường null.\nHỏi: ${cauHoi.slice(0, 200)}\nĐáp: ${dapAn.slice(0, 500)}`);
    const them = {};
    if (r?.specs && typeof r.specs === "object" && !Array.isArray(r.specs))
      for (const [k, v] of Object.entries(r.specs))
        if ((typeof v === "string" || typeof v === "number") && String(v).trim()) them[String(k).slice(0, 40)] = String(v).slice(0, 120);
    const capNhat = {};
    if (Object.keys(them).length) {
      const { data: cu } = await sb.from("listings").select("specs").eq("id", listingId).single();
      capNhat.specs = { ...(cu?.specs || {}), ...them };
    }
    if (typeof r?.direction === "string" && r.direction.trim()) capNhat.direction = r.direction.slice(0, 30);
    if (typeof r?.legal === "string" && r.legal.trim()) capNhat.legal_status = r.legal.slice(0, 60);
    // các cột số có ô riêng trong bảng "Chi tiết BĐS" (VD buyer hỏi "mấy phòng ngủ?" và
    // seller trả lời "3 phòng" -> cột bedrooms phải nhận 3, không chỉ nằm trong hỏi đáp)
    for (const k of ["bedrooms", "bathrooms", "floors"])
      if (typeof r?.[k] === "number" && r[k] > 0 && r[k] < 100) capNhat[k] = r[k];
    if (Object.keys(capNhat).length) {
      const { error } = await sb.from("listings").update(capNhat).eq("id", listingId);
      console.log(error ? `  (đắp specs lỗi: ${error.message})` : `  ✓ đắp ${Object.keys(capNhat).length} trường từ đáp án vào tin ${listingId.slice(0, 8)}`);
    } else {
      // không bóc được trường nào -> đắp nguyên cặp hỏi-đáp vào MÔ TẢ (quyết định 21/8:
      // "không bóc được thì ghi thêm vào mô tả là xong") - thông tin không bao giờ rơi rớt
      const { data: cu } = await sb.from("listings").select("description").eq("id", listingId).single();
      await sb.from("listings").update({
        description: `${cu?.description || ""}\n\n[Chủ nhà trả lời qua Radar] ${cauHoi.slice(0, 150)} -> ${dapAn.slice(0, 400)}`,
      }).eq("id", listingId);
      console.log(`  ✓ đắp hỏi-đáp vào mô tả tin ${listingId.slice(0, 8)} (không bóc được trường riêng)`);
    }
  } catch (e) { console.error("dapSpecsTuDapAn:", e.message); }
}

const KIND = ["nha", "dat", "can_ho", "mat_bang", "phong_tro", "khac"];

// Chống lặp câu "Em nhận được ảnh rồi ạ": fromId -> mốc nhắc gần nhất (đặt ở module
// để listener restart không mất; map nhỏ, chỉ giữ người nhắn ảnh nên không cần dọn)
const photoHintAt = new Map();
const HINT_GAP_MS = Number(process.env.ZALO_HINT_GAP_MS || 60_000);

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

// ---- GƯƠNG ẢNH VỀ KHO (21/8) ----
// Ảnh tin Zalo đang trỏ thẳng link CDN Zalo (photo.talk.zdn.vn) - link đó CÓ HẠN, Zalo thu
// hồi là tin trắng ảnh hàng loạt. Quét định kỳ: tin zalo nào còn ảnh CDN thì tải về bucket
// công khai `anh-zalo` trên Supabase Storage rồi thay link trong DB. Chạy NGOÀI luồng trả
// lời (không bắt khách chờ tải 12 tấm ảnh), lỗi tấm nào giữ link CDN tấm đó chờ lượt sau.
const KHO_ANH = "anh-zalo";
const laAnhCDN = (u) => /^https?:\/\//.test(u) && !u.includes("/storage/v1/object/public/");
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
          const res = await fetch(u);
          if (!res.ok) throw new Error("HTTP " + res.status);
          const loai = res.headers.get("content-type") || "image/jpeg";
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length < 1000 || buf.length > 8 * 1024 * 1024) throw new Error("cỡ lạ " + buf.length);
          const duongDan = `${tin.id}/${i}.${loai.includes("png") ? "png" : "jpg"}`;
          const { error } = await sb.storage.from(KHO_ANH).upload(duongDan, buf, { contentType: loai, upsert: true });
          if (error) throw error;
          moi.push(sb.storage.from(KHO_ANH).getPublicUrl(duongDan).data.publicUrl);
          doi = true;
        } catch (e) {
          moi.push(u); // giữ CDN chờ lượt sau - đừng vứt ảnh chỉ vì 1 lần tải lỗi
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

// Lưu 1 BĐS vào DB (dùng cho cả DM đăng tin lẫn tin bóc từ group)
async function saveListing(L, text, { fromGroup, images, khoaAnh } = {}) {
  const { data, error } = await sb.from("listings").insert({
    source: fromGroup ? "zalo_miniapp" : "zalo_oa",
    source_site: fromGroup ? "zalo_group" : "zalo_bot",
    title: L.title || text.slice(0, 80), description: text,
    images: (images || []).slice(0, ANH_TOI_DA),   // link CDN Zalo (photo.talk.zdn.vn) - công khai, SafeImg tự ẩn nếu chết
    price_vnd: L.price_vnd ?? null, area_m2: L.area_m2 ?? null, bedrooms: L.bedrooms ?? null,
    deal: L.listing_type === "ban" ? "ban" : "cho_thue",
    kind: KIND.includes(L.property_type || "") ? L.property_type : "khac",
    province: L.province ?? null, district: L.district ?? null, ward: L.ward ?? null,
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
    ai_score: fromGroup ? 70 : 85, poster_role_guess: "khong_ro",
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
  }
  return { error, id: data?.id ?? null };
}

// ---- Xử lý tin từ GROUP: chỉ bóc data BĐS, KHÔNG trả lời (tránh spam group) ----
async function harvestGroup(text, anh = [], khoaAnh = null) {
  if (text.length < 40) return; // tin ngắn/chat vặt -> bỏ
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
    const { error } = await saveListing(ai.listing, text, { fromGroup: true, images: anh, khoaAnh });
    console.log(error ? "  (lưu lỗi: " + error.message + ")" : `  ✓ bóc được 1 tin BĐS từ group${anh.length ? ` (+${anh.length} ảnh)` : ""} -> đã đăng`);
  }
}

// TRÍ NHỚ PHIÊN DM (21/8): khách hay đăng tin THIẾU SĐT rồi bổ sung ở tin nhắn sau
// ("chưa có số điện thoại mà. số là 034...") - bot không nhớ gì nên chỉ cảm ơn suông và tin
// không bao giờ được đăng (đo thật trên DM 11:04 21/8). Nhớ bản nháp trượt cổng theo người
// gửi trong 15 phút; tin nhắn kế trông giống phần BỔ SUNG (có SĐT, hoặc ngắn + có khu vực)
// thì ghép vào nháp rồi phân loại lại cả cụm. Tin dài tự đứng được thì xử lý như tin mới.
const nhapDo = new Map(); // fromId -> { text, luc }
const NHAP_TTL_MS = 15 * 60_000;

// ---- CẦU NỐI (21/8, học mô hình nhadat.CC "AI mặt tiền - người hậu trường") ----
// Buyer hỏi sâu về MỘT căn (sổ đỏ, quy hoạch, xem nhà...) -> bot relay sang seller nếu tin
// đăng qua Zalo (có zalo_thread), seller trả lời là chuyển lại buyer NGAY và câu trả lời
// TÍCH LUỸ vào listing_facts - buyer sau hỏi lại thì bot tự trả, không phiền seller lần hai.
// Tin CÀO không có seller trên Zalo -> ghi info_requests status 'admin', bot nhắn admin kèm
// SĐT gốc của chủ tin để admin gọi rồi trả lời khách bằng chính tài khoản Zalo này.
// Che SĐT trong nội dung RELAY hai chiều: hai bên mà trao đổi được số qua bot là họ tự nói
// chuyện riêng, mất luôn vai trung gian (đúng nỗi lo "seller gặp buyer trực tiếp thì mình
// không thu được gì"). Danh tính chỉ mở khi chốt lịch xem nhà - do admin quyết.
const cheSoRelay = (s) => String(s || "").replace(/(\+?84|0)[\s.\-]?(\d[\s.\-]?){7,10}/g, (m) => m.slice(0, 4) + "*** (số đã ẩn - liên hệ qua Radar)");
const daGioiThieu = new Map(); // buyerThread -> { ids: [listingId...], luc } - 4 căn bot vừa giới thiệu
const GT_TTL_MS = 30 * 60_000;
const choDapAn = new Map();   // sellerThread -> { reqId, buyerThread, listingId, question, luc }
const DAP_TTL_MS = 24 * 60 * 60_000;
const choXemNha = new Map();  // buyerThread -> { listingId, khungGio, luc } - đang chờ khách cho SĐT để chốt lịch xem
const XEM_TTL_MS = 10 * 60_000;

// ---- BÁO TIN MỚI QUA ZALO (21/8) ----
// Khách tìm nhà xong, bot hỏi "muốn nhận tin nhắn khi có tin MỚI khớp không?". Gật (hoặc
// nhắn kèm Gmail) là lưu saved_searches với zalo_thread; vòng quét 30'/lượt nhắn thẳng vào
// hội thoại khi có tin mới. Có email thì alerts.mjs trên CI gửi mail song song (nút hủy sẵn).
const truyVanCuoi = new Map(); // buyerThread -> { q, luc } - bộ lọc lần tìm gần nhất
const TV_TTL_MS = 30 * 60_000;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/;
async function baoTinMoiZalo() {
  try {
    const { data: subs } = await sb.from("saved_searches").select("*").eq("active", true).not("zalo_thread", "is", null).limit(200);
    for (const s of subs ?? []) {
      let q = sb.from("listings").select("id,title,price_vnd,area_m2,district,deal").eq("status", "published")
        .gt("first_seen_at", s.zalo_notified_at || s.created_at)
        .order("first_seen_at", { ascending: false }).limit(3);
      if (s.deal) q = q.eq("deal", s.deal);
      if (s.kind) q = q.eq("kind", s.kind);
      if (s.province) q = q.ilike("province", `%${s.province}%`);
      if (s.district) q = q.ilike("district", `%${s.district}%`); // từ Gemini nên chưa chắc canonical -> khớp mềm
      if (s.ward) q = q.ilike("ward", `%${s.ward}%`);
      if (s.price_min) q = q.gte("price_vnd", s.price_min);
      if (s.price_max) q = q.lte("price_vnd", s.price_max);
      if (s.area_min) q = q.gte("area_m2", s.area_min);
      const { data: hits } = await q;
      if (!hits?.length) continue;
      const lines = hits.map((x) => `• ${(x.title || "").slice(0, 50)} - ${fmtPrice(x.price_vnd, x.deal)}${x.area_m2 ? " · " + x.area_m2 + "m²" : ""}\n  ${SITE}/listings/${x.id}`);
      sendReply(s.zalo_thread, `🔔 Có ${hits.length} tin MỚI khớp tìm kiếm anh/chị quan tâm:\n${lines.join("\n")}\nCần hỏi thêm căn nào cứ nhắn em. Không muốn nhận nữa thì nhắn "ngừng báo tin" ạ.`);
      await sb.from("saved_searches").update({ zalo_notified_at: new Date().toISOString() }).eq("id", s.id);
      console.log(`  🔔 báo ${hits.length} tin mới cho thread ${String(s.zalo_thread).slice(0, 8)}...`);
    }
  } catch (e) { console.error("baoTinMoiZalo:", e.message); }
}
setInterval(baoTinMoiZalo, 30 * 60_000);

// ---- F2: HỎI LẠI "CÒN BÁN KHÔNG" + ESCALATE VIỆC TỒN ĐỌNG (25/8) ----
// Tin đăng QUA ZALO quá 7 ngày chưa chốt lại -> bot PM người bán hỏi còn bán không (lọc tin
// ma). Người bán "còn" -> giữ; "đã bán" -> gỡ (handler sold đã có). Kèm: câu hỏi Cầu Nối
// chuyển seller mà quá 48h không trả lời -> đẩy status 'admin' để baoAdmin nhắn Zalo chính
// của mày vào xử tay (đúng ý "hứa suông thì cứ hứa, nhưng đẩy về Zalo tao").
const choXacNhan = new Map(); // sellerThread -> { listingId, luc }
async function quanLyTonDong() {
  try {
    // 1. F2 - hỏi lại tin Zalo cũ quá 7 ngày
    const nguong7 = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
    const { data: canHoi } = await sb.from("listings")
      .select("id,title,deal,zalo_thread")
      .in("source", ["zalo_oa", "zalo_miniapp"]).eq("status", "published")
      .not("zalo_thread", "is", null)
      .or(`last_confirmed_at.is.null,last_confirmed_at.lt.${nguong7}`)
      .limit(15);
    for (const tin of canHoi ?? []) {
      const dm = tin.zalo_thread && !tin.zalo_thread.includes("|") ? tin.zalo_thread : null;
      if (!dm) continue;
      // đóng dấu ĐÃ hỏi (đặt last_confirmed_at = now) -> không hỏi lại trong 7 ngày dù seller
      // chưa trả lời; nếu vẫn im, 7 ngày sau hỏi tiếp
      await sb.from("listings").update({ last_confirmed_at: new Date().toISOString() }).eq("id", tin.id);
      choXacNhan.set(dm, { listingId: tin.id, luc: Date.now() });
      sendReply(dm, `Dạ căn "${(tin.title || "").slice(0, 50)}" của anh/chị còn ${tin.deal === "cho_thue" ? "cho thuê" : "bán"} không ạ? Nhắn "còn" để em giữ tin trên sàn, hoặc "đã bán / cho thuê rồi" để em gỡ giúp 🙏`);
      console.log(`  🔄 F2: hỏi lại còn bán không - tin ${tin.id.slice(0, 8)}`);
    }
    // 2. Escalate câu hỏi Cầu Nối treo quá 48h (seller không trả lời) -> đẩy admin
    const nguong48 = new Date(Date.now() - 48 * 3600_000).toISOString();
    const { data: treo } = await sb.from("info_requests")
      .update({ status: "admin", notified_at: null }).eq("status", "pending").lt("created_at", nguong48).select("id");
    if (treo?.length) console.log(`  ⏫ escalate ${treo.length} câu hỏi treo >48h -> Zalo admin`);
  } catch (e) { console.error("quanLyTonDong:", e.message); }
}
setInterval(quanLyTonDong, 6 * 60 * 60_000);

// Báo admin qua Zalo: lead mới từ web (form tư vấn, popup SĐT) + câu hỏi cần người thật.
// ZALO_ADMIN_ID đặt trong .env.local - nhắn thử cho bot rồi xem log "← [id]" để lấy id mình.
const ADMIN_ID = process.env.ZALO_ADMIN_ID || "";
if (!ADMIN_ID) console.log("(chưa đặt ZALO_ADMIN_ID trong .env.local - bot sẽ không nhắn báo lead/câu hỏi cho admin)");
async function baoAdmin() {
  if (!ADMIN_ID) return;
  try {
    const { data: ls } = await sb.from("leads").select("id,name,phone,message,listing_id").is("notified_at", null).order("created_at").limit(10);
    for (const l of ls ?? []) {
      sendReply(ADMIN_ID, `🔥 LEAD MỚI\n👤 ${l.name} · 📞 ${l.phone}${l.message ? `\n💬 ${l.message.slice(0, 200)}` : ""}${l.listing_id ? `\n🔗 ${SITE}/listings/${l.listing_id}` : ""}`);
      await sb.from("leads").update({ notified_at: new Date().toISOString() }).eq("id", l.id);
    }
    const { data: rq } = await sb.from("info_requests").select("id,question,listing_id").eq("status", "admin").is("notified_at", null).order("created_at").limit(10);
    for (const r of rq ?? []) {
      const { data: t } = await sb.from("listings").select("title,contact_phone,phone_masked").eq("id", r.listing_id).single();
      sendReply(ADMIN_ID, `❓ KHÁCH HỎI SÂU (tin cào - cần người thật)\n🏠 ${(t?.title || "").slice(0, 60)}\n💬 "${r.question.slice(0, 200)}"\n📞 chủ tin: ${t?.contact_phone || t?.phone_masked || "không có"}\n🔗 ${SITE}/listings/${r.listing_id}\n→ Gọi chủ tin xong, trả lời khách bằng CHÍNH tài khoản Zalo này (hội thoại gần nhất).`);
      await sb.from("info_requests").update({ notified_at: new Date().toISOString() }).eq("id", r.id);
    }
  } catch (e) { console.error("baoAdmin:", e.message); }
}
setInterval(baoAdmin, 60_000);

// ---- Xử lý DM (chat 1-1) -> trả về text để gửi lại ----
async function handle(text, anh = [], khoaAnh = null) {
  // 0. Seller đang được chờ trả lời câu hỏi của buyer? -> tin nhắn này là ĐÁP ÁN:
  //    chuyển cho buyer ngay + tích luỹ vào listing_facts (lần sau bot tự trả)
  const cho = khoaAnh ? choDapAn.get(khoaAnh) : null;
  if (cho) {
    choDapAn.delete(khoaAnh);
    if (Date.now() - cho.luc <= DAP_TTL_MS) {
      await sb.from("info_requests").update({ answer: text, status: "answered", answered_at: new Date().toISOString() }).eq("id", cho.reqId);
      await sb.from("listing_facts").insert({ listing_id: cho.listingId, question: cho.question.slice(0, 300), answer: text.slice(0, 1000) });
      dapSpecsTuDapAn(cho.listingId, cho.question, text); // chạy nền, không bắt hai bên chờ
      sendReply(cho.buyerThread, `Dạ chủ nhà vừa trả lời câu anh/chị hỏi:\n"${cheSoRelay(text).slice(0, 500)}"\nCần hỏi thêm hay muốn hẹn xem nhà thì anh/chị nhắn em ngay nhé 🏠`);
      console.log(`  ✓ cầu nối: chuyển đáp án seller -> buyer (tin ${cho.listingId.slice(0, 8)})`);
      return "Dạ em đã chuyển câu trả lời cho khách rồi ạ. Cảm ơn anh/chị nhiều 🙏";
    }
  }
  // 0b. Buyer đang được hỏi SĐT để chốt lịch xem nhà? (F4 - spec Cầu Nối, bản thủ công:
  //     đủ SĐT là ghi lead HẸN XEM, admin nhận báo qua Zalo rồi tự sắp lịch gọi hai bên)
  const cxn = khoaAnh ? choXemNha.get(khoaAnh) : null;
  if (cxn && Date.now() - cxn.luc <= XEM_TTL_MS) {
    if (/thôi|khỏi|không cần|huỷ|hủy|để sau/i.test(text)) {
      choXemNha.delete(khoaAnh);
      return "Dạ vâng ạ, khi nào anh/chị muốn xem thì nhắn em bất cứ lúc nào nhé 🏠";
    }
    const soKhach = (text.match(/(\+?84|0)\d{8,10}/) || [])[0];
    if (soKhach) {
      choXemNha.delete(khoaAnh);
      await sb.from("leads").insert({
        listing_id: cxn.listingId, name: "Khách Zalo hẹn xem nhà", phone: soKhach.replace(/^\+?84/, "0"),
        message: `🏠 HẸN XEM NHÀ${cxn.khungGio ? ` - khung giờ khách muốn: ${cxn.khungGio}` : ""} - khách nhắn: "${text.slice(0, 200)}"`,
      });
      return "Dạ em đã ghi lịch ✅ Radar sẽ gọi/Zalo anh/chị trong ít phút để chốt giờ và điểm hẹn cụ thể. Cảm ơn anh/chị 🙏";
    }
    cxn.khungGio = `${cxn.khungGio || ""} ${text}`.trim().slice(0, 150);
    cxn.luc = Date.now();
    return "Dạ em ghi nhận ạ. Anh/chị cho em xin SĐT để Radar gọi chốt lịch xem nhé (VD: 0909xxxxxx) 📞";
  }
  if (cxn) choXemNha.delete(khoaAnh);
  // 0b1. SELLER trả lời F2 "còn bán không" bằng "còn" -> giữ tin, chốt lại mốc 7 ngày.
  // ("đã bán" thì rơi xuống handler sold ngay dưới, không cần bắt ở đây)
  const cxn2 = khoaAnh ? choXacNhan.get(khoaAnh) : null;
  if (cxn2 && Date.now() - cxn2.luc < 48 * 3600_000 && text.trim().length < 30 &&
      /^(còn|con|vẫn còn|van con|còn ạ|con a|vẫn|van|ok|oke|giữ|giu)\b/i.test(text.trim())) {
    choXacNhan.delete(khoaAnh);
    await sb.from("listings").update({ last_confirmed_at: new Date().toISOString() }).eq("id", cxn2.listingId);
    return "Dạ vâng, em giữ tin trên sàn cho anh/chị ạ. Cảm ơn anh/chị 🙏";
  }
  // 0b2. SELLER báo tin ĐÃ BÁN / ĐÃ CHO THUÊ -> gỡ tin của thread này khỏi sàn (status gone:
  // ngừng hiển thị + ngừng matching). Bot đã hứa "báo đã bán cũng nhắn em" nên phải làm thật.
  // Gate: tin nhắn NGẮN (< 50 ký tự) + có từ xác nhận (rồi/xong/chốt) để không bắt nhầm tin
  // ĐĂNG mới bắt đầu bằng "Bán nhà...". Có mã tin thì gỡ đúng căn, không thì gỡ căn mới nhất.
  if (khoaAnh && text.trim().length < 50 &&
      /(đã|da)\s*(bán|ban|cho\s*thuê|cho\s*thue|sang)|(bán|ban|cho\s*thuê|cho\s*thue|ch[ốo]t|sang)\s*(r[ồo]i|xong)/i.test(text)) {
    const { data: cuaToi } = await sb.from("listings").select("id,title,deal")
      .eq("zalo_thread", String(khoaAnh)).eq("status", "published")
      .order("created_at", { ascending: false }).limit(10);
    if (cuaToi?.length) {
      const maTin = (text.match(/\b[0-9a-f]{8}\b/i) || [])[0]?.toLowerCase();
      const tin = (maTin && cuaToi.find((t) => t.id.startsWith(maTin))) || cuaToi[0];
      await sb.from("listings").update({ status: "gone", last_seen_at: new Date().toISOString() }).eq("id", tin.id);
      return `✅ Đã gỡ tin "${(tin.title || "").slice(0, 50)}" (mã ${tin.id.slice(0, 8)}) khỏi sàn - đánh dấu đã ${tin.deal === "cho_thue" ? "cho thuê" : "bán"}. Cảm ơn anh/chị đã tin tưởng Radar 🙏 Có căn mới cứ nhắn em đăng nhé 🏠`;
    }
    // không có tin nào của thread này -> rơi xuống xử lý bình thường
  }
  // 0c. Tắt/bật báo tin mới qua Zalo
  if (khoaAnh && /(ngừng|ngung|tắt|tat|huỷ|huy)\s*(báo|bao)\s*tin/i.test(text)) {
    await sb.from("saved_searches").update({ active: false }).eq("zalo_thread", String(khoaAnh)).eq("active", true);
    return 'Dạ em đã tắt báo tin cho anh/chị ✅ Khi nào cần lại, anh/chị tìm nhà rồi nhắn "CÓ" là bật ngay ạ.';
  }
  // Khách vừa được mời nhận báo tin (sau một lượt tìm) -> gật ("CÓ"/"ok") hoặc nhắn Gmail là chốt
  const tv = khoaAnh ? truyVanCuoi.get(khoaAnh) : null;
  if (tv && Date.now() - tv.luc <= TV_TTL_MS) {
    const email = (text.match(EMAIL_RE) || [])[0] || null;
    const gat = email || (text.trim().length < 40 && /^(có|co|ok|oke|okie|dạ|da|yes|muốn|muon|đồng ý|dong y|bật|bat|ừ|uh)\b/i.test(text.trim()));
    if (gat) {
      truyVanCuoi.delete(khoaAnh);
      const q = tv.q;
      // mỗi thread giữ MỘT đăng ký Zalo đang bật - đăng ký mới thay bộ lọc cũ, tránh dội tin trùng
      await sb.from("saved_searches").update({ active: false }).eq("zalo_thread", String(khoaAnh)).eq("active", true);
      const { error } = await sb.from("saved_searches").insert({
        zalo_thread: String(khoaAnh), email,
        deal: q.listing_type || null, kind: q.property_type || null,
        province: q.province || null, district: q.district || null, ward: q.ward || null,
        price_min: q.price_min || null, price_max: q.price_max || null, area_min: q.area_min || null,
      });
      if (error) { console.error("dang ky bao tin:", error.message); return "Dạ em chưa lưu được đăng ký, anh/chị thử lại sau ít phút nhé 🙏"; }
      return `✅ Đã bật báo tin mới cho ${[q.ward, q.district, q.province].filter(Boolean).join(", ") || "khu vực anh/chị quan tâm"}. Có tin khớp là em nhắn ngay tại đây${email ? ` và gửi thêm về ${email}` : ""}. Muốn tắt: nhắn "ngừng báo tin" ạ.`;
    }
  }
  const nhap = khoaAnh ? nhapDo.get(khoaAnh) : null;
  if (nhap && Date.now() - nhap.luc > NHAP_TTL_MS) nhapDo.delete(khoaAnh);
  else if (nhap && (PHONE_RE.test(text) || (text.length < 120 && AREA_HINT.test(text)))) {
    text = nhap.text + "\n" + text;
    console.log("  (ghép phần bổ sung vào tin nháp 15' của cùng người gửi)");
  }
  const ai = await classify(text);

  if (ai.intent === "dang_tin" && ai.listing) {
    const L = ai.listing;
    // Cổng chất lượng 17/8: DM thì NÓI RÕ thiếu gì để khách gửi bổ sung (không im lặng bỏ như group)
    const why = qualityGate((L.title || "") + "\n" + text, L);
    if (why) {
      if (khoaAnh) nhapDo.set(khoaAnh, { text, luc: Date.now() }); // giữ nháp - khách gửi nốt phần thiếu là ghép được
      const need = why === "không có SĐT" ? "số điện thoại liên hệ"
        : why === "không có khu vực" ? "khu vực (quận/huyện, phường/xã)"
        : "loại BĐS (nhà / đất / căn hộ / mặt bằng…) và giá";
      return `Dạ em chưa đăng được vì tin còn thiếu ${need}. Anh/chị nhắn bổ sung ${need} là em ghép với tin vừa gửi và đăng ngay ạ 🙏`;
    }
    const { error, id: idMoi } = await saveListing(L, text, { fromGroup: false, images: anh, khoaAnh });
    if (error) return "Dạ em chưa ghi được tin. Anh/chị gửi lại kèm giá, diện tích, khu vực giúp em nhé 🙏";
    if (khoaAnh) nhapDo.delete(khoaAnh);
    // Văn "gửi vàng" (21/8): biến việc CHE SĐT - thứ seller dễ khó chịu nhất - thành điểm
    // bán. Điểm đau thật của chính chủ là vừa đăng số lên là môi giới lạ gọi dội bom.
    return `✅ Tin của anh/chị đã lên sàn:${anh.length ? `\n📷 Kèm ${anh.length} ảnh` : ""}\n🏠 ${L.title || "BĐS"}\n💰 ${fmtPrice(L.price_vnd, L.listing_type)}${L.area_m2 ? " · " + L.area_m2 + "m²" : ""}${L.district ? " · " + L.district : ""}${idMoi ? `\n🆔 Mã tin: ${idMoi.slice(0, 8)}\n🔗 ${SITE}/listings/${idMoi}` : ""}\n\n🛡️ SĐT của anh/chị được Radar GIỮ KÍN - không hiện công khai nên không lo môi giới lạ gọi dội bom. Khách quan tâm thật sẽ liên hệ qua Radar, em chuyển tận tay anh/chị.\n\n🤝 Từ giờ anh/chị cứ để căn này Radar lo: tin đứng khu ĐỘC QUYỀN ngay đầu trang tìm kiếm, khách hỏi gì em chuyển liền, khách muốn xem nhà em sắp lịch rồi báo trước. Bán được mới tính phí giới thiệu, không bán không mất đồng nào.\n\n✏️ Muốn sửa: nhắn "sửa giá 5,5 tỷ" hay "bổ sung: có gác lửng" ngay tại đây - em cập nhật liền. Báo đã bán cũng nhắn em nhé 🏠`;
  }

  // SELLER sửa tin đã đăng qua Zalo này (21/8: "nhắn tin trong Zalo để sửa"). Tìm tin theo
  // zalo_thread trong DB (bền qua restart) - mã tin trong tin nhắn thì đúng căn đó, không
  // thì lấy căn mới đăng gần nhất. Chỉ sửa được tin CHÍNH CHỦ thread này đăng.
  if (ai.intent === "sua_tin" && khoaAnh) {
    const s = ai.sua || {};
    const { data: cuaToi } = await sb.from("listings")
      .select("id,title,description,price_vnd,area_m2").eq("zalo_thread", String(khoaAnh))
      .order("created_at", { ascending: false }).limit(5);
    if (!cuaToi?.length) return "Dạ em chưa thấy tin nào anh/chị đăng qua Zalo này (tin đăng từ 21/8 trở đi mới sửa qua chat được). Anh/chị nhắn nội dung tin mới là em đăng liền ạ.";
    const maTin = (s.ma_tin || (text.match(/\b[0-9a-f]{8}\b/i) || [])[0] || "").toLowerCase();
    const tin = (maTin && cuaToi.find((t) => t.id.startsWith(maTin))) || cuaToi[0];
    const upd = {};
    for (const k of ["price_vnd", "area_m2", "bedrooms", "bathrooms", "floors"])
      if (typeof s[k] === "number" && s[k] > 0) upd[k] = s[k];
    // giá/diện tích đổi thì tính lại giá/m² cho khớp
    const giaMoi = upd.price_vnd ?? tin.price_vnd, dtMoi = upd.area_m2 ?? tin.area_m2;
    if ((upd.price_vnd || upd.area_m2) && giaMoi && dtMoi) upd.price_per_m2 = Math.round(giaMoi / dtMoi);
    if (s.mo_ta_them && String(s.mo_ta_them).trim())
      upd.description = `${tin.description || ""}\n\n[Chủ nhà bổ sung] ${String(s.mo_ta_them).trim().slice(0, 500)}`;
    if (!Object.keys(upd).length)
      upd.description = `${tin.description || ""}\n\n[Chủ nhà bổ sung] ${text.slice(0, 500)}`; // không bóc được trường nào -> đắp nguyên văn vào mô tả
    const { error } = await sb.from("listings").update(upd).eq("id", tin.id);
    if (error) { console.error("sua_tin:", error.message); return "Dạ em chưa sửa được, anh/chị thử lại sau ít phút nhé 🙏"; }
    if (s.mo_ta_them) dapSpecsTuDapAn(tin.id, "chủ nhà bổ sung", s.mo_ta_them); // thử bóc đặc điểm từ phần bổ sung
    const daDoi = Object.keys(upd).filter((k) => k !== "description" && k !== "price_per_m2");
    return `✅ Đã cập nhật tin "${(tin.title || "").slice(0, 50)}" (mã ${tin.id.slice(0, 8)}):${daDoi.length ? `\n${daDoi.map((k) => `• ${k === "price_vnd" ? "Giá: " + fmtPrice(upd.price_vnd, "ban") : k === "area_m2" ? "Diện tích: " + upd.area_m2 + "m²" : k === "bedrooms" ? "Phòng ngủ: " + upd.bedrooms : k === "bathrooms" ? "WC: " + upd.bathrooms : "Số tầng: " + upd.floors}`).join("\n")}` : ""}${upd.description ? "\n• Đã thêm phần bổ sung vào mô tả" : ""}\n🔗 ${SITE}/listings/${tin.id}`;
  }

  // Buyer muốn XEM NHÀ (F4): xác định căn -> xin SĐT + khung giờ -> ghi lead HẸN XEM,
  // admin nhận báo Zalo (kèm link tin, trong đó có địa chỉ đầy đủ) rồi sắp lịch, gọi 2 bên.
  // Danh tính + địa chỉ chính xác chỉ mở ở bước này, và do NGƯỜI quyết chứ không phải bot.
  if (ai.intent === "xem_nha") {
    const gt0 = khoaAnh ? daGioiThieu.get(khoaAnh) : null;
    const ids0 = gt0 && Date.now() - gt0.luc < GT_TTL_MS ? gt0.ids : [];
    const idText0 = (text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) || [])[0] || null;
    const idXem = idText0 || (ai.ref_index >= 1 && ids0[ai.ref_index - 1]) || ids0[0] || null;
    if (!idXem) return 'Dạ anh/chị muốn xem căn nào ạ? Nhắn kèm link tin hoặc tìm trước (VD "nhà Quận 7 dưới 6 tỷ") rồi chọn căn giúp em nhé.';
    const soKhach = (text.match(/(\+?84|0)\d{8,10}/) || [])[0];
    if (soKhach) {
      await sb.from("leads").insert({
        listing_id: idXem, name: "Khách Zalo hẹn xem nhà", phone: soKhach.replace(/^\+?84/, "0"),
        message: `🏠 HẸN XEM NHÀ - khách nhắn: "${text.slice(0, 200)}"`,
      });
      return "Dạ em đã ghi lịch ✅ Radar sẽ gọi/Zalo anh/chị trong ít phút để chốt giờ và điểm hẹn cụ thể. Cảm ơn anh/chị 🙏";
    }
    choXemNha.set(khoaAnh, { listingId: idXem, khungGio: "", luc: Date.now() });
    return "Dạ được ạ 🏠 Anh/chị cho em xin SĐT và khung giờ rảnh (VD: \"0909xxxxxx, chiều thứ 7\") - Radar sẽ gọi chốt lịch và dẫn anh/chị xem tận nơi, hoàn toàn miễn phí.";
  }

  // Buyer hỏi SÂU về một căn cụ thể -> Cầu Nối: relay sang seller hoặc đẩy cho admin
  if (ai.intent === "hoi_sau") {
    const gt = khoaAnh ? daGioiThieu.get(khoaAnh) : null;
    const ids = gt && Date.now() - gt.luc < GT_TTL_MS ? gt.ids : [];
    const idTrongText = (text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) || [])[0] || null;
    const id = idTrongText || (ai.ref_index >= 1 && ids[ai.ref_index - 1]) || (ids.length === 1 ? ids[0] : null) || ids[0] || null;
    if (!id) return 'Dạ anh/chị đang hỏi về căn nào ạ? Nhắn kèm link tin (hoặc tìm lại trước, VD "thuê phòng trọ Quận 7 dưới 5 triệu") rồi hỏi tiếp giúp em nhé.';
    const { data: tin } = await sb.from("listings").select("id,title,zalo_thread").eq("id", id).single();
    if (!tin) return "Dạ căn đó không còn trên hệ thống (có thể đã gỡ). Anh/chị tìm căn khác giúp em nhé.";
    // đáp án tích luỹ từ các lần hỏi trước - có gì trả trước, đỡ chờ
    const { data: facts } = await sb.from("listing_facts").select("question,answer").eq("listing_id", id).order("created_at", { ascending: false }).limit(5);
    const sellerDM = tin.zalo_thread && !tin.zalo_thread.includes("|") ? tin.zalo_thread : null;
    const { data: req, error } = await sb.from("info_requests").insert({
      listing_id: id, buyer_thread: String(khoaAnh || ""), seller_thread: sellerDM,
      question: text.slice(0, 500), status: sellerDM ? "pending" : "admin",
    }).select("id").single();
    if (error) { console.error("info_requests:", error.message); return "Dạ em đang bị lỗi hệ thống, anh/chị thử lại sau ít phút nhé 🙏"; }
    if (sellerDM) {
      choDapAn.set(sellerDM, { reqId: req.id, buyerThread: String(khoaAnh), listingId: id, question: text, luc: Date.now() });
      sendReply(sellerDM, `Dạ có khách đang quan tâm tin "${(tin.title || "").slice(0, 60)}" của anh/chị và hỏi:\n"${cheSoRelay(text).slice(0, 300)}"\nAnh/chị nhắn trả lời ngay tại đây, em chuyển cho khách liền ạ 🙏`);
      console.log(`  → cầu nối: chuyển câu hỏi buyer -> seller (tin ${id.slice(0, 8)})`);
    }
    const daCo = (facts ?? []).map((f) => `• ${f.question.slice(0, 60)}: ${f.answer.slice(0, 150)}`).join("\n");
    return `${daCo ? `Thông tin chủ nhà đã trả lời trước đây:\n${daCo}\n\n` : ""}Dạ em đã chuyển câu hỏi ${sellerDM ? "cho chủ nhà" : "cho anh phụ trách khu này"}, có trả lời là em báo anh/chị ngay ạ 🔔`;
  }

  if (ai.intent === "hoi_tin" && ai.query) {
    const q = ai.query;
    let query = sb.from("listings").select("id,title,price_vnd,area_m2,district,ward,deal,kind,contact_phone,source,source_site").eq("status", "published");
    if (q.listing_type) query = query.eq("deal", q.listing_type);
    if (q.property_type) query = query.eq("kind", q.property_type);
    if (q.district) query = query.ilike("district", `%${q.district}%`);
    if (q.ward) query = query.ilike("ward", `%${q.ward}%`); // khách hỏi theo PHƯỜNG/XÃ (21/8)
    if (q.province) query = query.ilike("province", `%${q.province}%`);
    if (q.price_max) query = query.lte("price_vnd", q.price_max);
    if (q.price_min) query = query.gte("price_vnd", q.price_min);
    if (q.area_min) query = query.gte("area_m2", q.area_min);
    const { data } = await query.order("ai_score", { ascending: false, nullsFirst: false }).limit(4);
    // nhớ 4 căn vừa giới thiệu theo thread - khách nhắn "căn số 2 xem sổ được không?" là bot
    // biết đang nói căn nào (Cầu Nối / hoi_sau dùng)
    if (khoaAnh && data?.length) daGioiThieu.set(khoaAnh, { ids: data.map((x) => x.id), luc: Date.now() });
    // link "xem tất cả" trên web với cùng bộ lọc (UX audit: bot chỉ đưa 4 tin, không có đường đi tiếp)
    const sp = new URLSearchParams();
    if (q.listing_type) sp.set("deal", q.listing_type);
    if (q.property_type) sp.set("kind", q.property_type);
    if (q.province) sp.set("province", q.province);
    if (q.district) sp.set("district", q.district);
    if (q.price_max) sp.set("priceMax", String(q.price_max));
    if (q.price_min) sp.set("priceMin", String(q.price_min));
    if (q.ward) sp.set("ward", q.ward);
    if (q.area_min) sp.set("areaMin", String(q.area_min));
    const moreUrl = `${SITE}/search?${sp.toString()}`;
    // mời nhận báo tin mới (21/8): chỉ mời khi có KHU VỰC thật - lưu bộ lọc 30' chờ khách gật
    const coKhuVuc = !!(q.province || q.district || q.ward);
    if (khoaAnh && coKhuVuc) truyVanCuoi.set(khoaAnh, { q, luc: Date.now() });
    const moiBaoTin = coKhuVuc
      ? `\n\n🔔 Quý khách muốn nhận TIN NHẮN ngay tại đây mỗi khi có tin MỚI khớp tìm kiếm này không? Nhắn "CÓ" là em bật - muốn nhận thêm qua email thì nhắn kèm Gmail ạ.`
      : "";
    if (data?.length) {
      // Tin ĐỘC QUYỀN (FB + Zalo - cùng luật với src/lib/doc-quyen.ts): KHÔNG đưa SĐT ra,
      // liên hệ đi qua Cầu Nối - khách cầm số ở bước tìm là hết vai trò trung gian.
      const laDocQuyen = (x) => x.source === "zalo_oa" || x.source === "zalo_miniapp"
        || x.source_site === "facebook" || x.source_site === "zalo_group" || x.source_site === "zalo_bot";
      const lines = data.map((x, i) => `${i + 1}. ${x.title?.slice(0, 55)}\n   💰 ${fmtPrice(x.price_vnd, x.deal)}${x.area_m2 ? " · " + x.area_m2 + "m²" : ""} · ${PROP[x.kind] || x.kind}\n   📍 ${[x.ward, x.district].filter(Boolean).join(", ")}${laDocQuyen(x) ? `\n   ⭐ Độc quyền Radar - nhắn "căn số ${i + 1}" để hỏi thêm / hẹn xem` : x.contact_phone ? "\n   📞 " + x.contact_phone : ""}\n   🔗 ${SITE}/listings/${x.id}`);
      return `🔎 ${data.length} tin phù hợp nhất:\n\n${lines.join("\n\n")}\n\n👉 Xem tất cả + bản đồ: ${moreUrl}\nNhắn thêm điều kiện (giá, số phòng, đường…) để em lọc kỹ hơn.${moiBaoTin}`;
    }
    return `Chưa có tin nào khớp đúng yêu cầu. Anh/chị thử nới điều kiện (khu vực rộng hơn / giá cao hơn), hoặc xem danh sách gần nhất: ${moreUrl}${moiBaoTin || "\nĐể lại nhu cầu (khu vực + giá + loại), có tin mới khớp em báo ngay ạ 🔔"}`;
  }

  return ai.reply_hint ||
    "Xin chào 👋 Em là trợ lý NhaDat Radar.\n• Muốn ĐĂNG tin: gửi thông tin nhà/đất (giá, diện tích, khu vực, SĐT).\n• Muốn TÌM nhà: nhắn ví dụ \"thuê phòng trọ Quận 7 dưới 5 triệu\".";
}

// ============================================================================
//  ADAPTER zalo-agent-cli - CHỈNH 2 HÀM NÀY nếu tên lệnh CLI của bạn khác.
//  Xem lệnh thật: `zalo-agent --help`, `zalo-agent message --help`
// ============================================================================

// Gửi tin nhắn trả lời (cú pháp thật: zalo-agent msg send -t 0|1 <threadId> <message>)
function sendReply(toId, text, { group = false } = {}) {
  try {
    execFileSync(CLI, [...ZALO.pre, "msg", "send", "-t", group ? "1" : "0", String(toId), text], { stdio: "ignore", windowsHide: true });
  } catch (e) {
    console.error("Gửi Zalo lỗi:", e.message);
  }
}

// Lắng nghe tin nhắn đến (stream JSON qua stdout)
function startListener() {
  console.log("Zalo bot: bắt đầu lắng nghe... (Ctrl+C để dừng)");
  // --json là option TOÀN CỤC của zalo-agent-cli -> đặt TRƯỚC listen; --no-self để CLI tự lọc tin mình gửi
  // --auto-accept: tự đồng ý kết bạn để người lạ nhắn được cho bot
  // windowsHide: chưa `zalo-agent login` thì listen chết ngay -> vòng restart 5s, mỗi lần spawn bật 1 cửa sổ
  // CMD nảy lên màn hình liên tục (sự cố 17/8). Ẩn cửa sổ để lỗi chỉ nằm trong log pm2.
  // -e phải gồm cả "friend": handler auto-accept của CLI nằm TRONG nhánh sự kiện friend,
  // chỉ nghe "message" thì cờ --auto-accept là no-op im lặng (người lạ kết bạn không được duyệt)
  const child = spawn(CLI, [...ZALO.pre, "--json", "listen", "-e", "message,friend", "-f", "all", "--no-self", "--auto-accept"], { stdio: ["ignore", "pipe", "inherit"], windowsHide: true });
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
    if (!fromId || isSelf) return;
    // Khoá ghép ảnh-với-chữ: group phải kèm NGƯỜI GỬI (uidFrom) - không thì ảnh của người A
    // đang chat cùng lúc bị ghép vào tin của người B. DM thì thread chính là người gửi.
    // group mà CLI không đưa uidFrom thì thà không ghép ảnh còn hơn cả group dùng chung một
    // khoá "groupId|" - ảnh người A dính vào tin người B
    const khoaAnh = isGroup ? (d.uidFrom ? `${fromId}|${d.uidFrom}` : null) : String(fromId);
    // UX audit 16/8: khách gửi ẢNH nhà / file / sticker mà không kèm chữ -> bot im lặng -> tưởng bot chết.
    // DM: trả lời hướng dẫn 1 lần cho tin không có chữ (ảnh/file), bỏ qua sticker/thiệp; group: bỏ qua.
    const msgType = msgType0;
    // Sự kiện ẢNH: nhớ lại BẤT KỂ có chú thích hay không (bản cũ chỉ nhớ khi không có chữ).
    // Nếu là ảnh về MUỘN của tin vừa lưu (Zalo gửi chữ trước, album sau) thì đắp thẳng vào tin.
    if (laAnh && khoaAnh) {
      const url = raw.href || raw.oriUrl || raw.hdUrl || raw.normalUrl || raw.thumbUrl || raw.thumb || null;
      if (url && !ghepAnhMuon(khoaAnh, String(url))) {
        nhoAnh(khoaAnh, String(url));
        console.log(`← [${khoaAnh}] +1 ảnh (đang giữ chờ ghép)`);
      }
    }
    if (!text) {
      if (!isGroup && /photo|image|file|video|chat\.(photo|file|video)/i.test(msgType)) {
        // Sự cố 17/8: album 5 ảnh về thành 5 event riêng -> bot lặp câu hướng dẫn 5 lần liền
        // (khách tưởng bot lỗi, Zalo dễ gắn cờ spam). Nhớ mốc nhắc gần nhất theo fromId,
        // trong HINT_GAP_MS chỉ nhắc 1 lần cho cả album.
        const now = Date.now();
        if (now - (photoHintAt.get(fromId) || 0) < HINT_GAP_MS) return;
        photoHintAt.set(fromId, now);
        const hint = "Em nhận được ảnh rồi ạ 📷. Để đăng tin, anh/chị nhắn kèm 1 dòng: loại BĐS + diện tích + giá + khu vực + SĐT (VD: \"Bán nhà 4x15 Q7 5,2 tỷ, 0909xxxxxx\"). Em ghép với ảnh và đăng ngay.";
        sendReply(fromId, hint);
        console.log(`← [${fromId}] (${msgType}, không chữ) → hướng dẫn`);
      }
      return;
    }
    if (isGroup) {
      console.log(`← (group ${fromId}) ${text.slice(0, 60)}`);
      await harvestGroup(text, layAnh(khoaAnh), khoaAnh); // chỉ bóc data, không trả lời trong group
    } else {
      console.log(`← [${fromId}] ${text.slice(0, 60)}`);
      const reply = await handle(text, layAnh(khoaAnh), khoaAnh);
      sendReply(fromId, reply);
      console.log(`→ [${fromId}] ${reply.slice(0, 60)}`);
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

// ---- Chế độ ĐĂNG tin lên group: node zalo-bot.mjs post ----
async function postToGroups() {
  const groups = JSON.parse(process.env.ZALO_POST_GROUPS || "[]"); // ["groupId1","groupId2"]
  if (!groups.length) { console.error("Thiếu ZALO_POST_GROUPS trong .env.local (mảng id group)."); process.exit(1); }
  const { data } = await sb.from("listings")
    .select("id,title,price_vnd,area_m2,district,province,deal")
    .eq("status", "published").order("first_seen_at", { ascending: false }).limit(40);
  const pick = (data || []).sort(() => Math.random() - 0.5).slice(0, Number(process.env.ZALO_POST_COUNT || 3));
  for (const g of groups) {
    for (const x of pick) {
      const msg = `🏠 ${x.title}\n💰 ${fmtPrice(x.price_vnd, x.deal)}${x.area_m2 ? " · " + x.area_m2 + "m²" : ""}\n📍 ${[x.district, x.province].filter(Boolean).join(", ")}\n🔗 ${SITE}/listings/${x.id}`;
      sendReply(g, msg, { group: true });
      console.log("→ group", g, ":", x.title?.slice(0, 40));
      await new Promise((r) => setTimeout(r, 5000)); // giãn 5s tránh bị Zalo gắn cờ spam
    }
  }
  console.log(`Đã đăng ${pick.length} tin lên ${groups.length} group.`);
}

if (process.argv[2] === "post") { await postToGroups(); process.exit(0); }
startListener();
