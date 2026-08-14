// ============================================================================
//  Zalo bot (không cần OA/GPKD) — cầu nối zalo-agent-cli <-> NhaDat Radar.
//  Lắng nghe tin nhắn Zalo (acc clone, đăng nhập QR bằng zalo-agent-cli),
//  phân loại bằng Gemini -> ghi tin (dang_tin) / tra DB trả lời (hoi_tin).
//
//  CHẠY TRÊN MÁY/VPS (giữ phiên đăng nhập), KHÔNG chạy trên Vercel.
//  Cài 1 lần:  npm i -g zalo-agent-cli   (rồi đăng nhập: zalo-agent login  -> quét QR)
//  Chạy:       node --env-file=.env.local crawler/zalo-bot.mjs
//
//  ⚠ Dùng tài khoản Zalo CLONE — API không chính thức có thể bị Zalo khoá.
// ============================================================================
import { spawn, execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const CLI = process.env.ZALO_CLI || "zalo-agent";          // tên lệnh zalo-agent-cli
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const KEYS = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY2, process.env.GEMINI_API_KEY3,
  process.env.GEMINI_API_KEY4, process.env.GEMINI_API_KEY5].filter(Boolean);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Thiếu SUPABASE env (.env.local)"); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

const PROP = { nha: "Nhà", dat: "Đất nền", can_ho: "Căn hộ", mat_bang: "Mặt bằng", phong_tro: "Phòng trọ", khac: "Nhà đất khác" };
function fmtPrice(v, deal) {
  if (!v) return "Thoả thuận";
  const s = deal === "cho_thue" ? "/th" : "";
  if (v >= 1e9) return (v / 1e9).toFixed(2).replace(/\.?0+$/, "") + " tỷ" + s;
  if (v >= 1e6) return Math.round(v / 1e6) + " triệu" + s;
  return Math.round(v / 1e3) + "k";
}

// ---- Gemini phân loại (giống lib/ai.ts) ----
const PROMPT = `Bạn là trợ lý Zalo của sàn nhà đất. Đọc tin nhắn và trả về DUY NHẤT 1 JSON:
{"intent":"dang_tin"|"hoi_tin"|"khac","reply_hint":string,
 "listing":{"title":string,"price_vnd":number|null,"area_m2":number|null,"bedrooms":number|null,"listing_type":"ban"|"cho_thue","property_type":"nha"|"dat"|"can_ho"|"mat_bang"|"phong_tro"|"khac","province":string|null,"district":string|null,"ward":string|null,"legal":string|null,"amenities":string[],"contact_phone":string|null},
 "query":{"listing_type":"ban"|"cho_thue"|null,"property_type":string|null,"province":string|null,"district":string|null,"price_min":number|null,"price_max":number|null,"area_min":number|null}}
dang_tin: họ RAO 1 BĐS. hoi_tin: họ TÌM/hỏi. khac: chào/khác. Giá quy về VND (3tr5->3500000, 6 tỷ->6000000000). Không bịa.`;

async function classify(text) {
  for (const k of KEYS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${k}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
          body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT + "\n\n--- TIN NHẮN ---\n" + text }] }], generationConfig: { responseMimeType: "application/json", temperature: 0 } }) });
      if (res.status === 429) continue;
      const j = await res.json();
      return JSON.parse(j?.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
    } catch { /* xoay key */ }
    finally { clearTimeout(timer); }
  }
  return { intent: "khac" };
}

const KIND = ["nha", "dat", "can_ho", "mat_bang", "phong_tro", "khac"];

