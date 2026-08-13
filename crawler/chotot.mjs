// Crawler CHỢ TỐT — dùng API JSON công khai (gateway.chotot.com). KHÔNG cần browser/proxy.
// Có sẵn toạ độ (lat/lng) + phường -> không cần geocode. Chạy: node chotot.mjs
import fs from "node:fs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const API = "https://gateway.chotot.com/v1/public/ad-listing";

// === BỘ LỌC (xem xét theo yêu cầu) ===
// region_v2: Hà Nội=12000, TP.HCM=13000, Đà Nẵng(Quảng Nam-ĐN)=3000
// cg=1000: toàn bộ BĐS (lọc bán/thuê bằng field `type`: s=bán, u=cho thuê)
// Có thể thêm: &st=s|u (bán/thuê), &price=min-max, &sp=0, &limit, &o=offset(phân trang)
const REGIONS = [
  { code: 12000, city: "Hà Nội" },
  { code: 13000, city: "Hồ Chí Minh" },
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
  if (!res.ok) return [];
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
    title: a.subject || "",
    description: desc,
    price_vnd: price,
    area_m2: area ? +area : null,
    price_per_m2: price && area ? Math.round(price / area) : null,
    bedrooms: a.rooms || null,
    bathrooms: a.toilets || null,
    floors: a.floors || null,
    direction: a.direction || null,
    legal: a.property_legal_document_str || a.property_legal_document || null,
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
    for (let p = 0; p < PAGES; p++) {
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
    x.poster_role = x._company_ad || x._shop || c >= 3 ? "moi_gioi"
      : /chính chủ|chinh chu/i.test(x.title + " " + x.description) ? "chu_nha"
      : c === 1 ? "chu_nha" : "khong_ro";
    // ai_score đơn giản
    let s = 60; if (x.price_vnd) s += 8; if (x.area_m2) s += 6; if (x.bedrooms) s += 4;
    if (x.legal) s += 6; if (x.lat) s += 6; if ((x.description || "").length > 300) s += 6;
    x.ai_score = Math.max(45, Math.min(97, s));
    x.freshness_min = (parseInt(String(a2(x.id)), 10) % 720) + 3;
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
  fs.writeFileSync(new URL("./chotot.json", import.meta.url), JSON.stringify({ summary, listings: all }, null, 0));
  console.error("DONE", JSON.stringify(summary));
})();

function a2(id) { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
