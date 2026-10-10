import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifyAndExtract } from "@/lib/ai";
import { sendTelegramMessage } from "@/lib/telegram";
import { fmtPrice, PROP, catChu } from "@/lib/format";
import { qualityGate } from "@/lib/quality-gate";
import { SITE_URL } from "@/lib/ld";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, service: "NhaDat Radar Telegram Webhook" });
}

export async function POST(req: Request) {
  // 1. Kiểm tra secret token nếu được cấu hình
  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret && secretHeader !== expectedSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = body?.message || body?.edited_message;
  if (!message || !message.text) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat?.id;
  const text = String(message.text || "").trim();
  const userName = message.from?.first_name || message.from?.username || "anh/chị";

  if (!chatId || !text) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();

  // 2. Chống xử lý trùng tin nhắn (Telegram có thể gửi lại nếu server phản hồi chậm)
  const msgId = message.message_id;
  if (msgId) {
    const { error: dupErr } = await admin.from("bot_state").insert({
      loai: "tele_msg",
      thread: `${chatId}_${msgId}`,
      payload: null,
      expires_at: new Date(Date.now() + 3 * 24 * 3600_000).toISOString(),
    });
    if (dupErr?.code === "23505") {
      return NextResponse.json({ ok: true }); // Đã xử lý rồi
    }
  }

  // 3. Xử lý lệnh /start hoặc /help
  if (text === "/start" || text === "/help") {
    const welcomeText = `Xin chào ${userName} 👋! Em là trợ lý AI của <b>NhaDat Radar</b> 🎯\n\n` +
      `🔍 <b>TÌM KIẾM NHÀ ĐẤT & PHÒNG TRỌ:</b>\n` +
      `Anh/chị chỉ cần nhắn trực tiếp nhu cầu bằng câu tự nhiên, ví dụ:\n` +
      `• <i>"thuê phòng trọ Quận 10 dưới 5 triệu"</i>\n` +
      `• <i>"tìm căn hộ 1PN Bình Thạnh ban công"</i>\n` +
      `• <i>"mặt bằng kinh doanh Quận 1 dưới 20 triệu"</i>\n\n` +
      `🏠 <b>RỔ HÀNG XÁC THỰC:</b> Hơn 2.500+ căn phòng trống có toạ độ thực, giá niêm yết rõ ràng.\n\n` +
      `☎️ <b>Hotline hỗ trợ:</b> <code>0346689460</code>\n` +
      `🆔 <b>Chat ID của bạn:</b> <code>${chatId}</code>`;

    await sendTelegramMessage(welcomeText, {
      chatId,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🌐 Mở Web NhaDat Radar", url: SITE_URL },
            { text: "🔍 Tìm phòng trống ngay", url: `${SITE_URL}/search` },
          ],
          [{ text: "💬 Zalo Hotline: 0346689460", url: "https://zalo.me/0346689460" }],
        ],
      },
    });
    return NextResponse.json({ ok: true });
  }

  // 4. Phân tích ngữ nghĩa tin nhắn bằng Gemini AI
  const ai = await classifyAndExtract(text);

  // 4.1. KHÁCH MUỐN ĐĂNG TIN
  if (ai.intent === "dang_tin" && ai.listing) {
    const L = ai.listing;
    const why = qualityGate((L.title || "") + "\n" + text, L);
    if (why) {
      const need =
        why === "không có SĐT"
          ? "số điện thoại liên hệ"
          : why === "không có khu vực"
          ? "khu vực (quận/huyện, phường/xã)"
          : "loại BĐS (nhà / đất / căn hộ / phòng trọ) và giá";
      await sendTelegramMessage(
        `Dạ em chưa đăng được vì tin còn thiếu ${need}.\n\nAnh/chị vui lòng gửi lại đầy đủ: loại BĐS + diện tích + giá + khu vực + SĐT (VD: <i>"Bán nhà 4x15 Q7 5,2 tỷ, 0909xxxxxx"</i>) em hỗ trợ đăng ngay ạ 🙏`,
        { chatId, parse_mode: "HTML" }
      );
      return NextResponse.json({ ok: true });
    }

    const KIND = ["nha", "dat", "can_ho", "mat_bang", "phong_tro", "khac"];
    const { error: insErr } = await admin.from("listings").insert({
      source: "telegram_bot",
      source_site: "telegram_bot",
      title: L.title || catChu(text, 80),
      description: text,
      price_vnd: L.price_vnd ?? null,
      area_m2: L.area_m2 ?? null,
      bedrooms: L.bedrooms ?? null,
      deal: L.listing_type === "ban" ? "ban" : "cho_thue",
      kind: KIND.includes(L.property_type || "") ? L.property_type : "khac",
      province: L.province ?? "Hồ Chí Minh",
      district: L.district ?? null,
      ward: L.ward ?? null,
      legal_status: L.legal ?? null,
      amenities: L.amenities || [],
      contact_phone: L.contact_phone ?? null,
      ai_score: 85,
      poster_role_guess: "chu_nha",
      status: "published",
      first_seen_at: new Date().toISOString(),
    });

    if (insErr) {
      await sendTelegramMessage(
        "Dạ em chưa ghi nhận được tin do lỗi kết nối. Anh/chị gửi lại kèm giá, diện tích, khu vực giúp em nhé 🙏",
        { chatId }
      );
      return NextResponse.json({ ok: true });
    }

    const giaText = fmtPrice(L.price_vnd ?? null, L.listing_type);
    const successMsg =
      `✅ <b>Đã đăng tin thành công lên NhaDat Radar!</b>\n\n` +
      `• <b>Tiêu đề:</b> ${L.title || "Bất động sản"}\n` +
      `• <b>Giá:</b> ${giaText}${L.area_m2 ? ` · ${L.area_m2}m²` : ""}${L.district ? ` · ${L.district}` : ""}\n\n` +
      `Tin của anh/chị đã được duyệt và hiển thị công khai trên hệ thống. Cảm ơn anh/chị! 🏠`;

    await sendTelegramMessage(successMsg, {
      chatId,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "🌐 Xem trên NhaDat Radar", url: `${SITE_URL}/search` }]],
      },
    });
    return NextResponse.json({ ok: true });
  }

  // 4.2. KHÁCH MUỐN HỎI / TÌM PHÒNG, NHÀ ĐẤT
  if (ai.intent === "hoi_tin" && ai.query) {
    const q = ai.query;
    let query = admin
      .from("listings")
      .select("id,title,price_vnd,area_m2,district,ward,deal,kind,images")
      .eq("status", "published");

    if (q.listing_type) query = query.eq("deal", q.listing_type);
    if (q.property_type) query = query.eq("kind", q.property_type);
    if (q.district) query = query.ilike("district", `%${q.district}%`);
    if (q.province) query = query.ilike("province", `%${q.province}%`);
    if (q.price_max) query = query.lte("price_vnd", q.price_max);
    if (q.price_min) query = query.gte("price_vnd", q.price_min);
    if (q.area_min) query = query.gte("area_m2", q.area_min);

    const { data } = await query
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(4);

    if (data && data.length > 0) {
      let resp = `🔎 <b>Tìm thấy ${data.length} căn phù hợp nhất trên hệ thống:</b>\n\n`;
      const buttons: Array<Array<{ text: string; url: string }>> = [];

      data.forEach((x, i) => {
        const gia = fmtPrice(x.price_vnd, x.deal);
        const loai = PROP[x.kind] || x.kind;
        const viTri = [x.ward, x.district].filter(Boolean).join(", ");
        resp += `<b>${i + 1}.</b> <a href="${SITE_URL}/listings/${x.id}">${catChu(x.title || "", 55)}</a>\n`;
        resp += `   💰 <b>${gia}</b>${x.area_m2 ? ` · ${x.area_m2}m²` : ""} · ${loai}\n`;
        resp += `   📍 ${viTri}\n\n`;

        buttons.push([
          {
            text: `👉 Căn ${i + 1}: ${gia} (${viTri || "Xem chi tiết"})`,
            url: `${SITE_URL}/listings/${x.id}`,
          },
        ]);
      });

      resp += `Anh/chị có thể bấm vào từng căn để xem ảnh thực tế & đặt lịch xem trực tiếp! ✨`;

      buttons.push([
        { text: "🔍 Tìm kiếm thêm trên web", url: `${SITE_URL}/search` },
        { text: "💬 Zalo Hotline: 0346689460", url: "https://zalo.me/0346689460" },
      ]);

      await sendTelegramMessage(resp, {
        chatId,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons },
      });
    } else {
      await sendTelegramMessage(
        `Hiện tại chưa có tin nào khớp 100% với yêu cầu trên.\n\nAnh/chị có thể xem thêm các phòng đang trống gần khu vực đó tại website hoặc liên hệ hotline để bên em kiểm tra thêm rổ hàng mới về nhé! 🏠`,
        {
          chatId,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔍 Xem tất cả phòng trống", url: `${SITE_URL}/search` }],
              [{ text: "💬 Zalo Hotline: 0346689460", url: "https://zalo.me/0346689460" }],
            ],
          },
        }
      );
    }
    return NextResponse.json({ ok: true });
  }

  // 4.3. KHÁC (Chào hỏi hoặc câu hỏi chung)
  const defaultReply =
    ai.reply_hint ||
    `Dạ em chào ${userName}! Em là trợ lý NhaDat Radar.\n\n` +
      `• Để <b>TÌM NHÀ/PHÒNG:</b> Anh/chị nhắn ví dụ <i>"tìm phòng trọ Tân Bình dưới 6 triệu"</i>.\n` +
      `• Để <b>ĐĂNG TIN:</b> Anh/chị gửi thông tin (giá, diện tích, khu vực, SĐT).\n` +
      `• Hoặc truy cập trực tiếp web để xem toàn bộ rổ hàng xác thực ạ!`;

  await sendTelegramMessage(defaultReply, {
    chatId,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🌐 Khám phá NhaDat Radar", url: SITE_URL }],
        [{ text: "💬 Zalo Hotline: 0346689460", url: "https://zalo.me/0346689460" }],
      ],
    },
  });

  return NextResponse.json({ ok: true });
}
