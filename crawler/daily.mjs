// Làm mới data 1 ngày/lần. Chạy tay: node crawler/daily.mjs  |  Tự động: GitHub Actions (.github/workflows/daily-crawl.yml)
// Nguồn chạy headless được: Chợ Tốt (API) + nhadat.vn (HTTP). Batdongsan/Facebook/dự án: cào riêng (Cloudflare/đăng nhập).
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const here = import.meta.dirname;
function step(cmd) {
  // windowsHide: pm2 chạy không có console -> mỗi bước con bật 1 cửa sổ CMD nảy lên màn hình; người dùng
  // đóng cửa sổ = giết tiến trình con giữa chừng (sự cố 17/8: facebook.mjs + embed.mjs bị ^C theo cách này).
  try { console.log("▶", cmd); execSync(cmd, { stdio: "inherit", cwd: here, windowsHide: true }); return true; }
  catch (e) { console.error("✗ lỗi:", cmd, e.message); return false; }
}

// 1) Crawl các nguồn headless (Chợ Tốt API + nhadat HTTP + Mogi HTML)
//    `node daily.mjs --seed-only`: bỏ qua cào, chỉ merge + seed từ file đang có (test nhanh trên máy)
const SEED_ONLY = process.argv.includes("--seed-only");

// Kiem creds NGAY DAU - review 19/8: thieu creds thi slugDaCo() lang le tra Set rong, buoc
// du an cao lai chi tiet ca 700+ du an (~30 phut) roi moi chet o buoc seed vi dung ly do do.
// Chet som 30 giay dau re hon chet sau 30 phut.
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Thieu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env.local hoac GitHub Secrets) - dung truoc khi cao.");
  process.exit(1);
}
// `--fb-only`: CHỈ cào Facebook rồi gộp + seed. Dùng cho CHAY.bat ở máy nhà, vì các nguồn web
// (chotot, mogi, batdongsan, extra-sites) đã được GitHub Actions tự cào 9h/15h - cào lại ở máy
// là làm hai lần cùng một việc. Còn Facebook thì CI không làm được (IP datacenter bị FB chặn).
const FB_ONLY = process.argv.includes("--fb-only");

// ---- KHOÁ CHỐNG CHẠY CHỒNG (17/8) ----
// Mốc .last-run trước đây chỉ được GHI chứ không ai ĐỌC để chặn: crawl-on-boot có đọc, nhưng
// cron daily-crawl thì không. Kịch bản hỏng: bật máy 8:00 -> crawl-on-boot thấy quá 7h nên chạy
// daily.mjs (mất 40-60 phút) -> 9:00 cron khởi động daily.mjs LẦN NỮA trong khi lượt đầu chưa xong
// -> hai tiến trình cùng insert, đụng unique index uq_listings_source_post và seed thất bại.
// Giờ dùng file khoá .running chứa PID: lượt sau thấy tiến trình cũ còn sống thì tự nhường.
// Khoá quá 3h coi như hỏng (máy tắt đột ngột / tiến trình chết) -> bỏ qua để không kẹt vĩnh viễn.
const LOCK = new URL("./.running", import.meta.url);
const FORCE = process.argv.includes("--force");
if (!FORCE) {
  try {
    const [pidS, atS] = fs.readFileSync(LOCK, "utf8").trim().split("|");
    const pid = Number(pidS), ageH = (Date.now() - Number(atS)) / 36e5;
    let dangChay = false;
    try { process.kill(pid, 0); dangChay = true; } catch { /* tiến trình đã chết */ }
    if (dangChay && ageH < 3) {
      console.log(`↷ daily.mjs đang chạy ở PID ${pid} (${Math.round(ageH * 60)} phút trước) -> bỏ lượt này để khỏi seed chồng.`);
      process.exit(0);
    }
    if (dangChay) console.log(`⚠ Khoá cũ ${Math.round(ageH)}h (PID ${pid}) -> coi như hỏng, chạy tiếp.`);
  } catch { /* chưa có khoá */ }
}
try { fs.writeFileSync(LOCK, `${process.pid}|${Date.now()}`); } catch { /* không quan trọng */ }
const boKhoa = () => { try { fs.unlinkSync(LOCK); } catch { /* đã xoá */ } };
process.on("exit", boKhoa);
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => { boKhoa(); process.exit(1); });

