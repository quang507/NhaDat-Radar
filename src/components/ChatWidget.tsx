"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type MiniListing = { id: string; title: string; price: string; meta: string; image: string | null };
type Msg = { role: "user" | "bot"; text: string; listings?: MiniListing[] };

const GREET: Msg = {
  role: "bot",
  text: "Xin chào! Mình là trợ lý AI của NhaDat Radar 🏠 Hỏi mình kiểu:\n• “căn hộ 2PN dưới 3 tỷ ở Hà Nội”\n• “quận nào ở Hà Nội đáng đầu tư?”\n• “giá thuê Đà Nẵng khu nào rẻ?”",
};

// Chatbot nổi góc phải: hỏi đáp tìm nhà bằng AI, trả về thẻ tin bấm được.
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREET]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const next: Msg[] = [...msgs, { role: "user", text }];
    setMsgs(next);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, text }) => ({ role, text })) }),
      });
      const j = await res.json();
      setMsgs((m) => [...m, { role: "bot", text: j.reply || "Xin lỗi, mình chưa trả lời được.", listings: j.listings }]);
    } catch {
      setMsgs((m) => [...m, { role: "bot", text: "Có lỗi mạng, bạn thử lại giúp mình nhé." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Nút mở chat */}
      <button
        aria-label="Mở trợ lý AI"
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-lg text-2xl grid place-items-center
                   bg-gradient-to-br from-brand to-brand-2 text-white hover:scale-110 active:scale-95 transition ${open ? "" : "float-cta"}`}
      >
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[min(380px,calc(100vw-2.5rem))] h-[520px] max-h-[70vh]
                        card rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-brand to-brand-2 text-white">
            <div className="font-bold">Trợ lý NhaDat Radar</div>
            <div className="text-xs opacity-90">AI tìm nhà đất theo yêu cầu của bạn</div>
          </div>

          <div ref={bodyRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {msgs.map((m, i) => (
              <div key={i}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "ml-auto bg-brand text-white rounded-br-sm"
                    : "bg-[var(--surface-2)] rounded-bl-sm"
                }`}>
                  {m.text}
                </div>
                {m.listings && m.listings.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {m.listings.map((l) => (
                      <Link
                        key={l.id}
                        href={`/listings/${l.id}`}
                        className="flex gap-2 card rounded-xl p-2 hover:shadow-md transition"
                        onClick={() => setOpen(false)}
                      >
                        <div className="w-16 h-14 rounded-lg overflow-hidden bg-[var(--surface-2)] shrink-0 grid place-items-center">
                          {l.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={l.image} alt="" className="w-full h-full object-cover" />
                          ) : "🏠"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold leading-snug line-clamp-2">{l.title}</div>
                          <div className="text-brand font-bold text-xs mt-0.5">{l.price}</div>
                          <div className="text-[0.65rem] text-[var(--ink-soft)] truncate">{l.meta}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="text-xs text-[var(--ink-faint)] px-2 animate-pulse">Đang tìm giúp bạn…</div>}
          </div>

          <form
            className="p-2 border-t border-[var(--line)] flex gap-2"
            onSubmit={(e) => { e.preventDefault(); send(); }}
          >
            <input
              className="inp !py-2 text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="VD: căn hộ 2PN dưới 3 tỷ Hà Nội…"
            />
            <button className="btn btn-primary !px-4" type="submit" disabled={busy}>➤</button>
          </form>
        </div>
      )}
    </>
  );
}
