// pages/api/auth/register.js
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, password, username } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email y contraseña son requeridos.' });
  }

  // Validaciones adicionales...

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'El email ya está registrado.' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username: username || null,
      },
    });

    // --- INICIO DEL CAMBIO ---
    // Crear un objeto para la respuesta, convirtiendo BigInt a String
    const responseUser = {
      id: user.id.toString(), // Convertir el BigInt a String
      email: user.email,
      username: user.username,
      createdAt: user.createdAt, // Las fechas son serializables
      updatedAt: user.updatedAt,
    };

    // Enviar el objeto modificado
    return res.status(201).json({ user: responseUser });
    // --- FIN DEL CAMBIO ---

  } catch (error) {
    console.error("Error en registro:", error);
     if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
         return res.status(409).json({ message: 'El nombre de usuario ya existe.' });
     }
    // Captura explícita del error de BigInt si aún ocurriera por alguna razón
    if (error instanceof TypeError && error.message.includes('BigInt')) {
         console.error("Error de serialización BigInt detectado:", error);
         return res.status(500).json({ message: 'Error interno del servidor al procesar datos.' });
    }
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}