import { NextRequest, NextResponse, after } from "next/server";
import { ghiSuKien } from "@/lib/su-kien";
import { baoLeadMoi } from "@/lib/bao-lead";
import { createAnonClient, rateLimit } from "@/lib/supabase/anon";
import { gemini, median } from "@/lib/gemini";
import { fmtPrice, PROP } from "@/lib/format";
import { cleanImages } from "@/lib/img";
import { cauChotXemPhong, tronRoHang, laRoHang, maPhong } from "@/lib/ro-hang";
import { lamSachTuKhoa, cacMucNoi, type BoLoc } from "@/lib/chat-tim";
import { bocTruyVanBDS } from "@/lib/boc-truy-van";
import { layTinTuongTu } from "@/lib/tuong-tu";
import { cheSoVanBan } from "@/lib/doc-quyen";
import { HOTLINE } from "@/components/TuVanRadar";

// %/_ là wildcard ilike, ",()" phá cú pháp .or() - cùng luật clean của /search (soát 21/8:
// province/district/keyword từ output Gemini đi thẳng vào ilike không rửa)
const sach = (s: unknown) => String(s ?? "").replace(/[%_*,()]/g, " ").replace(/\s+/g, " ").trim();

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type ChatMsg = { role: "user" | "bot"; text: string };
type Parsed = {
  mode: "search" | "analyze" | "chat";
  deal?: "ban" | "cho_thue" | null;
  kind?: string | null;
  province?: string | null;
  district?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  bedrooms?: number | null;
  keyword?: string | null;
  small_talk_reply?: string | null;
};

const PARSE_PROMPT = `Bạn là trợ lý AI của sàn nhà đất NhaDat Radar (Việt Nam). Phân tích TIN NHẮN CUỐI của người dùng (kèm ngữ cảnh hội thoại) và trả về DUY NHẤT 1 JSON:
{
 "mode": "search"|"analyze"|"chat",
   // search: tìm tin cụ thể (mua/thuê nhà theo tiêu chí)
   // analyze: hỏi về THỊ TRƯỜNG - giá trung bình, khu nào rẻ/đắt, nên đầu tư đâu, so sánh khu vực, xu hướng
   // chat: chào hỏi, hỏi cách dùng web, khác
 "deal": "ban"|"cho_thue"|null,
 "kind": "nha"|"dat"|"can_ho"|"mat_bang"|"phong_tro"|null,
 "province": string|null,   // chuẩn hoá: "Hồ Chí Minh", "Hà Nội", "Đà Nẵng"... Mặc định ưu tiên Hồ Chí Minh nếu người dùng nhắc các quận như Tân Phú, Bình Tân, Quận 12, Gò Vấp, Tân Bình...
 "district": string|null,
 "price_min": number|null,  // VND: "2 tỷ"=2000000000, "5tr/tháng"=5000000
 "price_max": number|null,
 "bedrooms": number|null,
 "keyword": string|null,   // tên đường / dự án / địa danh nhỏ hơn quận. VIẾT CÓ DẤU CHUẨN kể cả khi người dùng gõ không dấu ("pham huu lau" -> "Phạm Hữu Lầu"); KHÔNG kèm chữ "đường", "phố", "hẻm", "gần"
 "small_talk_reply": string|null  // CHỈ khi mode=chat: trả lời thân thiện ngắn tiếng Việt. Gợi ý được: tìm kiếm /search, Hotline/Zalo 0346 689 460 để xem nhà thực tế, AI định giá /dinh-gia, tính lãi vay /tinh-lai-vay, đăng tin cần đăng nhập /auth rồi vào /dashboard/new, lưu tin bằng nút ♥.
}
Không bịa. Giá quy về VND.
Nếu có dòng "NGƯỜI DÙNG ĐANG XEM TIN" và câu hỏi nói về chính tin đó ("phòng này", "căn này", "còn không", "giá bao nhiêu", "ở đâu") -> mode "chat", small_talk_reply trả lời từ thông tin tin đó (không bịa thêm), mời gọi/nhắn Zalo hotline ${HOTLINE} để hẹn xem thực tế.`;

