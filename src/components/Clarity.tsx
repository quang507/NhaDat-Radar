import Script from "next/script";

// Microsoft Clarity (free): heatmap + session recording + rage click - đo UX thật (bước "đo sau khi live" của UX validation).
// Chỉ nạp khi có NEXT_PUBLIC_CLARITY_ID (Vercel env). Lấy ID: clarity.microsoft.com -> New project -> Setup -> "Install manually" -> chuỗi sau "clarity", "script", "XXXX".
// 2/11 (audit pháp lý): ghi phiên là theo dõi hành vi -> chỉ nạp khi khách đã bấm "Đồng ý" ở banner cookie
// (components/DongYCookie.tsx), hoặc ngay lúc bấm (sự kiện "radar-dong-y").
export default function Clarity() {
  const id = process.env.NEXT_PUBLIC_CLARITY_ID;
  if (!id || !/^[a-z0-9]+$/i.test(id)) return null;
  return (
    <Script id="ms-clarity" strategy="lazyOnload">
      {`(function(){function nap(){if(navigator.webdriver||window.clarity)return;(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${id}");if(location.pathname.indexOf("/admin")===0)window.clarity("set","role","admin");}try{if(localStorage.getItem("radar-dong-y-cookie")==="co")nap();}catch(e){}window.addEventListener("radar-dong-y",nap);})();`}
    </Script>
  );
}
