// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma.js';


export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      // El nombre para mostrar en la página de inicio de sesión (por ejemplo, "Iniciar sesión con Correo")
      name: 'Credentials',
      // `credentials` se usa para generar un formulario en la página de inicio de sesión predeterminada.
      // Puedes especificar los campos que esperas que se envíen.
      // ej. domain, username, password, 2FA token, etc.
      // Puedes pasar cualquier atributo HTML extra al <input> a través del objeto.
      credentials: {
        email: { label: "Email", type: "email", placeholder: "tu@email.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        // --- LOG AQUÍ ---
        console.log("DEBUG [authorize]: NEXTAUTH_SECRET used:", process.env.NEXTAUTH_SECRET ? '****** (loaded)' : '!!! NOT LOADED !!!');
        // --- FIN LOG ---
        // Lógica para buscar el usuario en la base de datos
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña requeridos.');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
           // Si no se encuentra el usuario o no tiene contraseña (podría ser de un proveedor OAuth futuro)
          throw new Error('No user found with this email or password setup.');
        }

        // Verificar la contraseña
        const isValidPassword = await bcrypt.compare(credentials.password, user.password);

        if (!isValidPassword) {
          throw new Error('Contraseña incorrecta.');
        }

        // Cualquier objeto devuelto aquí se guardará en la propiedad `user` del JWT
        // Devolvemos el usuario sin la contraseña
        return {
            id: user.id.toString(), // Convertir BigInt a string para la sesión
            email: user.email,
            username: user.username,
            // Puedes añadir más campos aquí si los necesitas en la sesión
        };
      }
    })
    // ...agrega más proveedores aquí si los necesitas (Google, Facebook, etc.)
  ],
  session: {
    // Usar JSON Web Tokens para las sesiones en lugar de sesiones de base de datos.
    strategy: 'jwt',
  },
  callbacks: {
    // El callback de sesión se llama cada vez que se verifica una sesión
    async session({ session, token }) {
      // Añadir el ID del usuario (y otros datos si quieres) del token a la sesión
      if (token?.sub) { // 'sub' es el ID del usuario en el token JWT por defecto
         session.user.id = token.sub;
      }
      // Puedes añadir más datos aquí si los incluiste en el token durante 'authorize' o en el callback 'jwt'
      // session.user.username = token.username; // Ejemplo
      return session;
    },
     // El callback jwt se llama al crear/actualizar un JWT (inicio de sesión, actualización de sesión)
     async jwt({ token, user }) {
       // El objeto 'user' solo está disponible en el primer inicio de sesión
       if (user) {
           token.sub = user.id; // Guarda el ID del usuario en el token
           // token.username = user.username; // Guarda otros datos si es necesario
       }
       return token;
   }
  },
  pages: {
    signIn: '/login', // Redirige a los usuarios a esta página para iniciar sesión
    // signOut: '/auth/signout',
    // error: '/auth/error', // Error code passed in query string as ?error=
    // verifyRequest: '/auth/verify-request', // (used for email/passwordless login)
     newUser: '/register' // Redirige aquí si se intenta iniciar sesión con un proveedor OAuth por primera vez
  },
  secret: process.env.NEXTAUTH_SECRET, // Asegúrate de tener esto en tu .env
  debug: process.env.NODE_ENV === 'development', // Muestra logs detallados en desarrollo
};

export default NextAuth(authOptions);