function fallbackParse(text: string): Parsed {
  const t = text.toLowerCase();
  const q: Parsed = { mode: "search" };
  if (/(giá trung bình|khu nào|quận nào|đầu tư|xu hướng|thị trường|so sánh|rẻ nhất|đắt nhất)/.test(t)) q.mode = "analyze";
  const b = bocTruyVanBDS(text);
  if (b.coKetQua) {
    if (b.loc.deal) q.deal = b.loc.deal;
    if (b.loc.kind) q.kind = b.loc.kind;
    if (b.loc.province) q.province = b.loc.province;
    if (b.loc.district) q.district = b.loc.district;
    if (b.loc.price_min) q.price_min = b.loc.price_min;
    if (b.loc.price_max) q.price_max = b.loc.price_max;
    else if (b.loc.price_approx) q.price_max = Math.round(b.loc.price_approx * 1.15);
    if (b.loc.bedrooms) q.bedrooms = b.loc.bedrooms;
    if (b.loc.keyword || b.loc.street) q.keyword = b.loc.keyword || b.loc.street;
  }
  return q;
}

// Thống kê thị trường theo quận từ data thật (giá/m² trung vị bán & thuê + tỷ suất cho thuê)
async function marketStats(province: string | null) {
  const supabase = createAnonClient();
  let q = supabase
    .from("listings")
    .select("district,province,deal,price_per_m2")
    .eq("status", "published").not("price_per_m2", "is", null).gt("price_per_m2", 0)
    .limit(2000);
  if (province && sach(province)) q = q.ilike("province", `%${sach(province)}%`);
  const { data } = await q;
  const byDistrict = new Map<string, { ban: number[]; thue: number[]; province: string }>();
  for (const r of data ?? []) {
    const d = (r.district || "").trim();
    if (!d) continue;
    const e = byDistrict.get(d) || { ban: [], thue: [], province: r.province || "" };
    (r.deal === "ban" ? e.ban : e.thue).push(Number(r.price_per_m2));
    byDistrict.set(d, e);
  }
  return [...byDistrict.entries()]
    .map(([district, e]) => {
      const banMed = median(e.ban), thueMed = median(e.thue);
      return {
        district, province: e.province,
        n: e.ban.length + e.thue.length,
        ban_ppm2: banMed, thue_ppm2: thueMed,
        // gross yield %/năm = (thuê/m²/tháng * 12) / (giá bán/m²)
        yield_pct: banMed && thueMed ? Math.round(((thueMed * 12) / banMed) * 1000) / 10 : null,
      };
    })
    .filter((x) => x.n >= 3)
    .sort((a, b) => b.n - a.n)
    .slice(0, 15);
}

