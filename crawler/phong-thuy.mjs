// crawler/phong-thuy.mjs
// Tra cứu Phong Thủy Bát Trạch & Hướng Nhà Hợp Mệnh (chuyển đổi từ tinh hoa MOSO sang ES Module)

export const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
export const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];

// Quái số Bát Trạch: 1 Khảm, 2 Khôn, 3 Chấn, 4 Tốn, 6 Càn, 7 Đoài, 8 Cấn, 9 Ly (5 Nam hóa Khôn, Nữ hóa Cấn)
export const CUNG_TEN = {
  1: "Khảm (Thủy)",
  2: "Khôn (Thổ)",
  3: "Chấn (Mộc)",
  4: "Tốn (Mộc)",
  6: "Càn (Kim)",
  7: "Đoài (Kim)",
  8: "Cấn (Thổ)",
  9: "Ly (Hỏa)",
};

// 1, 3, 4, 9 là Đông Tứ Mệnh; 2, 6, 7, 8 là Tây Tứ Mệnh
export const DONG_TU_MENH = new Set([1, 3, 4, 9]);
export const TAY_TU_MENH = new Set([2, 6, 7, 8]);

// Bát Cung kết hợp 8 hướng tạo thành 8 sao (Bát Trạch Cát Hung)
export const BAT_TRACH_HUONG = {
  // 1: Khảm (Đông Tứ Mệnh)
  1: {
    dong_nam: ["Sinh Khí", "Thu hút tài lộc, công danh phát đạt (Rất tốt)", true],
    dong: ["Thiên Y", "Sức khỏe dồi dào, quý nhân phù trợ (Rất tốt)", true],
    nam: ["Diên Niên", "Gia đạo êm ấm, tình cảm gắn kết (Tốt)", true],
    bac: ["Phục Vị", "Tinh thần an yên, củng cố nội lực (Tốt)", true],
    tay_nam: ["Tuyệt Mệnh", "Tổn hao sinh khí, tài vận trắc trở (Xấu)", false],
    dong_bac: ["Ngũ Quỷ", "Dễ gặp thị phi, hao tài (Xấu)", false],
    tay_bac: ["Lục Sát", "Xáo trộn quan hệ, trục trặc kiện tụng (Xấu)", false],
    tay: ["Họa Hại", "Khó khăn vụn vặt, bất hòa nhỏ (Xấu)", false],
  },
  // 2: Khôn (Tây Tứ Mệnh)
  2: {
    dong_bac: ["Sinh Khí", "Phát tài phát lộc, sự nghiệp hưng vượng (Rất tốt)", true],
    tay: ["Thiên Y", "Tránh bệnh tật, gia đạo bình an (Rất tốt)", true],
    tay_bac: ["Diên Niên", "Hòa khí sinh tài, con cháu thảo hiền (Tốt)", true],
    tay_nam: ["Phục Vị", "Vững vàng gia thất, tâm an lộc tự đến (Tốt)", true],
    bac: ["Tuyệt Mệnh", "Hao tổn năng lượng, trắc trở làm ăn (Xấu)", false],
    dong_nam: ["Ngũ Quỷ", "Bất an, dễ gặp tranh chấp (Xấu)", false],
    nam: ["Lục Sát", "Thị phi tình cảm, hao tài (Xấu)", false],
    dong: ["Họa Hại", "Thất thoát nhỏ, công việc chậm trễ (Xấu)", false],
  },
  // 3: Chấn (Đông Tứ Mệnh)
  3: {
    nam: ["Sinh Khí", "Vượng khí tài lộc, sự nghiệp thăng tiến vùn vụt (Rất tốt)", true],
    bac: ["Thiên Y", "Trường thọ, gặp may mắn trong cuộc sống (Rất tốt)", true],
    dong_nam: ["Diên Niên", "Gia đình sum vầy, các mối quan hệ hòa thuận (Tốt)", true],
    dong: ["Phục Vị", "Tâm trí sáng suốt, thi cử đỗ đạt (Tốt)", true],
    tay: ["Tuyệt Mệnh", "Bất lợi sức khỏe và tài sản (Xấu)", false],
    tay_bac: ["Ngũ Quỷ", "Thị phi, tiểu nhân quấy phá (Xấu)", false],
    dong_bac: ["Lục Sát", "Gia đạo lục đục, trở ngại pháp lý (Xấu)", false],
    tay_nam: ["Họa Hại", "Xui rủi vặt, hao tổn chi tiêu (Xấu)", false],
  },
  // 4: Tốn (Đông Tứ Mệnh)
  4: {
    bac: ["Sinh Khí", "Đại cát đại lợi, phúc lộc vẹn toàn (Rất tốt)", true],
    nam: ["Thiên Y", "Khỏe mạnh, gặp quý nhân trợ lực (Rất tốt)", true],
    dong: ["Diên Niên", "Tình duyên gắn kết, gia đạo hưng thịnh (Tốt)", true],
    dong_nam: ["Phục Vị", "Bình an, tài vận ổn định (Tốt)", true],
    dong_bac: ["Tuyệt Mệnh", "Trở ngại lớn, hao tổn tài vận (Xấu)", false],
    tay_nam: ["Ngũ Quỷ", "Dễ thất bại trong làm ăn (Xấu)", false],
    tay: ["Lục Sát", "Quan hệ xáo trộn, tranh chấp gia đạo (Xấu)", false],
    tay_bac: ["Họa Hại", "Hao tài tốn của, công việc trắc trở (Xấu)", false],
  },
  // 6: Càn (Tây Tứ Mệnh)
  6: {
    tay: ["Sinh Khí", "Lộc tài thịnh vượng, địa vị danh vọng cao (Rất tốt)", true],
    dong_bac: ["Thiên Y", "Khỏe mạnh, tai qua nạn khỏi (Rất tốt)", true],
    tay_nam: ["Diên Niên", "Gia đình bền chặt, con cháu thành đạt (Tốt)", true],
    tay_bac: ["Phục Vị", "Nâng cao năng lực, tâm thế vững vàng (Tốt)", true],
    nam: ["Tuyệt Mệnh", "Nguy hại sức khỏe, tài chính lao dốc (Xấu)", false],
    dong: ["Ngũ Quỷ", "Bất hòa đối tác, hỏa hoạn, thị phi (Xấu)", false],
    bac: ["Lục Sát", "Kiện tụng, thất thoát tiền tài (Xấu)", false],
    dong_nam: ["Họa Hại", "Dễ gặp chuyện không may, hao mòn tài chính (Xấu)", false],
  },
  // 7: Đoài (Tây Tứ Mệnh)
  7: {
    tay_bac: ["Sinh Khí", "Vận may liên tiếp, tiền bạc hanh thông (Rất tốt)", true],
    tay_nam: ["Thiên Y", "Thân tâm an lạc, tài vận bình ổn (Rất tốt)", true],
    dong_bac: ["Diên Niên", "Gia đạo hài hòa, nhân duyên tốt đẹp (Tốt)", true],
    tay: ["Phục Vị", "Tài năng phát huy, tự tin vững vàng (Tốt)", true],
    dong: ["Tuyệt Mệnh", "Tổn hại danh tiếng và sức khỏe (Xấu)", false],
    nam: ["Ngũ Quỷ", "Mất mát của cải, bất an trong nhà (Xấu)", false],
    dong_nam: ["Lục Sát", "Thị phi tình ái, tiền tài thất tán (Xấu)", false],
    bac: ["Họa Hại", "Khó khăn trong làm ăn, việc dở dang (Xấu)", false],
  },
  // 8: Cấn (Tây Tứ Mệnh)
  8: {
    tay_nam: ["Sinh Khí", "Tài lộc dồi dào, thăng tiến thuận lợi (Rất tốt)", true],
    tay_bac: ["Thiên Y", "Gia đình an khang, trường thọ (Rất tốt)", true],
    tay: ["Diên Niên", "Các mối quan hệ bền vững, quý nhân tương trợ (Tốt)", true],
    dong_bac: ["Phục Vị", "Phúc đức tụ hội, tâm an trí sáng (Tốt)", true],
    dong_nam: ["Tuyệt Mệnh", "Rủi ro bất ngờ, hao tổn lớn (Xấu)", false],
    bac: ["Ngũ Quỷ", "Lục đục nội bộ, tài sản hao hụt (Xấu)", false],
    dong: ["Lục Sát", "Trục trặc tình cảm, điều tiếng thị phi (Xấu)", false],
    nam: ["Họa Hại", "Việc khó thành, tốn kém chi phí (Xấu)", false],
  },
  // 9: Ly (Đông Tứ Mệnh)
  9: {
    dong: ["Sinh Khí", "Trí tuệ phát tiết, công danh xán lạn (Rất tốt)", true],
    dong_nam: ["Thiên Y", "Sức khỏe dồi dào, lộc trời ban (Rất tốt)", true],
    bac: ["Diên Niên", "Gia đạo hưng thịnh, mọi việc thuận hòa (Tốt)", true],
    nam: ["Phục Vị", "Danh tiếng rạng rỡ, nội tâm bình an (Tốt)", true],
    tay_bac: ["Tuyệt Mệnh", "Đại bại tài chính, sức khỏe suy kiệt (Xấu)", false],
    tay: ["Ngũ Quỷ", "Mất việc, tai bay vạ gió, thị phi (Xấu)", false],
    tay_nam: ["Lục Sát", "Quan hệ gia đình rạn nứt, hao tán (Xấu)", false],
    dong_bac: ["Họa Hại", "Bất lợi mưu sự, tiểu nhân quấy quả (Xấu)", false],
  },
};

