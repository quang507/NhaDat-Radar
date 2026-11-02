"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dongRoiDi } from "@/lib/dong-roi-di";
import { HOTLINE, HOTLINE_DISPLAY } from "@/lib/hotline";
import { baoGA } from "@/lib/su-kien-client";
import { LinkTheoDoi } from "./TheoDoi";
import { Bot, X, Send, PhoneCall, Home, RotateCcw } from "lucide-react";

// Khung chat trợ lý AI (2/11, audit P3): tách khỏi ChatWidget, tải bằng next/dynamic ssr:false chỉ khi khách
// bấm mở lần đầu -> trang không phải tải/hydrate khung chat cho người không dùng.

type MiniListing = { id: string; title: string; price: string; meta: string; image: string | null };
// link (26/10): nút mở trang liên quan - "xem cả N tin quanh dự án trên bản đồ", "trang dự án"
// loi (2/11, audit M7): tin báo lỗi -> hiện nút "Thử lại" + hotline, không gửi lên API
type Msg = { role: "user" | "bot"; text: string; listings?: MiniListing[]; suggestions?: string[]; link?: { href: string; label: string } | null; loi?: boolean };

const GREET_DEFAULT: Msg = {
  role: "bot",
  text: "Dạ em là trợ lý AI của Radar! Anh/chị đang tìm phòng khu vực nào, ngân sách tầm bao nhiêu để em lọc rổ hàng 1.400+ căn trống hôm nay gửi liền cho mình tham khảo ạ?",
  suggestions: ["Phòng trọ Bình Thạnh dưới 4tr", "Studio Quận 7 có ban công", "Phòng Tân Bình nuôi pet"],
};

const CHIPS_DEFAULT = [
  "Phòng trọ Bình Thạnh dưới 4tr",
  "Nhà Tân Phú 3 - 5 tỷ hxh",
  "Căn hộ 2PN Quận 7",
  "Liên hệ Hotline hỗ trợ",
];

const CHIPS_DANG_XEM = [
  "Gợi ý căn tương tự",
  "Căn này còn trống không?",
  "Tư vấn & hẹn xem nhà",
  "Liên hệ Hotline hỗ trợ",
];

