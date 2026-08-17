import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifyAndExtract } from "@/lib/ai";
import { verifyZaloSignature, sendZaloText } from "@/lib/zalo";
import { fmtPrice, PROP } from "@/lib/format";
import { qualityGate } from "@/lib/quality-gate";

export const dynamic = "force-dynamic";

// Zalo gọi GET để verify webhook URL
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-zevent-signature");
  const ts = req.headers.get("x-zevent-timestamp") || (() => {
    try { return String(JSON.parse(raw).timestamp || ""); } catch { return ""; }
  })();

  if (!verifyZaloSignature(raw, sig, ts)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  // chống replay: chỉ nhận event trong vòng 5 phút
  const tsNum = Number(ts);
  if (tsNum && Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) {
    return NextResponse.json({ error: "stale event" }, { status: 401 });
  }

  let event: { event_name?: string; sender?: { id?: string }; message?: { text?: string } };
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }

  const userId = event.sender?.id;
  const text = event.message?.text?.trim();
  if (event.event_name !== "user_send_text" || !userId || !text) {
    return NextResponse.json({ ok: true }); // bỏ qua event khác (follow, image, ...)
  }

  const admin = createAdminClient();
  const ai = await classifyAndExtract(text);

  // 1) NGƯỜI RAO cung cấp tin -> ghi lại (có consent vì họ chủ động gửi)
  if (ai.intent === "dang_tin" && ai.listing) {
    const L = ai.listing;
    // Cổng chất lượng 17/8 (bỏ duyệt tay): thiếu từ khoá BĐS / SĐT / khu vực -> báo khách gửi bổ sung, không đăng
    const why = qualityGate((L.title || "") + "\n" + text, L);
    if (why) {
      const need = why === "không có SĐT" ? "số điện thoại liên hệ"
        : why === "không có khu vực" ? "khu vực (quận/huyện, phường/xã)"
        : "loại BĐS (nhà / đất / căn hộ / mặt bằng…) và giá";
      await sendZaloText(userId, `Dạ em chưa đăng được vì tin còn thiếu ${need}. Anh/chị gửi lại đầy đủ: loại BĐS + diện tích + giá + khu vực + SĐT (VD: "Bán nhà 4x15 Q7 5,2 tỷ, 0909xxxxxx") em đăng ngay ạ 🙏`);
      return NextResponse.json({ ok: true });
    }
    const KIND = ["nha", "dat", "can_ho", "mat_bang", "phong_tro", "khac"];
    const { error: insErr } = await admin.from("listings").insert({
      source: "zalo_oa",
      source_site: "zalo_oa",
      title: L.title || text.slice(0, 80),
      description: text,
      price_vnd: L.price_vnd ?? null,
      area_m2: L.area_m2 ?? null,
      bedrooms: L.bedrooms ?? null,
      deal: L.listing_type === "ban" ? "ban" : "cho_thue",
      kind: KIND.includes(L.property_type || "") ? L.property_type : "khac",
      province: L.province ?? null,
      district: L.district ?? null,
      ward: L.ward ?? null,
      legal_status: L.legal ?? null,
      amenities: L.amenities || [],
      contact_phone: L.contact_phone ?? null, // consent: người dùng tự cung cấp
      ai_score: 85,
      poster_role_guess: "chu_nha",
      status: "published", // 17/8: bỏ duyệt trước — lên thẳng, admin gỡ tin rác ngay trên trang tin
    });
    if (insErr) {
      await sendZaloText(userId, "Dạ em chưa ghi được tin. Anh/chị gửi lại kèm giá, diện tích, khu vực giúp em nhé 🙏");
      return NextResponse.json({ ok: true });
    }
    await sendZaloText(
      userId,
      `✅ Đã ghi nhận tin của anh/chị:\n• ${L.title || "BĐS"}\n• ${fmtPrice(L.price_vnd ?? null, L.listing_type)}${L.area_m2 ? " · " + L.area_m2 + "m²" : ""}${L.district ? " · " + L.district : ""}\n\nTin đã lên trang. Cảm ơn anh/chị! 🏠`,
    );
    return NextResponse.json({ ok: true });
  }

  // 2) NGƯỜI HỎI/tìm -> tra DB trả lời
  if (ai.intent === "hoi_tin" && ai.query) {
    const q = ai.query;
    let query = admin.from("listings").select("title,price_vnd,area_m2,district,ward,deal,kind,source_url").eq("status", "published");
    if (q.listing_type) query = query.eq("deal", q.listing_type);
    if (q.property_type) query = query.eq("kind", q.property_type);
    if (q.district) query = query.ilike("district", `%${q.district}%`);
    if (q.province) query = query.ilike("province", `%${q.province}%`);
    if (q.price_max) query = query.lte("price_vnd", q.price_max);
    if (q.price_min) query = query.gte("price_vnd", q.price_min);
    if (q.area_min) query = query.gte("area_m2", q.area_min);
    const { data } = await query.order("ai_score", { ascending: false, nullsFirst: false }).limit(4);

    if (data && data.length) {
      const lines = data.map(
        (x, i) =>
          `${i + 1}. ${x.title?.slice(0, 55)}\n   💰 ${fmtPrice(x.price_vnd, x.deal)}${x.area_m2 ? " · " + x.area_m2 + "m²" : ""} · ${PROP[x.kind] || x.kind}\n   📍 ${[x.ward, x.district].filter(Boolean).join(", ")}`,
      );
      await sendZaloText(userId, `🔎 Tìm thấy ${data.length} tin phù hợp:\n\n${lines.join("\n\n")}\n\nNhắn tiếp để lọc thêm nhé!`);
    } else {
      await sendZaloText(userId, "Hiện chưa có tin khớp yêu cầu. Anh/chị để lại nhu cầu (khu vực + giá + loại), có tin phù hợp em báo ngay ạ! 🔔");
    }
    return NextResponse.json({ ok: true });
  }

  // 3) Khác -> chào + hướng dẫn
  await sendZaloText(
    userId,
    ai.reply_hint ||
      "Xin chào 👋 Em là trợ lý NhaDat Radar.\n• Muốn ĐĂNG tin: gửi thông tin nhà/đất (giá, diện tích, khu vực, SĐT).\n• Muốn TÌM nhà: nhắn ví dụ \"thuê phòng trọ Quận 7 dưới 5 triệu\".",
  );
  return NextResponse.json({ ok: true });
}
