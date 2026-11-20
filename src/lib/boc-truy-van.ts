// Bộ bóc tách câu tìm kiếm & luật tiền tiếng Việt cho BĐS
// Kế thừa và tinh chỉnh từ Nhadat.cc (luat-tien.ts & parse-query.ts)
// Chạy hoàn toàn bằng thuật toán chuẩn hoá NFD + Regex, KHÔNG tốn quota LLM

const TY = 1_000_000_000;
const TR = 1_000_000;

export type BoLocBDS = {
  deal?: "ban" | "cho_thue";
  kind?: "nha" | "can_ho" | "dat" | "mat_bang" | "phong_tro";
  province?: string;
  district?: string;
  ward?: string;
  price_min?: number;
  price_max?: number;
  price_approx?: number;
  bedrooms?: number;
  area_min?: number;
  area_max?: number;
  street?: string;
  keyword?: string;
  access?: "mt" | "hxh" | "hem";
};

export type KetQuaBocTruyVan = {
  raw: string;
  loc: BoLocBDS;
  confidence: Record<string, number>;
  tieuDeDienGiai: string;
  urlSearch: string;
  coKetQua: boolean;
};

/** Bỏ dấu giữ nguyên số ký tự, đ/Đ -> d/D */
export function boDauGiuViTri(s: string): string {
  let out = "";
  for (const ch of s) {
    if (ch === "đ" || ch === "Đ") { out += "d"; continue; }
    const base = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const c = (base[0] ?? " ").toLowerCase();
    const one = /[a-z0-9]/.test(c) ? c : /[.,/\-–]/.test(c) ? c : " ";
    out += one + " ".repeat(Math.max(0, ch.length - 1));
  }
  return out;
}

const DV_TIEN = "(ty|ti|toi|trieu|tr|cu)";
const SO_RE = "(\\d+(?:[.,]\\d+)?)";

function docSo(s: string): number {
  return parseFloat(s.replace(",", "."));
}

function donViVND(u: string): number {
  return u === "ty" || u === "ti" || u === "toi" ? TY : TR;
}

type GiaBoc = { min?: number; max?: number; approx?: number; conf: number; thue?: boolean; raw: string };

function bocGia(t: string, goc: string): GiaBoc | null {
  let textKd = t;
  // Chuẩn hoá "tỏi" -> "ty "
  let i = goc.toLowerCase().indexOf("tỏi");
  while (i >= 0) {
    textKd = textKd.slice(0, i) + "ty " + textKd.slice(i + 3);
    i = goc.toLowerCase().indexOf("tỏi", i + 3);
  }

  const rawCua = (m: RegExpExecArray) =>
    goc.slice(m.index + m[1].length, m.index + m[0].length).replace(/^[^\p{L}\p{N}]+/u, "").trim();

  // "8ty2", "6ty5" -> 8.2 / 6.5 tỷ
  let m = new RegExp(`(^|[^a-z0-9])${SO_RE}\\s*(ty|ti)\\s*(\\d)(?![a-z0-9])`).exec(textKd);
  if (m) {
    const v = (docSo(m[2]) + Number(m[4]) / 10) * TY;
    return { approx: v, min: Math.round(v * 0.85), max: Math.round(v * 1.15), conf: 0.9, raw: rawCua(m) };
  }

  // "5-8 ty", "5 den 8 ty", "tu 5 den 8 ty", "5 toi 8 ty", "3 - 5 tr"
  m = new RegExp(`(^|[^a-z0-9])${SO_RE}\\s*(?:-|–|den|toi|to)\\s*${SO_RE}\\s*${DV_TIEN}(?![a-z])`).exec(textKd);
  if (m) {
    const dv = donViVND(m[4]);
    return { min: Math.round(docSo(m[2]) * dv), max: Math.round(docSo(m[3]) * dv), conf: 0.95, raw: rawCua(m) };
  }

  // "duoi 5 ty", "tren 10 ty", "khoang 8 ty", "tam 8 ti", "8 ty ruoi", "15tr/thang", "duoi 4tr"
  m = new RegExp(`(^|[^a-z0-9])(duoi|toi da|max|tren|tu|it nhat|khoang|tam|co|gia|chung)?\\s*${SO_RE}\\s*${DV_TIEN}(?![a-z])(\\s*ruoi)?(\\s*/\\s*(thang|th|nam))?`).exec(textKd);
  if (m) {
    const tuKhoa = m[2] ?? "";
    let v = docSo(m[3]);
    if (m[5]) v += 0.5;
    const vnd = Math.round(v * donViVND(m[4]));
    const thue = !!m[6];
    const raw = rawCua(m);
    if (/^(duoi|toi da|max)$/.test(tuKhoa)) return { max: vnd, conf: 0.95, thue, raw };
    if (/^(tren|tu|it nhat)$/.test(tuKhoa)) return { min: vnd, conf: 0.95, thue, raw };
    return { approx: vnd, min: Math.round(vnd * 0.85), max: Math.round(vnd * 1.15), conf: tuKhoa ? 0.9 : 0.8, thue, raw };
  }

  return null;
}

