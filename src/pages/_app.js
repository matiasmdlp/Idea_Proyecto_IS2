// src/pages/_app.js
import { SessionProvider } from "next-auth/react";
import Modal from 'react-modal'; // Importar Modal
import '@/styles/globals.css';

// Configurar el appElement para react-modal
if (typeof window !== 'undefined') {
  Modal.setAppElement('#__next');
}

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}

export default MyApp;