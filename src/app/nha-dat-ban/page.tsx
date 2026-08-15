// Nhánh riêng "Nhà đất bán" (kiểu batdongsan.com.vn/nha-dat-ban):
// dùng chung engine /search nhưng khoá deal=ban + metadata riêng.
import SearchPage from "../search/page";

export const metadata = { title: "Mua bán nhà đất toàn quốc - NhaDat Radar" };
export const dynamic = "force-dynamic";

export default function NhaDatBan({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return SearchPage({ searchParams: searchParams.then((sp) => ({ ...sp, deal: "ban" })) });
}