// Mốc "lần cào gần nhất" cho crawl-on-boot (ghi lúc bắt đầu và lại khi xong)
try { fs.writeFileSync(new URL("./.last-run", import.meta.url), String(Date.now())); } catch { /* không quan trọng */ }
if (!SEED_ONLY) {
 if (!FB_ONLY) {
  step("node chotot.mjs");
  step("node mogi.mjs");
  step("node extra-sites.mjs");
  step("node guland.mjs");                               // guland.vn - tải bằng curl (Node fetch bị chặn TLS); ảnh lấy ở trang chi tiết, chỉ cho tin mới                          // batdongsantoanquoc + bannhadat123 + sosanhnha
  // Dự án (mogi.vn/du-an) đổi rất chậm mà tốn ~80 lượt tải chi tiết -> chỉ làm mới nếu projects.json
  // đã quá PROJECT_MAX_AGE_H (mặc định 72h). Tự seed thẳng vào bảng projects, KHÔNG qua merge/listings.
  // Dự án: mogi-projects.mjs giờ CỘNG DỒN - nó hỏi DB xem slug nào đã đủ dữ liệu rồi chỉ tải
  // chi tiết những dự án MỚI (đo thật: 40 gom được, 39 đã có -> chỉ tải 1). Nên chạy mỗi lượt
  // cũng rẻ, không cần né CI nữa. Trước đây tải lại cả 700+ dự án (~30 phút) nên CI hay bị cắt.
  step("node mogi-projects.mjs --seed");
  step("node batdongsan.mjs");                           // Cloudflare -> cần Playwright (devDep + npx playwright install chromium);
                                                         // bị chặn thì giữ file cũ, merge tự bỏ qua file quá 2 ngày
  // nhadat.vn: domain đã về VNNIC (tên miền hết hạn, cert *.vnnic.vn - kiểm chứng 16/8/2026) -> nguồn CHẾT, bỏ khỏi pipeline.
  // (crawl.js/geocode.mjs đã xoá 16/8 - cần thì lấy lại từ git history commit e171411)
 } else {
  console.log("↷ --fb-only: bỏ qua nguồn web (GitHub Actions lo phần đó), chỉ cào Facebook.");
 }
  // FB: IP GitHub Actions bị Facebook chặn (kiểm chứng 14/8: 13 nhóm đều trả trang login,
  // 0 bài, tốn ~9 phút/run) -> CI BỎ QUA FB hẳn. Chạy máy nhà (IP dân cư) vẫn cào bình thường.
  if (process.env.GITHUB_ACTIONS) {
    console.log("↷ Bỏ qua Facebook trên CI (IP datacenter bị chặn) - chạy crawl-local.bat trên máy nhà để lấy tin FB.");
  } else if (fs.existsSync(new URL("./fb-cookies.json", import.meta.url)) && process.env.FB_GROUP_URLS) {
    step("node facebook.mjs --playwright");   // 17/8: bỏ hẳn nhánh Apify (tốn phí) - chỉ còn Playwright miễn phí
  }
}
// `--no-merge`: seed thẳng combined.json đang có, KHÔNG dựng lại. Cần khi đã chạy tay merge + geocode-all:
// merge dựng combined.json từ file nguồn mà chỉ chotot.json có sẵn lat -> merge lại sau geocode sẽ xoá toạ độ
// vừa bù, rồi seed ghi lat=null đè lên DB (mất pin bản đồ của ~2/3 số tin).
if (!process.argv.includes("--no-merge")) step("node merge.mjs"); // gộp tất cả nguồn -> combined.json
if (!SEED_ONLY) step("node geocode-all.mjs");           // bù toạ độ cho MỌI tin thiếu (để tin nào cũng có map)

