import Head from 'next/head';
import '../src/styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.cdnfonts.com" />
        <link rel="stylesheet" href="https://fonts.cdnfonts.com/css/google-sans" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
