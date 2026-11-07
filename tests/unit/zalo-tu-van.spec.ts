import { test, expect } from "@playwright/test";
import {
  tinHieuCung, factsTuTin, soanTraLoiTuFacts, chuanHoaPhanLoai, quyetDinh, docLenhAdmin, taoTuVan, cauChao, locNhapTheoNguCanh, soanTinSanKhach, trichXuatDinhDanh, timPhongPhuHop,
} from "../../crawler/zalo-tu-van-lead.mjs";
import { laBaiTimPhong } from "../../crawler/khach-tim.mjs";
import { hoiThoaiMoi, themTin, nguoiNhan } from "../../crawler/zalo-hoi-thoai.mjs";
import { taoCongGui, trongGioIm } from "../../crawler/zalo-gui.mjs";

// Thiết kế lại chat 1-1 (1/11) sau sự cố: admin báo giá tay, bot không thấy, khách hỏi "phí khác"
// -> bot chào lại từ đầu, khách nghi bot, giục "alo anh ới?" -> bot chào lần hai.

const PHUT = 60_000;
const SANG = Date.parse("2026-11-01T03:00:00Z"); // 10:00 giờ VN
const DEM = Date.parse("2026-11-01T17:00:00Z");  // 00:00 giờ VN

const TIN = {
  id: "1a2b3c4d-0000-0000-0000-000000000000", title: "Studio Văn Chung", price_vnd: 4_200_000, area_m2: 20, deal: "cho_thue",
  status: "published", ward: "Phường 13", district: "Quận Tân Bình", address: "Văn Chung",
  specs: { "Loại phòng": "Studio", "Điện": "3.800 đ/kWh", "Nước": "100.000 đ/người", "Phí quản lý": "150.000 đ/phòng", "Tiền cọc": "4,2 triệu" },
  amenities: ["dieu_hoa", "may_giat"],
};
const RO_HANG = { partner: "evohome", unit_code: "305", commission: "40 80", exact_address: "12/3 Văn Chung",
  raw: { specs: { "Hoa hồng môi giới": "40 80", "Số phòng": "305", "Gửi xe": "100.000 đ/xe" } } };

const pl = (o: Record<string, unknown>) => chuanHoaPhanLoai({ ngon_ngu: "vi", do_tin_cay: 0.9, khan: false, tom_tat: "", goi_y: [], hoi_ve: [], ...o });

test("luật cứng: các câu trong sự cố", () => {
  expect(tinHieuCung("Dạ phí khác bao nhiêu vậy a").can_nguoi).toBe(false);
  expect(tinHieuCung("Tin nhắn tự động à a")).toMatchObject({ khan: true, ly_do: ["nghi_bot"] });
  expect(tinHieuCung("Mình xem trọ luôn được không ạ, mình ở gần đó").ly_do).toContain("hen_xem");
  expect(tinHieuCung("alo anh ới?")).toMatchObject({ khan: true, ly_do: ["goi_nguoi"] });
  expect(tinHieuCung("", "anh").ly_do).toEqual(["gui_anh"]);
});

test("luật cứng: 'bớt giá' là mặc cả, không phải nghi bot; không dấu vẫn bắt", () => {
  expect(tinHieuCung("bớt được không anh").ly_do).toEqual(["mac_ca"]);
  expect(tinHieuCung("bot gia dc ko").ly_do).toEqual(["mac_ca"]);
  expect(tinHieuCung("minh o gan do, qua coi luon dc ko").ly_do).toContain("hen_xem");
  expect(tinHieuCung("phòng có máy giặt không").can_nguoi).toBe(false);
  expect(tinHieuCung("cho mình xem thêm ảnh được không").can_nguoi).toBe(false);
});

test("dữ kiện: chỉ nhãn công khai, '-' là thiếu, lấy bổ sung từ rổ hàng", () => {
  const f = factsTuTin(TIN, RO_HANG);
  expect(f).toMatchObject({ ma: "RH1A2B3C", gia: "4,2 triệu/tháng", dien_tich: "20 m²", khu_vuc: "Phường 13, Quận Tân Bình",
    dien: "3.800 đ/kWh", gui_xe: "100.000 đ/xe", tien_ich: "máy lạnh, máy giặt" });
  expect(JSON.stringify(f)).not.toMatch(/305|40 80|12\/3|evohome/i);
  expect((factsTuTin({ ...TIN, specs: { "Nước": "-" } }, null) as Record<string, unknown>).nuoc).toBeUndefined();
});