// 2) Seed vào Supabase (thay data crawl cũ)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (đặt trong GitHub Secrets)"); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });
const now = new Date().toISOString();

const comb = JSON.parse(fs.readFileSync(new URL("./combined.json", import.meta.url)));

// Vòng đời tin (học Homigo: firstSeenAt/lastSeenAt/crawlCount): KHÔNG xoá-chèn nữa.
// - Tin đã có (cùng source_site + source_post_id) -> UPDATE theo id: giữ first_seen_at, giữ embedding, crawl_count+1, last_seen_at=now
// - Tin mới -> INSERT với first_seen_at=now  ("Radar thấy tin X trước" vẫn TRUNG THỰC)
// - Tin không còn thấy ≥ 36h (≈2 lần cào ngày) -> status 'gone' (ẩn khỏi tìm kiếm, chi tiết vẫn mở kèm nhãn) - không biến mất im lặng
// PostgREST cắt 1000 dòng/lần -> phải phân trang, không thì tin cũ ngoài 1000 bị coi là mới -> insert đụng
// unique index uq_listings_source_post (migration 001) và seed thất bại.
// Lấy thêm các cột DỄ RỖNG để KHÔNG ghi null đè lên giá trị tốt (xem giuNeuTrong bên dưới).
const COT_DE_RONG = "lat,lng,images,description,specs,phone_masked,poster_key,address,posted_at,direction,legal_status,furnishing,floors,bedrooms,bathrooms,amenities";
const oldRows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from("listings")
    .select(`id,source_site,source_post_id,first_seen_at,crawl_count,status,${COT_DE_RONG}`).eq("source", "crawl").not("source_post_id", "is", null)
    .order("id").range(from, from + 999);
  if (error) { console.error("Đọc tin cũ lỗi:", error.message); process.exit(1); }
  oldRows.push(...(data || []));
  if (!data || data.length < 1000) break;
}
const oldMap = new Map(oldRows.map((r) => [r.source_site + "|" + r.source_post_id, r]));
console.log(`(DB đang có ${oldRows.length} tin crawl)`);

// ---- KHÔNG GHI RỖNG ĐÈ LÊN DỮ LIỆU TỐT (review /ultrareview) ----
// Payload upsert trước đây gán thẳng giá trị lượt hiện tại cho MỌI cột, không COALESCE. Bất kỳ
// cột nào lượt này không lấy được đều xoá mất giá trị lượt trước. Hai đường đã đo được:
//   1. geo-cache.json nằm trong .gitignore và workflow KHÔNG có bước cache -> mỗi lượt CI geocode
//      từ số 0, hết ngân sách 8 phút giữa chừng -> tin giữ lat=null -> ghi đè toạ độ đang đúng.
//      (61% tin - 742/1218 - phụ thuộc hoàn toàn vào geocode-all; chú thích dòng 87-89 đã cảnh báo
//      đúng cơ chế này nhưng chỉ chặn cho cờ tay --no-merge.)
//   2. guland: một lần curl 403 thoáng qua -> images:[] + description:null đi đè lên hàng đang tốt.
// Quy tắc: null / "" / [] / {} của lượt này KHÔNG được xoá giá trị đã có. Muốn xoá thật thì sửa tay.
const rong = (v) => v == null || v === ""
  || (Array.isArray(v) && v.length === 0)
  || (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0);
const giuNeuTrong = (moi, cu) => (rong(moi) && cu !== undefined ? cu : moi);

// Độ tin cậy: heuristic có phổ theo dữ liệu thật (trước đây gán cứng 78 cho mọi tin).
function trustScore(x) {
  let s = 58;
  const imgs = (x.images || []).length;
  if (imgs >= 3) s += 9; else if (imgs) s += 4;
  if (x.legal) s += 8;
  if (x.phone_hash) s += 5;
  if ((x.description || "").length > 300) s += 5;
  if (x.poster_role === "chu_nha") s += 6;
  if (x.price_vnd && x.area_m2) s += 4;
  if (x.price_warning) s -= 20;
  return Math.max(35, Math.min(95, s));
}

