import Script from "next/script";

// Microsoft Clarity (free): heatmap + session recording + rage click - đo UX thật (bước "đo sau khi live" của UX validation).
// Chỉ nạp khi có NEXT_PUBLIC_CLARITY_ID (Vercel env). Lấy ID: clarity.microsoft.com -> New project -> Setup -> "Install manually" -> chuỗi sau "clarity", "script", "XXXX".
export default function Clarity() {
  const id = process.env.NEXT_PUBLIC_CLARITY_ID;
  if (!id || !/^[a-z0-9]+$/i.test(id)) return null;
  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${id}");`}
    </Script>
  );
}
