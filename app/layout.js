import './globals.css';

export const metadata = {
  title: 'SIRIAI Portfolio',
  alternates: {
    canonical: 'https://siriai.co.kr/portfolio',
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
      <body>{children}</body>
    </html>
  );
}
