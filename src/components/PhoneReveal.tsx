"use client";

import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { coCookiePhien, layClient } from "@/lib/supabase/lazy";
import { PopupSdtBatdongsan, type IntentLienHe } from "@/components/DangNhapDeXem";
import { chepVanBan, NutZalo } from "@/components/TheoDoi";
import { moKhoaLienHeSdt, type MoKhoaSdtState } from "@/app/listings/actions";
import { cheSdtDuoi, chuanHoaSdt, dinhDangSdt, HOTLINE, HOTLINE_MASKED, HOTLINE_ZALO, SDT_RE } from "@/lib/hotline";
import { maPhong } from "@/lib/ro-hang";
import { baoSuKien } from "@/lib/su-kien-client";

function IconZalo({ className = "w-4 h-4 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#0068FF" />
      <path
        fill="#FFFFFF"
        d="M5.4 7.8h6.1l-4.6 5.8h4.8v1.9H4.8l4.7-5.8H5.4V7.8zm7.6 2.7c1.6 0 2.8 1.1 2.8 2.6s-1.2 2.6-2.8 2.6-2.8-1.1-2.8-2.6 1.2-2.6 2.8-2.6zm0 1.6c-.6 0-1.1.4-1.1 1s.5 1 1.1 1 1.1-.4 1.1-1-.5-1-1.1-1zm3.7-4.8h1.8v8.1h-1.8V7.3zm4 3.2c1.6 0 2.8 1.1 2.8 2.6s-1.2 2.6-2.8 2.6-2.8-1.1-2.8-2.6 1.2-2.6 2.8-2.6zm0 1.6c-.6 0-1.1.4-1.1 1s.5 1 1.1 1 1.1-.4 1.1-1-.5-1-1.1-1z"
      />
    </svg>
  );
}

/**
 * Cụm nút "Chat qua Zalo" + "<SĐT che> · Hiện số" kiểu Batdongsan.com.vn:
 * - Chưa đăng nhập: bấm nút nào cũng bật popup để lại SĐT 1 bước (không OTP) -> lưu lead + đăng nhập luôn.
 * - Tin của Radar (rổ hàng + FB/Zalo độc quyền): hiện số Radar (0387 365 020) và mở Zalo Radar.
 * - Tin crawl web / tự đăng: mở SĐT thật của người đăng gốc (RPC lay_sdt_tin, tối đa 30 tin/ngày) và mở Zalo theo SĐT gốc.
 */
