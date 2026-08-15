// Nhánh riêng "Nhà đất bán" (kiểu batdongsan.com.vn/nha-dat-cho-thue):
// dùng chung engine /search nhưng khoá deal=cho_thue + metadata riêng.
import SearchPage from "../search/page";

export const metadata = { title: "Cho thuê nhà đất toàn quốc - NhaDat Radar" };
export const dynamic = "force-dynamic";

export default function NhaDatChoThue({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return SearchPage({ searchParams: searchParams.then((sp) => ({ ...sp, deal: "cho_thue" })) });
}
