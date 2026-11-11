"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { coCookiePhien, layClient } from "@/lib/supabase/lazy";
import { PROP } from "@/lib/format";
import { Bell, CheckCircle2, MessageCircle, X, Sparkles, Mail } from "lucide-react";
import { HOTLINE_ZALO } from "@/lib/hotline";
import { guiLeadNhanh } from "@/app/listings/actions";
import { NutZalo } from "./TheoDoi";

type Filters = {
  deal?: string; kind?: string; province?: string; district?: string; ward?: string;
  priceMin?: string; priceMax?: string; areaMin?: string;
};

const giaNgan = (v?: string) => {
  const n = Number(v);
  if (!n) return "";
  return n >= 1e9 ? `${+(n / 1e9).toFixed(1)} tỷ` : `${Math.round(n / 1e6)} triệu`;
};

// 🔔 Lưu bộ lọc -> Nhận thông báo phòng mới qua Zalo hoặc Email
export default function SaveSearchButton({ filters, compact = false }: { filters: Filters; compact?: boolean }) {
  const [state, setState] = useState<"idle" | "open" | "busy" | "done">("idle");
  const [kenh, setKenh] = useState<"zalo" | "email">("zalo");
  const [phone, setPhone] = useState("");
  const [loi, setLoi] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (state !== "open") return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setState("idle"); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  const tomTat = [
    filters.deal === "cho_thue" ? "Cho thuê" : filters.deal === "ban" ? "Mua bán" : "Mua bán & cho thuê",
    filters.kind ? filters.kind.split(",").map((k) => (PROP as Record<string, string>)[k] || k).join(", ") : "mọi loại nhà đất",
    [filters.ward, filters.district, filters.province].filter(Boolean).join(", ") || null,
    filters.priceMax ? `dưới ${giaNgan(filters.priceMax)}` : filters.priceMin ? `từ ${giaNgan(filters.priceMin)}` : null,
    filters.areaMin ? `≥ ${filters.areaMin} m²` : null,
  ].filter(Boolean);

  const loiChan = !filters.province
    ? "Bộ lọc chưa có khu vực - hãy chọn Tỉnh/Thành hoặc Quận/Huyện trước để nhận đúng tin bạn cần nhé."
    : (filters.priceMin || filters.priceMax) && filters.deal !== "ban" && filters.deal !== "cho_thue"
      ? "Bạn đang lọc theo khoảng giá nhưng chưa chọn Bán hay Cho thuê. Hãy chọn Bán hoặc Cho thuê trước nhé."
      : null;

  const tinNhanZalo = `Chào Radar, nhờ Radar lưu tiêu chí tìm phòng: ${tomTat.join(" · ")}. Khi có phòng mới khớp thì nhắn Zalo giúp mình nhé!`;

  async function dangKyZalo(e: React.FormEvent) {
    e.preventDefault();
    const cleanPhone = phone.replace(/[\s.-]/g, "").replace(/^\+?84/, "0");
    if (!/^0\d{9,10}$/.test(cleanPhone)) {
      setLoi("Vui lòng nhập số điện thoại / Zalo 10 số hợp lệ.");
      return;
    }

    setState("busy");
    setLoi("");

    try {
      const moTa = `[Nhận tin Zalo khi có phòng mới] Tiêu chí: ${tomTat.join(" · ")}`;
      const kq = await guiLeadNhanh({
        name: "Khách lưu tìm kiếm",
        phone: cleanPhone,
        message: moTa,
      });

      if (kq.ok) {
        setState("done");
      } else {
        setLoi(kq.error || "Chưa lưu được, bạn có thể bấm nút Nhắn Zalo trực tiếp bên dưới.");
        setState("open");
      }
    } catch {
      setLoi("Có lỗi xảy ra, vui lòng thử lại hoặc nhắn Zalo trực tiếp.");
      setState("open");
    }
  }

  async function dangKyEmail() {
    setState("busy");
    const supabase = coCookiePhien() ? await layClient().catch(() => null) : null;
    const user = supabase ? (await supabase.auth.getUser()).data.user : null;
    if (!supabase || !user) {
      router.push("/auth?message=" + encodeURIComponent("Đăng nhập để nhận email khi có tin mới khớp bộ lọc của bạn."));
      return;
    }
    const { error } = await supabase.from("saved_searches").insert({
      user_id: user.id,
      email: user.email,
      deal: filters.deal === "ban" || filters.deal === "cho_thue" ? filters.deal : null,
      kind: filters.kind || null,
      province: filters.province || null,
      district: filters.district || null,
      ward: filters.ward || null,
      price_min: Number(filters.priceMin) || null,
      price_max: Number(filters.priceMax) || null,
      area_min: Number(filters.areaMin) || null,
    });
    setState(error ? "open" : "done");
    if (error) { console.error("saveSearch:", error.message); alert("Chưa lưu được bộ lọc - thử lại sau ít phút."); }
  }

  return (
    <>
      <button
        className={`btn text-sm cursor-pointer ${compact ? "min-h-11 !px-3 inline-flex items-center gap-1.5" : ""}`}
        onClick={() => state === "idle" && setState("open")}
        disabled={state === "done" || state === "busy"}
        type="button"
        aria-label={compact ? (state === "done" ? "Đã đăng ký nhận tin mới" : "Nhận thông báo tin mới") : undefined}
        title={compact ? "Nhận thông báo khi có tin mới khớp bộ lọc" : undefined}
      >
        {compact ? (
          state === "done" ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Đã lưu</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap">
              <Bell className="w-3.5 h-3.5 shrink-0" />
              <span>Nhận tin</span>
            </span>
          )
        ) : state === "done" ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Đã đăng ký nhận tin</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Bell className="w-4 h-4 shrink-0" />
            <span>Nhận thông báo tin mới</span>
          </span>
        )}
      </button>

      {(state === "open" || state === "busy") && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs grid place-items-center p-4 animate-in fade-in duration-200" onClick={() => setState("idle")}>
          <div className="bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] rounded-xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setState("idle")}
              aria-label="Đóng"
              className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-[var(--surface-2)] text-[var(--ink-soft)] hover:text-[var(--ink)] flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 text-xs font-bold text-brand uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Theo dõi nhà đất giá thật</span>
            </div>

            <div className="text-base sm:text-lg font-bold mb-1 text-[var(--ink)]">
              Nhận thông báo phòng mới
            </div>

            {loiChan ? (
              <>
                <p className="text-xs sm:text-sm text-[var(--ink-soft)] mt-2 mb-4 leading-relaxed">{loiChan}</p>
                <button className="btn w-full text-center border border-[var(--line)] py-2 rounded-lg font-medium cursor-pointer" onClick={() => setState("idle")}>
                  Đóng để chọn bộ lọc
                </button>
              </>
            ) : (
              <>
                <div className="rounded-lg border border-brand/30 bg-brand/5 p-2.5 my-3 text-xs sm:text-sm font-semibold text-[var(--ink)]">
                  {tomTat.join(" · ")}
                </div>

                {/* Chuyển tab Zalo / Email */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--surface-2)] rounded-lg mb-4 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setKenh("zalo")}
                    className={`py-1.5 rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${kenh === "zalo" ? "bg-[var(--surface)] text-brand shadow-xs" : "text-[var(--ink-soft)]"}`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Qua Zalo (Nhanh)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setKenh("email")}
                    className={`py-1.5 rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${kenh === "email" ? "bg-[var(--surface)] text-brand shadow-xs" : "text-[var(--ink-soft)]"}`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Qua Email</span>
                  </button>
                </div>

                {kenh === "zalo" ? (
                  <form onSubmit={dangKyZalo} className="space-y-3">
                    <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
                      Chuyên viên Radar sẽ lưu tiêu chí và nhắn tin gửi 3 căn giá chuẩn nhất ngay khi có chủ nhà gửi phòng:
                    </p>
                    <div>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); setLoi(""); }}
                        placeholder="Số điện thoại / Zalo của bạn..."
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--line-strong)] bg-[var(--bg)] text-sm text-[var(--ink)] focus:outline-none focus:border-brand"
                      />
                      {loi && <p className="text-xs text-rose-600 mt-1">{loi}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={state === "busy"}
                      className="btn w-full min-h-11 py-2.5 rounded-lg font-bold text-sm bg-brand hover:bg-brand-ink text-white flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      {state === "busy" ? "Đang lưu..." : "Lưu & Nhận tin mới qua Zalo"}
                    </button>

                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-[var(--line)]" />
                      <span className="flex-shrink mx-2 text-[10px] text-[var(--ink-faint)] uppercase">hoặc</span>
                      <div className="flex-grow border-t border-[var(--line)]" />
                    </div>

                    <NutZalo
                      tinNhan={tinNhanZalo}
                      href={HOTLINE_ZALO}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn w-full min-h-11 py-2.5 rounded-lg font-bold text-xs text-white bg-[#0068ff] hover:bg-[#0057d6] flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <MessageCircle className="w-4 h-4 fill-white shrink-0" />
                      <span>Nhắn Zalo trực tiếp với Radar</span>
                    </NutZalo>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
                      Hệ thống tự động gửi tối đa 1 email/ngày khi có tin mới khớp tiêu chí. Hủy nhận bất kỳ lúc nào.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary w-full min-h-11 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                      onClick={dangKyEmail}
                      disabled={state === "busy"}
                    >
                      {state === "busy" ? "Đang xử lý…" : "Đăng ký nhận email tin mới"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