export default function PhoneReveal({
  phoneMasked,
  listingId,
  listingTitle,
  hasPhone = true,
  isRadar = false,
  sourceUrl,
  cheDo = "card",
}: {
  phoneMasked?: string | null;
  listingId: string;
  listingTitle?: string;
  hasPhone?: boolean;
  isRadar?: boolean;
  sourceUrl?: string | null;
  cheDo?: "card" | "mobile";
}) {
  const [phien, setPhien] = useState<null | "khach" | "dang_nhap">(null);
  const [unlocked, setUnlocked] = useState<{ phone: string | null; zaloPhone: string | null; overLimit?: boolean } | null>(null);
  const [dangTai, setDangTai] = useState(false);
  const [moPopup, setMoPopup] = useState(false);
  const [intent, setIntent] = useState<IntentLienHe>("phone");
  const [ghiChu, setGhiChu] = useState<string | null>(null);

  useEffect(() => {
    let huy = false;
    const kiemPhien = () => {
      if (!coCookiePhien()) {
        if (!huy) setPhien("khach");
        return;
      }
      layClient()
        .then((sb) => sb.auth.getSession())
        .then(({ data }) => { if (!huy) setPhien(data.session ? "dang_nhap" : "khach"); })
        .catch(() => { if (!huy) setPhien("khach"); });
    };

    const onUnlocked = (ev: Event) => {
      const d = (ev as CustomEvent<MoKhoaSdtState & { listingId?: string }>).detail;
      if (d?.listingId === listingId) {
        setPhien("dang_nhap");
        setUnlocked({ phone: d.phone ?? null, zaloPhone: d.zaloPhone ?? null, overLimit: d.overLimit });
      }
    };

    kiemPhien();
    window.addEventListener("ndr-phien-doi", kiemPhien);
    window.addEventListener("ndr-sdt-unlocked", onUnlocked);
    return () => {
      huy = true;
      window.removeEventListener("ndr-phien-doi", kiemPhien);
      window.removeEventListener("ndr-sdt-unlocked", onUnlocked);
    };
  }, [listingId]);

  const ma = maPhong(listingId);
  const loiChaoZalo = isRadar
    ? `Chào Radar, mình muốn xem căn "${listingTitle || "này"}" (Mã: ${ma}). Hỗ trợ giúp mình nhé!`
    : `Chào anh/chị, mình xem tin "${listingTitle || "này"}" trên NhaDat Radar, cho mình hỏi căn này còn không ạ?`;

  const soChe = isRadar ? HOTLINE_MASKED : cheSdtDuoi(phoneMasked);

  function capNhatKetQua(phone: string | null, zaloPhone: string | null, overLimit = false) {
    setUnlocked({ phone, zaloPhone, overLimit });
    window.dispatchEvent(
      new CustomEvent("ndr-sdt-unlocked", {
        detail: { listingId, ok: true, phone, zaloPhone, overLimit, isRadar },
      }),
    );
  }

  async function laySoDaDangNhap(hanhDong: IntentLienHe): Promise<{ phone: string | null; zaloPhone: string | null; overLimit?: boolean }> {
    if (isRadar) {
      baoSuKien(hanhDong === "zalo" ? "zalo" : "goi", listingId);
      const res = { phone: HOTLINE, zaloPhone: HOTLINE };
      capNhatKetQua(res.phone, res.zaloPhone);
      return res;
    }

    if (!hasPhone) {
      return { phone: null, zaloPhone: null };
    }

    // Gọi RPC lay_sdt_tin trực tiếp qua phiên authenticated (áp giới hạn 30 tin/ngày)
    try {
      const sb = await layClient();
      const rpc = await sb.rpc("lay_sdt_tin", { p_listing: listingId });
      if (rpc.error?.message?.includes("qua_gioi_han_xem_sdt")) {
        capNhatKetQua(null, null, true);
        return { phone: null, zaloPhone: null, overLimit: true };
      }
      if (!rpc.error) {
        const p = (rpc.data as string | null) ?? null;
        const clean = chuanHoaSdt(p);
        const z = SDT_RE.test(clean) ? clean : null;
        capNhatKetQua(p, z);
        return { phone: p, zaloPhone: z };
      }
    } catch { /* fallback sang server action */ }

    const srv = await moKhoaLienHeSdt({ listingId, intent: hanhDong });
    if (srv.ok) {
      capNhatKetQua(srv.phone ?? null, srv.zaloPhone ?? null, srv.overLimit);
      return { phone: srv.phone ?? null, zaloPhone: srv.zaloPhone ?? null, overLimit: srv.overLimit };
    }
    return { phone: null, zaloPhone: null };
  }

  async function bamHienSo() {
    if (dangTai) return;
    setGhiChu(null);
    if (phien !== "dang_nhap") {
      setIntent("phone");
      setMoPopup(true);
      return;
    }
    setDangTai(true);
    try {
      const kq = await laySoDaDangNhap("phone");
      if (!kq.phone && !kq.overLimit && !isRadar) {
        setGhiChu("Tin nguồn web không đính kèm SĐT - bạn bấm Xem bài gốc bên dưới để liên hệ nhé.");
      }
    } finally {
      setDangTai(false);
    }
  }

  async function bamChatZalo() {
    if (dangTai) return;
    setGhiChu(null);
    if (phien !== "dang_nhap") {
      setIntent("zalo");
      setMoPopup(true);
      return;
    }
    setDangTai(true);
    try {
      const kq = unlocked ?? (await laySoDaDangNhap("zalo"));
      const soZalo = kq.zaloPhone || (isRadar ? HOTLINE : null);
      if (soZalo) {
        void chepVanBan(`${loiChaoZalo}\n${location.origin}${location.pathname}`);
        const url = `https://zalo.me/${soZalo}`;
        const tab = window.open(url, "_blank", "noopener,noreferrer");
        if (!tab) location.href = url;
        return;
      }
      if (kq.overLimit) {
        if (cheDo === "mobile" && sourceUrl && sourceUrl !== "#") {
          window.open(sourceUrl, "_blank", "noopener,noreferrer");
        } else {
          setGhiChu("Bạn đã xem tối đa 30 SĐT hôm nay. Vui lòng xem bài gốc bên dưới hoặc quay lại ngày mai.");
        }
      } else {
        void chepVanBan(`${loiChaoZalo}${sourceUrl && sourceUrl !== "#" ? `\nNguồn: ${sourceUrl}` : ""}\n${location.origin}${location.pathname}`);
        const w = window.open(HOTLINE_ZALO, "_blank", "noopener,noreferrer");
        if (!w) location.href = HOTLINE_ZALO;
      }
    } finally {
      setDangTai(false);
    }
  }

  const popup = (
    <PopupSdtBatdongsan
      mo={moPopup}
      onClose={() => setMoPopup(false)}
      intent={intent}
      listingId={listingId}
      listingTitle={listingTitle}
      isRadar={isRadar}
      onUnlocked={(res) => setUnlocked({ phone: res.phone ?? null, zaloPhone: res.zaloPhone ?? null, overLimit: res.overLimit })}
    />
  );

  // Chưa tải cookie xong: giữ chiều cao ổn định tránh nhảy bố cục (CLS)
  if (phien === null) {
    if (cheDo === "mobile") {
      return (
        <span className="ml-auto flex items-center gap-2 shrink-0">
          {hasPhone && <span className="h-12 w-32 rounded-lg bg-[var(--surface-2)] animate-pulse" aria-hidden />}
          <span className="h-12 w-28 rounded-lg bg-[var(--surface-2)] animate-pulse" aria-hidden />
        </span>
      );
    }
    return <div className="h-[100px]" aria-hidden />;
  }

  const phone = unlocked?.phone ?? null;
  const zaloTarget = unlocked?.zaloPhone ?? (phien === "dang_nhap" && isRadar ? HOTLINE : null);

  if (cheDo === "mobile") {
    return (
      <>
        <span className="ml-auto flex items-center gap-2 shrink-0">
          {hasPhone && (
            phone ? (
              <a
                href={`tel:${chuanHoaSdt(phone)}`}
                onClick={() => baoSuKien("goi", listingId)}
                className="btn btn-primary whitespace-nowrap min-h-12 !px-3.5 font-bold inline-flex items-center gap-1.5 rounded-lg shadow-xs"
              >
                <Phone className="w-4 h-4 shrink-0" />
                <span>Gọi ngay</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={bamHienSo}
                disabled={dangTai}
                className="btn btn-primary whitespace-nowrap min-h-12 !px-3.5 font-bold inline-flex items-center gap-1.5 rounded-lg shadow-xs cursor-pointer"
              >
                <Phone className="w-4 h-4 shrink-0" />
                <span>{dangTai ? "Đang mở…" : "Gọi · Hiện số"}</span>
              </button>
            )
          )}

          {zaloTarget ? (
            <NutZalo
              listingId={listingId}
              tinNhan={loiChaoZalo}
              href={`https://zalo.me/${zaloTarget}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn whitespace-nowrap min-h-12 !px-3.5 bg-[#0068ff] hover:bg-[#0057d6] text-white border-0 font-bold inline-flex items-center gap-1.5 rounded-lg shadow-xs active:scale-95 transition"
            >
              <IconZalo className="w-4 h-4 shrink-0" />
              <span>Nhắn Zalo</span>
            </NutZalo>
          ) : (
            <button
              type="button"
              onClick={bamChatZalo}
              disabled={dangTai}
              className="btn whitespace-nowrap min-h-12 !px-3.5 bg-[#0068ff] hover:bg-[#0057d6] text-white border-0 font-bold inline-flex items-center gap-1.5 rounded-lg shadow-xs active:scale-95 transition cursor-pointer"
            >
              <IconZalo className="w-4 h-4 shrink-0" />
              <span>Nhắn Zalo</span>
            </button>
          )}
        </span>
        {popup}
      </>
    );
  }

  // Giao diện Card bên phải (Desktop / Chi tiết tin) - 2 nút chuẩn Batdongsan
  return (
    <div className="flex flex-col gap-2.5">
      {zaloTarget ? (
        <NutZalo
          listingId={listingId}
          tinNhan={loiChaoZalo}
          href={`https://zalo.me/${zaloTarget}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn w-full min-h-11 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] hover:border-[#0068ff] text-[var(--ink)] font-bold inline-flex items-center justify-center gap-2 shadow-2xs transition"
        >
          <IconZalo className="w-5 h-5 shrink-0" />
          <span>Chat qua Zalo</span>
        </NutZalo>
      ) : (
        <button
          type="button"
          onClick={bamChatZalo}
          disabled={dangTai}
          className="btn w-full min-h-11 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] hover:border-[#0068ff] text-[var(--ink)] font-bold inline-flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer"
        >
          <IconZalo className="w-5 h-5 shrink-0" />
          <span>{dangTai && intent === "zalo" ? "Đang mở Zalo…" : "Chat qua Zalo"}</span>
        </button>
      )}

      {hasPhone && (
        unlocked?.overLimit ? (
          <p className="text-xs text-[var(--ink-soft)] leading-relaxed rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3">
            Bạn đã xem SĐT của 30 tin hôm nay (giới hạn bảo vệ dữ liệu người đăng). Hãy xem bài gốc bên dưới hoặc quay lại vào ngày mai.
          </p>
        ) : phone ? (
          <a
            href={`tel:${chuanHoaSdt(phone)}`}
            onClick={() => baoSuKien("goi", listingId)}
            className="btn btn-primary w-full min-h-12 rounded-lg font-bold inline-flex items-center justify-center gap-2 shadow-sm"
          >
            <Phone className="w-4 h-4 shrink-0" />
            <span>{dinhDangSdt(phone)} · Gọi ngay</span>
          </a>
        ) : (
          <button
            type="button"
            onClick={bamHienSo}
            disabled={dangTai}
            className="btn btn-primary w-full min-h-12 rounded-lg font-bold inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Phone className="w-4 h-4 shrink-0" />
            <span>{soChe} ·</span>
            <span>{dangTai ? "Đang tải…" : "Hiện số"}</span>
          </button>
        )
      )}

      {ghiChu && (
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-snug">{ghiChu}</p>
      )}

      {popup}
    </div>
  );
}
