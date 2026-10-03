import Script from "next/script";

// Google Analytics 4 (gtag.js). Mã đo lường là public.
// 2/10: tài sản "Nhadat Radar" (tài khoản quangle) có luồng nhadatradar.com mã G-1XRXV857VE nhưng web lại gửi
// về G-FJ8QKCLWJZ -> GA báo "không nhận được dữ liệu". Giờ gửi về CẢ HAI (giữ mã cũ phòng khi nó thuộc tài khoản
// khác đang dùng). Đổi được qua NEXT_PUBLIC_GA_ID, nhiều mã cách nhau dấu phẩy.
export default function GoogleAnalytics() {
  const ids = (process.env.NEXT_PUBLIC_GA_ID || "G-1XRXV857VE,G-FJ8QKCLWJZ")
    .split(",").map((s) => s.trim()).filter((s) => /^G-[A-Z0-9]+$/.test(s));
  if (!ids.length) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${ids[0]}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {/* 3/10: trình duyệt TỰ ĐỘNG (Playwright/Selenium - navigator.webdriver) không tính vào GA. Bộ test E2E chạy từ
            GitHub Actions (máy Azure ở Phoenix/Boydton/Des Moines) chiếm 182/196 "người dùng" tuần đầu, làm sai hết số liệu. */}
        {`if(navigator.webdriver){${ids.map((id) => `window['ga-disable-${id}']=true;`).join("")}}window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());${ids.map((id) => `gtag('config','${id}');`).join("")}`}
      </Script>
    </>
  );
}
