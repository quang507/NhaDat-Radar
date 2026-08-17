export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListingCard from "@/components/ListingCard";
import { setAppointmentStatus } from "./actions";
import type { Listing } from "@/lib/types";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?message=" + encodeURIComponent("Đăng nhập để vào trang người bán"));

  const [{ data }, { data: appts }, { data: leadRows }] = await Promise.all([
    supabase.from("listings").select("*").eq("agent_id", user.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("appointments").select("*")
      .or(`agent_id.eq.${user.id},buyer_id.eq.${user.id}`)
      .order("slot", { ascending: true }).limit(30),
    // RLS chỉ trả lead của tin do chính user sở hữu
    supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(30),
  ]);
  type Lead = { id: string; listing_id: string | null; name: string; phone: string; message: string | null; created_at: string };
  const leads = (leadRows ?? []) as Lead[];
  const mine = (data ?? []) as Listing[];
  type Appt = { id: string; listing_id: string; buyer_id: string; agent_id: string; slot: string; status: string; note: string | null };
  const appointments = (appts ?? []) as Appt[];
  const apptListingIds = [...new Set(appointments.map((a) => a.listing_id))];
  const { data: apptListings } = apptListingIds.length
    ? await supabase.from("listings").select("id,title").in("id", apptListingIds)
    : { data: [] as { id: string; title: string }[] };
  const titleMap = new Map((apptListings ?? []).map((l) => [l.id, l.title]));
  const STATUS: Record<string, string> = { requested: "Chờ xác nhận", confirmed: "Đã xác nhận", cancelled: "Đã hủy" };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="prata text-2xl">Kênh người bán</h1>
          <p className="text-[var(--ink-soft)] text-sm">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/tin-nhan" className="btn">Tin nhắn</Link>
          <Link href="/account" className="btn">Hồ sơ</Link>
          <Link href="/dashboard/new" className="btn btn-primary">+ Đăng tin mới</Link>
        </div>
      </div>

      {appointments.length > 0 && (
        <div className="card rounded-lg p-5 mb-6">
          <h2 className="font-bold mb-3">Lịch hẹn xem nhà ({appointments.length})</h2>
          <div className="space-y-2 text-sm">
            {appointments.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 border-b border-[var(--line)] last:border-0">
                <span className="font-semibold">{new Date(a.slot).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</span>
                <Link href={`/listings/${a.listing_id}`} className="text-brand truncate max-w-[280px]">{titleMap.get(a.listing_id) || "Tin đã gỡ"}</Link>
                <span className="text-xs text-[var(--ink-soft)]">{a.agent_id === user.id ? "· khách đặt xem tin của bạn" : "· bạn đặt xem"}</span>
                {a.note && <span className="text-xs text-[var(--ink-soft)] italic truncate max-w-[220px]">“{a.note}”</span>}
                <span className="text-xs font-bold">{STATUS[a.status] || a.status}</span>
                <span className="ml-auto flex gap-1.5">
                  {/* Người bán: xác nhận / từ chối khi còn chờ; hủy khi đã xác nhận */}
                  {a.agent_id === user.id && a.status === "requested" && (
                    <>
                      <form action={setAppointmentStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="confirmed" />
                        <button className="btn !px-2.5 !py-1 text-xs !text-emerald-600">Xác nhận</button></form>
                      <form action={setAppointmentStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="cancelled" />
                        <button className="btn !px-2.5 !py-1 text-xs !text-red-600">Từ chối</button></form>
                    </>
                  )}
                  {a.status === "confirmed" && (
                    <form action={setAppointmentStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="cancelled" />
                      <button className="btn !px-2.5 !py-1 text-xs !text-red-600">Hủy</button></form>
                  )}
                  {/* Khách: hủy lịch mình đặt khi còn chờ */}
                  {a.buyer_id === user.id && a.status === "requested" && (
                    <form action={setAppointmentStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="cancelled" />
                      <button className="btn !px-2.5 !py-1 text-xs !text-red-600">Hủy</button></form>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {leads.length > 0 && (
        <div className="card rounded-lg p-5 mb-6">
          <h2 className="font-bold mb-3">Liên hệ từ khách ({leads.length})</h2>
          <div className="space-y-2 text-sm">
            {leads.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 border-b border-[var(--line)] last:border-0">
                <span className="font-semibold">{l.name}</span>
                <a href={`tel:${l.phone}`} className="text-brand font-mono">{l.phone}</a>
                {l.message && <span className="text-[var(--ink-soft)] truncate max-w-[420px]">“{l.message}”</span>}
                <span className="ml-auto text-xs text-[var(--ink-faint)]">{new Date(l.created_at).toLocaleDateString("vi-VN")}</span>
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
          <Link href="/dashboard/new" className="text-brand font-semibold">Đăng tin đầu tiên ›</Link>
        </p>
      )}
    </div>
  );
}
