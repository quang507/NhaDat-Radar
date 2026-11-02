// ============================================================================
//  CỔNG GỬI TIN 1-1 DUY NHẤT (1/11) - mọi tin bot gửi cho khách hoặc admin đều đi qua đây.
//
//  Vì sao có cổng riêng:
//  1. TIẾNG VỌNG: listener không còn chạy --no-self, nên tin bot vừa gửi quay về như tin "tự
//     gửi" và không phân biệt được với tin anh Quang chat tay từ điện thoại. Cổng ghi SỔ GỬI
//     trước khi gửi; tin tự gửi nào khớp sổ trong 5 phút là tiếng vọng của bot, còn lại là người.
//     Sai thì sai về phía an toàn: tiếng vọng lọt sổ (restart giữa chừng) chỉ khiến bot tưởng
//     người đang chat và im lặng.
//  2. AN TOÀN NICK: nick cá nhân dùng API không chính thức. Giới hạn tần suất, giãn cách giống
//     người gõ, không gửi một câu hai lần cho cùng khách, không tự nhắn khách giữa đêm.
//  3. Gửi TUẦN TỰ: hai lệnh CLI chạy song song dễ đè phiên đăng nhập.
// ============================================================================

const PHUT = 60_000;
const GIO = 60 * PHUT;

// loai: "khach_tu_dong" (bot tự trả lời) | "khach_admin" (admin chọn qua lệnh K####) | "admin" (thẻ báo admin)
const MAC_DINH = {
  tiengVongMs: 5 * PHUT,
  khachMoiGio: 40,          // tổng tin gửi khách / giờ (cả tự động lẫn admin chọn)
  adminMoiGio: 60,          // thẻ báo admin / giờ
  tuDongMoiKhachMoiGio: 3,  // bot tự trả lời 1 khách / giờ
  gioIm: [23, 7],           // [từ, đến) giờ VN: bot không tự nhắn khách
};

export const chuanHoaChu = (s) => String(s || "").replace(/\s+/g, " ").trim();

export function gioVN(ms) {
  return Number(new Date(ms).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh", hour: "numeric", hour12: false })) % 24;
}

export function trongGioIm(ms, [tu, den] = MAC_DINH.gioIm) {
  const h = gioVN(ms);
  return tu > den ? h >= tu || h < den : h >= tu && h < den;
}

/** Thời gian chờ như người gõ: câu dài chờ lâu hơn, có độ lệch ngẫu nhiên */
export function thoiGianGo(text, loai, rand = Math.random) {
  if (loai === "admin") return 300 + Math.round(rand() * 900);
  return 2500 + Math.min(chuanHoaChu(text).length * 45, 12_000) + Math.round(rand() * 2500);
}

/**
 * cli(args[]) -> Promise: chạy `zalo-agent --json <args>`.
 * Trả về { gui, laTiengVong }.
 */
export function taoCongGui({ cli, now = () => Date.now(), ngu = (ms) => new Promise((r) => setTimeout(r, ms)), rand = Math.random, cauHinh = {} }) {
  const ch = { ...MAC_DINH, ...cauHinh };
  const soGui = new Map();      // thread -> [{ chu, luc }] (tiếng vọng)
  const daGui24h = new Map();   // thread -> [{ chu, luc }] (chống lặp câu tự động)
  const dauKhach = [], dauAdmin = [];
  const dauTuDong = new Map();  // thread -> [luc]
  let hangDoi = Promise.resolve();

  const conTrong = (arr, cua, luc) => { while (arr.length && luc - arr[0] > cua) arr.shift(); return arr; };

  function laTiengVong(thread, text) {
    const luc = now(), chu = chuanHoaChu(text);
    const ds = (soGui.get(String(thread)) || []).filter((x) => luc - x.luc < ch.tiengVongMs);
    soGui.set(String(thread), ds);
    const i = ds.findIndex((x) => x.chu === chu);
    if (i < 0) return false;
    ds.splice(i, 1); // mỗi bản gửi chỉ khớp một tiếng vọng
    return true;
  }

  /** Kiểm tra luật trước khi xếp hàng; trả lý do từ chối hoặc null */
  function lyDoChan(thread, chu, loai, luc) {
    if (!chu) return "rong";
    if (loai === "admin") return conTrong(dauAdmin, GIO, luc).length >= ch.adminMoiGio ? "vuot_han_admin" : null;
    if (conTrong(dauKhach, GIO, luc).length >= ch.khachMoiGio) return "vuot_han_toan_nick";
    if (loai === "khach_tu_dong") {
      if (trongGioIm(luc, ch.gioIm)) return "gio_im";
      if (conTrong(dauTuDong.get(thread) || [], GIO, luc).length >= ch.tuDongMoiKhachMoiGio) return "vuot_han_moi_khach";
      if ((daGui24h.get(thread) || []).some((x) => x.chu === chu && luc - x.luc < 24 * GIO)) return "lap_cau";
    }
    return null;
  }

  function gui(thread, text, { loai, ...options } = {}) {
    thread = String(thread);
    const chu = chuanHoaChu(text);
    const luc0 = now();
    const chan = lyDoChan(thread, chu, loai, luc0);
    if (chan) return Promise.resolve({ ok: false, lyDo: chan });

    // Giữ chỗ trong hạn mức NGAY lúc xếp hàng (tin đang chờ gõ cũng phải tính), trả lại nếu gửi lỗi
    const giuCho = [];
    const giu = (arr) => { arr.push(luc0); giuCho.push(arr); };
    if (loai === "admin") giu(dauAdmin);
    else {
      giu(dauKhach);
      if (loai === "khach_tu_dong") { if (!dauTuDong.has(thread)) dauTuDong.set(thread, []); giu(dauTuDong.get(thread)); }
      const ds = (daGui24h.get(thread) || []).filter((x) => luc0 - x.luc < 24 * GIO);
      daGui24h.set(thread, [...ds, { chu, luc: luc0 }]);
    }
    const traCho = () => {
      for (const arr of giuCho) { const i = arr.indexOf(luc0); if (i >= 0) arr.splice(i, 1); }
      const ds = daGui24h.get(thread);
      if (ds) { const i = ds.findIndex((x) => x.chu === chu && x.luc === luc0); if (i >= 0) ds.splice(i, 1); }
    };

    const viec = hangDoi.then(async () => {
      await ngu(thoiGianGo(chu, loai, rand));
      // ghi sổ TRƯỚC khi gửi: tiếng vọng có thể về trước khi CLI trả kết quả
      soGui.set(thread, [...(soGui.get(thread) || []), { chu, luc: now() }]);
      try {
        const args = ["msg", "send", "-t", String(options.type || "0")];
        if (options.mention) args.push("--mention", options.mention);
        args.push(thread, text);
        await cli(args);
      } catch (e) {
        traCho();
        return { ok: false, lyDo: "loi_cli", loi: e.message };
      }
      return { ok: true };
    });
    hangDoi = viec.catch(() => {});
    return viec;
  }

  function react(msgId, thread, reaction = "/-heart", { type = "1", cliMsgId = null } = {}) {
    const viec = hangDoi.then(async () => {
      await ngu(500 + Math.round(rand() * 1000));
      try {
        const args = ["msg", "react", "-t", String(type || "1")];
        if (cliMsgId) args.push("-c", String(cliMsgId));
        args.push(String(msgId), String(thread), reaction);
        await cli(args);
        return { ok: true };
      } catch (e) {
        return { ok: false, loi: e.message };
      }
    });
    hangDoi = viec.catch(() => {});
    return viec;
  }

  return { gui, react, laTiengVong };
}
