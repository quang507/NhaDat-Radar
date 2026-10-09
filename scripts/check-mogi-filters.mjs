const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function main() {
  const res = await fetch("https://mogi.vn/du-an", { headers: { "User-Agent": UA } });
  const text = await res.text();
  // Find select inputs or dropdowns
  const selects = [...text.matchAll(/<select[^>]*>([\s\S]*?)<\/select>/gi)];
  console.log("Total select elements:", selects.length);
  for (const s of selects) {
    const name = (s[0].match(/name="([^"]*)"/) || [])[1];
    const id = (s[0].match(/id="([^"]*)"/) || [])[1];
    console.log(`Select id=${id} name=${name}: options count=${(s[1].match(/<option/g) || []).length}`);
    if (s[1].includes("Bình Dương") || s[1].includes("Hồ Chí Minh")) {
      console.log("  Matched province dropdown! Content sample:", s[1].slice(0, 500));
    }
  }

  // Look for any links with "binh-duong", "dong-nai", "vung-tau"
  const links = [...text.matchAll(/href="([^"]*)"/g)].map(m => m[1]);
  const provLinks = links.filter(l => /binh-duong|dong-nai|vung-tau|long-an|tay-ninh/i.test(l));
  console.log("Province links in page:", [...new Set(provLinks)]);
}

main().catch(console.error);
