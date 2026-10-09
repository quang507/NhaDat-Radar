"use client";

import { useState } from "react";
import Link from "next/link";
import { PROP } from "@/lib/format";
import { Search, Sparkles, ArrowRight } from "lucide-react";

// Ô tìm kiếm trang chủ: tab Thuê | Mua | Định giá + chip lối tắt khu vực/giá.
// Mặc định tab THUÊ: hàng chủ lực là rổ hàng phòng trống cho thuê. Form gửi thẳng sang /search (GET) -
// không JS vẫn chạy. Chip khu vực có số tin (server tính từ bảng đếm cache getAreas, không thêm truy vấn).

type Tab = "cho_thue" | "ban" | "dinh_gia";
export type ChipKhuVuc = { province: string; district: string; n: number };

const GIA: Record<"cho_thue" | "ban", [string, string, string][]> = {
  // [priceMin, priceMax, nhãn]
  cho_thue: [["", "3000000", "Dưới 3 triệu"], ["3000000", "5000000", "3 - 5 triệu"], ["5000000", "10000000", "5 - 10 triệu"], ["10000000", "", "Trên 10 triệu"]],
  ban: [["", "1000000000", "Dưới 1 tỷ"], ["1000000000", "3000000000", "1 - 3 tỷ"], ["3000000000", "5000000000", "3 - 5 tỷ"], ["5000000000", "", "Trên 5 tỷ"]],
};
const LOAI: Record<"cho_thue" | "ban", string[]> = {
  cho_thue: ["phong_tro", "can_ho", "nha", "mat_bang"],
  ban: ["nha", "can_ho", "dat", "mat_bang"],
};
// [giá trị lọc, nhãn gọn] - 3 ô chọn chung 1 hàng trên điện thoại 375px
const TINH: [string, string][] = [["Hồ Chí Minh", "TP.HCM"], ["Hà Nội", "Hà Nội"], ["Đà Nẵng", "Đà Nẵng"], ["Bình Dương", "Bình Dương"], ["Đồng Nai", "Đồng Nai"]];
const tenGon = (d: string) => d.replace(/^(Quận|Huyện|Thị xã|Thành phố) (?=\D)/, "");

export default function HeroTimKiem({ chip }: { chip: Record<"cho_thue" | "ban", ChipKhuVuc[]> }) {
  const [tab, setTab] = useState<Tab>("cho_thue");
  const deal = tab === "dinh_gia" ? null : tab;

  const nut = (t: Tab, nhan: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === t}
      onClick={() => setTab(t)}
      className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
        tab === t
          ? "bg-[var(--surface)] text-brand shadow-sm font-bold"
          : "text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--surface)]/50"
      }`}
    >
      {nhan}
    </button>
  );

  const sel = "inp appearance-none pr-6 cursor-pointer text-xs sm:text-sm !py-2.5 !px-2.5 sm:!px-3 rounded-lg border-[var(--line-strong)] bg-[var(--surface)]";
  const qs = (o: Record<string, string>) => "/search?" + new URLSearchParams(Object.entries(o).filter(([, v]) => v)).toString();

  return (
    <div className="card rounded-2xl p-3 sm:p-5 shadow-sm border border-[var(--line)]">
      <div role="tablist" className="flex items-center gap-1 p-1 bg-[var(--surface-2)] rounded-xl border border-[var(--line)] w-fit mb-3">
        {nut("cho_thue", "Cho thuê")}
        {nut("ban", "Mua bán")}
        {nut("dinh_gia", "AI Định giá")}
      </div>

      <div>
        {deal ? (
          <form
            action="/search"
            className="flex flex-col gap-2.5"
            onSubmit={(e) => {
              for (const el of Array.from(e.currentTarget.elements) as HTMLInputElement[]) {
                if (el.name && !el.value) el.disabled = true;
              }
            }}
          >
            <input type="hidden" name="deal" value={deal} />
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <input
                  name="q"
                  placeholder={deal === "cho_thue" ? "Gõ quận, đường, trường gần đó… (VD: Gò Vấp, Phạm Hữu Lầu)" : "Gõ quận, đường, dự án… (VD: Quận 7, Vinhomes)"}
                  className="inp flex-1 min-w-0 pr-4 pl-3.5 !py-2.5 rounded-xl text-sm"
                />
              </div>
              <button className="btn btn-primary px-5 sm:px-6 rounded-xl flex items-center gap-1.5 whitespace-nowrap" type="submit">
                <Search className="w-4 h-4" />
                <span>Tìm kiếm</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <select name="province" defaultValue="Hồ Chí Minh" className={sel} aria-label="Tỉnh/thành">
                <option value="">Toàn quốc</option>
                {TINH.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select name="kind" defaultValue="" className={sel} aria-label="Loại nhà đất">
                <option value="">Loại nhà đất</option>
                {LOAI[deal].map((k) => <option key={k} value={k}>{(PROP as Record<string, string>)[k]}</option>)}
              </select>
              <select name="priceMax" defaultValue="" className={sel} aria-label="Mức giá">
                <option value="">Mức giá</option>
                {GIA[deal].filter(([, max]) => max).map(([, max, l]) => <option key={max} value={max}>{l.startsWith("Dưới") ? l : `Dưới ${l.split(" - ")[1]}`}</option>)}
              </select>
            </div>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-2 px-1">
            <div className="flex-1">
              <div className="flex items-center gap-2 font-bold text-sm text-[var(--ink)] mb-0.5">
                <Sparkles className="w-4 h-4 text-brand" />
                <span>Định giá bất động sản với AI</span>
              </div>
              <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
                Nhập địa chỉ, diện tích, kết cấu - AI ước tính khoảng giá chính xác theo dữ liệu thị trường và lịch sử so sánh khu vực.
              </p>
            </div>
            <Link href="/dinh-gia" className="btn btn-primary whitespace-nowrap text-center inline-flex items-center gap-1.5 justify-center rounded-xl">
              <span>Định giá ngay</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {deal && (
          <div className="mt-3.5 flex flex-col gap-2 text-xs pt-3 border-t border-[var(--line)]">
            <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] -mx-1 px-1">
              <span className="text-[var(--ink-faint)] self-center mr-1 text-[0.7rem] uppercase tracking-wider font-semibold">Giá:</span>
              {GIA[deal].map(([min, max, l]) => (
                <Link
                  key={l}
                  href={qs({ deal, province: "Hồ Chí Minh", priceMin: min, priceMax: max })}
                  className="shrink-0 px-2.5 py-1 rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] hover:border-brand hover:text-brand transition whitespace-nowrap"
                >
                  {l}
                </Link>
              ))}
            </div>
            {chip[deal].length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] -mx-1 px-1 items-center" title="Số tin đang có theo khu vực">
                <span className="text-[var(--ink-faint)] self-center mr-1 text-[0.7rem] uppercase tracking-wider font-semibold">Khu vực:</span>
                {chip[deal].map((c) => (
                  <Link
                    key={c.district}
                    href={qs({ deal, province: c.province, district: c.district })}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-[var(--surface-2)] text-[var(--ink-soft)] hover:text-brand transition whitespace-nowrap"
                  >
                    {tenGon(c.district)} <span className="text-[var(--ink-faint)] font-mono text-[0.7rem]">{c.n.toLocaleString("vi-VN")}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
