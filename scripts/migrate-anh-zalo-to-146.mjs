// Di chuyen anh trong bucket Supabase `anh-zalo` ve thu muc cuc bo tren may 146
// (C:\radar\media\anh-zalo) va cap nhat `listings.images` sang https://nuc.tail19b567.ts.net:8443/anh-zalo/...
// Khong xoa file cu tren Supabase; sau khi xac minh web tai 200 OK moi don sau.
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const MEDIA_DIR = process.env.RADAR_MEDIA_DIR || "C:\\radar\\media";
const MEDIA_BASE = (process.env.RADAR_MEDIA_BASE_URL || "https://nuc.tail19b567.ts.net:8443").replace(/\/+$/, "");
const BUCKET = "anh-zalo";
const MARKER = `/storage/v1/object/public/${BUCKET}/`;
const CONCURRENCY = Number(process.env.MIGRATE_CONCURRENCY || 10);

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

async function downloadToDisk(url, relKey) {
  // Bao ve path traversal
  const parts = relKey.split("/").filter(Boolean);
  if (parts.length < 2 || parts.some((p) => p === "." || p === ".." || p.startsWith("."))) {
    throw new Error(`Invalid object key: ${relKey}`);
  }
  const dest = path.resolve(MEDIA_DIR, BUCKET, ...parts);
  const root = path.resolve(MEDIA_DIR, BUCKET);
  if (!dest.startsWith(root + path.sep)) {
    throw new Error(`Unsafe dest path: ${dest}`);
  }

  // Idempotent: da co file hop le (>= 500 bytes) thi bo qua tai lai
  const existing = await fsp.stat(dest).catch(() => null);
  if (existing && existing.isFile() && existing.size >= 500) {
    return `${MEDIA_BASE}/${BUCKET}/${parts.join("/")}`;
  }

  await fsp.mkdir(path.dirname(dest), { recursive: true });
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 500) throw new Error(`File qua nho (${buf.length} bytes)`);
      const tmp = `${dest}.tmp`;
      await fsp.writeFile(tmp, buf);
      await fsp.rename(tmp, dest);
      return `${MEDIA_BASE}/${BUCKET}/${parts.join("/")}`;
    } catch (e) {
      lastErr = e;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  throw lastErr;
}

async function main() {
  if (!fs.existsSync(MEDIA_DIR)) {
    throw new Error(`Khong thay thu muc media ${MEDIA_DIR} - chay script nay tren may 146`);
  }

  const targets = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from("listings")
      .select("id,images")
      .in("source", ["zalo_oa", "zalo_miniapp"])
      .not("images", "eq", "{}")
      .range(from, from + 999);
    if (error) throw error;
    if (!data || !data.length) break;
    for (const row of data) {
      if ((row.images || []).some((u) => typeof u === "string" && u.includes(MARKER))) {
        targets.push(row);
      }
    }
    if (data.length < 1000) break;
    from += 1000;
  }

  console.log(`Tim thay ${targets.length} tin can chuyen anh ve ${MEDIA_DIR}\\${BUCKET}`);

  let idx = 0;
  let okListings = 0;
  let errListings = 0;
  let filesDone = 0;
  let filesErr = 0;

  async function worker() {
    while (true) {
      const cur = idx++;
      if (cur >= targets.length) return;
      const row = targets[cur];
      const nextImages = [];
      let changed = false;
      let rowFailed = false;

      for (const u of row.images || []) {
        if (typeof u !== "string" || !u.includes(MARKER)) {
          nextImages.push(u);
          continue;
        }
        const relKey = decodeURIComponent(u.split(MARKER)[1].split(/[?#]/)[0]);
        try {
          const newUrl = await downloadToDisk(u, relKey);
          nextImages.push(newUrl);
          changed = true;
          filesDone++;
        } catch (e) {
          console.error(`  [ERR] ${row.id} (${relKey}): ${e.message}`);
          nextImages.push(u);
          filesErr++;
          rowFailed = true;
        }
      }

      if (changed) {
        const { error } = await sb.from("listings").update({ images: nextImages }).eq("id", row.id);
        if (error) {
          console.error(`  [DB ERR] ${row.id}: ${error.message}`);
          errListings++;
        } else if (!rowFailed) {
          okListings++;
        } else {
          errListings++;
        }
      }
      if ((cur + 1) % 100 === 0 || cur + 1 === targets.length) {
        console.log(`Tien do: ${cur + 1}/${targets.length} tin | OK=${okListings} | Loi=${errListings} | Anh=${filesDone} (loi ${filesErr})`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`HOAN TAT: ${okListings}/${targets.length} tin da chuyen sang ${MEDIA_BASE}/${BUCKET}/ (anh OK=${filesDone}, anh loi=${filesErr})`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
