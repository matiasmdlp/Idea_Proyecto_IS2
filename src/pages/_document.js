// pages/_document.js
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    // Puedes cambiar lang="en" a lang="es" si tu app es principalmente en español
    <Html lang="es">
      <Head>
        {/* Referencias existentes (si las tuvieras, como favicons, etc.) */}

        {/* --- Añade esto para Material Icons --- */}
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
        {/* ------------------------------------ */}

        {/* Añade aquí también los links de Google Fonts (Poppins) si los tenías en el Head de index.js */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      </Head>
      {/* className en body es opcional, puedes quitarlo si no lo usas */}
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
