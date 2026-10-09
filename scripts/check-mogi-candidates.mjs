const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const candidates = [
  "https://mogi.vn/du-an-tai-binh-duong",
  "https://mogi.vn/du-an-binh-duong",
  "https://mogi.vn/binh-duong/du-an-bat-dong-san",
  "https://mogi.vn/du-an-tai-tp-hcm",
  "https://mogi.vn/du-an?cityId=1",
  "https://mogi.vn/du-an?city=binh-duong",
  "https://mogi.vn/du-an?pr=binh-duong",
  "https://mogi.vn/du-an?pr=1",
  "https://mogi.vn/du-an?pr=2",
];

async function main() {
  for (const url of candidates) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    const text = await res.text();
    const title = (text.match(/<title>([^<]+)<\/title>/i) || [])[1] || "";
    console.log(url.padEnd(45), "->", res.status, "|", title.slice(0, 50));
  }
}

main().catch(console.error);
