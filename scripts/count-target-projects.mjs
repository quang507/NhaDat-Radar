import { parseList } from "../crawler/mogi-projects.mjs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const TARGET_CITIES = [
  { cityId: 30, name: "Hồ Chí Minh" },
  { cityId: 2, name: "Bà Rịa - Vũng Tàu" },
  { cityId: 9, name: "Bình Dương" },
  { cityId: 19, name: "Đồng Nai" },
  { cityId: 40, name: "Long An" },
  { cityId: 54, name: "Tây Ninh" },
];

async function main() {
  for (const c of TARGET_CITIES) {
    let page = 1;
    let total = 0;
    while (page <= 20) {
      const url = `https://mogi.vn/du-an?cityId=${c.cityId}&cp=${page}`;
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      const text = await res.text();
      const list = parseList(text);
      if (!list.length) break;
      total += list.length;
      page++;
      await new Promise(r => setTimeout(r, 200));
    }
    console.log(`${c.name.padEnd(20)}: ${total} projects across ${page - 1} pages`);
  }
}

main().catch(console.error);
