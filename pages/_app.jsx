import Head from 'next/head';
import '../src/styles/globals.css';

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Flow - Đồng hồ học tập & làm việc</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="description" content="Ứng dụng đếm ngược thời gian tập trung với đồng hồ nổi desktop" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⏱</text></svg>" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
