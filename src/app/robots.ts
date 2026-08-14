import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nha-dat-radar-rkyn.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/account", "/tin-nhan", "/api/"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
