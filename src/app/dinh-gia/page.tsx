export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import ValuationClient from "./ValuationClient";

export const metadata = { title: "AI định giá bất động sản - NhaDat Radar" };

export default async function ValuationPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings").select("province,district").eq("status", "published").limit(2000);

  const geo: Record<string, string[]> = {};
  for (const r of data ?? []) {
    const p = (r.province || "").trim();
    if (!p) continue;
    geo[p] ??= [];
    const d = (r.district || "").trim();
    if (d && !geo[p].includes(d)) geo[p].push(d);
  }
  for (const p of Object.keys(geo)) geo[p].sort();

  return <ValuationClient geo={geo} />;
}
