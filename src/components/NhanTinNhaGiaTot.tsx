"use client";

import { useState } from "react";
import { MessageCircle, Send, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NhanTinProps {
  khuVuc?: string;
  loaiBDS?: string;
  className?: string;
}

export default function NhanTinNhaGiaTot({ khuVuc = "khu vực bạn tìm", loaiBDS, className = "" }: NhanTinProps) {
  const [phone, setPhone] = useState("");
  const [nhuCau, setNhuCau] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/[\s.-]/g, "").replace(/^\+?84/, "0");
    if (!/^0\d{9,10}$/.test(cleanPhone)) {
      setError("Vui lòng nhập số điện thoại hợp lệ (10 số).");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const moTa = `[Lead nhận tin Zalo] Khu vực: ${khuVuc} | Nhu cầu: ${nhuCau.trim() || loaiBDS || "Cần tư vấn BĐS giá tốt"}`;
      
      const { error: insertError } = await supabase.from("leads").insert({
        name: "Khách tìm nhà qua web",
        phone: cleanPhone,
        message: moTa,
      });

      if (insertError) {
        console.error("Lỗi lưu lead:", insertError);
        setError("Chưa gửi được, bạn có thể chat Zalo trực tiếp với chúng tôi.");
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error(err);
      setError("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={`p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-center space-y-2 ${className}`}>
        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
        <h3 className="font-bold text-base text-emerald-900 dark:text-emerald-200">
          Đã nhận yêu cầu thành công!
        </h3>
        <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-md mx-auto">
          Chuyên viên Radar sẽ chọn lọc 3 căn giá thật tốt nhất tại <strong>{khuVuc}</strong> và gửi qua Zalo số <strong>{phone}</strong> trong ít phút.
        </p>
      </div>
    );
  }

  return (
    <div className={`p-5 sm:p-7 rounded-2xl bg-gradient-to-br from-brand/5 via-[var(--surface)] to-emerald-50/20 border border-brand/20 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 text-xs font-bold text-brand uppercase tracking-wider mb-2">
        <Sparkles className="w-4 h-4" />
        <span>Dịch vụ tìm nhà riêng biệt · Miễn phí</span>
      </div>

      <h3 className="text-base sm:text-lg font-bold text-[var(--ink)] leading-snug">
        Nhận danh sách bất động sản giá tốt tại {khuVuc} qua Zalo
      </h3>
      <p className="text-xs text-[var(--ink-soft)] mt-1.5 mb-4 leading-relaxed max-w-xl">
        Radar tổng hợp từ hàng ngàn nguồn và loại bỏ tin ảo. Để lại số điện thoại, chuyên viên sẽ gửi 3 căn giá chuẩn mặt bằng, kiểm tra pháp lý trước khi dẫn xem.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setError(""); }}
            placeholder="Số điện thoại / Zalo của bạn..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-sm focus:outline-none focus:border-brand"
          />
        </div>

        <input
          type="text"
          value={nhuCau}
          onChange={(e) => setNhuCau(e.target.value)}
          placeholder="Tầm giá / nhu cầu (VD: dưới 3 tỷ, hẻm xe hơi)"
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-sm focus:outline-none focus:border-brand"
        />

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary px-5 py-2.5 whitespace-nowrap text-sm font-bold flex items-center justify-center gap-2 shrink-0 shadow-sm hover:opacity-95"
        >
          {loading ? (
            "Đang gửi..."
          ) : (
            <>
              <MessageCircle className="w-4 h-4" />
              <span>Gửi qua Zalo</span>
            </>
          )}
        </button>
      </form>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      <div className="flex items-center gap-2 mt-3 text-[11px] text-[var(--ink-faint)]">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Bảo mật 100% · Chỉ gửi tin đúng nhu cầu, không gọi quấy rầy.</span>
      </div>
    </div>
  );
}
