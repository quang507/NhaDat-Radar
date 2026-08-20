// Crawler CHỢ TỐT - dùng API JSON công khai (gateway.chotot.com). KHÔNG cần browser/proxy.
// Có sẵn toạ độ (lat/lng) + phường -> không cần geocode. Chạy: node chotot.mjs
import fs from "node:fs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const API = "https://gateway.chotot.com/v1/public/ad-listing";

// === BỘ LỌC (xem xét theo yêu cầu) ===
// region_v2: Hà Nội=12000, TP.HCM=13000, Đà Nẵng(Quảng Nam-ĐN)=3000
// cg=1000: toàn bộ BĐS (lọc bán/thuê bằng field `type`: s=bán, u=cho thuê)
// Có thể thêm: &st=s|u (bán/thuê), &price=min-max, &sp=0, &limit, &o=offset(phân trang)
const REGIONS = [
  { code: 13000, city: "Hồ Chí Minh", pages: 4 },   // ưu tiên miền Nam: HCM gấp đôi
  { code: 12000, city: "Hà Nội", pages: 2 },
  { code: 3000, city: "Đà Nẵng", onlyDaNang: true },
];
const PAGES = 2;        // số trang mỗi vùng
const LIMIT = 50;       // tin/trang

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (s) => (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function propType(catName, houseType) {
  const t = ((catName || "") + " " + (houseType || "")).toLowerCase();
  if (/căn hộ|chung cư|duplex|penthouse|officetel/.test(t)) return "can_ho";
  if (/phòng trọ|ở ghép/.test(t)) return "phong_tro";
  if (/văn phòng|mặt bằng|kho|xưởng/.test(t)) return "mat_bang";
  if (/đất|nền/.test(t)) return "dat";
  if (/nhà|biệt thự|villa/.test(t)) return "nha";
  return "khac";
}
const AMEN = [
  { k: "ac", re: /máy lạnh|điều hoà|điều hòa/i }, { k: "furnished", re: /full nội thất|đầy đủ nội thất|nội thất cao cấp/i },
  { k: "parking", re: /để xe|hầm xe|gara|ô tô/i }, { k: "security", re: /an ninh|bảo vệ|camera|thang máy/i },
  { k: "elevator", re: /thang máy/i }, { k: "near_market", re: /gần chợ|gần trường|mặt tiền|trung tâm/i },
  { k: "pet", re: /thú cưng|nuôi (chó|mèo)/i }, { k: "corner", re: /lô góc|căn góc|2 mặt tiền/i },
];

async function fetchPage(region, offset) {
  const url = `${API}?cg=1000&region_v2=${region}&limit=${LIMIT}&o=${offset}&st=s,u`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) { console.error("chotot HTTP", res.status); return []; } // audit: không nuốt lỗi im lặng
  const j = await res.json();
  return j.ads || [];
}

function mapAd(a, city) {
  const desc = strip(a.body).slice(0, 1100);
  const text = (a.subject || "") + " " + desc;
  const price = a.price || null;
  const area = a.size || a.area || null;
  return {
    id: "ct-" + a.list_id,
    source: "crawl", source_site: "chotot",
    source_url: `https://www.nhatot.com/${a.list_id}.htm`,
    source_post_id: String(a.list_id),
    // thời điểm đăng trên nguồn (list_time = epoch ms) -> "Đăng trên Chợ Tốt lúc ..."
    posted_at: a.list_time ? new Date(Number(a.list_time)).toISOString() : null,
    title: a.subject || "",
    description: desc,
    price_vnd: price,
    area_m2: area ? +area : null,
    price_per_m2: price && area ? Math.round(price / area) : null,
    bedrooms: a.rooms || null,
    bathrooms: a.toilets || null,
    floors: a.floors || null,
    // direction cũng là MÃ SỐ (1 Đông · 2 Tây · 3 Nam · 4 Bắc · 5 Đông Bắc · 6 Đông Nam · 7 Tây Bắc · 8 Tây Nam) - tra từ API chi tiết 16/8
    direction: ({ 1: "Đông", 2: "Tây", 3: "Nam", 4: "Bắc", 5: "Đông Bắc", 6: "Đông Nam", 7: "Tây Bắc", 8: "Tây Nam" })[String(a.direction)] || (typeof a.direction === "string" && !/^\d+$/.test(a.direction) ? a.direction : null),
    // API list chỉ trả MÃ SỐ (property_legal_document), _str hầu như không có -> từng lưu "1"/"6" lên UI (audit 16/8).
    // Nhãn tra từ API chi tiết Chợ Tốt: 1 Đã có sổ · 2 Đang chờ sổ · 3 Không có sổ · 4 Sổ chung/vi bằng · 5 Hợp đồng mua bán · 6 Sổ hồng riêng
    legal: a.property_legal_document_str
      || ({ 1: "Đã có sổ", 2: "Đang chờ sổ", 3: "Không có sổ", 4: "Sổ chung / công chứng vi bằng", 5: "Hợp đồng mua bán", 6: "Sổ hồng riêng" })[String(a.property_legal_document)]
      || null,
    listing_type: a.type === "s" ? "ban" : "cho_thue",
    property_type: propType(a.category_name, a.house_type),
    province: a.region_name || city,
    district: a.area_name || null,
    ward: a.ward_name || null,
    lat: a.latitude || null, lng: a.longitude || null,
    amenities: AMEN.filter((x) => x.re.test(text)).map((x) => x.k),
    poster_id: a.account_id ? "ct" + a.account_id : null,
    poster_name: a.account_name || a.full_name || null,
    _company_ad: !!a.company_ad, _shop: !!a.is_shop_verified,
    images: (a.images || []).slice(0, 5),
  };
}

