import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap"
        />
        <link rel="icon" href="data:," />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
