import Script from 'next/script';
import './globals.css';

const GA_ID = 'G-VQ0WRBJ4TZ';

const SITE_URL = 'https://portfolio.siriai.co.kr';
const DESCRIPTION = '브랜드의 아이덴티티에 가장 근접한 인플루언서 큐레이션.';

export const metadata = {
  title: 'SIRIAI Portfolio',
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: 'https://siriai.co.kr/portfolio',
  },
  openGraph: {
    title: 'SIRIAI Portfolio',
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: 'SIRIAI',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SIRIAI Portfolio',
    description: DESCRIPTION,
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/*
          next/font/google's declared subsets for Noto Sans JP/KR omit an
          explicit "japanese"/"korean" label, but a plain Google Fonts CSS2
          request for these families serves unrestricted font files covering
          Hiragana/Kanji/Hangul (verified via fontTools cmap inspection), so
          <link> tags are used instead of next/font/google here.
        */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;600;700&family=Noto+Sans+JP:wght@700&display=swap"
        />
      </head>
      <body>
        {children}
        {/*
          GA4. afterInteractive rather than the raw async <script> from the
          snippet: next/script keeps it out of the critical path while still
          loading it on every route. Category switching is a pushState, not a
          navigation, so those views are counted by GA4's enhanced-measurement
          "page changes based on browser history events" rather than by a
          second gtag call here — sending one too would double-count them.
        */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
        </Script>
      </body>
    </html>
  );
}
