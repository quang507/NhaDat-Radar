import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nhadatradar.com";

// 3/10 (egress Supabase gói Free): bot SEO/AI quét hết ~22.000 trang tin mà không đem khách về.
// Chặn hẳn bot SEO-tool + bot lấy dữ liệu huấn luyện AI. Máy tìm kiếm (Google, Bing, Cốc Cốc) và bot tìm
// kiếm AI có dẫn link về (OAI-SearchBot, Claude-SearchBot, PerplexityBot) vẫn theo luật chung "*".
const BOT_CHAN = [
  "AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "PetalBot", "Bytespider", "BLEXBot", "DataForSeoBot",
  "SeznamBot", "YandexBot", "Barkrowler", "serpstatbot", "Amazonbot", "GPTBot", "CCBot", "ClaudeBot",
  "anthropic-ai", "meta-externalagent", "ImagesiftBot", "Timpibot",
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
