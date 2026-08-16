// Slug khu vực cho trang SEO /nha-dat-ban/[tinh]/[quan] (kiểu batdongsan /nha-dat-ban-tp-hcm, homigo /ho-chi-minh/quan-7).
// Không hardcode danh sách: slug sinh từ tên thật trong DB, và resolve ngược bằng cách so slug với tên đang có.

export function slugify(s: string): string {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function areaPath(deal: "ban" | "cho_thue", province: string, district?: string | null): string {
  const base = deal === "cho_thue" ? "/nha-dat-cho-thue" : "/nha-dat-ban";
  return `${base}/${slugify(province)}${district ? "/" + slugify(district) : ""}`;
}

export const DEAL_WORD: Record<"ban" | "cho_thue", string> = { ban: "Mua bán", cho_thue: "Cho thuê" };
