"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Mời người dùng ĐÃ đăng nhập để lại SĐT - mức NHẸ theo quyết định 20/8: không OTP,
// bỏ qua được, điền láo thì chịu. Mục tiêu là có số để gọi lại lead, không phải chặn cổng
// như radanhadat.vn (họ bán gói trả phí nên đáng chặn kỹ; mình đang gom người dùng,
// thêm bước bắt buộc là rụng người ngay chỗ phễu cần rộng nhất).
//
// Hiện 1 lần; bấm "Để sau" thì 7 ngày sau mới nhắc lại (localStorage). Đã có SĐT thì im.
const KHOA_NHAC = "radar-nhac-sdt";
const NHAC_LAI_MS = 7 * 24 * 60 * 60 * 1000;
const SDT_RE = /^0\d{9,10}$/; // sau khi đã đổi +84/84 về 0; 9-10 số sau số 0 (di động + bàn)

// localStorage KHÔNG được đứng chắn luồng đóng popup: Safari duyệt riêng tư ném lỗi ở
// setItem (đọc được, ghi là QuotaExceeded), Chrome chặn cookie thì ném ngay khi chạm
// window.localStorage - soát 21/8: bản cũ setItem đứng TRƯỚC setHien nên bấm "Để sau"
// là văng lỗi, popup phủ toàn trang không có đường thoát, khoá cứng cả site.
const docKho = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const ghiKho = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* riêng tư/đầy - thôi */ } };

// "+84 909 123 456" / "(84)909..." / "0909.123.456" -> "0909123456"
const chuanHoaSdt = (s: string) => s.replace(/[\s.\-()]/g, "").replace(/^\+?84/, "0");

export default function MoiDienSdt() {
  const [hien, setHien] = useState(false);
  const [sdt, setSdt] = useState("");
  const [loi, setLoi] = useState("");
  const [dangLuu, setDangLuu] = useState(false);

  useEffect(() => {
    const nhacGanNhat = Number(docKho(KHOA_NHAC) || 0);
    if (Date.now() - nhacGanNhat < NHAC_LAI_MS) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("phone").eq("id", user.id).single();
      if (p && !p.phone) setHien(true);
    });
  }, []);

  if (!hien) return null;

  // "Để sau" (chủ ý) = im 7 ngày; bấm ra NỀN TỐI (thường là lỡ tay) chỉ đóng phiên này,
  // không ghi mốc - đỡ cảnh trượt chuột một cái là mất luôn cả tuần cơ hội xin số.
  const deSau = () => { setHien(false); ghiKho(KHOA_NHAC, String(Date.now())); };
  const dongTam = () => setHien(false);

  const luu = async () => {
    if (dangLuu) return; // giữ Enter không bắn update chồng nhau
    const so = chuanHoaSdt(sdt);
    if (!SDT_RE.test(so)) { setLoi("Số chưa đúng dạng - VD: 0909123456"); return; }
    setDangLuu(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setHien(false); return; }
    const { error } = await supabase.from("profiles").update({ phone: so }).eq("id", user.id);
    setDangLuu(false);
    if (error) { setLoi("Chưa lưu được - thử lại sau ít phút."); return; }
    setHien(false);
    ghiKho(KHOA_NHAC, String(Date.now()));
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 grid place-items-center p-4" onClick={dongTam}>
      <div className="bg-[var(--bg,#fff)] rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-bold mb-1">Để lại số điện thoại?</div>
        <p className="text-sm text-[var(--ink-soft)] mb-4">
          Khi có tin đúng nhu cầu hoặc khách quan tâm tin của bạn, Radar gọi/Zalo báo ngay
          thay vì chỉ chờ email. Không bắt buộc.
        </p>
        <input
          className="inp w-full mb-1"
          placeholder="09xxxxxxxx"
          inputMode="tel"
          value={sdt}
          onChange={(e) => { setSdt(e.target.value); setLoi(""); }}
          onKeyDown={(e) => e.key === "Enter" && luu()}
        />
        {loi && <p className="text-xs text-red-600 mb-2">{loi}</p>}
        <button className="btn btn-primary w-full text-center mb-2 mt-2" onClick={luu} disabled={dangLuu}>
          {dangLuu ? "Đang lưu…" : "Lưu số"}
        </button>
        <button className="block w-full text-center text-xs text-[var(--ink-faint)]" onClick={deSau}>
          Để sau
        </button>
      </div>
    </div>
  );
}
