// Sinh bài đăng Facebook/Threads cho rổ hàng Radar (28/9) - dùng ở /admin?tab=dang-bai.
// Chỉ dùng dữ liệu CÔNG KHAI của tin (địa chỉ đã che số nhà, không hoa hồng, không hợp đồng) -
// bài đăng ra nhóm FB cũng phải theo đúng quy tắc như web: khách muốn biết chính xác thì gọi Radar.
import { fmtPrice, PROP } from "./format";
import { HOTLINE } from "@/components/TuVanRadar";
import { tagGiuPhong } from "./ro-hang";

type Tin = {
  id: string; deal: string; kind: string; title: string; description: string | null;
  price_vnd: number | null; area_m2: number | null; district: string | null; ward: string | null;
  address: string | null; specs: Record<string, string> | null; source?: string | null; source_site?: string | null;
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nha-dat-radar-rkyn.vercel.app";

const boDau = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
const hashtag = (s: string) => "#" + boDau(s).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

/** Các dòng "• ..." dưới mục TIỆN NGHI trong mô tả do script nhập rổ hàng dựng */
function tienNghi(moTa: string | null) {
  const out: string[] = [];
  let trong = false;
  for (const l of String(moTa || "").split("\n")) {
    if (/TIỆN NGHI/i.test(l)) { trong = true; continue; }
    if (trong && /^\s*•/.test(l)) out.push(l.replace(/^\s*•\s*/, "").trim());
    else if (trong && l.trim()) break;
  }
  return out;
}

export function baiDangMotPhong(x: Tin) {
  const quan = (x.district || "").replace(/^(Quận|Huyện) /, "");
  const loai = x.specs?.["Loại phòng"] || PROP[x.kind] || "Phòng";
  const gia = fmtPrice(x.price_vnd, x.deal);
  const tn = tienNghi(x.description);
  const giu = tagGiuPhong(x);
  return [
    `🔥 PHÒNG TRỐNG ${quan.toUpperCase()} - ${loai}${x.area_m2 ? ` ${x.area_m2}m²` : ""} chỉ ${gia}`,
    "",
    `📍 ${[x.address, x.district].filter(Boolean).join(", ")}`,
    `💰 Giá: ${gia}${x.specs?.["Tiền cọc"] ? ` · Cọc ${x.specs["Tiền cọc"]}` : ""}`,
    x.area_m2 ? `📐 Diện tích: ${x.area_m2} m²` : "",
    tn.length ? `✨ ${tn.slice(0, 8).join(" · ")}` : "",
    [x.specs?.["Điện"] ? `⚡ Điện ${x.specs["Điện"]}` : "", x.specs?.["Nước"] ? `💧 Nước ${x.specs["Nước"]}` : ""].filter(Boolean).join(" · "),
    giu ? `\n${giu}` : "",
    "",
    `👉 Cmt "XEM" hoặc ib để nhận video + vị trí chính xác, dẫn xem phòng miễn phí trong ngày!`,
    `📞 Hotline/Zalo: ${HOTLINE}`,
    `🔗 ${SITE}/listings/${x.id}`,
    "",
    [hashtag(`phongtro${quan}`), hashtag(`chothuephong${quan}`), "#phongtrohcm", "#chothuephonghcm", "#nhadatradar"].join(" "),
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n").trim();
}

/** Bài gom 5 phòng một quận - đăng nhóm "tìm phòng <quận>" ăn tương tác tốt hơn bài lẻ */
export function baiDangGomQuan(district: string, tins: Tin[]) {
  const quan = district.replace(/^(Quận|Huyện) /, "");
  const top = tins.slice(0, 5);
  if (!top.length) return "";
  const giaMin = Math.min(...top.map((t) => t.price_vnd || Infinity));
  const giu = tagGiuPhong(top[0]);
  return [
    `🏠 ${top.length} PHÒNG TRỐNG ${quan.toUpperCase()} - GIÁ TỪ ${fmtPrice(giaMin, "cho_thue").toUpperCase()}`,
    giu || "",
    "",
    ...top.map((t, i) => `${i + 1}️⃣ ${t.specs?.["Loại phòng"] || PROP[t.kind]}${t.area_m2 ? ` ${t.area_m2}m²` : ""} - ${fmtPrice(t.price_vnd, t.deal)}\n   📍 ${t.address || quan}`),
    "",
    `👉 Cmt số phòng ưng ý hoặc ib để nhận video + vị trí chính xác, dẫn xem miễn phí trong ngày!`,
    `📞 Hotline/Zalo: ${HOTLINE}`,
    "",
    [hashtag(`phongtro${quan}`), hashtag(`chothuephong${quan}`), "#phongtrohcm", "#nhadatradar"].join(" "),
  ].join("\n").trim();
}
