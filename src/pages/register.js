// pages/register.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import Head from 'next/head';
import styles from '../styles/Register.module.css'; // Importa los estilos de registro

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, username }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Algo salió mal en el registro');
      }

      // Registro exitoso
      setSuccess(true);

      // Intenta iniciar sesión automáticamente
      const signInResult = await signIn('credentials', {
        redirect: false,
        email: email,
        password: password,
      });

      setLoading(false); // Termina carga aquí, después del intento de signIn

      if (signInResult.ok) {
        router.push('/'); // Redirigir al dashboard
      } else {
        // Si el inicio de sesión automático falla
        setError('Registro exitoso. Por favor, inicia sesión manualmente.');
        // Opcional: redirigir a login después de un tiempo
        setTimeout(() => router.push('/login'), 3000);
      }

    } catch (err) {
      setLoading(false); // Asegúrate de parar la carga en caso de error
      setError(err.message);
    }
  };

  return (
    <div className={styles.container}>
       <Head>
         <title>Registrarse</title>
       </Head>
      <div className={styles.card}>
        <h1 className={styles.title}>Sign Up</h1>
        <form onSubmit={handleSubmit}>

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
            <label htmlFor="username" className={styles.label}>Username (Optional)</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
               placeholder="Choose a username"
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
              placeholder="Create password"
              required
              className={styles.input}
            />
          </div>

           {error && <p className={styles.error}>{error}</p>}
           {success && !error && <p style={{ color: 'green', textAlign: 'center', marginBottom: '1rem' }}>¡Registro exitoso! Redirigiendo...</p>}


          {/* No hay 'Remember me' ni 'Forgot password' aquí */}

          <button type="submit" className={styles.submitButton} disabled={loading || success}>
             {loading ? 'Registering...' : 'Sign Up'}
          </button>

          <div className={styles.registerLinkContainer}> {/* Reutilizamos la clase o creamos una nueva si se quiere diferente */}
             Already have an account?{' '}
            <a href="/login" className={styles.registerLink}>Sign in</a>
          </div>
        </form>
      </div>
    </div>
  );
}