export const HUONG_CHUAN = {
  dong: "dong",
  "đông": "dong",
  e: "dong",
  tay: "tay",
  "tây": "tay",
  w: "tay",
  nam: "nam",
  s: "nam",
  bac: "bac",
  "bắc": "bac",
  n: "bac",
  "dong nam": "dong_nam",
  "đông nam": "dong_nam",
  se: "dong_nam",
  "tay nam": "tay_nam",
  "tây nam": "tay_nam",
  sw: "tay_nam",
  "dong bac": "dong_bac",
  "đông bắc": "dong_bac",
  ne: "dong_bac",
  "tay bac": "tay_bac",
  "tây bắc": "tay_bac",
  nw: "tay_bac",
};

export const TEN_HUONG_DEP = {
  dong: "Chính Đông",
  tay: "Chính Tây",
  nam: "Chính Nam",
  bac: "Chính Bắc",
  dong_nam: "Đông Nam",
  tay_nam: "Tây Nam",
  dong_bac: "Đông Bắc",
  tay_bac: "Tây Bắc",
};

/** Tính Can Chi theo năm sinh dương lịch */
export function tinhCanChi(nam) {
  const n = Number(nam);
  if (!n || isNaN(n)) return "";
  const can = CAN[(n + 6) % 10];
  const chi = CHI[(n + 8) % 12];
  return `${can} ${chi}`;
}

