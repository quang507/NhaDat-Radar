import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function probe() {
  console.log("Probing Supabase URL:", url.replace(/:[^@]+@/, ":***@"));
  
  // 1. List of candidate tables to check
  const candidateTables = [
    "listings",
    "profiles",
    "leads",
    "conversations",
    "messages",
    "appointments",
    "info_requests",
    "listing_facts",
    "price_history",
    "saved_searches",
    "app_config",
    "buyers",
    "sellers",
    "deals",
    "interests",
    "viewings",
    "reminders",
    "ctvs",
    "admins",
    "bot_prompts",
    "bot_usage",
    "bot_errors",
    "bot_health",
    "mau_cau",
    "chat_quota",
    "curated_lists",
    "listing_media",
    "seller_ranks",
    "ctv_ranks",
    "bds_hot"
  ];

  console.log("\n--- Checking Table Existence ---");
  const existingTables = [];
  const missingTables = [];

  for (const t of candidateTables) {
    const { data, error, count } = await sb.from(t).select("*", { count: "exact", head: true });
    if (error) {
      missingTables.push({ table: t, error: error.message });
    } else {
      existingTables.push({ table: t, count: count ?? 0 });
    }
  }

  console.log("EXISTING TABLES (" + existingTables.length + "):");
  for (const item of existingTables) {
    console.log(`  ✓ ${item.table.padEnd(20)}: ${item.count} rows`);
  }

  console.log("\nMISSING TABLES (" + missingTables.length + "):");
  for (const item of missingTables) {
    console.log(`  ✗ ${item.table.padEnd(20)}: ${item.error}`);
  }

  // 2. Check for SQL execution RPCs
  console.log("\n--- Checking RPCs ---");
  const candidateRPCs = [
    "exec_sql",
    "execute_sql",
    "run_sql",
    "sql",
    "admin_gan_bds_quan_tam",
    "admin_xoa_bds_quan_tam",
    "admin_cap_nhat_khach",
    "match_listings",
    "chan_tu_phong_admin"
  ];

  for (const r of candidateRPCs) {
    const { data, error } = await sb.rpc(r, {});
    if (error) {
      console.log(`  RPC ${r.padEnd(25)}: ${error.code || error.message}`);
    } else {
      console.log(`  RPC ${r.padEnd(25)}: EXISTS (returned ${JSON.stringify(data)})`);
    }
  }
}

probe().catch(console.error);