// Lưu 1 BĐS vào DB (dùng cho cả DM đăng tin lẫn tin bóc từ group)
async function saveListing(L, text, { fromGroup } = {}) {
  return sb.from("listings").insert({
    source: fromGroup ? "zalo_miniapp" : "zalo_oa",
    source_site: fromGroup ? "zalo_group" : "zalo_bot",
    title: L.title || text.slice(0, 80), description: text,
    price_vnd: L.price_vnd ?? null, area_m2: L.area_m2 ?? null, bedrooms: L.bedrooms ?? null,
    deal: L.listing_type === "ban" ? "ban" : "cho_thue",
    kind: KIND.includes(L.property_type || "") ? L.property_type : "khac",
    province: L.province ?? null, district: L.district ?? null, ward: L.ward ?? null,
    legal_status: L.legal ?? null, amenities: L.amenities || [], contact_phone: L.contact_phone ?? null,
    ai_score: fromGroup ? 70 : 85, poster_role_guess: "khong_ro", status: "pending", // chờ duyệt ở /admin
  });
}

// ---- Xử lý tin từ GROUP: chỉ bóc data BĐS, KHÔNG trả lời (tránh spam group) ----
async function harvestGroup(text) {
  if (text.length < 40) return; // tin ngắn/chat vặt -> bỏ
  const ai = await classify(text);
  if (ai.intent === "dang_tin" && ai.listing) {
    const { error } = await saveListing(ai.listing, text, { fromGroup: true });
    console.log(error ? "  (lưu lỗi: " + error.message + ")" : "  ✓ bóc được 1 tin BĐS từ group -> chờ duyệt");
  }
}

// ---- Xử lý DM (chat 1-1) -> trả về text để gửi lại ----
async function handle(text) {
  const ai = await classify(text);

  if (ai.intent === "dang_tin" && ai.listing) {
    const L = ai.listing;
    const { error } = await saveListing(L, text, { fromGroup: false });
    if (error) return "Dạ em chưa ghi được tin. Anh/chị gửi lại kèm giá, diện tích, khu vực giúp em nhé 🙏";
    return `✅ Đã ghi nhận tin của anh/chị:\n• ${L.title || "BĐS"}\n• ${fmtPrice(L.price_vnd, L.listing_type)}${L.area_m2 ? " · " + L.area_m2 + "m²" : ""}${L.district ? " · " + L.district : ""}\n\nTin sẽ hiển thị sau khi duyệt. Cảm ơn anh/chị! 🏠`;
  }

  if (ai.intent === "hoi_tin" && ai.query) {
    const q = ai.query;
    let query = sb.from("listings").select("title,price_vnd,area_m2,district,ward,deal,kind").eq("status", "published");
    if (q.listing_type) query = query.eq("deal", q.listing_type);
    if (q.property_type) query = query.eq("kind", q.property_type);
    if (q.district) query = query.ilike("district", `%${q.district}%`);
    if (q.province) query = query.ilike("province", `%${q.province}%`);
    if (q.price_max) query = query.lte("price_vnd", q.price_max);
    if (q.price_min) query = query.gte("price_vnd", q.price_min);
    if (q.area_min) query = query.gte("area_m2", q.area_min);
    const { data } = await query.order("ai_score", { ascending: false, nullsFirst: false }).limit(4);
    if (data?.length) {
      const lines = data.map((x, i) => `${i + 1}. ${x.title?.slice(0, 55)}\n   💰 ${fmtPrice(x.price_vnd, x.deal)}${x.area_m2 ? " · " + x.area_m2 + "m²" : ""} · ${PROP[x.kind] || x.kind}\n   📍 ${[x.ward, x.district].filter(Boolean).join(", ")}`);
      return `🔎 Tìm thấy ${data.length} tin phù hợp:\n\n${lines.join("\n\n")}\n\nNhắn tiếp để lọc thêm nhé!`;
    }
    return "Hiện chưa có tin khớp yêu cầu. Anh/chị để lại nhu cầu (khu vực + giá + loại), có tin phù hợp em báo ngay ạ! 🔔";
  }

  return ai.reply_hint ||
    "Xin chào 👋 Em là trợ lý NhaDat Radar.\n• Muốn ĐĂNG tin: gửi thông tin nhà/đất (giá, diện tích, khu vực, SĐT).\n• Muốn TÌM nhà: nhắn ví dụ \"thuê phòng trọ Quận 7 dưới 5 triệu\".";
}

