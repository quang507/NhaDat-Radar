import { parseList, parseDetail, parseAddrLine } from "../crawler/mogi-projects.mjs";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const envLocal = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
const getEnv = (k) => process.env[k] || (envLocal.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim();

const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Thiếu SUPABASE credentials");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const TARGETS = [
  { cityId: 30, provinceName: "Hồ Chí Minh", maxProjects: 15 },
  { cityId: 2, provinceName: "Bà Rịa - Vũng Tàu", maxProjects: 10 },
  { cityId: 9, provinceName: "Bình Dương", maxProjects: 10 },
  { cityId: 19, provinceName: "Đồng Nai", maxProjects: 10 },
  { cityId: 40, provinceName: "Long An", maxProjects: 10 },
  { cityId: 54, provinceName: "Tây Ninh", maxProjects: 10 },
];

function parsePrice(s) {
  if (!s) return null;
  const t = s.toLowerCase();
  if (/thỏa thuận|thoả thuận|liên hệ|đang cập nhật/.test(t)) return null;
  const toNum = (v) => parseFloat(/^\d{1,3}(\.\d{3})+$/.test(v) ? v.replace(/\./g, "") : v.replace(",", "."));
  let vnd = 0;
  const ty = t.match(/([\d.,]+)\s*tỷ/); if (ty) vnd += toNum(ty[1]) * 1e9;
  const tr = t.match(/([\d.,]+)\s*triệu(?!\/)/); if (tr) vnd += toNum(tr[1]) * 1e6;
  return Math.round(vnd) || null;
}

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "vi-VN,vi;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      signal: ctrl.signal
    });
    if (res.status !== 200) return null;
    return await res.text();
  } catch (e) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function run() {
  console.log("=== BẮT ĐẦU CÀO DỰ ÁN MOGI (HCM, VŨNG TÀU, BÌNH DƯƠNG, ĐỒNG NAI, LONG AN, TÂY NINH) ===");

  const allInserted = [];

  for (const t of TARGETS) {
    console.log(`\n--- Đang quét: ${t.provinceName} (cityId=${t.cityId}) ---`);
    const listUrl = `https://mogi.vn/du-an?cityId=${t.cityId}&cp=1`;
    const listHtml = await fetchHtml(listUrl);
    if (!listHtml) {
      console.error(`Không tải được trang danh sách: ${listUrl}`);
      continue;
    }

    const items = parseList(listHtml).slice(0, t.maxProjects);
    console.log(`Tìm thấy ${items.length} dự án hàng đầu tại ${t.provinceName}. Đang lấy chi tiết...`);

    for (const [idx, item] of items.entries()) {
      const detailUrl = "https://mogi.vn" + item.href;
      await sleep(1200);

      const detailHtml = await fetchHtml(detailUrl);
      const d = detailHtml ? parseDetail(detailHtml, item.href) : {};
      const kv = parseAddrLine(item.addrLine);

      const name = item.name || d.name || "Dự án BĐS";
      const slug = item.href.replace(/^\//, "");
      const investor = d.investor || item.investor || null;
      const description = d.description || `Dự án ${name} tọa lạc tại ${t.provinceName}.`;
      const district = d.district || kv.district || null;
      const address = d.address || (district ? `${district}, ${t.provinceName}` : t.provinceName);
      const images = (d.images && d.images.length > 0) ? d.images : (item.thumb ? [item.thumb] : []);
      const priceMin = parsePrice(item.priceText);
      const ppm2 = (item.priceText?.replace(/\bm\s*2\b/g, "m²").match(/\(([^)]*\/m²?)/) || [])[1];
      const handover = (item.addrLine?.match(/Bàn giao:\s*([^|]+)/) || [])[1]?.trim() || null;

      const projectRow = {
        slug,
        name,
        investor,
        description,
        province: t.provinceName,
        district,
        ward: d.ward || null,
        address,
        images,
        price_min: priceMin,
        price_max: null,
        specs: Object.fromEntries(d.specs || []),
        status: "published",
        ...(d.lat != null && d.lng != null ? { geo: `SRID=4326;POINT(${d.lng} ${d.lat})` } : {}),
      };

      // Upsert vào Supabase
      const { data: existing } = await sb.from("projects").select("id").eq("slug", slug).maybeSingle();
      let res;
      if (existing) {
        res = await sb.from("projects").update(projectRow).eq("id", existing.id).select("id");
      } else {
        res = await sb.from("projects").insert(projectRow).select("id");
      }

      if (res.error) {
        console.error(`  [${idx + 1}/${items.length}] Lỗi lưu ${name}:`, res.error.message);
      } else {
        console.log(`  ✓ [${idx + 1}/${items.length}] Đã lưu: ${name} (${t.provinceName} - ${district || ""}) | ${images.length} ảnh | Giá: ${item.priceText || "N/A"}`);
        allInserted.push({ name, province: t.provinceName });
      }
    }
  }

  console.log(`\n=== HOÀN TẤT: Đã cào và lưu thành công ${allInserted.length} dự án vào Database! ===`);
}

run().catch(console.error);