// Bảng từ khoá loại hình BĐS (mẫu dài trước)
const LOAI_HINH: Array<{ re: RegExp; kind: BoLocBDS["kind"]; label: string; conf: number }> = [
  { re: /(^|[^a-z])(can ho dich vu|chdv|khach san|toa nha|building)(?![a-z])/, kind: "can_ho", label: "căn hộ dịch vụ", conf: 0.95 },
  { re: /(^|[^a-z])(phong tro|nha tro|tim tro|thue tro|o ghep|phong)(?![a-z])/, kind: "phong_tro", label: "phòng trọ", conf: 0.95 },
  { re: /(^|[^a-z])(chung cu|can ho|apartment|penthouse|studio|officetel)(?![a-z])/, kind: "can_ho", label: "căn hộ", conf: 0.9 },
  { re: /(^|[^a-z])(mat bang|kiot|ki ot|shophouse|cua hang|van phong)(?![a-z])/, kind: "mat_bang", label: "mặt bằng", conf: 0.9 },
  { re: /(^|[^a-z])(dat nen|lo dat|dat tho cu|dat)(?![a-z])/, kind: "dat", label: "đất nền", conf: 0.9 },
  { re: /(^|[^a-z])(biet thu|villa|nha pho|nha cap 4|nha rieng|nha hem|nha)(?!\s*dat)(?![a-z])/, kind: "nha", label: "nhà", conf: 0.85 },
];

