import { parseList, parseDetail, parseAddrLine } from "../crawler/mogi-projects.mjs";
import { canonProvince } from "../crawler/chung.mjs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function main() {
  const allProjects = [];
  const targetProvinces = new Set([
    "Hồ Chí Minh", "Bình Dương", "Đồng Nai", "Bà Rịa - Vũng Tàu", "Long An", "Tây Ninh"
  ]);

  for (let p = 1; p <= 15; p++) {
    const url = `https://mogi.vn/du-an?cp=${p}`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status !== 200) { console.error(`Page ${p} status ${res.status}`); continue; }
    const text = await res.text();
    const list = parseList(text);
    console.log(`Page ${p}: found ${list.length} projects`);
    for (const item of list) {
      const kv = parseAddrLine(item.addrLine);
      allProjects.push({ ...item, kv });
    }
  }

  console.log(`Total scanned: ${allProjects.length}`);
  const provMap = {};
  for (const p of allProjects) {
    const prov = p.kv.province || "Unknown";
    provMap[prov] = (provMap[prov] || 0) + 1;
  }
  console.log("Provinces breakdown:", provMap);
}

main().catch(console.error);