const seenKey = new Set();
const rows = [];
for (const x of comb.listings) {
  const key = x.source_site + "|" + (x.source_post_id || x.id);
  if (seenKey.has(key)) continue; seenKey.add(key);
  const old = oldMap.get(key);
  rows.push({
    ...(old ? { id: old.id } : {}),
    source: "crawl", source_site: x.source_site, source_url: x.url, source_post_id: x.source_post_id || x.id,
    // Các cột LUÔN lấy tươi: đều có sẵn ở trang danh sách nên lượt nào cũng đáng tin.
    deal: x.listing_type, kind: x.property_type, title: x.title,
    price_vnd: x.price_vnd, area_m2: x.area_m2,
    province: x.province, district: x.district, ward: x.ward,
    // Các cột đến từ TRANG CHI TIẾT hoặc GEOCODE -> hay rỗng khi bị chặn/hết ngân sách: giữ giá trị cũ.
    description: giuNeuTrong(x.description, old?.description),
    bedrooms: giuNeuTrong(x.bedrooms, old?.bedrooms), bathrooms: giuNeuTrong(x.bathrooms, old?.bathrooms),
    floors: giuNeuTrong(x.floors, old?.floors),
    direction: giuNeuTrong(x.direction, old?.direction), legal_status: giuNeuTrong(x.legal, old?.legal_status),
    furnishing: giuNeuTrong(x.furnishing, old?.furnishing),
    address: giuNeuTrong(x.address ?? null, old?.address),
    lat: giuNeuTrong(x.lat ?? null, old?.lat), lng: giuNeuTrong(x.lng ?? null, old?.lng),
    amenities: giuNeuTrong(x.amenities || [], old?.amenities), images: giuNeuTrong(x.images || [], old?.images),
    specs: giuNeuTrong(x.specs ?? null, old?.specs),        // bảng thông số nguồn (guland/batdongsan) - web ẩn ô trống
    contact_phone: null,                                   // NĐ13: không lưu SĐT thô của tin cào
    phone_masked: giuNeuTrong(x.phone_masked ?? null, old?.phone_masked),  // đã che 4 số -> hiển thị được (giống Homigo)
    ai_score: x.ai_score, poster_role_guess: x.poster_role,
    poster_listing_count: x.poster_listing_count ?? null, poster_reasons: x.poster_reasons || [],
    // id tài khoản trên nguồn / hash SĐT -> "N tin khác của người đăng"
    poster_key: giuNeuTrong(x.phone_hash || x.poster_id || null, old?.poster_key),
    price_flag: x.price_warning || null,
    source_count: x.source_count || 1, source_sites: x.source_sites || [x.source_site],
    posted_at: giuNeuTrong(x.posted_at ?? null, old?.posted_at),   // đăng trên nguồn lúc (nếu nguồn có)
    // Admin đã ẨN (nút "Ẩn tin" trên trang chi tiết, 17/8) thì giữ ẩn - không để lần cào sau bật lại tin rác.
    // Chỉ 'gone' (mất rồi thấy lại) mới về published.
    status: old?.status === "hidden" ? "hidden" : "published", crawled_at: now, last_seen_at: now,
    first_seen_at: (old && old.first_seen_at) || now,
    crawl_count: old ? (old.crawl_count || 1) + 1 : 1,
  });
  // trust_score phải chấm trên hàng ĐÃ HỢP NHẤT, không phải trên x thô: nếu không, một lượt mà
  // trang chi tiết hỏng sẽ hạ điểm tin xuống (mất ảnh/mô tả) dù DB vẫn còn đủ dữ liệu đó.
  // `legal` PHẢI có trong danh sách override: trustScore đọc x.legal (+8 điểm) còn cột đã hợp nhất
  // tên là legal_status. Thiếu nó thì DB giữ đúng pháp lý nhưng điểm vẫn tụt 8 - đúng lớp hồi quy
  // mà mấy dòng này sinh ra để chặn (review /ultrareview vòng 2).
  const r = rows[rows.length - 1];
  r.trust_score = trustScore({
    ...x,
    images: r.images, description: r.description, legal: r.legal_status,
    phone_hash: r.poster_key, price_warning: r.price_flag,
  });
}
const updates = rows.filter((r) => r.id), inserts = rows.filter((r) => !r.id);
const CHUNK = 200;
for (let i = 0; i < updates.length; i += CHUNK) {
  const { error } = await sb.from("listings").upsert(updates.slice(i, i + CHUNK), { onConflict: "id" });
  if (error) { console.error("Seed (update) lỗi:", error.message); process.exit(1); }
}
for (let i = 0; i < inserts.length; i += CHUNK) {
  const { error } = await sb.from("listings").insert(inserts.slice(i, i + CHUNK));
  if (error) { console.error("Seed (insert) lỗi:", error.message); process.exit(1); }
}
// Tin crawl không thấy lại ≥36h -> gone; nguồn chỉ cào được ở máy nhà (FB, batdongsan qua Playwright) cho 7 ngày
// vì máy nhà không chạy mỗi ngày; gone quá 30 ngày -> xoá hẳn (giữ DB gọn)
const HOME_ONLY = ["facebook.com", "facebook", "batdongsan.com.vn"];
// Hàng cũ chưa có last_seen_at (seed đời cũ / chèn tay) -> coi lần thấy = lúc cào/thấy lần đầu, để không "sống mãi" vì NULL lọt lưới
{
  const nulls = [];
  for (let from = 0; ; from += 1000) { // PostgREST cắt 1000/lần
    const { data } = await sb.from("listings").select("id,crawled_at,first_seen_at,created_at").eq("source", "crawl").is("last_seen_at", null).order("id").range(from, from + 999);
    nulls.push(...(data || [])); if (!data || data.length < 1000) break;
  }
  for (let i = 0; i < nulls.length; i += 20)
    await Promise.all(nulls.slice(i, i + 20).map((r) => sb.from("listings").update({ last_seen_at: r.crawled_at || r.first_seen_at || r.created_at }).eq("id", r.id)));
  if (nulls.length) console.log(`(backfill last_seen_at cho ${nulls.length} tin cũ thiếu mốc)`);
}
// ---- CHỐT CHẶN NGUỒN SỤT SẢN LƯỢNG (review /ultrareview) ----
// Mỗi crawler đã có chốt "0 tin thì giữ file cũ", nhưng chốt đó CHỈ bắt đúng mốc 0 - mà bị chặn
// MỘT PHẦN mới là chuyện hay xảy ra: mogi.mjs log lỗi HTTP rồi đi tiếp, batdongsan fetchSRP trả ""
// nên trang đó lặng lẽ ra 0 tin. File vẫn được ghi với crawled_at mới tinh nhưng thiếu 80% tin;
// merge.load() chỉ kiểm TUỔI file chứ không kiểm SỐ LƯỢNG nên nhận -> phần thiếu tụt khỏi
// combined.json -> last_seen_at đứng yên -> 36h sau thành 'gone', 30 ngày sau bị XOÁ HẲN.
// Không thể so với lượt trước bằng file trạng thái (mọi file .json đều .gitignore nên CI luôn
// trắng). So với chính DB thì bền và dùng được ở cả CI lẫn máy nhà.
const NGUONG_SUT = Number(process.env.SOURCE_DROP_FLOOR || 0.6);   // còn < 60% so với DB = nghi bị chặn
const demLuot = {}, demDB = {};
for (const r of rows) demLuot[r.source_site] = (demLuot[r.source_site] || 0) + 1;
for (const r of oldRows) if (r.status === "published") demDB[r.source_site] = (demDB[r.source_site] || 0) + 1;
const nguonSut = Object.keys(demDB).filter((s) => demDB[s] >= 20 && (demLuot[s] || 0) < demDB[s] * NGUONG_SUT);
for (const s of nguonSut) {
  console.error(`⚠ NGUỒN SỤT: ${s} chỉ có ${demLuot[s] || 0} tin lượt này so với ${demDB[s]} trong DB `
    + `(< ${Math.round(NGUONG_SUT * 100)}%) -> NGHI BỊ CHẶN, tạm không đánh dấu 'gone' cho nguồn này.`);
}

