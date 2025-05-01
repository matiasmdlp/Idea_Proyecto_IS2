// pages/api/activities/[activityId].js
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
    // --- Solo permite el método DELETE por ahora ---
    if (req.method !== 'DELETE') {
        res.setHeader('Allow', ['DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // --- Autenticación y Autorización ---
    const token = await getToken({ req });
    console.log(`DEBUG [DELETE /api/activities/ID]: Token check:`, token);

    if (!token || !token.sub) {
        console.error(`DEBUG [DELETE /api/activities/ID]: No valid token or sub found, returning 401.`);
        return res.status(401).json({ message: 'No autenticado' });
    }

    const userId = BigInt(token.sub);
    const { activityId } = req.query; // Obtiene el ID de la URL

    if (!activityId) {
         return res.status(400).json({ message: 'ID de actividad requerido en la URL.' });
    }

    const activityIdBigInt = BigInt(activityId);
    console.log(`DEBUG [DELETE /api/activities/${activityId}]: Attempting delete for user ${userId}`);


    // --- Lógica de Borrado ---
    try {
        // 1. Verifica si la actividad pertenece al usuario ANTES de borrarla
        const activityToDelete = await prisma.activity.findUnique({
            where: { id: activityIdBigInt },
            select: { userId: true } // Solo necesitamos saber el dueño
        });

        if (!activityToDelete) {
            return res.status(404).json({ message: 'Actividad no encontrada.' });
        }

        // 2. Comprueba la propiedad (y que no sea una actividad estándar)
        if (activityToDelete.userId === null) {
            return res.status(403).json({ message: 'No puedes eliminar actividades estándar.' });
        }
        if (activityToDelete.userId !== userId) {
            return res.status(403).json({ message: 'No tienes permiso para eliminar esta actividad.' });
        }

        // 3. Si todo está bien, procede a eliminar
        await prisma.activity.delete({
            where: {
                id: activityIdBigInt,
                // Podríamos añadir userId aquí también por doble seguridad, pero ya lo verificamos
                // userId: userId
            },
        });

        console.log(`DEBUG [DELETE /api/activities/${activityId}]: Successfully deleted activity for user ${userId}`);
        // Puedes devolver 200 con mensaje o 204 sin contenido
        // return res.status(204).end();
        return res.status(200).json({ message: 'Actividad eliminada correctamente' });

    } catch (error) {
        console.error(`Error deleting activity ${activityId} for user ${userId}:`, error);
        // Manejar errores específicos de Prisma si es necesario (ej. P2025 Record not found)
        if (error.code === 'P2025') {
             return res.status(404).json({ message: 'Actividad no encontrada al intentar eliminar.' });
        }
        return res.status(500).json({ message: 'Error interno al eliminar la actividad' });
    }
}