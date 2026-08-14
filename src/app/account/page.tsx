export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ImageUpload from "@/components/ImageUpload";
import { updateProfile } from "./actions";

export const metadata = { title: "Tài khoản của tôi - NhaDat Radar" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?message=" + encodeURIComponent("Đăng nhập để xem tài khoản"));
  const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="prata text-2xl">Tài khoản của tôi</h1>
          <p className="text-[var(--ink-soft)] text-sm">👤 {user.email}</p>
        </div>
        <Link href="/dashboard" className="btn">Kênh người bán →</Link>
      </div>

      {sp.error && <p className="text-sm text-red-600 mb-3">{sp.error}</p>}
      {sp.message && <p className="text-sm text-emerald-600 mb-3">{sp.message}</p>}

      <form action={updateProfile} className="card rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <span className="lbl">Ảnh đại diện</span>
          <ImageUpload name="avatar" max={1} initial={p?.avatar_url ? [p.avatar_url] : []} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="lbl">Họ và tên</span>
            <input className="inp" name="full_name" defaultValue={p?.full_name || ""} placeholder="Nguyễn Văn A" />
          </label>
          <label className="block">
            <span className="lbl">Số điện thoại</span>
            <input className="inp" name="phone" defaultValue={p?.phone || ""} placeholder="09xxxxxxxx" />
          </label>
        </div>

        <div className="rounded-xl border border-brand/30 bg-brand/5 p-4">
          <h2 className="font-bold text-sm mb-1">🧑‍💼 Hồ sơ người bán</h2>
          <p className="text-xs text-[var(--ink-soft)] mb-3">
            Điền phần này để xuất hiện trên trang <Link href="/agents" className="text-brand font-semibold">Người bán chuyên nghiệp</Link> — khách mua sẽ tìm thấy bạn.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="lbl">Tên công ty / cá nhân môi giới</span>
              <input className="inp" name="agency_name" defaultValue={p?.agency_name || ""} placeholder="VD: BĐS An Phát" />
            </label>
            <label className="block">
              <span className="lbl">Số năm kinh nghiệm</span>
              <input className="inp" name="years_experience" type="number" min={0} max={60} defaultValue={p?.years_experience || 0} />
            </label>
          </div>
          <label className="block mt-3">
            <span className="lbl">Chuyên môn (phân cách bằng dấu phẩy)</span>
            <input className="inp" name="specialties" defaultValue={(p?.specialties || []).join(", ")} placeholder="Nhà phố, Căn hộ, Cho thuê" />
          </label>
          <label className="block mt-3">
            <span className="lbl">Giới thiệu bản thân</span>
            <textarea className="inp" name="bio" rows={3} defaultValue={p?.bio || ""} placeholder="Kinh nghiệm, khu vực hoạt động..." />
          </label>
        </div>

        <button className="btn btn-primary" type="submit">Lưu hồ sơ</button>
      </form>
    </div>
  );
}