/**
 * Tính Quái số (Cung Phi) chuẩn phong thủy Bát Trạch.
 * Rút gọn 2 số cuối năm sinh về 1 chữ số L.
 * - Trước 2000: Nam = (10 - L) % 9; Nữ = (L + 5) % 9
 * - Từ 2000:    Nam = (9 - L) % 9;  Nữ = (L + 6) % 9
 * Kết quả 0 -> 9. Nam ra 5 hóa Khôn 2; Nữ ra 5 hóa Cấn 8.
 */
export function tinhQuaiSo(nam, gioiTinh = "nam") {
  const n = Number(nam);
  let s = (Math.floor(n % 100) / 10 | 0) + (n % 10);
  while (s > 9) {
    s = (s / 10 | 0) + (s % 10);
  }

  const gt = String(gioiTinh || "").trim().toLowerCase();
  const laNu = ["nu", "nữ", "female", "gái", "chị", "bà", "em gái"].includes(gt);

  let q = 0;
  if (n < 2000) {
    q = laNu ? (s + 5) % 9 : (10 - s) % 9;
  } else {
    q = laNu ? (s + 6) % 9 : (9 - s) % 9;
  }

  if (q === 0) q = 9;
  if (q === 5) q = laNu ? 8 : 2;
  return q;
}

/**
 * Tra cứu chi tiết Bát Trạch
 * @param {number | string} namSinh
 * @param {string} [gioiTinh]
 * @param {string | null} [huongNha]
 * @returns {{ nam_sinh: number, gioi_tinh: string, can_chi: string, quai_so: number, cung_phi: string, nhom_menh: string, huong_tot: { ma: string, ten: string, sao: string, y_nghia: string }[], huong_xau: { ma: string, ten: string, sao: string, y_nghia: string }[], danh_gia_huong?: { huong: string, hop_menh: boolean, sao: string, y_nghia: string } } | null}
 */
export function traCuuPhongThuy(namSinh, gioiTinh = "nam", huongNha = null) {
  const n = Number(namSinh);
  if (!n || isNaN(n)) return null;

  const canChi = tinhCanChi(n);
  const quai = tinhQuaiSo(n, gioiTinh);
  const cung = CUNG_TEN[quai];
  const nhom = DONG_TU_MENH.has(quai) ? "Đông Tứ Mệnh" : "Tây Tứ Mệnh";
  const bangHuong = BAT_TRACH_HUONG[quai] || {};

  const huongTot = [];
  const huongXau = [];
  for (const [k, v] of Object.entries(bangHuong)) {
    const item = { ma: k, ten: TEN_HUONG_DEP[k], sao: v[0], y_nghia: v[1] };
    if (v[2]) huongTot.push(item);
    else huongXau.push(item);
  }

  /** @type {{ nam_sinh: number, gioi_tinh: string, can_chi: string, quai_so: number, cung_phi: string, nhom_menh: string, huong_tot: { ma: string, ten: string, sao: string, y_nghia: string }[], huong_xau: { ma: string, ten: string, sao: string, y_nghia: string }[], danh_gia_huong?: { huong: string, hop_menh: boolean, sao: string, y_nghia: string } }} */
  const ketQua = {
    nam_sinh: n,
    gioi_tinh: ["nu", "nữ", "female"].includes(String(gioiTinh).toLowerCase()) ? "Nữ" : "Nam",
    can_chi: canChi,
    quai_so: quai,
    cung_phi: cung,
    nhom_menh: nhom,
    huong_tot: huongTot,
    huong_xau: huongXau,
  };

  if (huongNha) {
    const kHuong = String(huongNha).toLowerCase().replace(/[_-]/g, " ").trim();
    let kChuan = HUONG_CHUAN[kHuong];
    if (!kChuan) {
      for (const [raw, c] of Object.entries(HUONG_CHUAN)) {
        if (kHuong.includes(raw)) {
          kChuan = c;
          break;
        }
      }
    }
    if (kChuan && bangHuong[kChuan]) {
      const [sao, yNghia, hop] = bangHuong[kChuan];
      ketQua.danh_gia_huong = {
        huong: TEN_HUONG_DEP[kChuan],
        hop_menh: hop,
        sao,
        y_nghia: yNghia,
      };
    }
  }

  return ketQua;
}