// ============================================================================
//  ADAPTER zalo-agent-cli — CHỈNH 2 HÀM NÀY nếu tên lệnh CLI của bạn khác.
//  Xem lệnh thật: `zalo-agent --help`, `zalo-agent message --help`
// ============================================================================

// Gửi tin nhắn trả lời
function sendReply(toId, text) {
  try {
    // ĐIỀU CHỈNH: cú pháp gửi tin của zalo-agent-cli (ví dụ phổ biến bên dưới)
    execFileSync(CLI, ["message", "send", "--thread", String(toId), "--text", text, "--json"], { stdio: "ignore" });
  } catch (e) {
    console.error("Gửi Zalo lỗi:", e.message);
  }
}

// Lắng nghe tin nhắn đến (stream JSON qua stdout)
function startListener() {
  console.log("Zalo bot: bắt đầu lắng nghe... (Ctrl+C để dừng)");
  // ĐIỀU CHỈNH: lệnh lắng nghe của zalo-agent-cli (--json để ra từng dòng JSON)
  const child = spawn(CLI, ["listen", "--json"], { stdio: ["ignore", "pipe", "inherit"] });
  let buf = "";
  child.stdout.on("data", async (chunk) => {
    buf += chunk.toString();
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
      if (!line) continue;
      let ev; try { ev = JSON.parse(line); } catch { continue; }
      // ĐIỀU CHỈNH: đường dẫn tới nội dung tin nhắn trong JSON của zalo-agent-cli
      const fromId = ev.threadId ?? ev.uidFrom ?? ev.sender?.id ?? ev.from;
      const text = (ev.text ?? ev.message?.text ?? ev.content ?? "").toString().trim();
      const isSelf = ev.isSelf ?? ev.self ?? false;
      // group hay chat 1-1? (điều chỉnh theo field thật của zalo-agent-cli)
      const isGroup = ev.isGroup ?? ev.threadType === "group" ?? ev.type === "group" ?? false;
      if (!fromId || !text || isSelf) continue;

      if (isGroup) {
        console.log(`← (group ${fromId}) ${text.slice(0, 60)}`);
        await harvestGroup(text); // chỉ bóc data, không trả lời trong group
      } else {
        console.log(`← [${fromId}] ${text.slice(0, 60)}`);
        const reply = await handle(text);
        sendReply(fromId, reply);
        console.log(`→ [${fromId}] ${reply.slice(0, 60)}`);
      }
    }
  });
  child.on("exit", (code) => { console.error("zalo-agent listen thoát, code", code, "- thử chạy lại sau 5s"); setTimeout(startListener, 5000); });
}

// ---- Chế độ ĐĂNG tin lên group: node zalo-bot.mjs post ----
async function postToGroups() {
  const groups = JSON.parse(process.env.ZALO_POST_GROUPS || "[]"); // ["groupId1","groupId2"]
  if (!groups.length) { console.error("Thiếu ZALO_POST_GROUPS trong .env.local (mảng id group)."); process.exit(1); }
  const { data } = await sb.from("listings")
    .select("id,title,price_vnd,area_m2,district,province,deal")
    .eq("status", "published").order("first_seen_at", { ascending: false }).limit(40);
  const pick = (data || []).sort(() => Math.random() - 0.5).slice(0, Number(process.env.ZALO_POST_COUNT || 3));
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nha-dat-radar-rkyn.vercel.app";
  for (const g of groups) {
    for (const x of pick) {
      const msg = `🏠 ${x.title}\n💰 ${fmtPrice(x.price_vnd, x.deal)}${x.area_m2 ? " · " + x.area_m2 + "m²" : ""}\n📍 ${[x.district, x.province].filter(Boolean).join(", ")}\n🔗 ${SITE}/listings/${x.id}`;
      sendReply(g, msg);
      console.log("→ group", g, ":", x.title?.slice(0, 40));
      await new Promise((r) => setTimeout(r, 5000)); // giãn 5s tránh bị Zalo gắn cờ spam
    }
  }
  console.log(`Đã đăng ${pick.length} tin lên ${groups.length} group.`);
}

if (process.argv[2] === "post") { await postToGroups(); process.exit(0); }
startListener();