test("câu tự trả lời: ráp từ DB, thiếu một khoản là không trả lời", () => {
  const f = factsTuTin(TIN, RO_HANG);
  const r = soanTraLoiTuFacts(["chi_phi"], f)!;
  expect(r).toContain("Điện: 3.800 đ/kWh");
  expect(r).toContain("Gửi xe: 100.000 đ/xe");
  expect(soanTraLoiTuFacts(["chi_phi"], factsTuTin({ ...TIN, specs: { "Điện": "3.800 đ/kWh" } }, null))).toBeNull();
  expect(soanTraLoiTuFacts(["con_trong"], f)).toBeNull();
  expect(soanTraLoiTuFacts(["gia", "thu_cung"], f)).toBeNull();
  expect(soanTraLoiTuFacts(["dien_tich"], factsTuTin({ ...TIN, area_m2: null }, null))).toBeNull(); // bản cũ điền "25m²"
});

test("đầu ra AI sai khuôn -> null, gợi ý có SĐT bị bỏ", () => {
  expect(chuanHoaPhanLoai(null)).toBeNull();
  expect(chuanHoaPhanLoai({ y_dinh: "tra_loi_luon" })).toBeNull();
  const p = chuanHoaPhanLoai({ y_dinh: "hoi_thong_tin", hoi_ve: ["dien", "bay"], do_tin_cay: 7, goi_y: ["gọi 0909 123 456 nha", "Dạ điện 3.800đ"] })!;
  expect(p).toMatchObject({ hoi_ve: ["dien"], do_tin_cay: 1, goi_y: ["Dạ điện 3.800đ"] });
  // DB không có tình trạng còn phòng -> nháp khẳng định "vẫn còn" bị bỏ, để chỗ trống thì giữ
  const c = chuanHoaPhanLoai({ y_dinh: "hoi_thong_tin", hoi_ve: ["con_trong"], goi_y: ["Phòng này hiện vẫn còn bạn nhé", "Phòng [còn/hết phòng] bạn nha"] })!;
  expect(c.goi_y).toEqual(["Phòng [còn/hết phòng] bạn nha"]);
});

test("lượt chờ: câu bot ghi theo mốc quyết định, tin khách đến sau vẫn còn chờ", () => {
  const h = hoiThoaiMoi("123456789");
  themTin(h, "khach", "phí sao", "chu", SANG);
  themTin(h, "khach", "alo", "chu", SANG + 5_000);
  themTin(h, "bot", "Dạ phòng ...", "chu", SANG + 1_000); // bot quyết định trả lời trước khi "alo" tới
  expect(h.cho_tu).toBe(SANG + 5_000);
  themTin(h, "nguoi", "mình đây", "chu", SANG + 9_000);
  expect(h.cho_tu).toBeNull();
});

test("chính sách: người đang chat thì bot im và không báo thẻ cho câu hỏi thường", () => {
  const h = hoiThoaiMoi("1"); nguoiNhan(h, SANG - 2 * PHUT);
  themTin(h, "khach", "Dạ phí khác bao nhiêu vậy a", "chu", SANG);
  const qd = quyetDinh({ h, pl: pl({ y_dinh: "hoi_thong_tin", hoi_ve: ["chi_phi"] }), cung: tinHieuCung("Dạ phí khác bao nhiêu vậy a"),
    facts: factsTuTin(TIN, RO_HANG), luc: SANG, tuDong: true, cuaSoMoi: true });
  expect(qd).toMatchObject({ tuTraLoi: null, baoAdmin: null });
});

test("chính sách: người thật đã tiếp nhận thì bot không gửi báo (kể cả khẩn); chưa tiếp nhận thì báo khẩn", () => {
  const hNguoi = hoiThoaiMoi("1"); nguoiNhan(hNguoi, SANG - 15 * PHUT);
  expect(quyetDinh({ h: hNguoi, pl: null, cung: tinHieuCung("Tin nhắn tự động à a"), facts: null, luc: SANG, tuDong: true }).baoAdmin).toBeNull();

  const hBot = hoiThoaiMoi("2");
  expect(quyetDinh({ h: hBot, pl: null, cung: tinHieuCung("Tin nhắn tự động à a"), facts: null, luc: SANG, tuDong: true }).baoAdmin).toBe("khan");
});

