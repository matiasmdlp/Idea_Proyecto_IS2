import { SessionProvider } from "next-auth/react";
import '@/styles/globals.css'; // Asumiendo que tienes este archivo para estilos globales

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}

export default MyApp;