// import("…/x.css") động (lib/map-layers.ts: CSS maplibre tải cùng JS) cần khai báo module cho TypeScript.
// 3/11: thiếu file này làm deploy 220f071 hỏng ở bước kiểm kiểu trên Vercel; máy local không báo vì tsconfig từng
// quét cả node_modules của FBManager/ remotion-studio/ video/ (có sẵn `declare module "*.css"`).
declare module "*.css";
