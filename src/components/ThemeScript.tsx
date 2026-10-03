import Script from 'next/script';

const THEME_SCRIPT =
  "(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})()";

/** Root not-found can mount client-side, where native inline scripts do not run. */
export function ThemeScript({ afterInteractive = false }: { afterInteractive?: boolean }) {
  if (afterInteractive) {
    return <Script id="error-page-theme" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
  }

  return (
    <script
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}
