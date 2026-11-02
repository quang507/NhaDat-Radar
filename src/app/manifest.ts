import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NhaDat Radar - Sàn BĐS & Phòng Trọ Giá Thật",
    short_name: "Radar Nhà Đất",
    description: "Tổng hợp tin nhà đất bán và cho thuê, phòng trọ giá thật theo khu vực trên toàn quốc",
    // 2/11 (audit M5): id/scope/lang cho TWA (Bubblewrap) và Play
    id: "/",
    start_url: "/",
    scope: "/",
    lang: "vi",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // maskable: logo thu vào vùng an toàn 80% giữa, nền brand kín (xuất từ icon.svg bằng sharp, 2/11)
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