test("chính sách: bot chỉ tự trả lời khi bật cờ, đủ tin cậy và đủ dữ kiện", () => {
  const facts = factsTuTin(TIN, RO_HANG);
  const base = { h: hoiThoaiMoi("1"), cung: tinHieuCung("phí sao"), facts, luc: SANG, cuaSoMoi: true };
  const hoi = pl({ y_dinh: "hoi_thong_tin", hoi_ve: ["chi_phi"] });
  expect(quyetDinh({ ...base, pl: hoi, tuDong: false }).tuTraLoi).toBeNull();
  const ok = quyetDinh({ ...base, pl: hoi, tuDong: true });
  expect(ok.tuTraLoi).toContain("Phí quản lý");
  expect(ok.baoAdmin).toBe("thuong"); // lead mới vẫn báo admin
  expect(quyetDinh({ ...base, pl: pl({ y_dinh: "hoi_thong_tin", hoi_ve: ["chi_phi"], do_tin_cay: 0.6 }), tuDong: true }).tuTraLoi).toBeNull();
  expect(quyetDinh({ ...base, pl: null, tuDong: true })).toMatchObject({ tuTraLoi: null, baoAdmin: "thuong" }); // AI sập
});

test("chính sách: câu chào chỉ một lần, cảm ơn thì không báo", () => {
  const h = hoiThoaiMoi("1");
  const chao = quyetDinh({ h, pl: pl({ y_dinh: "chao_hoi" }), cung: tinHieuCung("hello"), facts: null, luc: SANG, tuDong: true, cuaSoMoi: true });
  expect(chao).toMatchObject({ tuTraLoi: cauChao(false), laChao: true, baoAdmin: "thuong" });
  h.da_chao = true;
  expect(quyetDinh({ h, pl: pl({ y_dinh: "chao_hoi" }), cung: tinHieuCung("alo"), facts: null, luc: SANG, tuDong: true }).tuTraLoi).toBeNull();
  expect(quyetDinh({ h, pl: pl({ y_dinh: "cam_on_ket_thuc" }), cung: tinHieuCung("ok cảm ơn"), facts: null, luc: SANG, tuDong: true, cuaSoMoi: true }))
    .toMatchObject({ baoAdmin: null, ketThuc: true });
});

test("nháp chối là bot bị loại khi hội thoại đã có tin bot tự gửi", () => {
  const h = hoiThoaiMoi("1");
  themTin(h, "khach", "hello", "chu", SANG); themTin(h, "bot", cauChao(false), "chu", SANG + 1);
  const p = pl({ y_dinh: "nghi_bot", khan: true });
  const nhap = ["Dạ không bạn ơi, mình là nhân viên tư vấn đây ạ.", "Đúng rồi bạn, tin vừa rồi là tự động, giờ mình trực tiếp hỗ trợ bạn nhé."];
  expect(locNhapTheoNguCanh(nhap, p, h)).toEqual([nhap[1]]);
  expect(locNhapTheoNguCanh(nhap, p, hoiThoaiMoi("2"))).toEqual(nhap); // chưa từng có tin bot: người thật nói "không" là thật
});

test("lệnh admin", () => {
  expect(docLenhAdmin("K4249 2")).toEqual({ ma: "K4249", lenh: "chon", so: 2 });
  expect(docLenhAdmin("k4249 bot")).toEqual({ ma: "K4249", lenh: "bot" });
  expect(docLenhAdmin("K4249 im")).toEqual({ ma: "K4249", lenh: "im" });
  expect(docLenhAdmin("K42491 Dạ 4tr2 bạn nha")).toEqual({ ma: "K42491", lenh: "gui", noiDung: "Dạ 4tr2 bạn nha" });
  expect(docLenhAdmin("ok em")).toBeNull();
});

