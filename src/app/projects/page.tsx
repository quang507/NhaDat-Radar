export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmtPrice } from "@/lib/format";
import type { Project } from "@/lib/types";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("status", "published")
    .order("name");
  const projects = (data ?? []) as Project[];

  return (
    <div>
      <h1 className="prata text-2xl mb-5">Dự án</h1>
      {projects.length ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="card rounded-2xl p-5 hover:shadow-lg transition">
              <h3 className="font-bold text-lg">{p.name}</h3>
              <div className="text-xs text-[var(--ink-soft)] mb-2">
                {p.investor ? `CĐT: ${p.investor} · ` : ""}
                {[p.district, p.province].filter(Boolean).join(", ")}
              </div>
              <div className="text-brand font-bold">
                {fmtPrice(p.price_min, "ban")} - {fmtPrice(p.price_max, "ban")}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-[var(--ink-soft)] py-8">Chưa có dự án. Thêm vào bảng <code>projects</code>.</p>
      )}
    </div>
  );
}
