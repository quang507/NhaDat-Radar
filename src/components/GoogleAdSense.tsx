import Script from "next/script";

/**
 * Google AdSense Script loader.
 * Kích hoạt khi có biến môi trường NEXT_PUBLIC_ADSENSE_CLIENT_ID (dạng ca-pub-XXXXXXXXXXXXXXXX)
 */
export default function GoogleAdSense() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();

  if (!clientId || !clientId.startsWith("ca-pub-")) {
    return null;
  }

  return (
    <Script
      id="google-adsense"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  );
}
