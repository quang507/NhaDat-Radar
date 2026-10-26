"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HOTLINE, HOTLINE_ZALO } from "@/lib/hotline";
import { Bot, Sparkles, X, Send, PhoneCall, Home, MessageCircle, ChevronUp } from "lucide-react";

type MiniListing = { id: string; title: string; price: string; meta: string; image: string | null };
// link (26/10): nút mở trang liên quan - "xem cả N tin quanh dự án trên bản đồ", "trang dự án"
type Msg = { role: "user" | "bot"; text: string; listings?: MiniListing[]; suggestions?: string[]; link?: { href: string; label: string } | null };

const GREET_DEFAULT: Msg = {
  role: "bot",
  text: "Xin chào! Mình là trợ lý của NhaDat Radar 🏠\n\nMình có thể lọc nhanh căn phù hợp theo nhu cầu của bạn. Bạn muốn xem phương án nào?",
  suggestions: ["Phòng trọ Bình Thạnh dưới 4tr", "Nhà Tân Phú 3 - 5 tỷ hxh", "Căn hộ 2PN Quận 7"],
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

// Cụm liên hệ nhanh nổi góc phải: Zalo + Gọi điện + Hỏi trợ lý
export default function ChatWidget() {
  const pathname = usePathname();
  // đang ở trang chi tiết tin -> gửi kèm id để bot hiểu
  const dangXem = pathname?.match(/^\/listings\/([0-9a-f-]{36})/i)?.[1] || null;
  const anThanhDay = !!dangXem || pathname === "/lap-phong" || pathname?.startsWith("/admin") || pathname?.startsWith("/dashboard");

  const [open, setOpen] = useState(false);
  const [daMoRong, setDaMoRong] = useState(false);
  const [reChuot, setReChuot] = useState(false);
  const moRong = daMoRong || reChuot || open;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const [msgs, setMsgs] = useState<Msg[]>([
    dangXem
      ? {
          role: "bot",
          text: "Xin chào! Bạn đang xem tin bất động sản này 🏠\n\nBạn muốn tìm thêm các căn tương tự hay cần tư vấn & hẹn xem trực tiếp?",
          suggestions: ["Gợi ý căn tương tự", "Căn này còn trống không?", "Tư vấn & hẹn xem nhà"],
        }
      : GREET_DEFAULT,
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const chips = dangXem ? CHIPS_DANG_XEM : CHIPS_DEFAULT;

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  async function handleSendText(text: string) {
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
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, text }) => ({ role, text })), dangXem }),
      });
      const j = await res.json();
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
      setMsgs((m) => [...m, { role: "bot", text: "Có lỗi mạng, bạn thử lại giúp mình nhé." }]);
    } finally {
      setBusy(false);
    }
  }

  function send() {
    handleSendText(input);
  }

  return (
    <>
      {/* MOBILE (25/10, ZEN thumb zone): thanh 3 nút dính đáy thay cho cụm nút nổi - cụm cũ đè lên thẻ tin/
          ô tìm kiếm ở 375-414px. Trang tin đã có thanh Gọi/Zalo riêng (kèm giá + mã phòng) -> ẩn ở đó. */}
      {/* /lap-phong có thanh "Đăng ký lấp phòng" riêng -> không chồng 2 thanh dính đáy */}
      {!anThanhDay && (
        <>
          <div className="lg:hidden h-[calc(4.5rem+env(safe-area-inset-bottom))]" aria-hidden />
          <nav aria-label="Liên hệ nhanh" className="lg:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-[1fr_1fr_auto] gap-2 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur">
            <a href={`tel:${HOTLINE}`} aria-label={`Gọi Hotline ${HOTLINE}`} className="btn btn-primary min-h-11 font-bold">
              <PhoneCall className="w-4 h-4" />
              <span>Gọi ngay</span>
            </a>
            <a href={HOTLINE_ZALO} target="_blank" rel="noopener noreferrer" aria-label="Nhắn Zalo tư vấn phòng" className="btn min-h-11 font-bold !border-[#0068ff] !text-[#0068ff]">
              <MessageCircle className="w-4 h-4" />
              <span>Zalo</span>
            </a>
            <button type="button" aria-label={open ? "Đóng trợ lý AI" : "Mở trợ lý AI"} onClick={() => setOpen((v) => !v)} className="btn min-h-11 min-w-11 !px-3">
              {open ? <X className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-amber-500" />}
            </button>
          </nav>
        </>
      )}

      {/* Máy tính: cụm liên hệ nhanh góc phải (co lại mặc định, hover hoặc click để xổ ra) */}
      <div
        className="fixed bottom-6 right-6 z-40 hidden lg:flex flex-col items-end gap-2"
        onMouseEnter={() => setReChuot(true)}
        onMouseLeave={() => setReChuot(false)}
      >
        {/* Menu xổ ra: Hotline + Zalo + Hỏi AI */}
        <div
          className={`flex flex-col items-end gap-2 transition-all duration-300 origin-bottom ${
            moRong
              ? "opacity-100 translate-y-0 pointer-events-auto max-h-60"
              : "opacity-0 translate-y-3 pointer-events-none max-h-0 overflow-hidden"
          }`}
        >
          {/* Nút Gọi Hotline trực tiếp */}
          <a
            href={`tel:${HOTLINE}`}
            aria-label={`Gọi Hotline ${HOTLINE}`}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md hover:shadow-lg active:scale-95 transition-all border border-emerald-600"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Hotline: 0387 365 020</span>
          </a>

          {/* Nút Chat Zalo */}
          <a
            href={HOTLINE_ZALO}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Nhắn Zalo tư vấn phòng"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#0068ff] hover:bg-[#0057d9] text-white text-xs font-bold shadow-md hover:shadow-lg hover:border-blue-700 active:scale-95 transition-all border border-blue-600"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>Nhắn Zalo tư vấn 24/7</span>
          </a>

          {/* Nút Trợ lý AI */}
          <button
            type="button"
            aria-label="Mở trợ lý AI"
            onClick={() => {
              setOpen((v) => !v);
              setDaMoRong(false);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-semibold shadow-md transition active:scale-95 cursor-pointer border border-slate-800"
          >
            {open ? <X className="w-3.5 h-3.5 text-slate-300" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
            <span>{open ? "Đóng trợ lý AI" : "Hỏi trợ lý AI"}</span>
          </button>
        </div>

        {/* Nút chính thu gọn: Click hoặc Hover vào đây để xổ menu 3 nút ra */}
        <button
          type="button"
          aria-expanded={moRong}
          aria-label={moRong ? "Thu gọn cụm liên hệ" : "Mở liên hệ nhanh và hỏi AI"}
          onClick={() => setDaMoRong((v) => !v)}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-white text-xs font-bold shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer border ${
            moRong
              ? "bg-slate-800 hover:bg-slate-900 border-slate-700 text-slate-200"
              : "bg-emerald-700 hover:bg-emerald-800 border-emerald-600 animate-pulse-zoom"
          }`}
        >
          {moRong ? (
            <>
              <X className="w-4 h-4" />
              <span>Thu gọn</span>
            </>
          ) : (
            <>
              <MessageCircle className="w-4 h-4" />
              <span>Liên hệ &amp; Hỏi AI</span>
              <ChevronUp className="w-3.5 h-3.5 text-emerald-200" />
            </>
          )}
        </button>
      </div>

      {open && (
        <div className="fixed bottom-20 lg:bottom-24 right-4 lg:right-5 z-50 w-[min(400px,calc(100vw-2rem))] h-[560px] max-h-[75vh]
                        card rounded-lg shadow-lg flex flex-col overflow-hidden border border-slate-300">
          {/* Header */}
          <div className="px-4 py-3 bg-brand text-white flex items-center justify-between">
            <div>
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <Bot className="w-4 h-4" />
                <span>Trợ lý Tìm Nhà Radar</span>
                <span className="text-[0.65rem] bg-white/20 px-1.5 py-0.5 rounded-md font-normal">24/7</span>
              </div>
              <div className="text-xs text-white/80">Lọc nhanh phòng trống &amp; nhà đất xác minh</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              aria-label="Đóng chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub-bar Hotline */}
          <div className="px-3 py-1.5 bg-[var(--surface-2)] border-b border-[var(--line)] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Chuyên viên trực tuyến</span>
            </div>
            <a
              href={`tel:${HOTLINE}`}
              className="font-semibold text-brand hover:underline flex items-center gap-1"
            >
              <PhoneCall className="w-3 h-3" />
              <span>Hotline: 0387 365 020</span>
            </a>
          </div>

          {/* Body chat */}
          <div ref={bodyRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {msgs.map((m, i) => (
              <div key={i}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-brand text-white rounded-br-sm shadow-sm"
                    : "bg-[var(--surface-2)] rounded-bl-sm border border-[var(--line)]"
                }`}>
                  {m.text}
                </div>
                {m.listings && m.listings.length > 0 && (
                  <div className="mt-2.5 space-y-2">
                    {m.listings.map((l) => (
                      <Link
                        key={l.id}
                        href={`/listings/${l.id}`}
                        className="flex gap-2.5 card rounded-xl p-2 hover:shadow-md transition border border-[var(--line)]"
                        onClick={() => setOpen(false)}
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-[var(--surface-2)] shrink-0 grid place-items-center">
                          {l.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={l.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Home className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold leading-snug line-clamp-2">{l.title}</div>
                          <div className="text-brand font-bold text-xs mt-0.5">{l.price}</div>
                          <div className="text-[0.65rem] text-[var(--ink-soft)] truncate mt-0.5">{l.meta}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {m.link && (
                  <Link href={m.link.href} onClick={() => setOpen(false)}
                    className="mt-2 btn btn-primary w-full min-h-11 text-sm font-bold">
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
                        className="text-[0.72rem] font-medium px-2.5 py-1 rounded-md bg-brand/10 text-brand hover:bg-brand hover:text-white transition-all border border-brand/20 active:scale-95 text-left inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>💡</span>
                        <span>{sug}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="text-xs text-[var(--ink-faint)] px-2 animate-pulse">Đang tìm kiếm căn phù hợp…</div>}
          </div>

          {/* Quick chips gợi ý */}
          <div className="cuon-ngang px-3 py-1.5 bg-[var(--surface)] border-t border-[var(--line)] overflow-x-auto flex gap-1.5 [scrollbar-width:none]">
            {chips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendText(chip)}
                disabled={busy}
                className="text-[0.7rem] whitespace-nowrap px-2.5 py-1 rounded-md bg-[var(--surface-2)] hover:bg-brand/10 hover:text-brand border border-[var(--line)] transition cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input form */}
          <form
            className="p-2 border-t border-[var(--line)] bg-[var(--surface)] flex gap-2"
            onSubmit={(e) => { e.preventDefault(); send(); }}
          >
            <input
              className="inp !py-2 text-sm flex-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhắn yêu cầu: 'phòng Bình Thạnh dưới 4tr'…"
            />
            <button className="btn btn-primary !px-3.5 flex items-center justify-center cursor-pointer" type="submit" disabled={busy || !input.trim()} aria-label="Gửi câu hỏi">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