const goneCutoff = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
const goneCutoffHome = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
// Nguồn đang nghi bị chặn thì HOÃN hạ 'gone': thà giữ vài tin đã gỡ thêm một lượt còn hơn chôn
// hàng loạt tin còn sống chỉ vì crawler bị 403 nửa chừng.
const boQuaGone = [...new Set([...HOME_ONLY, ...nguonSut])];
// NOT IN bỏ sót source_site NULL (NULL NOT IN … = NULL) -> thêm nhánh is.null (audit 16/8)
const { count: goneN1 } = await sb.from("listings").update({ status: "gone" }, { count: "exact" })
  .eq("source", "crawl").eq("status", "published")
  .or(`source_site.is.null,source_site.not.in.(${boQuaGone.map((s) => `"${s}"`).join(",")})`).lt("last_seen_at", goneCutoff);
const homeConLai = HOME_ONLY.filter((s) => !nguonSut.includes(s));
const { count: goneN2 } = homeConLai.length
  ? await sb.from("listings").update({ status: "gone" }, { count: "exact" })
      .eq("source", "crawl").eq("status", "published").in("source_site", homeConLai).lt("last_seen_at", goneCutoffHome)
  : { count: 0 };
const goneN = (goneN1 || 0) + (goneN2 || 0);
const purgeCutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
const { count: purgedN } = await sb.from("listings").delete({ count: "exact" })
  .eq("source", "crawl").eq("status", "gone").lt("last_seen_at", purgeCutoff);
