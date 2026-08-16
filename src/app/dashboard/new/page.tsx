import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListingForm from "./ListingForm";

export default async function NewListingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?message=" + encodeURIComponent("Đăng nhập để đăng tin"));

  // Gợi ý tỉnh/quận từ dữ liệu thật để tên nhập khớp DB (lọt bộ lọc + trang khu vực)
  const { data: rows } = await supabase.from("listings").select("province,district").eq("status", "published").limit(5000);
  const geo: Record<string, string[]> = {};
  for (const r of rows ?? []) {
    const p = (r.province || "").trim(); if (!p) continue;
    geo[p] ??= [];
    const d = (r.district || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
    if (d && !geo[p].includes(d)) geo[p].push(d);
  }
  for (const p of Object.keys(geo)) geo[p].sort();

  return (
    <div>
      <h1 className="prata text-2xl mb-4">Đăng tin mới</h1>
      <p className="text-sm text-[var(--ink-soft)] mb-4 max-w-2xl">Tin đăng lên ngay, miễn phí, gắn nhãn “Tự đăng”. Điền đủ ảnh + pháp lý + mô tả để điểm tin cao và được ưu tiên hiển thị.</p>
      <ListingForm geo={geo} />
    </div>
  );
}
