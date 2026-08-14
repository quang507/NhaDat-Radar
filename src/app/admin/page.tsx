export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fmtPrice } from "@/lib/format";
import type { Listing } from "@/lib/types";
import { setListingStatus, deleteListing } from "./actions";

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

  const tab = sp.tab === "crawl" ? "crawl" : "user";
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
    <div>
      <h1 className="prata text-2xl mb-4">Quản trị tin đăng</h1>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Link href="/admin?tab=user" className={`btn text-sm ${tab === "user" ? "!border-brand !text-brand" : ""}`}>Tin người dùng</Link>
        <Link href="/admin?tab=crawl" className={`btn text-sm ${tab === "crawl" ? "!border-brand !text-brand" : ""}`}>Tin crawl</Link>
        <form action="/admin" className="ml-auto flex gap-2">
          <input type="hidden" name="tab" value={tab} />
          <input className="inp !w-56" name="q" defaultValue={sp.q} placeholder="Tìm tiêu đề…" />
          <button className="btn" type="submit">Tìm</button>
        </form>
      </div>

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
    </div>
  );
}
