"use client";

import { useEffect, useRef } from "react";

// Nút Back Android (app TWA) / vuốt lùi: đóng lớp phủ (modal, khung chat, menu, gallery) thay vì rời trang.
// Mở lớp phủ -> đẩy 1 mục lịch sử cùng URL; Back -> popstate -> đóng. Đóng bằng nút X -> tự lùi mục đã đẩy.
// Giữ nguyên history.state của Next (__NA + cây router) nên router coi popstate là "cùng trang", không tải lại.
export function useDongBangBack(mo: boolean, dong: () => void) {
  const dongRef = useRef(dong);
  dongRef.current = dong;

  useEffect(() => {
    if (!mo) return;
    window.history.pushState({ ...(window.history.state || {}), lopPhu: true }, "");
    let daBack = false;
    const onPop = () => { daBack = true; dongRef.current(); };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (!daBack && window.history.state?.lopPhu) window.history.back();
    };
  }, [mo]);
}
