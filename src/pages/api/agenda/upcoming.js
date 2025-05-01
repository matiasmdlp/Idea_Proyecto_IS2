// pages/api/agenda/upcoming.js
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

// Reutiliza el helper para formatear la hora (Date Epoch -> HH:MM:SS string)
const formatDbTimeToHHMMSS = (dbTimeValue) => {
    if (!dbTimeValue || !(dbTimeValue instanceof Date) || isNaN(dbTimeValue.getTime())) return null;
    try {
        const hours = dbTimeValue.getUTCHours().toString().padStart(2, '0');
        const minutes = dbTimeValue.getUTCMinutes().toString().padStart(2, '0');
        const seconds = dbTimeValue.getUTCSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    } catch { return null; }
};

// Reutiliza el helper para formatear la respuesta
const safeStringifyAgendaItem = (item) => {
    if (!item) return null;
    const formattedHoraInicio = formatDbTimeToHHMMSS(item.horaInicio);
    const formattedHoraFin = formatDbTimeToHHMMSS(item.horaFin);

    return {
        id: item.id?.toString(),
        userId: item.userId?.toString(),
        activityId: item.activityId?.toString(),
        fecha: item.fecha?.toISOString().split('T')[0], // YYYY-MM-DD
        horaInicio: formattedHoraInicio, // <-- Usa formateada
        horaFin: formattedHoraFin,  

        activity: item.activity ? {
            id: item.activity.id?.toString(),
            name: item.activity.name,
            iconName: item.activity.iconName
        } : undefined,
        notes: item.notes,
        // Añade otros campos si los necesitas en el resumen (ej. location)
        // locationLatitude: item.locationLatitude?.toString(),
        // locationLongitude: item.locationLongitude?.toString(),
    };
};


export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const token = await getToken({ req });
    if (!token || !token.sub) {
        return res.status(401).json({ message: 'No autenticado' });
    }
    const userId = BigInt(token.sub);

    try {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Inicio del día local

        // Define cuántos próximos eventos quieres mostrar
        const limit = 7; // Muestra los próximos 3

        const upcomingItems = await prisma.agenda.findMany({
            where: {
                userId: userId,
                fecha: { gte: now },
            },
            // --- AÑADE select o incluye todos los campos necesarios ---
            select: { // Usa 'select' para especificar EXACTAMENTE qué traer
                id: true,
                userId: true,     // Necesario para safeStringify (aunque podrías quitarlo)
                activityId: true, // Necesario para safeStringify
                fecha: true,        // Necesario
                horaInicio: true,   // ¡Necesario!
                horaFin: true,      // ¡Necesario!
                notes: true,        // Si lo muestras en el resumen
                locationLatitude: true, // Si lo muestras
                locationLongitude: true,// Si lo muestras
                createdAt: true,    // Necesario para safeStringify
                updatedAt: true,    // Necesario para safeStringify
                periodicidad: true, // Necesario para safeStringify
                reminderEnabled: true,// Necesario para safeStringify
                reminderOffsetMinutes: true, // Necesario para safeStringify

                // Mantiene el include para traer datos de la actividad
                activity: {
                    select: { name: true, iconName: true, id: true, userId: true } // userId de activity opcional aquí
                }
            },
            // --- FIN select ---
            orderBy: [
                { fecha: 'asc' },
                { horaInicio: 'asc' },
            ],
            take: limit,
        });


        console.log(`DEBUG [GET /api/agenda/upcoming]: Found ${upcomingItems.length} raw items from Prisma.`);
        if(upcomingItems.length > 0) console.log("First raw item from Prisma:", upcomingItems[0]); // Verifica que vengan las horas

        const safeItems = upcomingItems.map(safeStringifyAgendaItem).filter(Boolean);

        return res.status(200).json(safeItems);

    } catch (error) {
        console.error(`Error fetching upcoming agenda for user ${userId}:`, error);
        return res.status(500).json({ message: 'Error al obtener próximas actividades' });
    }
}