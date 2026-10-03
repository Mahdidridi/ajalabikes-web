import { Head, Html, Main, NextScript } from 'next/document';
import { ThemeScript } from '@/components/ThemeScript';

export default function ErrorDocument() {
  return (
    <Html lang="ar" dir="rtl">
      <Head><ThemeScript /></Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
