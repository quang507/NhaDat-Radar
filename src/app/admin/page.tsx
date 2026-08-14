export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fmtPrice } from "@/lib/format";
import type { Listing } from "@/lib/types";
import { setListingStatus, deleteListing, setVerified } from "./actions";

export const metadata = { title: "Quản trị - NhaDat Radar" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (p?.role !== "admin") {
    return (
      <div className="card rounded-2xl p-10 text-center max-w-md mx-auto mt-10">
        <div className="text-4xl mb-3">🔒</div>
        <p className="text-sm text-[var(--ink-soft)]">
          Trang này chỉ dành cho admin. Cấp quyền: Supabase → Table Editor → profiles → đổi <code>role</code> của tài khoản bạn thành <code>admin</code>.
        </p>
      </div>
    );
  }

  const tab = ["crawl", "leads", "agents"].includes(sp.tab || "") ? sp.tab! : "user";

  // ===== Tab: Liên hệ (leads) =====
  if (tab === "leads") {
    const { data: leads } = await supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(100);
    return (
      <AdminShell tab={tab} q={sp.q}>
        <div className="card rounded-2xl overflow-hidden">
          {(leads ?? []).length ? (leads ?? []).map((l: { id: string; name: string; phone: string; message: string | null; listing_id: string | null; created_at: string }) => (
            <div key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 border-b border-[var(--line)] last:border-0 text-sm">
              <span className="font-semibold">{l.name}</span>
              <a href={`tel:${l.phone}`} className="text-brand font-mono">{l.phone}</a>
              {l.message && <span className="text-[var(--ink-soft)] truncate max-w-[420px]">“{l.message}”</span>}
              {l.listing_id ? <Link href={`/listings/${l.listing_id}`} className="text-xs text-brand">xem tin →</Link> : <span className="text-xs text-[var(--ink-faint)]">(liên hệ dự án)</span>}
              <span className="ml-auto text-xs text-[var(--ink-faint)]">{new Date(l.created_at).toLocaleString("vi-VN")}</span>
            </div>
          )) : <p className="p-8 text-center text-sm text-[var(--ink-soft)]">Chưa có liên hệ nào.</p>}
        </div>
      </AdminShell>
    );
  }

  // ===== Tab: Người bán (xác minh) =====
  if (tab === "agents") {
    const { data: profs } = await supabase.from("profiles")
      .select("id,full_name,agency_name,phone,is_verified,years_experience")
      .or("role.eq.agent,role.eq.admin,agency_name.not.is.null").limit(100);
    return (
      <AdminShell tab={tab} q={sp.q}>
        <div className="card rounded-2xl overflow-hidden">
          {(profs ?? []).length ? (profs ?? []).map((p2: { id: string; full_name: string | null; agency_name: string | null; phone: string | null; is_verified: boolean }) => (
            <div key={p2.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 border-b border-[var(--line)] last:border-0 text-sm">
              {p2.is_verified && <span className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">✓ đã xác minh</span>}
              <span className="font-semibold">{p2.full_name || "(chưa đặt tên)"}</span>
              {p2.agency_name && <span className="text-[var(--ink-soft)]">{p2.agency_name}</span>}
              {p2.phone && <span className="text-xs font-mono text-[var(--ink-soft)]">{p2.phone}</span>}
              <form action={setVerified} className="ml-auto">
                <input type="hidden" name="id" value={p2.id} /><input type="hidden" name="verified" value={String(!p2.is_verified)} />
                <button className="btn !px-2.5 !py-1 text-xs">{p2.is_verified ? "Bỏ xác minh" : "✓ Xác minh"}</button>
              </form>
            </div>
          )) : <p className="p-8 text-center text-sm text-[var(--ink-soft)]">Chưa có người bán nào.</p>}
        </div>
      </AdminShell>
    );
  }

  // ===== Tab: tin đăng (user / crawl) =====
  let query = supabase.from("listings").select("*").order("created_at", { ascending: false }).limit(60);
  query = tab === "user" ? query.neq("source", "crawl") : query.eq("source", "crawl");
  if (sp.q) query = query.ilike("title", `%${sp.q}%`);
  const { data } = await query;
  const rows = (data ?? []) as Listing[];

  const badge: Record<string, string> = {
    published: "text-emerald-600 bg-emerald-500/10", pending: "text-amber-600 bg-amber-500/10",
    hidden: "text-[var(--ink-soft)] bg-[var(--surface-2)]", rejected: "text-red-600 bg-red-500/10",
  };

  return (
    <AdminShell tab={tab} q={sp.q}>
      <div className="card rounded-2xl overflow-hidden">
        {rows.length ? rows.map((x) => (
          <div key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 border-b border-[var(--line)] last:border-0 text-sm">
            <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded ${badge[x.status] || ""}`}>{x.status}</span>
            <Link href={`/listings/${x.id}`} className="font-semibold truncate max-w-[360px] hover:text-brand">{x.title}</Link>
            <span className="text-[var(--ink-soft)] text-xs">{fmtPrice(x.price_vnd, x.deal)} · {[x.district, x.province].filter(Boolean).join(", ")} · {x.source === "crawl" ? x.source_site : "tự đăng"}</span>
            <span className="ml-auto flex gap-1.5">
              {x.status !== "published" && (
                <form action={setListingStatus}><input type="hidden" name="id" value={x.id} /><input type="hidden" name="status" value="published" />
                  <button className="btn !px-2.5 !py-1 text-xs">✓ Duyệt</button></form>
              )}
              {x.status === "published" && (
                <form action={setListingStatus}><input type="hidden" name="id" value={x.id} /><input type="hidden" name="status" value="hidden" />
                  <button className="btn !px-2.5 !py-1 text-xs">Ẩn</button></form>
              )}
              <form action={deleteListing}><input type="hidden" name="id" value={x.id} />
                <button className="btn !px-2.5 !py-1 text-xs !text-red-600">Xóa</button></form>
            </span>
          </div>
        )) : (
          <p className="p-8 text-center text-sm text-[var(--ink-soft)]">Không có tin nào.</p>
        )}
      </div>
    </AdminShell>
  );
}

// Khung chung: tiêu đề + thanh tab + ô tìm kiếm, dùng lại cho mọi tab admin.
function AdminShell({ tab, q, children }: { tab: string; q?: string; children: React.ReactNode }) {
  const tabs = [
    { key: "user", label: "Tin người dùng" },
    { key: "crawl", label: "Tin crawl" },
    { key: "leads", label: "Liên hệ" },
    { key: "agents", label: "Người bán" },
  ];
  const showSearch = tab === "user" || tab === "crawl";
  return (
    <div>
      <h1 className="prata text-2xl mb-4">Quản trị</h1>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {tabs.map((t) => (
          <Link key={t.key} href={`/admin?tab=${t.key}`} className={`btn text-sm ${tab === t.key ? "!border-brand !text-brand" : ""}`}>{t.label}</Link>
        ))}
        {showSearch && (
          <form action="/admin" className="ml-auto flex gap-2">
            <input type="hidden" name="tab" value={tab} />
            <input className="inp !w-56" name="q" defaultValue={q} placeholder="Tìm tiêu đề…" />
            <button className="btn" type="submit">Tìm</button>
          </form>
        )}
      </div>
      {children}
    </div>
  );
}
