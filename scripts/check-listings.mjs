import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envText = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { count: totalListings } = await sb.from("listings").select("*", { count: "exact", head: true });
  const { count: published } = await sb.from("listings").select("*", { count: "exact", head: true }).eq("status", "published");
  const { count: hidden } = await sb.from("listings").select("*", { count: "exact", head: true }).eq("status", "hidden");
  console.log("TOTAL IN DB:", { totalListings, published, hidden });

  const { data: cay, error: cayErr } = await sb.rpc("cay_khu_vuc");
  if (!cayErr && cay) {
    console.log("cay_khu_vuc total (t):", cay.t, "sources (s):", cay.s?.length);
  }
}

run().catch(console.error);
