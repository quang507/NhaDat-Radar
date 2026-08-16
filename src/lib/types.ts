export type Listing = {
  id: string;
  source: "crawl" | "agent" | "zalo_oa" | "zalo_miniapp" | "user";
  source_site: string | null;
  source_url: string | null;
  agent_id: string | null;
  project_id: string | null;
  deal: "ban" | "cho_thue";
  kind: "nha" | "dat" | "can_ho" | "mat_bang" | "phong_tro" | "khac";
  title: string;
  description: string | null;
  price_vnd: number | null;
  area_m2: number | null;
  price_per_m2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floors: number | null;
  direction: string | null;
  legal_status: string | null;
  furnishing: string | null;
  province: string | null;
  district: string | null;
  ward: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  amenities: string[];
  images: string[];
  contact_name: string | null;
  contact_phone: string | null;
  ai_score: number | null;
  trust_score: number | null;
  poster_role_guess: string | null;
  price_flag: PriceFlag | null;
  status: string;
  first_seen_at: string | null;
  crawled_at: string | null;
  created_at: string;
  // vòng đời tin (migration 008)
  posted_at?: string | null;          // đăng trên nguồn lúc
  last_seen_at?: string | null;       // Radar thấy gần nhất
  crawl_count?: number | null;
  source_count?: number | null;       // xuất hiện trên N nguồn
  source_sites?: string[] | null;
  phone_masked?: string | null;       // SĐT đã che 4 số
  poster_listing_count?: number | null;
  poster_reasons?: string[] | null;   // lý do dấu hiệu môi giới/chính chủ
  poster_key?: string | null;         // id tài khoản trên nguồn / hash SĐT (migration 011)
};

export type PriceFlag = {
  reason: "cao_hon" | "thap_hon";
  deviation_pct: number;
  cluster_size: number;
  distinct_posters: number;
  median_vnd?: number;
  basis?: "m2" | "gia";
};

/** Diễn giải mã lý do poster_reasons thành câu cho người dùng */
export function posterReasonText(code: string): string {
  const m = code.match(/^tai_khoan_dang_(\d+)_tin$/);
  if (m) return `Tài khoản người đăng có ${m[1]} tin trong đợt thu thập`;
  if (code === "nguon_ghi_nhan_moi_gioi") return "Nguồn đăng ghi nhận tài khoản môi giới/cửa hàng";
  if (code === "tu_xung_chinh_chu") return "Nội dung tự xưng chính chủ";
  if (code === "tu_xung_moi_gioi") return "Nội dung tự xưng môi giới / nhận ký gửi";
  return code;
}

export type Project = {
  id: string;
  slug: string | null;
  name: string;
  investor: string | null;
  description: string | null;
  province: string | null;
  district: string | null;
  ward: string | null;
  address: string | null;
  amenities: string[];
  images: string[];
  price_min: number | null;
  price_max: number | null;
  status: string;
};

export type Profile = {
  id: string;
  role: "user" | "agent" | "admin";
  full_name: string | null;
  phone: string | null;
  agency_name: string | null;
};
