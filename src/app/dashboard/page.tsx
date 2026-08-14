export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListingCard from "@/components/ListingCard";
import type { Listing } from "@/lib/types";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?message=" + encodeURIComponent("Đăng nhập để vào trang người bán"));

  const [{ data }, { data: appts }] = await Promise.all([
    supabase.from("listings").select("*").eq("agent_id", user.id).order("created_at", { ascending: false }),
    supabase.from("appointments").select("*")
      .or(`agent_id.eq.${user.id},buyer_id.eq.${user.id}`)
      .order("slot", { ascending: true }).limit(30),
  ]);
  const mine = (data ?? []) as Listing[];
  type Appt = { id: string; listing_id: string; buyer_id: string; agent_id: string; slot: string; status: string; note: string | null };
  const appointments = (appts ?? []) as Appt[];
  const apptListingIds = [...new Set(appointments.map((a) => a.listing_id))];
  const { data: apptListings } = apptListingIds.length
    ? await supabase.from("listings").select("id,title").in("id", apptListingIds)
    : { data: [] as { id: string; title: string }[] };
  const titleMap = new Map((apptListings ?? []).map((l) => [l.id, l.title]));
  const STATUS: Record<string, string> = { requested: "🕐 Chờ xác nhận", confirmed: "✅ Đã xác nhận", cancelled: "✖ Đã hủy" };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="prata text-2xl">Kênh người bán</h1>
          <p className="text-[var(--ink-soft)] text-sm">👤 {user.email}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/tin-nhan" className="btn">💬 Tin nhắn</Link>
          <Link href="/account" className="btn">Hồ sơ</Link>
          <Link href="/dashboard/new" className="btn btn-primary">+ Đăng tin mới</Link>
        </div>
      </div>

      {appointments.length > 0 && (
        <div className="card rounded-2xl p-5 mb-6">
          <h2 className="font-bold mb-3">📅 Lịch hẹn xem nhà ({appointments.length})</h2>
          <div className="space-y-2 text-sm">
            {appointments.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 border-b border-[var(--line)] last:border-0">
                <span className="font-semibold">{new Date(a.slot).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</span>
                <Link href={`/listings/${a.listing_id}`} className="text-brand truncate max-w-[280px]">{titleMap.get(a.listing_id) || "Tin đã gỡ"}</Link>
                <span className="text-xs text-[var(--ink-soft)]">{a.agent_id === user.id ? "· khách đặt xem tin của bạn" : "· bạn đặt xem"}</span>
                <span className="ml-auto text-xs font-bold">{STATUS[a.status] || a.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-bold mb-3">Tin của tôi ({mine.length})</h2>
      {mine.length ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
          {mine.map((x) => (
            <ListingCard key={x.id} x={x} />
          ))}
        </div>
      ) : (
        <p className="text-[var(--ink-soft)] py-8">
          Bạn chưa đăng tin nào.{" "}
          <Link href="/dashboard/new" className="text-brand font-semibold">Đăng tin đầu tiên →</Link>
        </p>
      )}
    </div>
  );
}