export default function ChatPanel({ open, dangXem, onClose }: { open: boolean; dangXem: string | null; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    dangXem
      ? {
          role: "bot",
          text: "Xin chào, mình là trợ lý AI của Radar! Bạn đang xem tin bất động sản này 🏠\n\nBạn muốn tìm thêm các căn tương tự hay cần tư vấn & hẹn xem trực tiếp?",
          suggestions: ["Gợi ý căn tương tự", "Căn này còn trống không?", "Tư vấn & hẹn xem nhà"],
        }
      : GREET_DEFAULT,
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const chips = dangXem ? CHIPS_DANG_XEM : CHIPS_DEFAULT;
  const router = useRouter();

  // Bấm tin / link trong chat: đóng khung (gỡ mục lịch sử Back) XONG mới chuyển trang - xem lib/dong-roi-di.
  // Ctrl/Cmd/Shift-click (mở tab mới) để trình duyệt tự xử lý.
  const moLink = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    dongRoiDi(onClose, () => router.push(href));
  };

  useEffect(() => {
    if (open) bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  async function goiApi(next: Msg[]) {
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => !m.loi).map(({ role, text }) => ({ role, text })), dangXem }),
      });
      // 2/11 (audit M7): 5xx / trả HTML (timeout Vercel) -> báo lỗi kèm nút Thử lại, không nuốt thành "lỗi mạng"
      const j = await res.json().catch(() => null);
      if (!j || (res.status >= 500 && !j.reply)) throw new Error(`chat ${res.status}`);
      // server đã lưu SĐT khách để lại trong chat -> ghi chuyển đổi GA như các form để lại SĐT
      if (j.daLuuLead === true) baoGA("ndr_de_lai_sdt", { kieu: "chat_ai" });
      setMsgs((m) => [
        ...m,
        {
          role: "bot",
          text: j.reply || "Xin lỗi, mình chưa trả lời được.",
          listings: j.listings,
          suggestions: j.suggestions,
          // chỉ nhận link nội bộ ("/..."), không mở link lạ từ phản hồi
          link: j.link && typeof j.link.href === "string" && j.link.href.startsWith("/") && !j.link.href.startsWith("//") ? j.link : null,
        },
      ]);
    } catch {
      setMsgs((m) => [...m, { role: "bot", text: "Trợ lý AI đang trục trặc, chưa trả lời được. Bạn bấm Thử lại hoặc gọi Hotline để gặp chuyên viên nhé.", loi: true }]);
    } finally {
      setBusy(false);
    }
  }

  function handleSendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");

    if (trimmed === "Liên hệ Hotline hỗ trợ") {
      setMsgs((m) => [
        ...m,
        { role: "user", text: trimmed },
        {
          role: "bot",
          text: `Bạn có thể liên hệ trực tiếp với Chuyên viên tư vấn Radar qua Hotline ${HOTLINE} để được hỗ trợ nhanh nhất. Nếu cần tìm thêm căn nào, bạn cứ nhắn mình ở đây nhé!`,
        },
      ]);
      return;
    }

    const next: Msg[] = [...msgs, { role: "user", text: trimmed }];
    setMsgs(next);
    void goiApi(next);
  }

  // Thử lại: bỏ tin báo lỗi cuối, gửi lại đúng lịch sử có tin nhắn cuối của khách
  function thuLai() {
    if (busy) return;
    const next = msgs[msgs.length - 1]?.loi ? msgs.slice(0, -1) : msgs;
    setMsgs(next);
    void goiApi(next);
  }

  // đóng thì chỉ ẩn (không gỡ) để giữ lịch sử chat khi khách mở lại
  return (
    <div
      role="dialog"
      aria-label="Trợ lý AI Radar"
      className={`fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-24 right-4 lg:right-5 z-50 w-[min(400px,calc(100vw-2rem))] h-[min(560px,70dvh)]
                 card rounded-md shadow-zen-4 flex-col overflow-hidden border border-[var(--line)] ${open ? "flex" : "hidden"}`}
    >
      {/* Header */}
      <div className="pl-4 pr-2 py-1.5 bg-brand text-white flex items-center justify-between">
        <div>
          <div className="font-bold flex items-center gap-1.5 text-body-sm">
            <Bot className="w-4 h-4" />
            {/* 2/11 (Luật AI 134/2025 Điều 11 khoản 1): người dùng phải biết đang nói chuyện với AI */}
            <span>Trợ lý AI Radar</span>
            <span className="text-overline border border-current px-1.5 py-0.5 rounded-sm">AI</span>
          </div>
          <div className="text-caption text-white/80">Tự động lọc phòng trống &amp; nhà đất theo yêu cầu</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 min-w-11 grid place-items-center text-white/80 hover:text-white rounded-sm hover:bg-black/10 transition"
          aria-label="Đóng chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Sub-bar: thông báo AI + dữ liệu (NĐ 142/2026 Điều 18: báo trước khi người dùng nhập) + Hotline gặp người thật.
          Trước 2/11 ghi "Chuyên viên trực tuyến" + chấm xanh nhấp nháy -> khách tưởng đang chat với người. */}
      <div className="px-3 py-1.5 bg-[var(--surface-2)] border-b border-[var(--line)] text-caption text-[var(--ink-soft)] leading-relaxed">
        Bạn đang trò chuyện với trợ lý AI (Google Gemini), không phải nhân viên. Nếu bạn gửi SĐT, Radar sẽ lưu để liên hệ
        tư vấn.{" "}
        <a href="/chinh-sach-bao-mat#ai" className="underline hover:text-brand">Chính sách</a>
      </div>
      <div className="px-3 py-1.5 bg-[var(--surface-2)] border-b border-[var(--line)] flex items-center justify-between text-caption">
        <span className="text-[var(--ink-soft)] font-semibold">Cần gặp người thật?</span>
        {/* 2/11 (audit Q6): gọi từ khung chat cũng ghi ndr_goi; min-h-11 + -my-2 nới vùng chạm mà không cao thanh */}
        <LinkTheoDoi
          loai="goi"
          listingId={dangXem}
          href={`tel:${HOTLINE}`}
          className="min-h-11 -my-2 font-semibold text-brand hover:underline flex items-center gap-1"
        >
          <PhoneCall className="w-3 h-3" />
          <span>Hotline: {HOTLINE_DISPLAY}</span>
        </LinkTheoDoi>
      </div>

      {/* Body chat */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {msgs.map((m, i) => (
          <div key={i}>
            <div className={`max-w-[85%] rounded-md px-3 py-2 text-body-sm whitespace-pre-wrap leading-relaxed ${
              m.role === "user"
                ? "ml-auto bg-brand text-white shadow-zen-1"
                : "bg-[var(--surface-2)] border border-[var(--line)]"
            }`}>
              {m.text}
            </div>
            {m.loi && i === msgs.length - 1 && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={thuLai} disabled={busy} className="btn btn-primary min-h-11 text-body-sm font-bold">
                  <RotateCcw className="w-4 h-4" />
                  Thử lại
                </button>
                <LinkTheoDoi loai="goi" listingId={dangXem} href={`tel:${HOTLINE}`} className="btn min-h-11 text-body-sm font-bold">
                  <PhoneCall className="w-4 h-4" />
                  Gọi {HOTLINE_DISPLAY}
                </LinkTheoDoi>
              </div>
            )}
            {m.listings && m.listings.length > 0 && (
              <div className="mt-2.5 space-y-2">
                {m.listings.map((l) => (
                  <Link
                    key={l.id}
                    href={`/listings/${l.id}`}
                    className="flex gap-2.5 card rounded-md p-2 hover:shadow-zen-2 transition border border-[var(--line)]"
                    onClick={(e) => moLink(e, `/listings/${l.id}`)}
                  >
                    <div className="w-16 h-16 rounded-sm overflow-hidden bg-[var(--surface-2)] shrink-0 grid place-items-center">
                      {l.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Home className="w-6 h-6 text-[var(--ink-faint)]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-caption font-semibold leading-snug line-clamp-2">{l.title}</div>
                      <div className="text-brand font-bold text-caption mt-0.5">{l.price}</div>
                      <div className="text-overline text-[var(--ink-soft)] truncate mt-0.5">{l.meta}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {m.link && (
              <Link href={m.link.href} onClick={(e) => moLink(e, m.link!.href)}
                className="mt-2 btn btn-primary w-full min-h-11 text-body-sm font-bold">
                {m.link.label} ›
              </Link>
            )}
            {m.suggestions && m.suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {m.suggestions.map((sug, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    disabled={busy}
                    onClick={() => handleSendText(sug)}
                    className="min-h-11 text-caption font-medium px-2.5 py-1 rounded-sm bg-brand/10 text-brand hover:bg-brand hover:text-white transition-all border border-brand/20 active:scale-95 text-left inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>💡</span>
                    <span>{sug}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="text-caption text-[var(--ink-faint)] px-2 animate-pulse">Đang tìm kiếm căn phù hợp…</div>}
      </div>

      {/* Quick chips gợi ý */}
      <div className="cuon-ngang px-3 py-1 bg-[var(--surface)] border-t border-[var(--line)] overflow-x-auto flex gap-1.5 [scrollbar-width:none]">
        {chips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendText(chip)}
            disabled={busy}
            className="min-h-11 text-caption whitespace-nowrap px-2.5 rounded-sm bg-[var(--surface-2)] hover:bg-brand/10 hover:text-brand border border-[var(--line)] transition cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input form */}
      <form
        className="p-2 border-t border-[var(--line)] bg-[var(--surface)] flex gap-2"
        onSubmit={(e) => { e.preventDefault(); handleSendText(input); }}
      >
        <input
          className="inp !py-2 min-h-11 text-body-sm flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhắn yêu cầu: 'phòng Bình Thạnh dưới 4tr'…"
          aria-label="Nhắn trợ lý AI"
        />
        <button className="btn btn-primary min-h-11 min-w-11 !px-3.5 flex items-center justify-center cursor-pointer" type="submit" disabled={busy || !input.trim()} aria-label="Gửi câu hỏi">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
