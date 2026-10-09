"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HOTLINE, HOTLINE_ZALO } from "@/lib/hotline";
import { Bot, Sparkles, X, Send, PhoneCall, Home } from "lucide-react";

type MiniListing = { id: string; title: string; price: string; meta: string; image: string | null };
type Msg = { role: "user" | "bot"; text: string; listings?: MiniListing[] };

const GREET: Msg = {
  role: "bot",
  text: "Xin chào! Mình là trợ lý AI của NhaDat Radar.\n\nMình có thể hỗ trợ bạn:\n• Tìm nhà bán / cho thuê theo tầm giá & khu vực\n• Kiểm tra tin đã xác minh, tư vấn pháp lý\n• Đặt lịch hẹn xem nhà thực tế với chuyên viên\n\nBạn đang quan tâm bất động sản ở khu vực nào?",
};

const CHIPS = [
  "Nhà Tân Phú dưới 8 tỷ",
  "Nhà Bình Tân 3 - 4 tỷ",
  "Cần xem sổ hồng & tư vấn",
  "Liên hệ Hotline hỗ trợ",
];

// Chatbot nổi góc phải: hỏi đáp tìm nhà bằng AI, thu thập lead và kết nối chuyên viên
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREET]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  // đang ở trang chi tiết tin -> gửi kèm id để bot hiểu "phòng này còn không", "giá bao nhiêu"
  const dangXem = usePathname()?.match(/^\/listings\/([0-9a-f-]{36})/i)?.[1] || null;

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  async function handleSendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");

    // Nếu bấm chip Hotline
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
      setMsgs((m) => [...m, { role: "bot", text: j.reply || "Xin lỗi, mình chưa trả lời được.", listings: j.listings }]);
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
      {/* Nút mở trợ lý AI (không chèn thêm nút Zalo nổi riêng để giữ giao diện thanh lịch) */}
      <button
        aria-label="Mở trợ lý AI"
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-20 lg:bottom-5 right-4 lg:right-5 z-50 w-12 h-12 lg:w-14 lg:h-14 rounded-full shadow-lg grid place-items-center
                   bg-brand text-white hover:scale-105 active:scale-95 transition ${open ? "" : "float-cta"}`}
      >
        {open ? <X className="w-5 h-5" /> : <Sparkles className="w-6 h-6" />}
      </button>

      {open && (
        <div className="fixed bottom-36 lg:bottom-24 right-4 lg:right-5 z-50 w-[min(400px,calc(100vw-2rem))] h-[560px] max-h-[75vh]
                        card rounded-xl shadow-2xl flex flex-col overflow-hidden border border-[var(--line)]">
          {/* Header */}
          <div className="px-4 py-3 bg-brand text-white flex items-center justify-between">
            <div>
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <Bot className="w-4 h-4" />
                <span>Trợ lý AI Radar</span>
                <span className="text-[0.65rem] bg-white/20 px-1.5 py-0.5 rounded-full font-normal">24/7</span>
              </div>
              <div className="text-xs text-white/80">Tìm nhà nhanh · Kiểm tra giá thật</div>
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
              <span>Trực tuyến</span>
            </div>
            <a
              href={`tel:${HOTLINE}`}
              className="font-semibold text-brand hover:underline flex items-center gap-1"
            >
              <PhoneCall className="w-3 h-3" />
              <span>Hotline: {HOTLINE}</span>
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
              </div>
            ))}
            {busy && <div className="text-xs text-[var(--ink-faint)] px-2 animate-pulse">Đang tìm kiếm dữ liệu nhà đất…</div>}
          </div>

          {/* Quick chips gợi ý */}
          <div className="px-3 py-1.5 bg-[var(--surface)] border-t border-[var(--line)] overflow-x-auto flex gap-1.5 [scrollbar-width:none]">
            {CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendText(chip)}
                disabled={busy}
                className="text-[0.7rem] whitespace-nowrap px-2.5 py-1 rounded-full bg-[var(--surface-2)] hover:bg-brand/10 hover:text-brand border border-[var(--line)] transition"
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
              placeholder="Hỏi AI: 'nhà Tân Phú dưới 8 tỷ', để lại SĐT…"
            />
            <button className="btn btn-primary !px-3.5 flex items-center justify-center" type="submit" disabled={busy || !input.trim()} aria-label="Gửi câu hỏi">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
