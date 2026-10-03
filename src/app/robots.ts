import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nhadatradar.com";

// 3/10 (egress Supabase gói Free): bot SEO/AI quét hết ~22.000 trang tin mà không đem khách về.
// Chặn hẳn; Google/Bing/Cốc Cốc vẫn theo luật chung "*".
const BOT_CHAN = [
  "AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "PetalBot", "Bytespider", "BLEXBot", "DataForSeoBot",
  "SeznamBot", "YandexBot", "Barkrowler", "serpstatbot", "Amazonbot", "GPTBot", "CCBot", "ClaudeBot",
  "anthropic-ai", "PerplexityBot", "meta-externalagent", "ImagesiftBot", "Timpibot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/account", "/tin-nhan", "/api/"] },
      { userAgent: BOT_CHAN, disallow: "/" },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
