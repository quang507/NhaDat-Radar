"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PROP } from "@/lib/format";

type Filters = {
  deal?: string; kind?: string; province?: string; district?: string; ward?: string;
  priceMin?: string; priceMax?: string; areaMin?: string;
};

const giaNgan = (v?: string) => {
  const n = Number(v);
  if (!n) return "";
  return n >= 1e9 ? `${+(n / 1e9).toFixed(1)} tỷ` : `${Math.round(n / 1e6)} triệu`;
};

// 🔔 Lưu bộ lọc -> saved_searches; cron hằng ngày gửi email khi có tin mới khớp.
//
// 20/8: KHÔNG lưu im lặng nữa. Bản cũ bấm phát là đăng ký luôn bộ lọc hiện tại - ai đang xem
// "toàn quốc" không lọc gì mà bấm là tự đăng ký nhận MỌI tin cả nước, tự spam chính mình,
// rồi bấm hủy đăng ký trong email và mất luôn niềm tin. Giờ mở popup cho người dùng THẤY
// đúng cái họ sắp nhận rồi mới xác nhận; bộ lọc trống trơn thì chặn, mời chọn khu vực trước.
// Email chỉ gửi từ pipeline chạy server (alerts.mjs) - không tốn gì trên máy khách.
export default function SaveSearchButton({ filters }: { filters: Filters }) {
  const [state, setState] = useState<"idle" | "open" | "busy" | "done">("idle");
  const router = useRouter();

  const tomTat = [
    filters.deal === "cho_thue" ? "Cho thuê" : filters.deal === "ban" ? "Mua bán" : "Mua bán & cho thuê",
    filters.kind ? (PROP as Record<string, string>)[filters.kind] : "mọi loại nhà đất",
    [filters.ward, filters.district, filters.province].filter(Boolean).join(", ") || null,
    filters.priceMax ? `dưới ${giaNgan(filters.priceMax)}` : filters.priceMin ? `từ ${giaNgan(filters.priceMin)}` : null,
    filters.areaMin ? `≥ ${filters.areaMin} m²` : null,
  ].filter(Boolean);

  // không có lấy một tiêu chí thu hẹp nào -> đăng ký là nhận mọi tin cả nước, chặn lại
  const quaRong = !filters.province && !filters.district && !filters.kind && !filters.priceMax && !filters.deal;

  async function dangKy() {
    setState("busy");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
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
        className="btn text-sm"
        onClick={() => state === "idle" && setState("open")}
        disabled={state === "done" || state === "busy"}
        type="button"
      >
        {state === "done" ? "✅ Sẽ email khi có tin mới" : "🔔 Nhận email tin mới"}
      </button>

      {(state === "open" || state === "busy") && (
        <div className="fixed inset-0 z-[1000] bg-black/50 grid place-items-center p-4" onClick={() => setState("idle")}>
          <div className="bg-[var(--bg,#fff)] rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-bold mb-1">Nhận email tin mới</div>

            {quaRong ? (
              <>
                <p className="text-sm text-[var(--ink-soft)] mb-4">
                  Bộ lọc đang <b>trống</b> - đăng ký bây giờ là nhận email về <b>mọi tin trên cả nước</b>,
                  hộp thư sẽ ngập rất nhanh. Chọn ít nhất khu vực hoặc loại nhà đất trước đã nhé.
                </p>
                <button className="btn w-full text-center border border-[var(--line)]" onClick={() => setState("idle")}>
                  Đóng để chọn bộ lọc
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-[var(--ink-soft)] mb-2">Bạn sẽ nhận email khi có tin mới khớp:</p>
                <div className="rounded-lg border border-[var(--line)] bg-[var(--bg)] p-3 mb-3 text-sm font-semibold">
                  {tomTat.join(" · ")}
                </div>
                <p className="text-xs text-[var(--ink-faint)] mb-4">
                  Tối đa 1 email/ngày, chỉ gửi khi thật sự có tin mới. Hủy được ngay trong email.
                </p>
                <button className="btn btn-primary w-full text-center mb-2" onClick={dangKy} disabled={state === "busy"}>
                  {state === "busy" ? "Đang lưu…" : "Đăng ký nhận email"}
                </button>
                <button className="btn w-full text-center border border-[var(--line)]" onClick={() => setState("idle")}>
                  Sửa lại bộ lọc trước
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
