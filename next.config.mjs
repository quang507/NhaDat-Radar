// 2/11 (audit S11): CSP chạy REPORT-ONLY trước (chỉ báo vi phạm ở console, không chặn), theo dõi ~1 tuần rồi mới
// đổi key sang "Content-Security-Policy". Danh sách host lấy từ code: GA4 (GoogleAnalytics.tsx), Clarity (Clarity.tsx),
// AdSense (GoogleAdSense.tsx), Turnstile (Turnstile.tsx), Supabase (REST + realtime wss), bản đồ (lib/map-layers.ts:
// openfreemap + Esri). Ảnh tin hotlink từ nhiều CDN nguồn -> img-src mở https:. Script inline của Next/GA -> 'unsafe-inline'.
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://nalcvzwsescsxfzsxirg.supabase.co";
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  // đăng nhập Google: server action redirect sang Supabase Auth rồi Google - Chrome áp form-action cả cho redirect
  `form-action 'self' ${SUPABASE} https://accounts.google.com`,
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.clarity.ms https://*.clarity.ms https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.adtrafficquality.google https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // video rổ hàng phát thẳng từ máy chủ đối tác (5/11, crawler/che-media.mjs)
  "media-src 'self' blob: https:",
  `connect-src 'self' ${SUPABASE} ${SUPABASE.replace(/^https:/, "wss:")} https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.clarity.ms https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.adtrafficquality.google https://challenges.cloudflare.com https://tiles.openfreemap.org https://server.arcgisonline.com`,
  "frame-src https://challenges.cloudflare.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.googlesyndication.com https://www.google.com https://*.adtrafficquality.google",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // 22/9: bỏ remotePatterns "**" — web không dùng next/image (ảnh hotlink bằng <img>), mà pattern mở
  // khiến /_next/image thành proxy ảnh công cộng cho MỌI domain (ai cũng dùng được, Vercel tính phí).
  // Khi nào dùng next/image thì liệt kê đúng từng hostname cần thiết.

  // Audit 25/10: trang chủ thành Static (bỏ searchParams để giữ cache CDN) -> link lọc cũ "/?deal=...&q=..."
  // (Google đã index, link chia sẻ cũ) mà không chuyển thì khách thấy trang chủ trơn, mất bộ lọc.
  // Đẩy sang /search (giữ nguyên query string) - redirect chạy ở edge, không đụng cache của "/".
  async redirects() {
    return [
      ...["deal", "kind", "province", "bedrooms", "priceMax", "q"].map((key) => ({
        source: "/",
        has: [{ type: "query", key }],
        destination: "/search",
        permanent: true,
      })),
      // Chuẩn hoá slug tỉnh (Audit 4/11): hợp nhất các biến thể tp-hcm và tp-ho-chi-minh về ho-chi-minh
      { source: "/nha-dat-cho-thue/tp-hcm/:path*", destination: "/nha-dat-cho-thue/ho-chi-minh/:path*", permanent: true },
      { source: "/nha-dat-cho-thue/tp-ho-chi-minh/:path*", destination: "/nha-dat-cho-thue/ho-chi-minh/:path*", permanent: true },
      { source: "/nha-dat-ban/tp-hcm/:path*", destination: "/nha-dat-ban/ho-chi-minh/:path*", permanent: true },
      { source: "/nha-dat-ban/tp-ho-chi-minh/:path*", destination: "/nha-dat-ban/ho-chi-minh/:path*", permanent: true },
      // 5/11: ảnh/video rổ hàng không còn đi qua Vercel (vượt Fast Origin Transfer, bị khoá 4/11). URL /m cũ (HTML
      // còn cache, Google Images, link đã share) chuyển hướng ở edge về máy chủ đối tác - redirect không tốn origin
      // transfer. Query (?alt=media&token=..) Next tự giữ nguyên. Tiền tố phải khớp NGUON trong crawler/che-media.mjs.
      { source: "/m/h/:f*", destination: "https://firebasestorage.googleapis.com/v0/b/hifriendz-agent.firebasestorage.app/o/listings%2Fuploads%2F:f*", permanent: true },
      { source: "/m/e/:p*", destination: "https://media.evohome.it.com/:p*", permanent: true },
    ];
  },

  // Header bảo mật cơ bản. CSP mới ở chế độ Report-Only (xem hằng CSP ở đầu file).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Content-Security-Policy-Report-Only", value: CSP },
        ],
      },
      // Service worker (public/sw.js): trình duyệt luôn hỏi lại bản mới - deploy công tắc khẩn có hiệu lực ngay
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
      // Trang tin cấm Google/bot index (Hướng B: bot chỉ vào trang đích)
      { source: "/listings/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
      // Cache sitemap 24h trên CDN Edge: Googlebot cào sitemap tốn 0 byte Egress Supabase
      { source: "/sitemap(.*)", headers: [{ key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" }] },
    ];
  },

  // Sự cố 17/8: `next build` ở MÁY NHÀ treo cứng — tiến trình chỉ tiêu 6.7s CPU trong 15 phút,
  // .next đứng im, phải kill. Nguyên nhân: repo nằm trong thư mục OneDrive đang đồng bộ, mà
  // webpack ghi cache thành 13 file .pack tổng 171MB; OneDrive khoá file khi sync -> build kẹt
  // ở bước đọc/ghi cache. Xoá .next rồi build lại thì chạy hết bình thường (đã kiểm chứng).
  // -> Ở máy (không phải Vercel/CI) thì TẮT cache webpack cho bản build production: mất thêm
  //    chút thời gian biên dịch nhưng không còn 171MB file rác cho OneDrive vật lộn, và không tái
  //    diễn treo. Trên Vercel/CI vẫn giữ cache để build nhanh.
  // (Đã thử cho .next thành junction ra ngoài OneDrive: KHÔNG dùng được — Node resolve theo
  //  đường dẫn thật rồi không tìm thấy node_modules, lỗi "Cannot find module 'react/jsx-runtime'".)
  webpack: (config, { dev }) => {
    if (!dev && !process.env.VERCEL && !process.env.CI) config.cache = false;
    return config;
  },
};
export default nextConfig;
