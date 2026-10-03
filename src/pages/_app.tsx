import type { AppProps } from 'next/app';
import { Geist, Noto_Sans_Arabic } from 'next/font/google';
import '../app/globals.css';

const geist = Geist({ variable: '--font-sans', subsets: ['latin'] });
const arabic = Noto_Sans_Arabic({ variable: '--font-arabic', subsets: ['arabic'] });

// Next serves ISR rendering failures through the Pages Router's static 500.
export default function ErrorApp({ Component, pageProps }: AppProps) {
  return (
    <div className={`${geist.variable} ${arabic.variable} min-h-screen font-sans antialiased`}>
      <Component {...pageProps} />
    </div>
  );
}
