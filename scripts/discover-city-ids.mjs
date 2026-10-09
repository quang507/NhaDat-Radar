const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function main() {
  const map = {};
  for (let id = 1; id <= 65; id++) {
    try {
      const res = await fetch(`https://mogi.vn/du-an?cityId=${id}`, { headers: { "User-Agent": UA } });
      const text = await res.text();
      const title = (text.match(/<title>([^<]+)<\/title>/i) || [])[1] || "";
      const match = title.match(/Dự Án Bất Động Sản (.*?) Mới Nhất/i);
      if (match) {
        map[id] = match[1].trim();
      }
    } catch {}
  }
  console.log("Found cityId map:", map);
}

main().catch(console.error);
