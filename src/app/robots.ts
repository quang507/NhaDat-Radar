import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nhadatradar.com";

// 1/10: Supabase gói Free vượt log 12/1 GB + egress 10/5 GB. Mỗi trang tin bot tải mà chưa có cache = ~8-10
// lượt gọi DB, sitemap có ~10.000 trang tin. Chặn các bot SEO/AI/cào dữ liệu không mang khách về
// (vẫn giữ Googlebot, Bingbot, Cốc Cốc coccocbot, Zalo/Facebook preview). Bot tử tế tôn trọng robots.txt;
// bot không tôn trọng thì phải chặn ở tầng Vercel Firewall.
const BOT_CHAN = [
  "AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "BLEXBot", "DataForSeoBot", "PetalBot", "Barkrowler", "serpstatbot",
  "MegaIndex", "SeekportBot", "Amazonbot", "Bytespider", "GPTBot", "ClaudeBot",
  "anthropic-ai", "Claude-Web", "CCBot", "Diffbot", "ImagesiftBot", "Omgilibot", "YouBot", "Timpibot",
];
// KHÔNG chặn OAI-SearchBot / ChatGPT-User / PerplexityBot: bot TÌM KIẾM AI - dẫn khách về khi người ta hỏi
// ChatGPT/Perplexity "phòng trọ Gò Vấp". Chỉ chặn bot gom dữ liệu huấn luyện (GPTBot, ClaudeBot, CCBot...) + bot SEO.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: BOT_CHAN, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/account", "/tin-nhan", "/api/"] },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