/**
 * Định dạng văn bản phong thủy gửi khách tự nhiên, chuyên nghiệp
 * @param {number | string} namSinh
 * @param {string} [gioiTinh]
 * @param {string | null} [huongNha]
 */
export function dinhDangPhongThuyChat(namSinh, gioiTinh = "nam", huongNha = null) {
  const pt = traCuuPhongThuy(namSinh, gioiTinh, huongNha);
  if (!pt) return "";

  const dong = [
    `🧭 TRA CỨU HƯỚNG NHÀ HỢP MỆNH — TUỔI ${pt.can_chi.toUpperCase()} (${pt.nam_sinh})`,
    `• Mệnh chủ: ${pt.gioi_tinh} | Cung phi: ${pt.cung_phi} (${pt.nhom_menh})`,
    "",
    "✅ 4 HƯỚNG TỐT NÊN CHỌN:",
  ];

  for (const h of pt.huong_tot) {
    dong.push(`  + Hướng ${h.ten}: Cung ${h.sao} (${h.y_nghia})`);
  }

  dong.push("\n⚠️ 4 HƯỚNG HẠN CHẾ:");
  for (const h of pt.huong_xau) {
    dong.push(`  - Hướng ${h.ten}: Cung ${h.sao} (${h.y_nghia})`);
  }

  if (pt.danh_gia_huong) {
    const dg = pt.danh_gia_huong;
    dong.push("\n🔍 ĐÁNH GIÁ HƯỚNG CĂN ĐANG XEM:");
    if (dg.hop_menh === true) {
      dong.push(`  -> Căn hướng ${dg.huong} rất hợp mệnh (${dg.sao}), mang lại ${dg.y_nghia.toLowerCase()}.`);
    } else if (dg.hop_menh === false) {
      dong.push(
        `  -> Căn hướng ${dg.huong} thuộc cung ${dg.sao}. Tuy nhiên với căn hộ/phòng trọ, có thể dễ dàng hóa giải bằng cách đặt bếp tọa hung hướng cát và bố trí cây cảnh, rèm cửa để điều hòa sinh khí.`
      );
    }
  }

  dong.push(
    "\n💡 Lời khuyên khí hậu: Ở TP.HCM, các căn ban công hướng Nam hoặc Đông Nam luôn thoáng mát nhất quanh năm. Căn hướng Tây có thể dùng thêm rèm chống nắng 2 lớp."
  );

  return dong.join("\n");
}

/** Nhận diện câu hỏi phong thủy trong tin nhắn khách */
export function nhanDienCauHoiPhongThuy(text) {
  const s = String(text || "").toLowerCase();
  const coTuKhoa = /(phong thuy|hop huong|huong nha|huong phong|ban cong huong|dong tu menh|tay tu menh|menh gi|hop tuoi|cung phi|bat trach)/i.test(s);
  const matchNam = s.match(/\b(19\d{2}|20[0-2]\d)\b/);
  const namSinh = matchNam ? parseInt(matchNam[1], 10) : null;
  const laNu = /(nu|chị|em gái|con gái|bà)/i.test(s);
  const matchHuong = s.match(/(dong nam|tay nam|dong bac|tay bac|đông nam|tây nam|đông bắc|tây bắc|chính đông|chính tây|chính nam|chính bắc|đông|tây|nam|bắc)/i);
  const huong = matchHuong ? matchHuong[1] : null;

  return {
    laPhongThuy: coTuKhoa || (matchNam && /(hop|huong|menh)/i.test(s)),
    namSinh,
    gioiTinh: laNu ? "nu" : "nam",
    huongNha: huong,
  };
}