// Danh sách Quận/Huyện TP.HCM, khu vực dân gian (trích xuất từ AOND KIEN_THUC_NGHE), trường ĐH & điểm neo chiến lược
const QUAN_TPHCM: Array<[RegExp, string, string?]> = [
  [/binh thanh|\b(ba chieu|hang xanh|thi nghe|van thanh|thanh da|mieu noi|hutech|ngoai thuong|ftu|ftu2|uef|van lang|vlu|ung buou)\b/, "Bình Thạnh", "Hồ Chí Minh"],
  [/tan binh|\b(bau cat|k300|bay hien|lang cha ca|ba queo|etown|tan son nhat|benh vien thong nhat|kcn tan binh)\b/, "Tân Bình", "Hồ Chí Minh"],
  [/tan phu|\baeon tan phu\b/, "Tân Phú", "Hồ Chí Minh"],
  [/phu nhuan|\bphan xich long\b/, "Phú Nhuận", "Hồ Chí Minh"],
  [/go vap|\b(cityland|hanh thong tay|cong nghiep tphcm|dai hoc cong nghiep|\biuh\b)\b/, "Gò Vấp", "Hồ Chí Minh"],
  [/thu duc|\b(thao dien|an phu|sala|van phuc|binh trieu|hiep binh|su pham ky thuat|spkt|hcmute|nong lam|\bnlu\b|\bfpt\b|\bfptu\b|khu cong nghe cao|vinhomes grand park)\b/, "Thủ Đức", "Hồ Chí Minh"],
  [/binh tan|\b(ten lua|an lac)\b/, "Bình Tân", "Hồ Chí Minh"],
  [/binh chanh|\btrung son\b/, "Bình Chánh", "Hồ Chí Minh"],
  [/nha be|\bphuoc kien\b/, "Nhà Bè", "Hồ Chí Minh"],
  [/hoc mon/, "Hóc Môn", "Hồ Chí Minh"],
  [/cu chi/, "Củ Chi", "Hồ Chí Minh"],
  [/can gio/, "Cần Giờ", "Hồ Chí Minh"],
  [/\b(da kao|tan dinh|cau ong lanh|ben thanh|ba son)\b/, "Quận 1", "Hồ Chí Minh"],
  [/\b(do thanh|ban co)\b/, "Quận 3", "Hồ Chí Minh"],
  [/\bxom chieu\b/, "Quận 4", "Hồ Chí Minh"],
  [/\b(khu nguoi hoa|cho lon|cho ray|khoa hoc tu nhien|khtn|hcmus|y duoc|\bump\b|su pham tphcm|hcmue)\b/, "Quận 5", "Hồ Chí Minh"],
  [/\b(phu lam|binh phu)\b/, "Quận 6", "Hồ Chí Minh"],
  [/\b(phu my hung|him lam|kieu dam|ton duc thang|tdtu|rmit|tan thuan)\b/, "Quận 7", "Hồ Chí Minh"],
  [/\bxom cui\b/, "Quận 8", "Hồ Chí Minh"],
  [/\b(cu xa bac hai|bac hai|bach khoa|hcmut|nhi dong 1|van hanh mall)\b/, "Quận 10", "Hồ Chí Minh"],
  [/\b(cu xa lu gia|lu gia|binh thoi)\b/, "Quận 11", "Hồ Chí Minh"],
  [/\b(nga tu ga|an suong|phan mem quang trung)\b/, "Quận 12", "Hồ Chí Minh"],
  [/\b(di an|dong hoa|bcons)\b|\bthong nhat\b.*\blang dai hoc\b|\blang dai hoc\b.*\b(thong nhat|bcons|di an)\b/, "Dĩ An", "Bình Dương"],
  [/\b(thuan an|lai thieu|vsip)\b/, "Thuận An", "Bình Dương"],
  [/\bthu dau mot\b/, "Thủ Dầu Một", "Bình Dương"],
  [/\bbien hoa\b/, "Biên Hòa", "Đồng Nai"],
];

const TINH_THANH: Array<[RegExp, string]> = [
  [/(ho chi minh|tphcm|tp hcm|sai gon)/, "Hồ Chí Minh"],
  [/(ha noi|hn)/, "Hà Nội"],
  [/(da nang|dn)/, "Đà Nẵng"],
  [/(binh duong|bd)/, "Bình Dương"],
  [/(dong nai)/, "Đồng Nai"],
];

const DUONG_RE = /(^|[^a-z])(mat tien duong|mt duong|hem duong|duong|pho)\s+([a-z0-9\s]{2,30})/i;
const TU_DUNG_DUONG = /^(gia|q\d*|quan|phuong|p\d*|hxh|hxt|mt|hem|duoi|tren|khoang|tam|tu|den|pn|phong|dt|ban|mua|thue|can|tim|nha|dat|chung|cu|co|voi|gan|lang|khu|bcons|dhqg|truong|cho|benh|vien|khong|ko|k|nao)$/;

/**
 * Bóc tách truy vấn ngôn ngữ tự nhiên tiếng Việt cho BĐS.
 * Hỗ trợ các kiểu gõ tự do: "phòng trọ bình thạnh có gác dưới 4tr", "nhà tân phú 3-5 tỷ hxh"
 */
