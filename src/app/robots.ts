import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/ld";

const SITE = SITE_URL;

// 3/10 (egress Supabase gói Free) & 14/11 (Hướng B: bot chỉ vào trang đích):
// Bot SEO/AI cào hàng chục nghìn trang tin mà không đem khách về. Chặn hẳn bot SEO-tool, bot huấn luyện AI
// và meta-webindexer. Trang tin (/listings/) và các trang động (/search, /thong-ke...) cấm mọi bot qua Disallow.
const BOT_CHAN = [
  "AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "PetalBot", "Bytespider", "BLEXBot", "DataForSeoBot",
  "SeznamBot", "YandexBot", "Barkrowler", "serpstatbot", "Amazonbot", "GPTBot", "CCBot", "ClaudeBot",
  "anthropic-ai", "meta-externalagent", "meta-webindexer", "ImagesiftBot", "Timpibot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/admin",
          "/account",
          "/tin-nhan",
          "/api/",
          "/listings/",
          "/search",
          "/thong-ke",
          "/auth",
          "/yeu-thich",
          "/agents",
          "/rh/",
          "/nha-dat-ban?",
          "/nha-dat-cho-thue?",
        ],
      },
      { userAgent: BOT_CHAN, disallow: "/" },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