test("cổng gửi: nhận tiếng vọng, giờ im, lặp câu, hạn mức mỗi khách", async () => {
  let luc = SANG;
  const gui: string[][] = [];
  const cong = taoCongGui({ cli: async (a: string[]) => { gui.push(a); }, now: () => luc, ngu: async () => {}, rand: () => 0 });
  expect((await cong.gui("9", "Dạ  phòng RH1", { loai: "khach_tu_dong" })).ok).toBe(true);
  expect(cong.laTiengVong("9", "Dạ phòng RH1")).toBe(true);
  expect(cong.laTiengVong("9", "Dạ phòng RH1")).toBe(false); // mỗi bản gửi chỉ khớp một lần
  expect(cong.laTiengVong("9", "4tr2 bạn ạ")).toBe(false);   // người thật
  expect(await cong.gui("9", "Dạ phòng RH1", { loai: "khach_tu_dong" })).toMatchObject({ ok: false, lyDo: "lap_cau" });
  await cong.gui("9", "câu 2", { loai: "khach_tu_dong" });
  await cong.gui("9", "câu 3", { loai: "khach_tu_dong" });
  expect(await cong.gui("9", "câu 4", { loai: "khach_tu_dong" })).toMatchObject({ ok: false, lyDo: "vuot_han_moi_khach" });
  expect((await cong.gui("9", "câu admin chọn", { loai: "khach_admin" })).ok).toBe(true);
  luc = DEM;
  expect(trongGioIm(DEM)).toBe(true);
  expect(await cong.gui("8", "chào", { loai: "khach_tu_dong" })).toMatchObject({ ok: false, lyDo: "gio_im" });
  expect((await cong.gui("admin", "thẻ khẩn", { loai: "admin" })).ok).toBe(true);
});

test("cổng gửi: lỗi CLI trả lại hạn mức", async () => {
  let loi = true;
  const cong = taoCongGui({ cli: async () => { if (loi) throw new Error("mất phiên"); }, now: () => SANG, ngu: async () => {}, cauHinh: { tuDongMoiKhachMoiGio: 1 } });
  expect(await cong.gui("9", "a", { loai: "khach_tu_dong" })).toMatchObject({ ok: false, lyDo: "loi_cli" });
  loi = false;
  expect((await cong.gui("9", "a", { loai: "khach_tu_dong" })).ok).toBe(true);
});

// Phát lại sự cố qua bộ điều phối với Zalo, DB và AI giả
function heGia() {
  let luc = SANG;
  const daGui: { thread: string; text: string; loai: string }[] = [];
  const dem = new Map<string, ReturnType<typeof hoiThoaiMoi>>();
  const kho = {
    lay: async (uid: string) => dem.get(String(uid)) ?? (dem.set(String(uid), hoiThoaiMoi(uid)), dem.get(String(uid))!),
    luu: async () => {}, timTheoMa: async (ma: string) => [...dem.keys()].filter((u) => u.endsWith(ma.slice(1))),
    tatCa: () => [...dem.values()],
  };
  const soGui = new Set<string>();
  const cong = {
    gui: async (thread: string, text: string, { loai }: { loai: string }) => { daGui.push({ thread: String(thread), text, loai }); soGui.add(`${thread}|${text}`); return { ok: true }; },
    laTiengVong: (thread: string, text: string) => soGui.delete(`${thread}|${text}`),
  };
  // DB không có tin nào khớp (khách chỉ gửi ảnh, không gửi mã)
  const rong: any = new Proxy({}, { get: (_t, k) => (k === "then" ? (r: any) => r({ data: [], error: null }) : () => rong) });
  const sb = { from: () => rong };
  const goiAI: { n: number; tra: any } = { n: 0, tra: null };
  const tv = taoTuVan({ sb, kho, cong, adminUid: "ADMIN", tuDong: true, now: () => luc, log: { log() {}, error() {} } as unknown as Console,
    goiAI: async () => { goiAI.n++; return goiAI.tra; } });
  return { tv, daGui, dem, goiAI, troi: (ms: number) => { luc += ms; } };
}

