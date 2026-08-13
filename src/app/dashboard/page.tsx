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

  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("agent_id", user.id)
    .order("created_at", { ascending: false });
  const mine = (data ?? []) as Listing[];

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="prata text-2xl">Kênh người bán</h1>
          <p className="text-[var(--ink-soft)] text-sm">👤 {user.email}</p>
        </div>
        <Link href="/dashboard/new" className="btn btn-primary">+ Đăng tin mới</Link>
      </div>

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
