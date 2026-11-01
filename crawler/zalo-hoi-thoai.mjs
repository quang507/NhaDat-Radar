// ============================================================================
//  TRẠNG THÁI HỘI THOẠI ZALO 1-1 (1/11) - sống qua restart.
//
//  Trước đây chế độ "người đang chat", lịch sử và căn đang hỏi nằm trong Map RAM: service
//  restart (crash, reboot NUC, deploy) là quên sạch -> bot chen vào giữa cuộc anh đang chat,
//  chào lại khách cũ như khách mới, báo trùng lead. Giờ mỗi hội thoại là 1 dòng bot_state
//  (loai='zalo_hoi_thoai', thread=uid khách) - bảng đã có, RLS bật, chỉ service role đọc/ghi.
//  Map chỉ còn là bộ đệm; lỗi DB thì vẫn chạy tiếp bằng bộ đệm và log, không làm sập bot.
// ============================================================================

export const LOAI = "zalo_hoi_thoai";
const NGAY = 24 * 60 * 60_000;
export const NGUOI_GIU_MS = NGAY;      // người thật nhắn -> bot im 24 giờ (hoặc tới khi admin trả lệnh "bot")
const SO_TIN_GIU = 20;
const HET_HAN_MS = 30 * NGAY;

export function hoiThoaiMoi(uid) {
  return {
    uid: String(uid), ten: null,
    listing_id: null,
    che_do: "bot",          // "bot" | "nguoi"
    nguoi_luc: null,        // lần cuối người thật nhắn khách
    tin: [],                // [{ vai: "khach"|"nguoi"|"bot", chu, kieu, luc }]
    cho_tu: null,           // tin khách CHƯA ai trả lời sớm nhất (ms) - mốc nhắc việc
    nhac_luc: null,         // đã nhắc admin cho lượt chờ hiện tại
    khan_luc: null,         // lần cuối báo khẩn
    the_luc: null,          // lần cuối gửi thẻ thường
    lead_bao: {},           // listing_id -> ms đã báo lead
    goi_y: [],              // gợi ý trong thẻ gần nhất (để "K1234 2" lấy đúng câu)
    da_chao: false,
  };
}

/**
 * Ghi 1 tin vào hội thoại (xếp theo thời điểm) rồi tính lại lượt chờ: tin khách đầu tiên SAU
 * tin trả lời cuối cùng. Câu bot ghi với mốc lúc QUYẾT ĐỊNH trả lời, nên khách nhắn thêm trong
 * lúc bot đang "gõ" vẫn còn là tin chờ, không bị câu trả lời cũ khép mất.
 */
export function themTin(h, vai, chu, kieu = "chu", luc = Date.now()) {
  const tin = { vai, chu: String(chu || "").slice(0, 600), kieu, luc };
  let i = h.tin.length;
  while (i > 0 && h.tin[i - 1].luc > luc) i--;
  h.tin.splice(i, 0, tin);
  if (h.tin.length > SO_TIN_GIU) h.tin.splice(0, h.tin.length - SO_TIN_GIU);
  let choTu = null;
  for (const t of h.tin) choTu = t.vai === "khach" ? (choTu ?? t.luc) : null;
  if (choTu !== h.cho_tu) { h.cho_tu = choTu; h.nhac_luc = null; }
  return h;
}

export function nguoiNhan(h, luc = Date.now()) {
  h.che_do = "nguoi";
  h.nguoi_luc = luc;
  return h;
}

export function traChoBot(h) {
  h.che_do = "bot";
  h.nguoi_luc = null;
  return h;
}

export function dangDoNguoi(h, luc = Date.now()) {
  return h.che_do === "nguoi" && h.nguoi_luc != null && luc - h.nguoi_luc < NGUOI_GIU_MS;
}

/** Mã thẻ admin gõ lại: "K" + 4 số cuối uid - suy ra từ uid nên không cần bảng tra, restart vẫn đúng */
export const maThe = (uid) => "K" + String(uid).slice(-4);

export function taoKhoHoiThoai({ sb, now = () => Date.now(), log = console }) {
  const dem = new Map();
  let baoLoi = 0;
  const loiDB = (viec, e) => { if (baoLoi++ < 20) log.error(`[hội thoại] ${viec} lỗi: ${e?.message || e}`); };

  async function napTatCa() {
    try {
      const { data, error } = await sb.from("bot_state").select("thread,payload")
        .eq("loai", LOAI).gt("expires_at", new Date(now()).toISOString()).limit(5000);
      if (error) throw error;
      for (const r of data ?? []) if (r.payload?.uid) dem.set(r.thread, { ...hoiThoaiMoi(r.thread), ...r.payload });
      log.log(`[hội thoại] nạp ${dem.size} hội thoại từ DB`);
    } catch (e) { loiDB("nạp", e); }
  }

  async function lay(uid) {
    uid = String(uid);
    if (dem.has(uid)) return dem.get(uid);
    let h = hoiThoaiMoi(uid);
    try {
      const { data, error } = await sb.from("bot_state").select("payload").eq("loai", LOAI).eq("thread", uid).maybeSingle();
      if (error) throw error;
      if (data?.payload) h = { ...h, ...data.payload };
    } catch (e) { loiDB("đọc", e); }
    dem.set(uid, h);
    return h;
  }

  async function luu(h) {
    dem.set(h.uid, h);
    try {
      const { error } = await sb.from("bot_state").upsert({
        loai: LOAI, thread: h.uid, payload: h, expires_at: new Date(now() + HET_HAN_MS).toISOString(),
      }, { onConflict: "loai,thread" });
      if (error) throw error;
    } catch (e) { loiDB("ghi", e); }
  }

  /** Mã thẻ -> các uid khớp 4 số cuối (thường 1; >1 thì admin phải gõ thêm số) */
  async function timTheoMa(ma) {
    const duoi = String(ma).replace(/^k/i, "");
    if (!/^\d{4,}$/.test(duoi)) return [];
    const khop = new Set([...dem.keys()].filter((u) => u.endsWith(duoi)));
    try {
      const { data } = await sb.from("bot_state").select("thread").eq("loai", LOAI).like("thread", `%${duoi}`).limit(10);
      for (const r of data ?? []) khop.add(r.thread);
    } catch (e) { loiDB("tìm mã", e); }
    return [...khop];
  }

  return { napTatCa, lay, luu, timTheoMa, tatCa: () => [...dem.values()] };
}
