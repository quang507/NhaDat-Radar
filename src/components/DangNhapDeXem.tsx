"use client";

import { useState } from "react";

// Cổng "đăng nhập để xem SĐT người đăng" — mô hình Homigo nhưng KHÔNG thu tiền:
// khách vãng lai bấm nút thì mở popup mời đăng nhập/đăng ký, đăng nhập xong thấy số.
// Mục tiêu là gom tài khoản (email + tên) để nuôi kênh phân phối (email tin mới, retarget),
// đổi lại khách được xem SĐT che — chi phí bằng 0 với khách, giá trị thu về là danh sách user.
//
// Chỉ chặn SĐT NGƯỜI ĐĂNG. Hotline tư vấn của Radar (TuVanRadar) vẫn hiện cho mọi khách —
// chặn nốt cái đó là tự bóp kênh lead chính.
//
// v1: /auth sau đăng nhập đổ về /dashboard chứ chưa quay lại đúng tin đang xem (actions.ts
// chưa nhận tham số next). Chấp nhận được — sửa luồng quay-lại là việc riêng ở auth/actions.
export default function DangNhapDeXem() {
  const [mo, setMo] = useState(false);

  return (
    <>
      <button
        onClick={() => setMo(true)}
        className="btn w-full text-center border border-[var(--line)] font-semibold"
      >
        🔒 Đăng nhập để xem SĐT người đăng
      </button>

      {mo && (
        <div
          className="fixed inset-0 z-[1000] bg-black/50 grid place-items-center p-4"
          onClick={() => setMo(false)}
        >
          <div
            className="bg-[var(--bg,#fff)] rounded-xl p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-bold mb-1">Xem SĐT người đăng</div>
            <p className="text-sm text-[var(--ink-soft)] mb-4">
              Tạo tài khoản miễn phí để xem số liên hệ, lưu tin yêu thích và nhận thông báo
              khi có tin mới đúng khu vực bạn quan tâm.
            </p>
            <a href="/auth?mode=register" className="btn btn-primary w-full text-center block mb-2">
              Đăng ký miễn phí
            </a>
            <a href="/auth" className="btn w-full text-center block border border-[var(--line)]">
              Tôi đã có tài khoản — Đăng nhập
            </a>
            <button
              onClick={() => setMo(false)}
              className="block w-full text-center text-xs text-[var(--ink-faint)] mt-3"
            >
              Để sau
            </button>
          </div>
        </div>
      )}
    </>
  );
}
