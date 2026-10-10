import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NhaDat Radar - Sàn BĐS & Phòng Trọ Giá Thật",
    short_name: "Radar Nhà Đất",
    description: "Tổng hợp tin nhà đất bán và cho thuê, phòng trọ giá thật theo khu vực trên toàn quốc",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#16233a",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
