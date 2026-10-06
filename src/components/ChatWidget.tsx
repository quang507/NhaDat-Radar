"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HOTLINE, HOTLINE_ZALO } from "@/lib/hotline";

type MiniListing = { id: string; title: string; price: string; meta: string; image: string | null };
type Msg = { role: "user" | "bot"; text: string; listings?: MiniListing[] };

const GREET: Msg = {
  role: "bot",
  text: "Xin chào! Mình là trợ lý AI của NhaDat Radar 🏠\n\nMình có thể hỗ trợ bạn:\n• Tìm nhà bán/thuê theo tầm giá & khu vực\n• Xem nhà rổ hàng ưu tiên, kiểm tra pháp lý\n• Đặt lịch hẹn xem nhà thực tế với chuyên viên\n\nBạn đang quan tâm nhà ở khu vực nào?",
};

const CHIPS = [
  "🏡 Nhà Tân Phú dưới 8 tỷ",
  "🔑 Nhà Bình Tân 3 - 4 tỷ",
  "📑 Cần xem sổ hồng & tư vấn",
  "📞 Gặp chuyên viên Zalo",
];

// Chatbot nổi góc phải: hỏi đáp tìm nhà bằng AI, thu thập lead và kết nối Hotline/Zalo
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

    // Nếu bấm chip Zalo
    if (trimmed === "📞 Gặp chuyên viên Zalo") {
      window.open(HOTLINE_ZALO, "_blank", "noopener");
      setMsgs((m) => [
        ...m,
        { role: "user", text: trimmed },
        {
          role: "bot",
          text: `Dạ em đã mở cửa sổ chat Zalo để anh/chị trao đổi trực tiếp với Chuyên viên (Hotline: ${HOTLINE}). Nếu cần tìm thêm căn nào, anh/chị cứ nhắn ở đây nhé!`,
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
      {/* Nút Zalo người thật */}
      <a
        href={HOTLINE_ZALO}
        target="_blank"
        rel="noopener"
        aria-label="Chat Zalo Hotline"
        title="Chat Zalo Chuyên Viên: 0346 689 460"
        className="fixed bottom-36 lg:bottom-24 right-4 lg:right-5 z-40 w-12 h-12 lg:w-14 lg:h-14 rounded-full shadow-lg grid place-items-center bg-[#0068ff] text-white hover:scale-110 active:scale-95 transition"
      >
        <span className="font-extrabold text-xs lg:text-sm tracking-tight">Zalo</span>
      </a>

      {/* Nút mở trợ lý AI */}
      <button
        aria-label="Mở trợ lý AI"
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-20 lg:bottom-5 right-4 lg:right-5 z-50 w-12 h-12 lg:w-14 lg:h-14 rounded-full shadow-lg text-2xl grid place-items-center
                   bg-gradient-to-br from-brand to-brand-2 text-white hover:scale-110 active:scale-95 transition ${open ? "" : "float-cta"}`}
      >
        {open ? "✕" : "🤖"}
      </button>

      {open && (
        <div className="fixed bottom-36 lg:bottom-24 right-4 lg:right-5 z-50 w-[min(400px,calc(100vw-2rem))] h-[560px] max-h-[75vh]
                        card rounded-xl shadow-2xl flex flex-col overflow-hidden border border-[var(--line)]">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-brand to-brand-2 text-white flex items-center justify-between">
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <span>🤖 Trợ lý AI Radar</span>
                <span className="text-[0.65rem] bg-white/20 px-1.5 py-0.5 rounded-full font-normal">24/7</span>
              </div>
              <div className="text-xs opacity-90">Tìm nhà nhanh · Đặt lịch xem trực tiếp</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white text-lg p-1"
              aria-label="Đóng chat"
            >
              ✕
            </button>
          </div>

          {/* Sub-bar Hotline & Zalo */}
          <div className="px-3 py-1.5 bg-[var(--surface-2)] border-b border-[var(--line)] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Trực tuyến</span>
            </div>
            <a
              href={HOTLINE_ZALO}
              target="_blank"
              rel="noopener"
              className="font-bold text-[#0068ff] hover:underline flex items-center gap-1"
            >
              <span>💬 Zalo: {HOTLINE}</span>
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
                          ) : "🏠"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold leading-snug line-clamp-2">{l.title}</div>
                          <div className="text-brand font-bold text-xs mt-0.5">{l.price}</div>
                          <div className="text-[0.65rem] text-[var(--ink-soft)] truncate mt-0.5">{l.meta}</div>
                        </div>
                      </Link>
                    ))}
                    <div className="pt-1 text-center">
                      <a
                        href={HOTLINE_ZALO}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#0068ff] bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition"
                      >
                        💬 Nhắn Zalo hẹn xem nhà hoặc xem sổ hồng →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="text-xs text-[var(--ink-faint)] px-2 animate-pulse">Đang tìm kiếm dữ liệu nhà đất…</div>}
          </div>

          {/* Quick chips gợi ý */}
          <div className="px-3 py-1.5 bg-[var(--surface)] border-t border-[var(--line)] overflow-x-auto flex gap-1.5 no-scrollbar">
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
            <button className="btn btn-primary !px-4" type="submit" disabled={busy || !input.trim()} aria-label="Gửi câu hỏi">
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