(async () => {
  let all = [];
  for (const r of REGIONS) {
    for (let p = 0; p < (r.pages ?? PAGES); p++) {
      const ads = await fetchPage(r.code, p * LIMIT);
      let mapped = ads.map((a) => mapAd(a, r.city));
      if (r.onlyDaNang) mapped = mapped.filter((x) => /đà nẵng/i.test((x.province || "") + (x.district || "")));
      all = all.concat(mapped);
      console.error(`${r.city} trang ${p + 1}: +${mapped.length}`);
      await sleep(700);
    }
  }
  // dedupe theo id
  const seen = new Set();
  all = all.filter((x) => (seen.has(x.id) ? false : seen.add(x.id)));

  // owner/broker: company_ad / shop = môi giới; tần suất account
  const freq = {};
  all.forEach((x) => { if (x.poster_id) freq[x.poster_id] = (freq[x.poster_id] || 0) + 1; });
  all.forEach((x) => {
    const c = x.poster_id ? freq[x.poster_id] : 1;
    x.poster_listing_count = c;
    // Lý do (hiện cho người dùng, không gọi là "AI"): tài khoản đăng N tin / nguồn ghi nhận môi giới / tự xưng chính chủ
    const reasons = [];
    if (x._company_ad || x._shop) reasons.push("nguon_ghi_nhan_moi_gioi");
    if (c >= 3) reasons.push(`tai_khoan_dang_${c}_tin`);
    if (/chính chủ|chinh chu/i.test(x.title + " " + x.description)) reasons.push("tu_xung_chinh_chu");
    x.poster_reasons = reasons;
    x.poster_role = x._company_ad || x._shop || c >= 3 ? "moi_gioi"
      : /chính chủ|chinh chu/i.test(x.title + " " + x.description) ? "chu_nha"
      : c === 1 ? "chu_nha" : "khong_ro";
    // ai_score: chấm theo tín hiệu thật để giãn điểm (đầy đủ thông tin + nhiều ảnh + chính chủ = cao)
    let s = 48;
    if (x.price_vnd) s += 6;
    if (x.area_m2) s += 5;
    if (x.bedrooms) s += 3;
    if (x.bathrooms) s += 2;
    if (x.legal) s += 6;
    if (x.lat) s += 4;
    s += Math.min(12, (x.images?.length || 0) * 3);           // ảnh: tín hiệu mạnh (0 ảnh=0, 4+ ảnh=+12)
    const dlen = (x.description || "").length;
    s += dlen > 500 ? 8 : dlen > 200 ? 4 : 0;
    if (x.poster_role === "chu_nha") s += 5;
    else if (x.poster_role === "moi_gioi") s -= 3;
    if (/gấp|giá rẻ|giá sốc|sốc|lh ngay|call ngay|0đ|siêu rẻ/i.test(x.title || "")) s -= 5; // dấu hiệu câu view/spam
    x.ai_score = Math.max(35, Math.min(98, Math.round(s)));
    delete x._company_ad; delete x._shop;
  });

  const summary = {
    crawled_at: new Date().toISOString().slice(0, 10), source: "chotot.com (gateway API)",
    total: all.length, ban: all.filter((x) => x.listing_type === "ban").length,
    cho_thue: all.filter((x) => x.listing_type === "cho_thue").length,
    with_geo: all.filter((x) => x.lat).length, with_ward: all.filter((x) => x.ward).length,
    brokers: all.filter((x) => x.poster_role === "moi_gioi").length,
    by_city: all.reduce((a, x) => ((a[x.province] = (a[x.province] || 0) + 1), a), {}),
  };
  if (!all.length) { console.error("chotot: 0 tin (API chặn/đổi?) -> giữ chotot.json cũ"); return; } // audit 16/8: không ghi đè bằng 0
  fs.writeFileSync(new URL("./chotot.json", import.meta.url), JSON.stringify({ summary, listings: all }, null, 0));
  console.error("DONE", JSON.stringify(summary));
})();