export function bocTruyVanBDS(qRaw: string): KetQuaBocTruyVan {
  const q = (qRaw ?? "").toString().slice(0, 300).replace(/\s+/g, " ").trim();
  const t = boDauGiuViTri(q);
  const loc: BoLocBDS = {};
  const conf: Record<string, number> = {};

  // 1. Phân định Mua/Bán vs Thuê
  if (/(^|[^a-z])(thue|cho thue|can thue|muon thue|o ghep|mƯon)(?![a-z])/.test(t)) {
    loc.deal = "cho_thue";
    conf.deal = 0.95;
  } else if (/(^|[^a-z])(mua|ban|can mua|tim mua|dau tu|chinh chu ban)(?![a-z])/.test(t)) {
    loc.deal = "ban";
    conf.deal = 0.95;
  }

  // 2. Loại hình BĐS
  for (const item of LOAI_HINH) {
    if (item.re.test(t)) {
      loc.kind = item.kind;
      conf.kind = item.conf;
      break;
    }
  }

  // 3. Tỉnh/thành
  for (const [re, ten] of TINH_THANH) {
    if (re.test(t)) {
      loc.province = ten;
      conf.province = 0.95;
      break;
    }
  }

  // 4. Quận/huyện
  let m = /(^|[^a-z])(quan|q)\.?\s*(\d{1,2})(?![0-9])/.exec(t);
  if (m) {
    loc.district = `Quận ${Number(m[3])}`;
    conf.district = 0.95;
    if (!loc.province) loc.province = "Hồ Chí Minh";
  } else {
    for (const [re, ten, tinh] of QUAN_TPHCM) {
      if (re.test(t)) {
        loc.district = ten;
        conf.district = 0.95;
        if (!loc.province) loc.province = tinh || "Hồ Chí Minh";
        break;
      }
    }
  }

  // 5. Phường: "phường 5", "p.5", "p5"
  m = /(^|[^a-z])(phuong|p)\.?\s*(\d{1,2})(?![0-9])/.exec(t);
  if (m) {
    loc.ward = `Phường ${Number(m[3])}`;
    conf.ward = 0.9;
  }

  // 6. Giá tiền
  const g = bocGia(t, q);
  if (g) {
    if (g.min) loc.price_min = g.min;
    if (g.max) loc.price_max = g.max;
    if (g.approx) loc.price_approx = g.approx;
    conf.price = g.conf;
    if (g.thue && !loc.deal) {
      loc.deal = "cho_thue";
      conf.deal = 0.85;
    }
  }

  // Nếu giá dưới 100 triệu mà chưa rõ giao dịch -> 99% là thuê phòng/nhà theo tháng
  const giaMoc = loc.price_approx || loc.price_max || loc.price_min;
  if (!loc.deal && giaMoc && giaMoc < 100 * TR) {
    loc.deal = "cho_thue";
    conf.deal = 0.8;
  }

  // Giá tính theo tỷ (>= 500 triệu) mà không có /tháng -> mặc định mua bán
  if (!loc.deal && ((loc.price_min && loc.price_min >= 500 * TR) || (loc.price_max && loc.price_max >= 500 * TR) || (loc.price_approx && loc.price_approx >= 500 * TR))) {
    loc.deal = "ban";
    conf.deal = 0.85;
  }

  // Phòng trọ mặc định deal thuê nếu chưa set
  if (loc.kind === "phong_tro" && !loc.deal) {
    loc.deal = "cho_thue";
    conf.deal = 0.9;
  }

  // 7. Đường vào / Ngõ hẻm
  if (/(^|[^a-z])(mt|mat tien)(?![a-z])/.test(t)) {
    loc.access = "mt";
    conf.access = 0.9;
  } else if (/(^|[^a-z])(hxh|hxt|hem xe hoi|hem xe tai|hem oto|o to vao)(?![a-z])/.test(t)) {
    loc.access = "hxh";
    conf.access = 0.9;
  } else if (/(^|[^a-z])(hem|trong hem|hem xe may)(?![a-z])/.test(t)) {
    loc.access = "hem";
    conf.access = 0.8;
  }

  // 8. Phòng ngủ
  m = /(^|[^a-z0-9])(\d)\s*(pn|phong ngu|phong)(?![a-z])/.exec(t);
  if (m && loc.kind !== "phong_tro") {
    loc.bedrooms = Math.min(6, Math.max(1, Number(m[2])));
    conf.bedrooms = 0.9;
  }

  // 9. Diện tích: "50m2", "tren 60 m2"
  m = /(^|[^a-z0-9])(duoi|tren|tu|khoang|dt|dien tich)?\s*(\d{2,4})\s*(m2|m vuong|met vuong)(?![a-z])/.exec(t);
  if (m) {
    const v = Number(m[3]);
    if (m[2] === "duoi") loc.area_max = v;
    else if (m[2] === "tren" || m[2] === "tu") loc.area_min = v;
    else {
      loc.area_min = Math.round(v * 0.85);
      loc.area_max = Math.round(v * 1.2);
    }
    conf.area = 0.85;
  }

  // 10. Tên đường / từ khoá cụ thể
  m = DUONG_RE.exec(t);
  if (m) {
    const rawSpan = m[3].trim().split(/\s+/);
    const validWords: string[] = [];
    for (const w of rawSpan) {
      if (TU_DUNG_DUONG.test(w)) break;
      validWords.push(w);
      if (validWords.length >= 4) break;
    }
    if (validWords.length > 0) {
      const idx = t.indexOf(m[0]);
      if (idx >= 0) {
        const startCut = idx + m[1].length + m[2].length;
        const streetRaw = q.slice(startCut).trimStart().split(/\s+/).slice(0, validWords.length).join(" ").replace(/[.,;?!]+$/, "").trim();
        if (streetRaw.length >= 2) {
          loc.street = streetRaw;
          loc.keyword = streetRaw;
          conf.street = 0.8;
        }
      }
    }
  }

  const coKetQua = !!(
    loc.deal || loc.kind || loc.district || loc.province ||
    loc.price_min || loc.price_max || loc.price_approx ||
    loc.ward || loc.street || loc.bedrooms || loc.area_min || loc.area_max
  );

  // Tạo tiêu đề diễn giải tiếng Việt
  const tieuDeParts: string[] = [];
  if (loc.deal === "cho_thue") tieuDeParts.push("Thuê");
  else if (loc.deal === "ban") tieuDeParts.push("Mua");

  if (loc.kind === "phong_tro") tieuDeParts.push("phòng trọ");
  else if (loc.kind === "can_ho") tieuDeParts.push("căn hộ");
  else if (loc.kind === "nha") tieuDeParts.push("nhà");
  else if (loc.kind === "dat") tieuDeParts.push("đất");
  else if (loc.kind === "mat_bang") tieuDeParts.push("mặt bằng");
  else tieuDeParts.push("nhà đất");

  if (loc.access === "mt") tieuDeParts.push("mặt tiền");
  else if (loc.access === "hxh") tieuDeParts.push("hẻm xe hơi");

  if (loc.bedrooms) tieuDeParts.push(`${loc.bedrooms}PN`);

  if (loc.price_min && loc.price_max) {
    tieuDeParts.push(`${fmtTien(loc.price_min)} – ${fmtTien(loc.price_max)}`);
  } else if (loc.price_max) {
    tieuDeParts.push(`dưới ${fmtTien(loc.price_max)}`);
  } else if (loc.price_min) {
    tieuDeParts.push(`trên ${fmtTien(loc.price_min)}`);
  } else if (loc.price_approx) {
    tieuDeParts.push(`tầm ${fmtTien(loc.price_approx)}`);
  }

  if (loc.street) tieuDeParts.push(`đường ${loc.street}`);
  if (loc.ward) tieuDeParts.push(loc.ward);
  if (loc.district) tieuDeParts.push(loc.district);
  else if (loc.province) tieuDeParts.push(loc.province);

  const tieuDeDienGiai = coKetQua ? tieuDeParts.join(", ") : "";

  // Tạo URL Search tương ứng cho web
  const params = new URLSearchParams();
  if (loc.deal) params.set("deal", loc.deal);
  if (loc.kind) params.set("kind", loc.kind);
  if (loc.province) params.set("province", loc.province);
  if (loc.district) params.set("district", loc.district);
  if (loc.ward) params.set("ward", loc.ward);
  if (loc.price_min) params.set("priceMin", String(loc.price_min));
  if (loc.price_max) params.set("priceMax", String(loc.price_max));
  if (loc.area_min) params.set("areaMin", String(loc.area_min));
  if (loc.area_max) params.set("areaMax", String(loc.area_max));
  if (loc.bedrooms) params.set("bedrooms", String(loc.bedrooms));
  if (loc.street) params.set("street", loc.street);
  const qs = params.toString();
  const urlSearch = `/search${qs ? `?${qs}` : ""}`;

  return { raw: q, loc, confidence: conf, tieuDeDienGiai, urlSearch, coKetQua };
}

function fmtTien(v: number): string {
  if (v >= TY) {
    const ty = v / TY;
    return `${Number.isInteger(ty) ? ty : ty.toFixed(1)} tỷ`;
  }
  const tr = Math.round(v / TR);
  return `${tr} triệu`;
}
