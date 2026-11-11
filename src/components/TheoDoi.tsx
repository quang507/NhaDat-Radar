"use client";

import { useEffect, useState, type AnchorHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { baoSuKien } from "@/lib/su-kien-client";
import { maPhong } from "@/lib/ro-hang";
import { AlertCircle, Check, Copy } from "lucide-react";

// Theo dõi quan tâm (30/9) - xem lib/su-kien-client + migration 031.

/** Đặt 1 lần trong trang chi tiết tin: ghi lượt xem, mỗi phiên trình duyệt 1 lần/tin (F5 không đếm lại) */
export function GhiXemTin({ listingId }: { listingId: string }) {
  useEffect(() => {
    try {
      const k = `ndr_xem_${listingId}`;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    } catch { /* chặn sessionStorage -> vẫn ghi */ }
    baoSuKien("xem", listingId);
  }, [listingId]);
  return null;
}

/** <a> ghi sự kiện khi bấm (gọi / Zalo) - thay cho <a href="tel:..."> trong server component */
// 2/11 (audit Q6): listingId không bắt buộc - hotline chung (thanh đáy, lập phòng...) ghi listing_id = null
export function LinkTheoDoi({ loai, listingId, ...a }: AnchorHTMLAttributes<HTMLAnchorElement> & { loai: "goi" | "zalo"; listingId?: string | null }) {
  return <a {...a} onClick={(e) => { baoSuKien(loai, listingId); a.onClick?.(e); }} />;
}

/**
 * Chép chữ vào bộ nhớ tạm (2/11, audit Q5): navigator.clipboard thiếu ở WebView / http / bị chặn quyền
 * -> khách mở Zalo trống, mất mã phòng. Thử execCommand("copy") qua textarea NGAY trong lượt bấm
 * (phải đồng bộ mới được phép), hỏng mới tới clipboard.writeText. Trả true nếu chép được.
 */
export function chepVanBan(s: string): Promise<boolean> {
  let ok = false;
  try {
    const truoc = document.activeElement as HTMLElement | null;
    const t = document.createElement("textarea");
    t.value = s;
    t.setAttribute("readonly", "");
    // fixed + 16px: không cuộn trang, iOS không phóng to khi chọn chữ
    t.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;pointer-events:none";
    document.body.appendChild(t);
    t.select();
    t.setSelectionRange(0, s.length);
    ok = document.execCommand("copy");
    t.remove();
    truoc?.focus?.({ preventScroll: true });
  } catch { /* execCommand bị gỡ / chặn */ }
  if (ok) return Promise.resolve(true);
  if (!navigator.clipboard?.writeText) return Promise.resolve(false);
  return navigator.clipboard.writeText(s).then(() => true, () => false);
}

/**
 * Nút Zalo CHÉP SẴN TIN NHẮN (2/10): zalo.me/<số> không điền sẵn nội dung được, khách mở ra khung chat trống
 * rồi không biết hỏi gì / quên mã phòng -> Radar không biết khách hỏi phòng nào. Bấm là chép sẵn
 * "Chào Radar, em muốn xem phòng RH1A2B3C ..." vào bộ nhớ tạm + nhắc "dán vào Zalo", rồi mở Zalo như cũ.
 */
// 29/10: listingId không bắt buộc - trang chủ, định giá, tìm kiếm cũng chép sẵn tin nhắn (trước dùng ?text= nên khách mở ra khung trống)
export function NutZalo({ listingId, tinNhan, children, ...a }: AnchorHTMLAttributes<HTMLAnchorElement> & { listingId?: string | null; tinNhan: string }) {
  // 2/11 (audit Q5): "ok" = đã chép, "loi" = chép hỏng -> nhắc khách tự gõ mã khi nhắn Zalo
  const [chep, setChep] = useState<"ok" | "loi" | null>(null);
  return (
    <>
      <a {...a} onClick={(e) => {
        baoSuKien("zalo", listingId);
        const tn = `${tinNhan}\n${location.origin}${location.pathname}`;
        void chepVanBan(tn).then((ok) => { setChep(ok ? "ok" : "loi"); setTimeout(() => setChep(null), ok ? 6000 : 9000); });
        a.onClick?.(e);
      }}>{children}</a>
      {/* portal ra body: cha có transform/backdrop-filter thì fixed bị neo theo cha (cụm Speed Dial máy tính) */}
      {chep && createPortal(
        <span
          role="status"
          onClick={() => setChep(null)}
          className={`fixed left-1/2 -translate-x-1/2 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 max-w-[92vw] px-4 py-2.5 rounded-sm text-caption sm:text-body-sm font-semibold shadow-zen-4 flex items-center gap-2 cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-200 ${chep === "ok" ? "btn-zalo" : "bg-[var(--ink)] text-[var(--bg)]"}`}
        >
          <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center shrink-0">
            {chep === "ok" ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <AlertCircle className="w-3.5 h-3.5" />}
          </span>
          {chep === "ok"
            ? <span>Đã chép nội dung{listingId ? <> &amp; mã phòng</> : null} - mở Zalo và chọn <b>Dán</b> để gửi</span>
            : listingId
              ? <span>Chưa chép được trên trình duyệt này - gửi mã <b className="font-mono">{maPhong(listingId)}</b> qua Zalo hoặc để lại SĐT ngay trên trang</span>
              : <span>Chưa chép được trên trình duyệt này - mở Zalo nhắn nhu cầu hoặc để lại SĐT cho Radar nhé</span>}
        </span>
      , document.body)}
    </>
  );
}

/**
 * Nhãn "Mã: RH…" bấm để chép (29/10): Clarity ghi dead click nhiều nhất trang tin ở đúng nhãn này - khách bấm
 * vào mã để chép mà không có gì xảy ra. Chép xong đổi chữ thành "Đã chép" 2 giây (không cần toast).
 */
export function NutChepMa({
  ma,
  loai = "phòng",
  dang = "pill",
  className,
  children,
}: {
  ma: string;
  loai?: string;
  dang?: "pill" | "box";
  className?: string;
  children?: React.ReactNode;
}) {
  const [daChep, setDaChep] = useState(false);
  const [loi, setLoi] = useState(false);

  const handleCopy = () => {
    // 2/11 (audit Q5): chép qua chepVanBan (có đường lui execCommand), hỏng thì báo khách gõ tay mã
    void chepVanBan(ma).then((ok) => {
      if (ok) {
        setDaChep(true);
        setTimeout(() => setDaChep(false), 2000);
      } else {
        setLoi(true);
        setTimeout(() => setLoi(false), 6000);
      }
    });
  };

  if (dang === "box") {
    return (
      <>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Chép mã ${ma}`}
          title="Chạm để sao chép mã phòng - gửi kèm khi nhắn Zalo"
          className={
            className ||
            "w-full rounded-lg border border-dashed border-brand/50 hover:border-brand bg-brand/5 p-3 text-center cursor-pointer transition-all active:scale-[0.98] group"
          }
        >
          <div className="text-xs text-[var(--ink-soft)] group-hover:text-brand transition-colors">
            {daChep ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center justify-center gap-1">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Đã chép mã vào bộ nhớ tạm
              </span>
            ) : (
              `Mã ${loai} · Chạm để sao chép`
            )}
          </div>
          <div className="font-mono text-xl font-extrabold tracking-wider text-brand flex items-center justify-center gap-2 mt-0.5">
            <span>{ma}</span>
            <Copy className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
        {loi &&
          createPortal(
            <span
              role="status"
              className="fixed left-1/2 -translate-x-1/2 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 max-w-[90vw] px-4 py-2.5 rounded-sm bg-[var(--ink)] text-[var(--bg)] text-caption sm:text-body-sm font-semibold shadow-zen-4 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Chưa chép được - nhắn Zalo kèm mã <b className="font-mono">{ma}</b>
              </span>
            </span>,
            document.body
          )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Chép mã ${ma}`}
        title="Bấm để chép mã - gửi kèm khi nhắn Zalo"
        className={className}
        onClick={handleCopy}
      >
        {children ? (
          children
        ) : (
          <>
            {daChep ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 opacity-70" />}
            <span aria-live="polite">{daChep ? "Đã chép mã" : `Mã: ${ma}`}</span>
          </>
        )}
      </button>
      {loi &&
        createPortal(
          <span
            role="status"
            className="fixed left-1/2 -translate-x-1/2 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 max-w-[90vw] px-4 py-2.5 rounded-sm bg-[var(--ink)] text-[var(--bg)] text-caption sm:text-body-sm font-semibold shadow-zen-4 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Chưa chép được - nhắn Zalo kèm mã <b className="font-mono">{ma}</b>
            </span>
          </span>,
          document.body
        )}
    </>
  );
}
