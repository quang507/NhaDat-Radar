// Slug khu vực cho trang SEO /nha-dat-ban/[tinh]/[quan] (kiểu batdongsan /nha-dat-ban-tp-hcm, homigo /ho-chi-minh/quan-7).
// Không hardcode danh sách: slug sinh từ tên thật trong DB, và resolve ngược bằng cách so slug với tên đang có.

/** Bỏ dấu tiếng Việt + đ/Đ, về chữ thường: "Quận Gò Vấp" -> "quan go vap" (dùng ở slug + autosuggest PlaceSuggest) */
export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

export function slugify(s: string): string {
  return stripAccents(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Loại BĐS <-> slug cho trang khu vực theo loại (/nha-dat-ban/ho-chi-minh/quan-7/can-ho).
// Trang tin sống ~3 tuần rồi bị xoá nên không phải tài sản SEO; trang khu vực thì URL ổn định
// vĩnh viễn -> nhân thêm chiều "loại BĐS" là cách rẻ nhất để có thêm trang xếp hạng được (23/9).
export const KIND_SLUG: Record<string, string> = {
  nha: "nha", can_ho: "can-ho", dat: "dat", mat_bang: "mat-bang", phong_tro: "phong-tro",
};
export const SLUG_KIND: Record<string, string> = Object.fromEntries(Object.entries(KIND_SLUG).map(([k, v]) => [v, k]));
/** slug (can-ho) -> kind (can_ho); không phải loại hợp lệ thì null */
export const kindFromSlug = (s?: string | null): string | null => (s && SLUG_KIND[s]) || null;

export function areaPath(deal: "ban" | "cho_thue", province: string, district?: string | null, kind?: string | null): string {
  const base = deal === "cho_thue" ? "/nha-dat-cho-thue" : "/nha-dat-ban";
  const k = kind && KIND_SLUG[kind] ? "/" + KIND_SLUG[kind] : "";
  return `${base}/${slugify(province)}${district ? "/" + slugify(district) : ""}${k}`;
}

export const DEAL_WORD: Record<"ban" | "cho_thue", string> = { ban: "Mua bán", cho_thue: "Cho thuê" };