test("phát lại sự cố: bot không chen vào cuộc người đang chat, nhắc admin khi khách chờ lâu", async () => {
  const { tv, daGui, dem, goiAI, troi } = heGia();
  const KHACH = "5550004249";

  // 1. khách gửi ảnh phòng + hỏi giá -> thẻ cho admin, bot không tự trả lời (không đọc được ảnh)
  goiAI.tra = { y_dinh: "hoi_thong_tin", hoi_ve: ["gia"], do_tin_cay: 0.9, khan: false, ngon_ngu: "vi", tom_tat: "Hỏi giá phòng trong ảnh", goi_y: ["Dạ phòng này [giá] bạn nha"] };
  await tv.khachNhan({ uid: KHACH, ten: "Lan", chu: "phòng này giá sao a", kieu: "anh" });
  expect(daGui.filter((g) => g.thread !== "ADMIN")).toHaveLength(0);
  expect(daGui.at(-1)!.text).toContain("K4249 · Lan");
  expect(daGui.at(-1)!.text).toContain("khách gửi ảnh");
  await tv.tuGuiNhan({ uid: "ADMIN", chu: daGui.at(-1)!.text }); // tiếng vọng thẻ admin: bỏ qua

  // 2. anh Quang chat tay từ điện thoại
  troi(PHUT);
  await tv.tuGuiNhan({ uid: KHACH, chu: "4tr2 bạn ạ" });
  expect(dem.get(KHACH)!.che_do).toBe("nguoi");

  // 3. khách hỏi tiếp "phí khác" -> bot im, không tốn lượt AI, không báo thẻ
  troi(PHUT); const truoc = daGui.length, aiTruoc = goiAI.n;
  await tv.khachNhan({ uid: KHACH, ten: "Lan", chu: "Dạ phí khác bao nhiêu vậy a" });
  expect(daGui.length).toBe(truoc);
  expect(goiAI.n).toBe(aiTruoc);

  // 4. người thật đã tiếp nhận -> nhắc việc KHÔNG gửi thẻ về số chính nữa
  troi(11 * PHUT);
  await tv.nhacViec();
  expect(daGui.filter((g) => g.text.startsWith("⏰"))).toHaveLength(0);

  // 5. khách nhắn tiếp (kể cả nghi bot/khẩn) -> người thật đã tiếp nhận nên bot KHÔNG gửi báo số chính
  troi(PHUT);
  const truocKhan = daGui.length;
  await tv.khachNhan({ uid: KHACH, ten: "Lan", chu: "Tin nhắn tự động à a" });
  await tv.khachNhan({ uid: KHACH, ten: "Lan", chu: "alo anh ới?" });
  expect(daGui.length).toBe(truocKhan); // không gửi thêm thẻ nào về admin
  expect(daGui.filter((g) => g.thread === KHACH)).toHaveLength(0); // bot cũng không nhắn khách

  // 6. admin vẫn có thể dùng lệnh để gửi tin cho khách
  await tv.adminNhan({ chu: "K4249 Mình đây, bạn đang ở đoạn nào để mình ra mở cửa nha" });
  expect(daGui.find((g) => g.thread === KHACH)).toMatchObject({ loai: "khach_admin" });
  expect(dem.get(KHACH)!.cho_tu).toBeNull();
});

test("nhắc việc bỏ qua lượt chờ quá 12 giờ (nạp lại sau restart)", async () => {
  const { tv, daGui, dem, troi } = heGia();
  const h = hoiThoaiMoi("888"); themTin(h, "khach", "phòng còn không", "chu", SANG); dem.set("888", h);
  troi(13 * 60 * PHUT);
  await tv.nhacViec();
  expect(daGui).toHaveLength(0);
});

test("tiếng vọng câu bot tự gửi không bị coi là người thật nhận cuộc", async () => {
  const { tv, daGui, dem, goiAI } = heGia();
  goiAI.tra = { y_dinh: "chao_hoi", do_tin_cay: 0.95, khan: false, ngon_ngu: "vi", tom_tat: "", goi_y: [] };
  await tv.khachNhan({ uid: "777", ten: "Khách", chu: "hello" });
  await new Promise((r) => setTimeout(r, 0));
  const cauBot = daGui.find((g) => g.thread === "777")!;
  expect(cauBot.text).toBe(cauChao(false));
  await tv.tuGuiNhan({ uid: "777", chu: cauBot.text });
  expect(dem.get("777")!.che_do).toBe("bot");
});

test("sự kiện phi ngôn ngữ: cuộc gọi, sticker, tin thoại có câu phản hồi và gợi ý chuẩn", async () => {
  const { tv, daGui, dem } = heGia();
  const KHACH_GOI = "9990001111";

  // 1. Khách gọi nhỡ -> báo thẻ khẩn, có gợi ý xin lỗi lỡ cuộc gọi
  await tv.khachNhan({ uid: KHACH_GOI, ten: "Hoàng", chu: "", kieu: "cuoc_goi" });
  const theAdmin = daGui.find((g) => g.thread === "ADMIN" && g.text.includes("K1111"));
  expect(theAdmin).toBeDefined();
  expect(theAdmin!.text).toContain("🚨 K1111 · Hoàng");
  expect(theAdmin!.text).toContain("lỡ cuộc gọi");
  expect((dem.get(KHACH_GOI)!.goi_y as string[])[0]).toContain("lỡ cuộc gọi");

  // 2. Khách gửi sticker -> gợi ý chào hỏi lọc rổ hàng 1.400+ căn
  const KHACH_STICKER = "9990002222";
  await tv.khachNhan({ uid: KHACH_STICKER, ten: "Hà", chu: "", kieu: "sticker" });
  expect((dem.get(KHACH_STICKER)!.goi_y as string[])[0]).toContain("1.400+ căn");

  // 3. Khách gửi tin thoại -> gợi ý báo đang ngoài đường hơi ồn xin gửi chữ
  const KHACH_VOICE = "9990003333";
  await tv.khachNhan({ uid: KHACH_VOICE, ten: "Nam", chu: "", kieu: "giong_noi" });
  expect((dem.get(KHACH_VOICE)!.goi_y as string[])[0]).toContain("tin nhắn thoại");
});

