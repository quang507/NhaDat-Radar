"use client";

// Đóng lớp phủ RỒI mới điều hướng (2/11, đi cùng useDongBangBack): đóng lớp phủ thì hook tự history.back()
// để gỡ mục lịch sử đã đẩy - back() chạy bất đồng bộ, router.push ngay sau đó sẽ bị cú Back này cắt ngang
// (về lại URL cũ). Nên chờ popstate của cú Back xong mới gọi fn; không có mục lớp phủ thì gọi luôn.
export function dongRoiDi(dong: () => void, fn: () => void) {
  const coMuc = !!window.history.state?.lopPhu;
  dong();
  if (!coMuc) { fn(); return; }
  let xong = false;
  const chay = () => {
    if (xong) return;
    xong = true;
    window.removeEventListener("popstate", chay);
    setTimeout(fn, 0);
  };
  window.addEventListener("popstate", chay);
  setTimeout(chay, 400);   // phòng khi popstate không tới (trình duyệt lạ) - vẫn điều hướng
}
