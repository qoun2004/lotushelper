import './globals.css';
import Script from 'next/script';

export const metadata = {
  title: '寵妻神器 — CVS行銷AI助理',
  description: '百大CVS行銷經理AI自動駕駛工作面板',
  manifest: '/manifest.json',
  themeColor: '#7C6E5C',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        {children}
        <Script
          src="https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