test("săn khách tìm phòng: nhận diện tin tìm phòng, soạn tin rep nhóm và tin nhắn riêng 1-1", () => {
  // 1. Nhận diện tin tìm phòng và loại trừ tin rao
  expect(laBaiTimPhong("Mình cần tìm phòng trọ Bình Thạnh dưới 4tr có gác lửng")).toBe(true);
  expect(laBaiTimPhong("Ai có phòng trọ Q7 tầm 3tr5 cho em xin info với ạ")).toBe(true);
  expect(laBaiTimPhong("Chính chủ cho thuê phòng trọ Quận 10 giá 4tr full nội thất")).toBe(false);

  // 2. Soạn tin khi có 2 căn khớp
  const canKhop = [
    { title: "Phòng trọ D2", price_vnd: 3800000, district: "Quận Bình Thạnh", ward: "Phường 25", amenities: ["gac_lung", "ban_cong"] },
    { title: "Phòng trọ Bạch Đằng", price_vnd: 4000000, district: "Quận Bình Thạnh", ward: "Phường 15", amenities: ["dieu_hoa"] },
  ] as any;
  const { repNhom, tinRieng } = (soanTinSanKhach as any)({
    senderName: "Tuấn Anh",
    nhuCau: { quan: ["Quận Bình Thạnh"], gia_den: 4000000 },
    canKhop,
  });

  expect(repNhom).toContain("@Tuấn Anh");
  expect(repNhom).toContain("Bình Thạnh");
  expect(repNhom).toContain("Zalo");

  expect(tinRieng).toContain("Tuấn Anh");
  expect(tinRieng).toContain("Bình Thạnh");
  expect(tinRieng).toContain("3tr8");
  expect(tinRieng).toContain("4tr");
  expect(tinRieng).toContain("0387 365 020");
});

test("cổng gửi: hỗ trợ gửi tin nhóm có mention và thả tim (react)", async () => {
  const cacLenh: string[][] = [];
  const chay = (args: string[]) => { cacLenh.push(args); return Promise.resolve(JSON.stringify({ ok: true })); };
  const cong = taoCongGui({ cli: chay, now: () => SANG, ngu: () => Promise.resolve(), rand: () => 0 });

  // 1. Gửi tin nhóm có mention
  await cong.gui("group_123", "@Tuấn Anh Em vừa nhắn riêng á", {
    loai: "khach_tu_dong",
    type: "1",
    mention: "0:user_456:9",
  });
  expect(cacLenh).toContainEqual(["msg", "send", "-t", "1", "--mention", "0:user_456:9", "group_123", "@Tuấn Anh Em vừa nhắn riêng á"]);

  // 2. Thả tim tin nhắn
  await cong.react("msg_999", "group_123", "/-heart", { type: "1", cliMsgId: "cli_888" as any });
  expect(cacLenh).toContainEqual(["msg", "react", "-t", "1", "-c", "cli_888", "msg_999", "group_123", "/-heart"]);
});

