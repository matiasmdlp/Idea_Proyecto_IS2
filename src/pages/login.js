// pages/login.js
import { useState } from 'react';
import { signIn, getCsrfToken } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head'; // Importa Head para el título de la página
import styles from '../styles/Login.module.css'; // Importa los estilos

export default function Login({ csrfToken }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false); // Estado para el checkbox
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false); // Estado para deshabilitar botón

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true); // Inicia carga

    const result = await signIn('credentials', {
      redirect: false,
      email: email,
      password: password,
      // Nota: 'rememberMe' no es usado directamente por 'credentials' por defecto
      // Necesitarías lógica personalizada en NextAuth para manejar sesiones extendidas
    });

    setLoading(false); // Finaliza carga

    if (result.error) {
      setError(result.error);
    } else if (result.ok) {
      // Redirige a la página deseada después del éxito, por ejemplo, la raíz
      router.push(router.query.callbackUrl || '/');
    }
  };

  return (
    <div className={styles.container}>
       <Head>
         <title>Iniciar Sesión</title>
       </Head>
      <div className={styles.card}>
        <h1 className={styles.title}>Sign In</h1>
        <form onSubmit={handleSubmit}>
          {/* Input oculto para CSRF token es importante */}
          <input name="csrfToken" type="hidden" defaultValue={csrfToken} />

          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className={styles.input}
            />
          </div>

           {/* Muestra el error aquí si existe */}
           {error && <p className={styles.error}>{error}</p>}

          <div className={styles.optionsGroup}>
             <div className={styles.checkboxGroup}>
                <input
                    id="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className={styles.checkbox}
                />
                <label htmlFor="rememberMe" className={styles.checkboxLabel}>Remember me</label>
             </div>
             {/* Enlace placeholder - la funcionalidad requiere más configuración */}
            <a href="#" className={styles.forgotPasswordLink}>Forgot password?</a>
          </div>


          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Signing in...' : 'Submit'}
          </button>

          <div className={styles.registerLinkContainer}>
            Don't have an account?{' '}
            <a href="/register" className={styles.registerLink}>Sign up</a>
          </div>
        </form>
      </div>
    </div>
  );
}

// getServerSideProps para obtener csrfToken sigue igual
export async function getServerSideProps(context) {
  return {
    props: {
      csrfToken: await getCsrfToken(context),
    },
  };
}