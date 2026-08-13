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
  contact_phone: string | null;
  ai_score: number | null;
  trust_score: number | null;
  poster_role_guess: string | null;
  price_flag: PriceFlag | null;
  status: string;
  first_seen_at: string | null;
  created_at: string;
};

export type PriceFlag = {
  reason: "cao_hon" | "thap_hon";
  deviation_pct: number;
  cluster_size: number;
  distinct_posters: number;
};

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