console.log(`✅ ${now.slice(0, 10)}: ${inserts.length} tin mới · ${updates.length} tin còn sống (cập nhật) · ${goneN || 0} tin vừa gỡ (gone) · ${purgedN || 0} gone cũ xoá · ${rows.filter((r) => r.images.length).length} có ảnh · ${rows.filter((r) => r.source_count > 1).length} tin ≥2 nguồn · ${rows.filter((r) => r.price_flag).length} tin cờ giá.`);

// 2b) Dọn tin bóc từ group Zalo quá 1 NĂM (giữ lâu hơn tin crawl vì group không re-seed;
// tin DM tự đăng (zalo_bot) và tin user coi như tin người dùng - KHÔNG tự xóa)
const zaloCutoff = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
const { count: zaloDeleted, error: zaloErr } = await sb.from("listings")
  .delete({ count: "exact" }).eq("source_site", "zalo_group").lt("created_at", zaloCutoff);
if (zaloErr) console.error("Dọn tin zalo_group lỗi:", zaloErr.message);
else if (zaloDeleted) console.log(`🧹 Xóa ${zaloDeleted} tin zalo_group quá 1 năm.`);

// Mốc "đã cào xong" cho run-if-stale.mjs (bật máy trễ giờ cron -> tự cào bù)
try { fs.writeFileSync(new URL("./.last-run", import.meta.url), String(Date.now())); } catch { /* không quan trọng */ }

// 3) Hậu xử lý: snapshot lịch sử giá + gửi email báo tin mới (đều tự bỏ qua nếu thiếu env)
if (!SEED_ONLY) {
  step("node price-history.mjs");
  step("node alerts.mjs");
  step("node embed.mjs"); // embedding cho tìm kiếm ngữ nghĩa (cần migration 003 + GEMINI key) - giờ upsert nên embedding cũ được giữ, chỉ embed tin mới
}
