import { parseList } from "../crawler/mogi-projects.mjs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const provinces = [
  { slug: "ho-chi-minh", name: "Hồ Chí Minh" },
  { slug: "ba-ria-vung-tau", name: "Bà Rịa - Vũng Tàu" },
  { slug: "binh-duong", name: "Bình Dương" },
  { slug: "dong-nai", name: "Đồng Nai" },
  { slug: "long-an", name: "Long An" },
  { slug: "tay-ninh", name: "Tây Ninh" },
];

async function main() {
  for (const p of provinces) {
    const res = await fetch(`https://mogi.vn/du-an?tinh-thanh=${p.slug}`, { headers: { "User-Agent": UA } });
    const text = await res.text();
    const list = parseList(text);
    // Find pagination numbers
    const pageMatches = [...text.matchAll(/class="page-link"[^>]*>(\d+)<\/a>/g)].map(m => Number(m[1]));
    const maxPage = pageMatches.length ? Math.max(...pageMatches) : 1;
    console.log(`${p.name.padEnd(20)}: Page 1 has ${list.length} projects, Total pages detected: ${maxPage}`);
    if (list[0]) {
      console.log(`   Sample project: ${list[0].name} | ${list[0].addrLine} | ${list[0].priceText}`);
    }
  }
}

main().catch(console.error);
