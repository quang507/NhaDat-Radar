/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // ảnh crawl thường hotlink từ CDN khác — nới remote patterns khi bật ảnh thật
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};
export default nextConfig;
