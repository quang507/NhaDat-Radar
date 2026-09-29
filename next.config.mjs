/** @type {import('next').NextConfig} */
const nextConfig = {
  // 22/9: bỏ remotePatterns "**" — web không dùng next/image (ảnh hotlink bằng <img>), mà pattern mở
  // khiến /_next/image thành proxy ảnh công cộng cho MỌI domain (ai cũng dùng được, Vercel tính phí).
  // Khi nào dùng next/image thì liệt kê đúng từng hostname cần thiết.

  // Header bảo mật cơ bản. CHƯA đặt CSP: trang nạp Clarity, Turnstile, tile Esri/OSM/Mapbox và ảnh
  // hotlink từ nhiều CDN -> CSP phải liệt kê kỹ + thử trên preview trước.
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
        ],
      },
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