export async function POST(req: NextRequest) {
  // chặn spam: 20 request/phút mỗi IP (endpoint công khai + tốn quota Gemini)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?";
  if (!rateLimit(`chat:${ip}`, 20, 60_000)) {
    return NextResponse.json({ reply: "Bạn thao tác hơi nhanh, chờ một phút rồi thử lại nhé." }, { status: 429 });
  }
  let body: { messages?: ChatMsg[]; dangXem?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ reply: "Yêu cầu không hợp lệ." }, { status: 400 });
  }
  // chỉ nhận mảng {role,text:string}; mỗi lượt cắt 1000 ký tự (trước: messages không phải mảng -> 500,
  // lịch sử không giới hạn độ dài -> đốt token Gemini)
  const messages: ChatMsg[] = (Array.isArray(body?.messages) ? body.messages : [])
    .filter((m) => !!m && typeof m === "object" && typeof m.text === "string")
    .map((m): ChatMsg => ({ role: m.role === "user" ? "user" : "bot", text: m.text.slice(0, 1000) }))
    .slice(-8);
  const last = messages.filter((m) => m.role === "user").pop()?.text?.slice(0, 1000);
  if (!last) return NextResponse.json({ reply: "Bạn muốn tìm nhà đất như thế nào ạ?" });

  // Thu thập lead tự động khi khách để lại SĐT trong chat
  const phoneMatch = last.match(/(?:(?:\+84|0)[35789]\d{8})/);
  let daLuuLead = false;
  if (phoneMatch) {
    const rawPhone = phoneMatch[0];
    const sdt = rawPhone.replace(/^\+84/, "0");
    const lid = typeof body.dangXem === "string" && /^[0-9a-f-]{36}$/i.test(body.dangXem) ? body.dangXem : null;
    const leadRow = {
      listing_id: lid,
      name: "Khách chat Web AI",
      phone: sdt,
      message: `[AI Chat] "${last}"`,
    };
    try {
      const { error: errLead } = await createAnonClient().from("leads").insert(leadRow);
      if (!errLead) {
        daLuuLead = true;
        after(() => baoLeadMoi({ listing_id: lid, name: leadRow.name, phone: sdt, message: leadRow.message }));
        after(() => ghiSuKien({ loai: "dat_lich", listingId: lid }));
      }
    } catch (err) {
      console.error("Loi luu lead tu chat:", err);
    }
  }

  // Nếu khách CHỈ để lại SĐT hoặc câu quá ngắn chỉ để liên hệ
  if (daLuuLead && last.length < 50 && !/(tìm|mua|thuê|cần|quận|giá|tỷ|triệu|bán)/i.test(last)) {
    return NextResponse.json({
      reply: `Dạ em đã ghi nhận số điện thoại ${phoneMatch![0]} của anh/chị rồi ạ! Chuyên viên NhaDat Radar sẽ liên hệ qua Điện thoại/Zalo để tư vấn và hỗ trợ xem nhà sớm nhất nhé 🏠\n\n📞 Cần hỗ trợ gấp: ${HOTLINE} (Hotline/Zalo)`,
      listings: [],
    });
  }

  // Quy tắc bán hàng (28/9): KHÔNG nhận bớt giá / không nói thời hạn hợp đồng qua tin nhắn -> mời qua xem
  // phòng rồi thương lượng trực tiếp. Chặn trước Gemini để câu chốt luôn đúng kịch bản.
  if (/(bớt|giảm giá|bot gia|thương lượng|fix giá|hợp đồng|hop dong|mấy tháng|bao nhiêu tháng|tối thiểu.*tháng)/i.test(last)) {
    return NextResponse.json({
      reply: `${cauChotXemPhong("như trên tin")}
📞 Hotline/Zalo: ${HOTLINE}`,
      listings: [],
    });
  }

  // Tin khách đang xem (widget gửi kèm khi ở trang /listings/[id]) -> ngữ cảnh cho câu "phòng này còn không"
  let dangXem = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tinDangXemData: any = null;
  if (typeof body.dangXem === "string" && /^[0-9a-f-]{36}$/i.test(body.dangXem)) {
    const { data } = await createAnonClient().from("listings")
      .select("id,title,price_vnd,deal,area_m2,bedrooms,district,province,ward,kind,address,source,source_site").eq("id", body.dangXem).eq("status", "published").maybeSingle();
    if (data) {
      tinDangXemData = data;
      const rh = laRoHang(data);
      // địa chỉ công khai (rổ hàng/độc quyền đã che số nhà) - không bao giờ đưa địa chỉ thật cho AI
      dangXem = `NGƯỜI DÙNG ĐANG XEM TIN: "${cheSoVanBan(data.title)}" - ${fmtPrice(data.price_vnd, data.deal)}${data.area_m2 ? `, ${data.area_m2}m²` : ""}, ${cheSoVanBan([data.address, data.district, data.province].filter(Boolean).join(", "))}${rh ? `. Đây là phòng trống rổ hàng Radar, mã phòng ${maPhong(data.id)}, hotline/Zalo ${HOTLINE} (khách nhắn kèm mã phòng)` : ""}.`;
    }
  }

  // Khách bấm chip hoặc hỏi tìm căn tương tự / quanh đây khi đang xem một tin
  if (tinDangXemData && /(tương tự|tuong tu|giống|giong|căn khác|phòng khác|quanh đây|khu này còn không|gợi ý thêm)/i.test(last)) {
    const tuongTu = await layTinTuongTu(tinDangXemData, 4);
    if (tuongTu.length > 0) {
      return NextResponse.json({
        reply: `Em tìm thấy ${tuongTu.length} căn cùng khu vực và tầm giá tương đương ở bên dưới nhé 🏠\n\nBạn muốn em hỗ trợ phương án nào tiếp theo?`,
        suggestions: [
          "Xem căn giá mềm hơn",
          "Xem căn có hẻm xe hơi",
          "Đặt lịch hẹn xem trực tiếp",
        ],
        listings: tuongTu.map((x) => ({
          id: x.id,
          title: x.title,
          price: fmtPrice(x.price_vnd, x.deal),
          meta: [x.lyDoGoiY, x.area_m2 ? `${x.area_m2}m²` : null, [x.ward, x.district].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
          image: cleanImages(x.images || [])[0] || null,
        })),
      });
    }
  }

  const convo = (dangXem ? dangXem + "\n" : "") + messages.map((m) => `${m.role === "user" ? "Người dùng" : "Trợ lý"}: ${m.text}`).join("\n");

  let parsed: Parsed | null = null;
  const raw = await gemini(`${PARSE_PROMPT}\n\n--- HỘI THOẠI ---\n${convo}`);
  if (raw) { try { parsed = JSON.parse(raw) as Parsed; } catch { /* fallback */ } }
  parsed ??= fallbackParse(last);

  // Kế thừa parser tiếng Việt: bổ sung nếu Gemini bỏ sót giá hoặc quận/loại hình
  const tuLuat = bocTruyVanBDS(last);
  if (tuLuat.coKetQua) {
    if (tuLuat.loc.deal && !parsed.deal) parsed.deal = tuLuat.loc.deal;
    if (tuLuat.loc.kind && !parsed.kind) parsed.kind = tuLuat.loc.kind;
    if (tuLuat.loc.district && !parsed.district) parsed.district = tuLuat.loc.district;
    if (tuLuat.loc.province && !parsed.province) parsed.province = tuLuat.loc.province;
    if (tuLuat.loc.price_max && !parsed.price_max) parsed.price_max = tuLuat.loc.price_max;
    if (tuLuat.loc.price_min && !parsed.price_min) parsed.price_min = tuLuat.loc.price_min;
    if (tuLuat.loc.bedrooms && !parsed.bedrooms) parsed.bedrooms = tuLuat.loc.bedrooms;
    if (tuLuat.loc.keyword && !parsed.keyword) parsed.keyword = tuLuat.loc.keyword;
    if (parsed.mode === "chat" && (tuLuat.loc.price_max || tuLuat.loc.district || tuLuat.loc.kind)) {
      parsed.mode = "search";
    }
  }

  // ===== Chat thường =====
  if (parsed.mode === "chat") {
    return NextResponse.json({
      reply: parsed.small_talk_reply ||
        "Xin chào! Mình là trợ lý NhaDat Radar 🏠 Hỏi mình kiểu: “căn hộ 2PN dưới 3 tỷ ở Hà Nội”, hoặc “quận nào ở Hà Nội đáng đầu tư?”",
      listings: [],
    });
  }

  // ===== Phân tích thị trường bằng số liệu thật =====
  if (parsed.mode === "analyze") {
    const stats = await marketStats(parsed.province || null);
    if (!stats.length) {
      return NextResponse.json({ reply: "Chưa đủ dữ liệu cho khu vực này. Bạn thử hỏi về Hà Nội, Hồ Chí Minh hoặc Đà Nẵng nhé.", listings: [] });
    }
    const fm = (v: number | null) => (v ? (v >= 1e6 ? (v / 1e6).toFixed(1) + "tr" : Math.round(v / 1e3) + "k") : "-");
    const table = stats
      .map((s) => `${s.district} (${s.province}): bán ${fm(s.ban_ppm2)}/m² · thuê ${fm(s.thue_ppm2)}/m²/th · yield ${s.yield_pct ?? "-"}%/năm · ${s.n} tin`)
      .join("\n");
    const reply = await gemini(
      `Bạn là chuyên gia phân tích BĐS Việt Nam của NhaDat Radar. Người dùng hỏi: "${last}"
SỐ LIỆU THẬT từ tin rao đang hiển thị trên sàn (giá/m² trung vị theo quận; yield = tỷ suất cho thuê gộp/năm):
${table}

Trả lời tiếng Việt 3-5 câu, TRÍCH SỐ LIỆU CỤ THỂ ở trên (không bịa số khác), nêu 2-3 khu vực đáng chú ý phù hợp câu hỏi, kết bằng 1 lưu ý ngắn (dữ liệu từ tin rao, chỉ tham khảo).`,
      { json: false },
    );
    return NextResponse.json({
      reply: reply || "Số liệu hiện có:\n" + table + "\n(Dữ liệu từ tin rao, chỉ mang tính tham khảo.)",
      listings: [],
    });
  }

  // ===== Tìm tin =====
  const supabase = createAnonClient();
  // builder bị mutate khi gọi filter -> dựng mới cho mỗi truy vấn
  const taoQ = (b: BoLoc) => {
    let q = supabase
      .from("listings")
      .select("id,title,price_vnd,area_m2,bedrooms,district,province,deal,kind,images,source")
      .eq("status", "published");
    if (b.deal) q = q.eq("deal", b.deal);
    if (b.kind && PROP[b.kind]) q = q.eq("kind", b.kind);
    if (b.province && sach(b.province)) q = q.ilike("province", `%${sach(b.province)}%`);
    if (b.district && sach(b.district)) q = q.ilike("district", `%${sach(b.district)}%`);
    if (b.price_min) q = q.gte("price_vnd", b.price_min);
    if (b.price_max) q = q.lte("price_vnd", b.price_max);
    if (b.bedrooms) q = q.gte("bedrooms", b.bedrooms);
    // 30/9: từ khoá (tên đường/dự án) tìm cả tiêu đề + địa chỉ + phường + quận như trang /search -
    // trước chỉ tìm tiêu đề nên "Phạm Hữu Lầu" trong địa chỉ bị bỏ sót
    if (b.keyword) q = q.or(`title.ilike.%${b.keyword}%,address.ilike.%${b.keyword}%,ward.ilike.%${b.keyword}%,district.ilike.%${b.keyword}%`);
    return q;
  };
  // Nới dần bộ lọc (bỏ giá -> bỏ loại -> bỏ từ khoá) trước khi dùng tìm ngữ nghĩa, và NÓI THẬT với khách
  // là đang đưa tin gần đúng (lib/chat-tim). Rổ hàng Radar ưu tiên (3 rổ hàng : 2 tin khác trong 5 thẻ).
  type TinChat = { id: string; title: string; price_vnd: number | null; area_m2: number | null; bedrooms: number | null; district: string | null; province: string | null; deal: string; kind: string; images: string[] | null; source: string | null };
  let found: TinChat[] = [];
  let ghiChuNoi: string | null = null;
  for (const { loc, ghiChu } of cacMucNoi({ ...parsed, keyword: lamSachTuKhoa(parsed.keyword) || null })) {
    const [{ data: rh }, { data }] = await Promise.all([
      taoQ(loc).eq("source", "ro_hang").order("first_seen_at", { ascending: false }).limit(3),
      taoQ(loc).neq("source", "ro_hang").order("ai_score", { ascending: false, nullsFirst: false }).limit(5),
    ]);
    found = tronRoHang(rh ?? [], data ?? [], 3).slice(0, 5);
    if (found.length) { ghiChuNoi = ghiChu; break; }
  }

  // Không có kết quả -> thử tìm NGỮ NGHĨA bằng pgvector (cần migration 003 + embed.mjs đã chạy)
  if (!found.length) {
    try {
      const KEYS = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY2, process.env.GEMINI_API_KEY3,
        process.env.GEMINI_API_KEY4, process.env.GEMINI_API_KEY5].filter(Boolean) as string[];
      // Cùng danh sách model với crawler/embed.mjs (vector câu hỏi phải cùng model với vector đã lưu)
      let vec: number[] | null = null;
      outer: for (const model of ["gemini-embedding-001"]) { // text-embedding-004 đã bị gỡ (404) - giữ đồng bộ với crawler/embed.mjs
        for (const k of KEYS) {
          const body: Record<string, unknown> = { content: { parts: [{ text: last.slice(0, 1000) }] } };
          if (model === "gemini-embedding-001") body.outputDimensionality = 768;
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${k}`,
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
          );
          if (res.status === 429) continue;
          const j = await res.json();
          if (j?.embedding?.values) { vec = j.embedding.values; break outer; }
          if (res.status === 404) break; // model không tồn tại -> đổi model
          continue; // lỗi key -> thử key kế
        }
      }
      if (vec) {
        const { data: matches } = await supabase.rpc("match_listings", { query_embedding: vec, match_count: 5 });
        const ids = (matches ?? []).filter((m: { similarity: number }) => m.similarity > 0.5).map((m: { id: string }) => m.id);
        if (ids.length) {
          const { data: sem } = await supabase
            .from("listings").select("id,title,price_vnd,area_m2,bedrooms,district,province,deal,kind,images,source")
            .in("id", ids);
          found = sem ?? [];
          if (found.length) ghiChuNoi = "không có tin khớp đúng từ khoá - đây là các tin có nội dung gần giống";
        }
      }
    } catch { /* chưa có pgvector/embedding - bỏ qua */ }
  }

  let reply: string | null = null;
  const suggestions: string[] = [];
  if (found.length) {
    const summary = found
      .map((x, i) => `${i + 1}. ${x.title} - ${fmtPrice(x.price_vnd, x.deal)}${x.area_m2 ? `, ${x.area_m2}m²` : ""} (${[x.district, x.province].filter(Boolean).join(", ")})`)
      .join("\n");
    // 30/9: nói RÕ cho AI kết quả khớp đúng hay là tin gần đúng (đã nới lọc) - bản cũ để AI tự đoán nên
    // có lúc đưa 5 phòng đúng đường mà vẫn trả lời "chưa có phòng trên đường này"
    reply = await gemini(
      `Bạn là trợ lý sàn NhaDat Radar. Người dùng hỏi: "${last}".\nKết quả tìm được:\n${summary}\n\n${
        ghiChuNoi
          ? `LƯU Ý: kết quả gần đúng - ${ghiChuNoi}.`
          : "Kết quả khớp đúng yêu cầu."
      }\nQUY TẮC BẮT BUỘC:\n- Cực kỳ ngắn gọn (1-2 câu, dưới 30 từ).\n- KHÔNG liệt kê lại tên nhà hay giá (đã có thẻ bên dưới).\n- Đưa ra 1 câu gợi ý phương án tiếp theo cho khách chọn.`,
      { json: false },
    );
    reply ||= ghiChuNoi
      ? `Em gửi bạn các tin gần đúng ở bên dưới nhé!`
      : `Em tìm được ${found.length} tin phù hợp ở bên dưới nhé 🏠`;
    if (parsed?.district) {
      suggestions.push(`Căn rẻ hơn ở ${parsed.district}`);
      suggestions.push(`Hẻm xe hơi ở ${parsed.district}`);
    } else {
      suggestions.push("Xem căn giá mềm hơn");
      suggestions.push("Xem căn hẻm xe hơi");
    }
    suggestions.push("Đặt lịch hẹn xem nhà");
  } else {
    reply = "Hiện chưa có tin nào khớp đúng mức này 😥 Bạn thử chọn các phương án nới tìm kiếm dưới đây xem sao nhé:";
    if (parsed?.district) {
      suggestions.push(`Tất cả tin tại ${parsed.district}`);
      suggestions.push(`Nới giá tại ${parsed.district}`);
    } else {
      suggestions.push("Nới rộng mức giá");
      suggestions.push("Tìm khu vực lân cận");
    }
  }

  // log câu hỏi + số kết quả (bảng su_kien, loai='chat') -> tab "Quan tâm" liệt kê câu bot trả lời hụt
  after(() => ghiSuKien({ loai: "chat", listingId: typeof body.dangXem === "string" ? body.dangXem : null, noiDung: last, ketQua: found.length }));
  return NextResponse.json({
    reply,
    suggestions,
    listings: found.map((x) => ({
      id: x.id, title: x.title, price: fmtPrice(x.price_vnd, x.deal),
      meta: [x.area_m2 ? `${x.area_m2}m²` : null, x.bedrooms ? `${x.bedrooms}PN` : null, [x.district, x.province].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
      // cleanImages như mọi surface khác: bỏ link album facebook (không phải file ảnh, thẻ chat hiện ảnh vỡ) + nâng hi-res
      image: cleanImages(x.images || [])[0] || null,
    })),
  });
}
