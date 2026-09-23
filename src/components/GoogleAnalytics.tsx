import Script from "next/script";

// Google Analytics 4 (gtag.js). Mã đo lường là public, mặc định G-FJ8QKCLWJZ (luồng "NhaDat Radar Web"); đổi được qua NEXT_PUBLIC_GA_ID.
export default function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID || "G-FJ8QKCLWJZ";
  if (!/^G-[A-Z0-9]+$/.test(id)) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`}
      </Script>
    </>
  );
}
