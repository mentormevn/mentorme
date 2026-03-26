import Head from "next/head";
import Script from "next/script";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/style.css" />
        <link rel="stylesheet" href="/search.css" />
      </Head>
      <Script src="/public-config.js" strategy="beforeInteractive" />
      <Script
        src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
        strategy="beforeInteractive"
      />
      <Component {...pageProps} />
      <Script src="/main.js" strategy="afterInteractive" />
    </>
  );
}
