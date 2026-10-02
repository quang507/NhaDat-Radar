"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { deLaiSdt } from "@/app/listings/actions";
import { signInWithGoogle } from "@/app/auth/actions";
import { LinkTheoDoi } from "./TheoDoi";
import { baoGA } from "@/lib/su-kien-client";
import { HOTLINE } from "@/lib/hotline";

// "BẤM ĐỂ HIỆN SỐ" (2/10, kiểu batdongsan/Chợ Tốt): số hotline Radar hiện dạng 0346 689 xxx. Bấm -> bảng
// "Đăng ký / đăng nhập để tiếp tục": đăng nhập Google HOẶC nhập SĐT -> hiện số + ghi lead (SĐT khách) để
// Radar gọi lại nếu khách chưa kịp gọi. Thay form đặt lịch nhiều ô (tên, ngày, buổi) - ít ô = nhiều lead hơn.
// Đã đăng nhập / đã để lại SĐT trên máy này -> hiện số luôn, không hỏi lại.

const KHOA = "ndr_hien_so";
const dep = (s: string) => s.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3");
const SO_DEP = dep(HOTLINE);
const SO_AN = SO_DEP.replace(/\d{3}$/, "xxx");

export default function HienSoRadar({ listingId, nho = false, className = "" }: {
  listingId?: string;
  nho?: boolean;          // thanh dính đáy màn hình điện thoại: nút gọn
  className?: string;
}) {
  const [daHien, setDaHien] = useState(false);
  const [mo, setMo] = useState(false);

  useEffect(() => {
    try { if (localStorage.getItem(KHOA) === "1") { setDaHien(true); return; } } catch { /* chặn localStorage */ }
    // getSession đọc cookie tại chỗ, không gọi mạng
    createClient().auth.getSession().then(({ data }) => { if (data.session) setDaHien(true); }).catch(() => {});
  }, []);

  if (daHien) {
    return (
      <LinkTheoDoi loai="goi" listingId={listingId || ""} href={`tel:${HOTLINE}`}
        className={`btn btn-primary text-center whitespace-nowrap ${nho ? "min-h-12 !px-3" : "w-full"} ${className}`}>
        📞 {nho ? "Gọi" : `Gọi ${SO_DEP}`}
      </LinkTheoDoi>
    );
  }
  return (
    <>
      <button type="button" onClick={() => { setMo(true); baoGA("ndr_bam_hien_so", { listing_id: listingId }); }}
        className={`btn whitespace-nowrap font-bold ${nho ? "btn-primary min-h-12 !px-3" : "text-left w-full flex items-center justify-between gap-2 border-2 border-brand text-brand bg-brand/5"} ${className}`}>
        {nho ? "📞 Hiện số" : (<><span>📞 {SO_AN}</span><span className="text-sm font-semibold">Bấm để hiện số</span></>)}
      </button>
      {/* portal ra body: thanh dính đáy có backdrop-blur -> tạo khối chứa riêng, bảng nằm trong đó bị kẹt dưới bong bóng chat */}
      {mo && createPortal(<BangTiepTuc listingId={listingId} onDong={() => setMo(false)} onXong={() => {
        try { localStorage.setItem(KHOA, "1"); } catch { /* không lưu được thì lần sau hỏi lại */ }
        setDaHien(true); setMo(false);
      }} />, document.body)}
    </>
  );
}

function BangTiepTuc({ listingId, onDong, onXong }: { listingId?: string; onDong: () => void; onXong: () => void }) {
  const [sdt, setSdt] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  const [next, setNext] = useState("");
  const hopLe = /^(\+84|0)\d{8,10}$/.test(sdt.replace(/[\s.-]/g, ""));

  useEffect(() => {
    setNext(location.pathname + location.search);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onDong(); };
    document.addEventListener("keydown", esc);
    const cu = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = cu; };
  }, [onDong]);

  async function guiSdt(e: React.FormEvent) {
    e.preventDefault();
    if (!hopLe || dang) return;
    setDang(true); setLoi("");
    const kq = await deLaiSdt(listingId || null, sdt).catch(() => ({ ok: false, error: "Lỗi mạng, thử lại giúp Radar." }));
    setDang(false);
    if (!kq.ok) { setLoi(kq.error || "Chưa gửi được."); return; }
    baoGA("ndr_de_lai_sdt", { listing_id: listingId, kieu: "hien_so" });
    onXong();
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onDong(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="hien-so-tieu-de"
        className="relative w-full sm:max-w-md bg-[var(--surface)] rounded-t-2xl sm:rounded-2xl shadow-2xl px-6 pt-6 pb-8">
        <button type="button" onClick={onDong} aria-label="Đóng" className="absolute right-4 top-4 w-8 h-8 grid place-items-center rounded-lg text-[var(--ink-soft)] hover:bg-[var(--surface-2)] text-lg">✕</button>
        <p className="text-sm text-[var(--ink-soft)]">Xin chào bạn!</p>
        <h2 id="hien-so-tieu-de" className="text-xl font-bold mt-0.5">Đăng ký / đăng nhập để tiếp tục</h2>
        <p className="text-sm text-[var(--ink-soft)] mt-1 mb-5">Xem số Radar và được hỗ trợ xem phòng miễn phí.</p>

        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value={next} />
          <button type="submit" onClick={() => baoGA("ndr_hien_so_google", { listing_id: listingId })}
            className="w-full h-12 rounded-xl border border-[var(--line-strong)] font-semibold flex items-center justify-center gap-2.5 hover:bg-[var(--surface-2)]">
            <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
            Đăng nhập với Google
          </button>
        </form>

        <div className="flex items-center gap-3 my-4 text-xs text-[var(--ink-faint)]"><span className="flex-1 h-px bg-[var(--line)]" />Hoặc<span className="flex-1 h-px bg-[var(--line)]" /></div>

        <form onSubmit={guiSdt} className="flex flex-col gap-3">
          <label className="sr-only" htmlFor="hien-so-sdt">Số điện thoại</label>
          <input id="hien-so-sdt" className="inp !h-12 !rounded-xl" inputMode="tel" autoComplete="tel" placeholder="Số điện thoại *"
            value={sdt} onChange={(e) => setSdt(e.target.value)} autoFocus />
          {loi && <p className="text-xs text-red-600">{loi}</p>}
          <button type="submit" disabled={!hopLe || dang}
            className="h-12 rounded-xl bg-brand text-white font-semibold disabled:opacity-45 hover:bg-brand-ink">
            {dang ? "Đang gửi…" : "Tiếp tục"}
          </button>
          <p className="text-[0.7rem] text-[var(--ink-faint)] text-center">Radar chỉ dùng số này để gọi lại tư vấn phòng bạn đang xem.</p>
        </form>
      </div>
    </div>
  );
}
