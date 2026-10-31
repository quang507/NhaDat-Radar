"use client";

import Link from "next/link";
import { useState } from "react";
import type { Listing } from "@/lib/types";
import { fresh, PROP, thumb } from "@/lib/format";
import FavButton from "./FavButton";
import SafeImg from "./SafeImg";
import PropertyPlaceholder from "./PropertyPlaceholder";
import { thongTinAnh } from "@/lib/img";
import { laTinDocQuyen, cheSoVanBan } from "@/lib/doc-quyen";
import { laRoHang, maPhong, tagGiuPhong } from "@/lib/ro-hang";
import { tienIchTheoKhoa } from "@/lib/tien-ich";
import { baoGA } from "@/lib/su-kien-client";
import { ShieldCheck, Eye, Play } from "lucide-react";

// THẺ PHÒNG CHO THUÊ kiểu EvoHome (1/10): thẻ dọc xếp lưới - ảnh, [mã] giá đ/tháng, địa chỉ, chip
// Loại · m² · Trống, icon tiện ích "+N tiện ích", thời gian đăng, [sao chép] [Liên hệ], "Xem chi tiết".
// Màu theo brand Radar. Trang mua bán vẫn dùng ListingRow (thẻ ngang kiểu batdongsan).

const LOAI_NGAN: Record<string, string> = { phong_tro: "Phòng", can_ho: "Căn hộ", nha: "Nhà", mat_bang: "Mặt bằng", dat: "Đất", khac: "Khác" };
const giaThang = (v: number | null) => (v ? `${v.toLocaleString("vi-VN")} đ/tháng` : "Thoả thuận");

