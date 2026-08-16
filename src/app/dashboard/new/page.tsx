import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListingForm from "./ListingForm";
import { getAreas } from "@/lib/geo";

export default async function NewListingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?message=" + encodeURIComponent("Đăng nhập để đăng tin"));

  // Gợi ý tỉnh/quận từ dữ liệu thật để tên nhập khớp DB (lọt bộ lọc + trang khu vực)
  // Cây khu vực cache 10' (lib/geo) — audit 16/8: bản cũ select 5.000 dòng mỗi lần mở form
  const areas = await getAreas();
  const geo: Record<string, string[]> = Object.fromEntries(Object.entries(areas.geo).map(([p, ds]) => [p, Object.keys(ds).sort()]));

  return (
    <div>
      <h1 className="prata text-2xl mb-4">Đăng tin mới</h1>
      <p className="text-sm text-[var(--ink-soft)] mb-4 max-w-2xl">Tin đăng lên ngay, miễn phí, gắn nhãn “Tự đăng”. Điền đủ ảnh + pháp lý + mô tả để điểm tin cao và được ưu tiên hiển thị.</p>
      <ListingForm geo={geo} />
    </div>
  );
}
