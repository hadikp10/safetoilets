import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en-IN">
      <Head>
        {/* Open Graph / Social sharing preview */}
        <meta property="og:title" content="SafeToilets Kerala" />
        <meta property="og:description" content="Find clean public toilets near you in Kerala" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://safetoilets.pages.dev" />
        <meta property="og:image" content="https://safetoilets.pages.dev/og-image.png" />
        <meta name="twitter:card" content="summary" />

        {/* PWA Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SafeToilets" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#1C1917" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />

        {/* Leaflet CSS */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
