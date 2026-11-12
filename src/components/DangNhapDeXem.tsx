"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Lock, MessageCircle, PhoneCall, ShieldCheck, X } from "lucide-react";
import GhiChuDuLieu from "@/components/GhiChuDuLieu";
import { chepVanBan } from "@/components/TheoDoi";
import { moKhoaLienHeSdt, type MoKhoaSdtState } from "@/app/listings/actions";
import { baoDoiPhien, layClient } from "@/lib/supabase/lazy";
import { HOTLINE } from "@/lib/hotline";
import { maPhong } from "@/lib/ro-hang";
import { baoGA } from "@/lib/su-kien-client";

export type IntentLienHe = "phone" | "zalo";

/**
 * Popup "Để lại SĐT" kiểu Batdongsan (2 cột, KHÔNG cần mã OTP):
 * - Khách gõ SĐT 1 lần -> lưu leads, tự tạo/đăng nhập tài khoản khách (`@sdt.nhadatradar.local`),
 *   mở khóa số/Zalo ngay tức thì và nhớ phiên cho mọi tin về sau.
 */
export function PopupSdtBatdongsan({
  mo,
  onClose,
  intent,
  listingId,
  listingTitle,
  isRadar,
  onUnlocked,
}: {
  mo: boolean;
  onClose: () => void;
  intent: IntentLienHe;
  listingId: string;
  listingTitle?: string;
  isRadar: boolean;
  onUnlocked: (res: MoKhoaSdtState) => void;
}) {
  const [sdt, setSdt] = useState("");
  const [loi, setLoi] = useState<string | null>(null);
  const [dangGui, setDangGui] = useState(false);
  const [zaloChoBam, setZaloChoBam] = useState<string | null>(null);

  useEffect(() => {
    if (!mo) { setLoi(null); setZaloChoBam(null); return; }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mo, onClose]);

  if (!mo || typeof document === "undefined") return null;

  const ma = listingId ? maPhong(listingId) : "";
  const loiChaoZalo = isRadar
    ? `Chào Radar, mình muốn hỏi tin "${listingTitle || "này"}" (Mã: ${ma}), gửi giúp mình chi tiết và hẹn xem nhé!`
    : `Chào anh/chị, mình thấy tin "${listingTitle || "này"}" trên NhaDat Radar, không biết còn không ạ?`;

  async function gui(e: React.FormEvent) {
    e.preventDefault();
    if (dangGui) return;
    setLoi(null);
    setDangGui(true);
    try {
      const res = await moKhoaLienHeSdt({ listingId, phone: sdt, intent });
      if (!res.ok) {
        setLoi(res.error || "Chưa xác nhận được SĐT, bạn thử lại nhé.");
        return;
      }

      try {
        const sb = await layClient();
        await sb.auth.getSession();
      } catch { /* cookie đã được server set sẵn */ }
      baoDoiPhien();
      window.dispatchEvent(new CustomEvent("ndr-sdt-unlocked", { detail: { listingId, ...res } }));
      baoGA("ndr_de_lai_sdt", { listing_id: listingId, kieu: isRadar ? "radar_popup" : "crawl_popup" });
      onUnlocked(res);

      if (intent === "zalo") {
        const soZalo = res.zaloPhone || (isRadar ? HOTLINE : null);
        if (soZalo) {
          void chepVanBan(`${loiChaoZalo}\n${location.origin}${location.pathname}`);
          const url = `https://zalo.me/${soZalo}`;
          const tab = window.open(url, "_blank", "noopener,noreferrer");
          if (!tab) {
            setZaloChoBam(url);
            return;
          }
        }
      }
      onClose();
    } catch {
      setLoi("Kết nối gián đoạn, bạn thử lại giúp Radar nhé.");
    } finally {
      setDangGui(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs grid place-items-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ndr-sdt-modal-title"
    >
      <div
        className="bg-[var(--surface)] rounded-lg overflow-hidden max-w-[660px] w-full shadow-xl border border-[var(--line)] grid md:grid-cols-[240px_1fr] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute top-3 right-3 z-10 w-10 h-10 rounded-md bg-[var(--surface-2)] hover:bg-[var(--line)] text-[var(--ink-soft)] flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Cột trái thương hiệu (kiểu Batdongsan) */}
        <div className="bg-brand text-white p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/15 px-2.5 py-1 rounded-sm mb-3">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>NhaDat Radar</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold leading-snug">
              Bảo đảm riêng tư
              <br />
              Thư giãn tìm nhà
            </h3>
            <p className="text-xs text-white/90 mt-2 leading-relaxed">
              {isRadar
                ? "Để lại số điện thoại 1 lần duy nhất (không cần mã xác thực) để xem hotline, nhận video thực tế và hẹn xem miễn phí."
                : "Để lại số điện thoại 1 lần duy nhất (không cần mã xác thực) để mở khóa số liên hệ người đăng tin gốc trên mọi tin."}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[11px] text-white/85 pt-3 border-t border-white/20">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>Chỉ nhập 1 lần, lần sau bấm là hiện ngay</span>
          </div>
        </div>

        {/* Cột phải nhập SĐT (1 bước, không OTP) */}
        <div className="p-5 sm:p-6 flex flex-col justify-center">
          {zaloChoBam ? (
            <div className="space-y-3 py-2">
              <h4 id="ndr-sdt-modal-title" className="text-base sm:text-lg font-bold text-[var(--ink)] pr-8">
                Đã mở khóa liên hệ
              </h4>
              <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
                Nội dung tin đang xem đã được chép sẵn. Bấm nút bên dưới để mở ứng dụng Zalo ngay:
              </p>
              <a
                href={zaloChoBam}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="btn-zalo w-full min-h-12 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-xs"
              >
                <MessageCircle className="w-4 h-4 fill-current shrink-0" />
                <span>Mở Chat Zalo ngay</span>
              </a>
            </div>
          ) : (
            <form onSubmit={gui} className="space-y-3">
              <h4 id="ndr-sdt-modal-title" className="text-base sm:text-lg font-bold text-[var(--ink)] pr-8 leading-snug">
                {intent === "zalo" ? "Nhập SĐT để mở Chat Zalo" : "Nhập SĐT để xem số liên hệ"}
              </h4>
              <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
                Không cần nhập mã xác thực. Lần sau bạn có thể dùng chính SĐT này để đăng nhập vào lại tài khoản.
              </p>
              <div>
                <input
                  className="inp w-full min-h-12 text-base"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  autoFocus
                  placeholder="Nhập SĐT của bạn (VD: 0912 345 678)"
                  value={sdt}
                  onChange={(e) => { setSdt(e.target.value); setLoi(null); }}
                  required
                />
                {loi && <p className="text-xs text-red-600 mt-1.5">{loi}</p>}
              </div>
              <button
                type="submit"
                disabled={dangGui}
                className="btn btn-primary w-full min-h-12 font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <PhoneCall className="w-4 h-4 shrink-0" />
                <span>{dangGui ? "Đang mở khóa..." : intent === "zalo" ? "Mở Chat Zalo ngay" : "Hiện số ngay"}</span>
              </button>
              <GhiChuDuLieu mucDich="hiển thị số liên hệ, tạo phiên đăng nhập nhanh bằng SĐT và hỗ trợ tư vấn tin này" />
              <div className="pt-2 border-t border-[var(--line)] text-xs text-[var(--ink-soft)] flex items-center justify-between gap-2">
                <span>Đã dùng tài khoản Google / Email?</span>
                <Link
                  href={`/auth?next=${encodeURIComponent(`/listings/${listingId}`)}`}
                  className="text-brand font-semibold hover:underline shrink-0"
                >
                  Đăng nhập ›
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function DangNhapDeXem({
  listingId = "",
  listingTitle,
  isRadar = true,
  onUnlocked,
}: {
  listingId?: string;
  listingTitle?: string;
  isRadar?: boolean;
  onUnlocked?: (res: MoKhoaSdtState) => void;
}) {
  const [mo, setMo] = useState(false);
  const [intent, setIntent] = useState<IntentLienHe>("phone");

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => { setIntent("zalo"); setMo(true); }}
        className="btn w-full min-h-11 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] hover:border-[#0068ff] text-[var(--ink)] font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
      >
        <MessageCircle className="w-4 h-4 text-[#0068ff] shrink-0" />
        <span>Chat qua Zalo</span>
      </button>
      <button
        type="button"
        onClick={() => { setIntent("phone"); setMo(true); }}
        className="btn btn-primary w-full min-h-12 rounded-lg font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
      >
        <PhoneCall className="w-4 h-4 shrink-0" />
        <span>Hiện số điện thoại</span>
      </button>
      <PopupSdtBatdongsan
        mo={mo}
        onClose={() => setMo(false)}
        intent={intent}
        listingId={listingId}
        listingTitle={listingTitle}
        isRadar={isRadar}
        onUnlocked={(r) => onUnlocked?.(r)}
      />
    </div>
  );
}