export default function ThePhong({ x }: { x: Listing }) {
  const [daChep, setDaChep] = useState(false);
  const roHang = laRoHang(x);
  const tieuDe = laTinDocQuyen(x) ? cheSoVanBan(x.title) : x.title;
  const ma = roHang ? maPhong(x.id) : null;
  const diaChi = [x.district, x.province].filter(Boolean).join(", ") || "-";
  const ageMin = x.first_seen_at ? Math.round((Date.now() - new Date(x.first_seen_at).getTime()) / 60000) : null;
  const ti = (x.ti || []).map(tienIchTheoKhoa).filter((t): t is NonNullable<typeof t> => !!t);
  const anh = thongTinAnh(x);
  const giuPhong = tagGiuPhong(x);
  const href = `/listings/${x.id}`;
  const t = thumb(x.kind);

  // "Sao chép thông tin" như EvoHome: gửi nhanh cho khách qua Zalo
  async function chep() {
    const dong = [ma ? `[${ma}] ${tieuDe}` : tieuDe, `💰 ${giaThang(x.price_vnd)}`, `📍 ${diaChi}`,
      x.area_m2 ? `📐 ${x.area_m2} m²` : "", ti.length ? `✨ ${ti.map((t) => t.ten).join(", ")}` : "",
      `${location.origin}${href}`].filter(Boolean).join("\n");
    try { await navigator.clipboard.writeText(dong); setDaChep(true); baoGA("ndr_chep_tin", { listing_id: x.id }); setTimeout(() => setDaChep(false), 1500); } catch { /* trình duyệt chặn clipboard */ }
  }

  return (
    <div className={`relative card rounded-lg overflow-hidden flex flex-col transition-all duration-200 ${roHang ? "border-t-2 border-t-brand" : ""}`}>
      <Link href={href} className="relative block aspect-[3/2] overflow-hidden" style={{ background: x.images?.[0] ? "var(--surface-2)" : t.bg }}>
        {x.images?.[0] ? (
          <SafeImg src={x.images[0]} alt={tieuDe} fallbackLabel={PROP[x.kind]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <PropertyPlaceholder kind={x.kind} />
        )}
        {/* 27/10: 2 nhãn chung 1 hàng, chừa chỗ nút tim (bản cũ VIDEO neo right-10 đè lên "XÁC MINH" ở thẻ hẹp) */}
        {(roHang || anh.video) && (
          <div className="absolute top-2 left-2 right-12 flex flex-wrap gap-1">
            {roHang && (
              <span className="text-overline tracking-tight font-bold px-1.5 py-0.5 rounded-sm bg-emerald-700 text-white shadow-xs flex items-center gap-1 whitespace-nowrap">
                <ShieldCheck className="w-3 h-3 shrink-0" />
                <span>XÁC MINH</span>
              </span>
            )}
            {anh.video && (
              <span className="text-overline tracking-tight font-bold px-1.5 py-0.5 rounded-sm bg-rose-600 text-white shadow-xs flex items-center gap-1 whitespace-nowrap">
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>VIDEO</span>
              </span>
            )}
          </div>
        )}
        {anh.so > 1 && <span className="absolute bottom-2 right-2 text-overline font-semibold px-2 py-0.5 rounded-sm bg-black/75 text-white">{anh.so} ảnh</span>}
      </Link>
      <FavButton id={x.id} className="absolute top-2 right-2" />

      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <Link href={href} className="flex flex-col gap-1.5 flex-1 group/body">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
            {ma && <span className="shrink-0 text-overline font-bold px-1.5 py-0.5 rounded-sm border border-brand/40 text-brand bg-brand/5" title="Mã phòng - gửi kèm khi nhắn Zalo">{ma}</span>}
            <span className="text-brand font-extrabold text-base leading-tight whitespace-nowrap">{giaThang(x.price_vnd)}</span>
          </div>
          <h3 className="text-body-sm font-semibold leading-snug line-clamp-2 text-[var(--ink)] group-hover/body:text-brand transition-colors" title={tieuDe}>{tieuDe}</h3>
          <div className="text-caption text-[var(--ink-soft)] truncate">{diaChi}</div>

          <div className="flex flex-wrap items-center gap-1 text-caption">
            <span className="px-1.5 py-0.5 rounded bg-brand/10 text-brand font-semibold">{LOAI_NGAN[x.kind] || PROP[x.kind] || "Khác"}</span>
            {x.area_m2 ? <span className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--ink-soft)]">{x.area_m2} m²</span> : null}
            {roHang && <span className="ml-auto px-1.5 py-0.5 rounded border border-emerald-500/50 text-emerald-600 font-semibold">Trống</span>}
          </div>

          {ti.length > 0 && (
            <div className="flex items-center gap-1" title={ti.map((t) => t.ten).join(", ")}>
              {ti.slice(0, 3).map((t) => (
                <span key={t.k} className="grid place-items-center w-6 h-6 rounded-md bg-brand/10 text-caption" title={t.ten} aria-label={t.ten}>{t.icon}</span>
              ))}
              {ti.length > 3 && <span className="text-caption text-[var(--ink-soft)] ml-0.5">+{ti.length - 3} tiện ích</span>}
            </div>
          )}

          {ageMin != null && <div suppressHydrationWarning className="text-caption text-[var(--ink-faint)]">Đăng: {fresh(ageMin)}</div>}
        </Link>

        <div className="mt-auto pt-2 flex gap-1.5">
          <button type="button" onClick={chep} title="Sao chép thông tin" aria-label="Sao chép thông tin"
            className={`shrink-0 w-9 h-9 grid place-items-center rounded-md border transition ${daChep ? "border-brand text-brand bg-brand/5" : "border-[var(--line-strong)] hover:border-brand"}`}>
            {daChep ? "✓" : (
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                <rect x="7" y="7" width="10" height="10" rx="2" /><path d="M13 7V5a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2" />
              </svg>
            )}
          </button>
          <Link href={`${href}#lien-he`} onClick={() => baoGA("ndr_bam_lien_he_the", { listing_id: x.id })} className="btn btn-primary flex-1 h-9 rounded-md text-sm font-semibold flex items-center justify-center gap-1.5 shadow-2xs">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><rect x="3" y="4.5" width="14" height="12" rx="2" /><path d="M3 8.5h14M7 3v3M13 3v3" strokeLinecap="round" /></svg>
            Liên hệ
          </Link>
        </div>
        <Link href={href} className="text-center text-caption text-[var(--ink-soft)] hover:text-brand py-0.5 inline-flex items-center justify-center gap-1">
          <Eye className="w-3.5 h-3.5" />
          <span>Xem chi tiết</span>
        </Link>
      </div>
    </div>
  );
}