test("đồng bộ vận hành: hotline 0387 365 020 (Lê Quang), mã phòng RH, 5 khoản phí minh bạch", () => {
  // 1. Tra cứu mã phòng RHxxxxxx từ tin nhắn
  expect(trichXuatDinhDanh("Phòng RH017FC5 còn không bạn?")).toEqual({ kieu: "ma_rh", giaTri: "RH017FC5" });
  expect(trichXuatDinhDanh("căn rh1a2b3c giá sao")).toEqual({ kieu: "ma_rh", giaTri: "RH1A2B3C" });
  expect(trichXuatDinhDanh("mã: 1A2B3C")).toEqual({ kieu: "ma_rh", giaTri: "RH1A2B3C" });

  // 2. Bóc tách 5 khoản phí minh bạch và Hotline Radar
  const f = factsTuTin(TIN, RO_HANG);
  const r = soanTraLoiTuFacts(["chi_phi"], f)!;
  expect(r).toContain("Phòng RH1A2B3C bên mình tính phí rõ ràng từ đầu như này nha:");
  expect(r).toContain("Điện: 3.800 đ/kWh");
  expect(r).toContain("Nước: 100.000 đ/người");
  expect(r).toContain("Gửi xe: 100.000 đ/xe");
  expect(r).toContain("Dịch vụ (Phí quản lý): 150.000 đ/phòng");
  expect(r).toContain("Tiền phòng: 4,2 triệu/tháng");
  expect(r).toContain("0387 365 020");
  expect(r).toContain("Bên mình dẫn coi phòng miễn phí");

  // 3. AI draft cho phép hotline chính thức nhưng chặn SĐT lạ
  const goiYHopLe = ["Hotline/Zalo: 0387 365 020 (Lê Quang)"];
  const pl1 = chuanHoaPhanLoai({ y_dinh: "hoi_thong_tin", hoi_ve: ["dien"], do_tin_cay: 0.9, goi_y: goiYHopLe });
  expect(pl1?.goi_y).toEqual(goiYHopLe);

  const pl2 = chuanHoaPhanLoai({ y_dinh: "hoi_thong_tin", hoi_ve: ["dien"], do_tin_cay: 0.9, goi_y: ["Gọi số 0912 345 678 nhé"] });
  expect(pl2?.goi_y).toEqual([]);
});

test("timPhongPhuHop: tự tra cứu DB theo loại phòng (1PN, VP) ngay cả khi khách không ghi quận", async () => {
  const fakeRows = [
    { id: "11111111-1111-1111-1111-111111111111", title: "Căn 1PN chung cư Bến Vân Đồn", price_vnd: 8000000, district: "Quận 4", specs: { "Loại phòng": "1 Phòng ngủ" } },
    { id: "22222222-2222-2222-2222-222222222222", title: "Mặt bằng kinh doanh văn phòng", price_vnd: 10000000, district: "Quận 1", specs: { "Loại phòng": "Mặt bằng" } },
    { id: "33333333-3333-3333-3333-333333333333", title: "Phòng trọ studio tiện nghi", price_vnd: 4500000, district: "Bình Thạnh", specs: { "Loại phòng": "Studio" } },
  ];

  const fakeSb: any = {
    from: () => {
      let filter = "";
      const query: any = {
        select: () => query,
        eq: () => query,
        ilike: () => query,
        lte: () => query,
        gte: () => query,
        or: (expr: string) => { filter = expr; return query; },
        order: () => query,
        limit: () => {
          let rows = fakeRows;
          if (filter.includes("1PN")) rows = fakeRows.filter((r) => r.title.includes("1PN"));
          else if (filter.includes("văn phòng")) rows = fakeRows.filter((r) => r.title.includes("văn phòng"));
          return Promise.resolve({ data: rows });
        },
      };
      return query;
    },
  };

  // Ca Lan Chi: tìm căn 1PN chung cư, không có quận
  const ketQua1PN = await timPhongPhuHop({
    sb: fakeSb,
    nhuCau: { quan: [], loai_phong: "can_ho", yeu_cau: ["1pn", "máy lạnh"], tom_tat: "Cần thuê căn 1pn chung cư làm văn phòng" },
  });
  expect(ketQua1PN.length).toBeGreaterThan(0);
  expect(ketQua1PN[0].title).toContain("1PN");

  // Soạn tin nhắn riêng khi không có quận: vẫn gợi ý căn khớp và hỏi thêm khu vực
  const { tinRieng, repNhom } = (soanTinSanKhach as any)({
    senderName: "Lan Chi",
    nhuCau: { quan: [], loai_phong: "can_ho", tom_tat: "Cần thuê căn 1pn chung cư" },
    canKhop: ketQua1PN,
  });
  expect(repNhom).toContain("@Lan Chi");
  expect(tinRieng).toContain("Lan Chi");
  expect(tinRieng).toContain("Bạn đang ưu tiên tìm phòng/nhà quanh khu vực quận nào");
  expect(tinRieng).toContain("0387 365 020 (Lê Quang)");
});

