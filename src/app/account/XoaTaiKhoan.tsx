"use client";

import { useActionState, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { xoaTaiKhoan, type KetQuaXoa } from "./xoa-tai-khoan";

// 2/11 (audit 🔴4): 2 bước - mở khung -> gõ câu xác nhận. Không dùng confirm() (WebView có thể chặn hộp thoại JS)
export default function XoaTaiKhoan() {
  const [mo, setMo] = useState(false);
  const [go, setGo] = useState("");
  const [kq, action, dang] = useActionState<KetQuaXoa, FormData>(xoaTaiKhoan, {});
  const dung = go.trim().toUpperCase() === "XOA TAI KHOAN";

  return (
    <section aria-labelledby="xoa-tk" className="mt-8 rounded-sm border border-red-500/30 bg-[var(--surface)] p-5">
      <h2 id="xoa-tk" className="font-bold flex items-center gap-2 text-red-600">
        <AlertTriangle className="w-4 h-4 shrink-0" /> Xoá tài khoản
      </h2>
      <p className="text-sm text-[var(--ink-soft)] mt-1">
        Xoá vĩnh viễn tài khoản, hồ sơ, tin đã đăng, tin đã lưu, tin nhắn, lịch hẹn và ảnh đã tải lên. Không khôi phục được.
      </p>
      {!mo ? (
        <button type="button" onClick={() => setMo(true)} className="btn min-h-11 mt-3 !border-red-500/50 !text-red-600">
          Tôi muốn xoá tài khoản
        </button>
      ) : (
        <form
          action={action}
          onSubmit={() => { try { localStorage.removeItem("ndr_favs"); } catch { /* riêng tư/chặn - bỏ qua */ } }}
          className="mt-3 flex flex-col gap-3"
        >
          <label className="block">
            <span className="block text-caption font-semibold text-[var(--ink-soft)] mb-1">Gõ <b>XOA TAI KHOAN</b> để xác nhận</span>
            <input
              name="xac_nhan"
              className="inp min-h-11"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={go}
              onChange={(e) => setGo(e.target.value)}
            />
          </label>
          {kq.loi && <p role="alert" className="text-sm text-red-600">{kq.loi}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn min-h-12" disabled={dang} onClick={() => { setMo(false); setGo(""); }}>Huỷ</button>
            <button type="submit" disabled={!dung || dang} className="btn min-h-12 !bg-red-600 !border-red-600 !text-white disabled:opacity-50">
              {dang ? "Đang xoá…" : "Xoá vĩnh viễn"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
