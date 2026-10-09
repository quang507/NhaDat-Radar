import { parseList, parseDetail, parseAddrLine } from "../crawler/mogi-projects.mjs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function main() {
  const listRes = await fetch("https://mogi.vn/du-an?cityId=30&cp=1", { headers: { "User-Agent": UA } });
  const listText = await listRes.text();
  const list = parseList(listText);
  console.log("First project in list:", list[0]);

  const detailRes = await fetch("https://mogi.vn" + list[0].href, { headers: { "User-Agent": UA } });
  const detailText = await detailRes.text();
  const detail = parseDetail(detailText, list[0].href);
  console.log("Detail parsed:", {
    name: detail.name,
    investor: detail.investor,
    province: detail.province,
    district: detail.district,
    address: detail.address,
    specs: detail.specs,
    imagesCount: detail.images.length,
    descSample: detail.description?.slice(0, 150)
  });
}

main().catch(console.error);
