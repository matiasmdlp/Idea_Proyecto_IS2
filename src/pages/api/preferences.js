// pages/api/preferences.js
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

// Helper para convertir BigInt a String en un objeto anidado
const safeStringifyPreferences = (prefs) => {
    if (!prefs) return null;
    return {
        ...prefs,
        preferencesId: prefs.preferencesId?.toString(),
        userId: prefs.userId?.toString(),
        activityId: prefs.activityId?.toString(),
        // Los campos Decimal también deben ser string para JSON seguro
        maxPrecipitationIntensity: prefs.maxPrecipitationIntensity?.toString(),
    };
};


export default async function handler(req, res) {
    const token = await getToken({ req });
    console.log(`DEBUG [${req.method} /api/preferences]: Token check:`, token);

    // --- Autenticación ---
    if (!token || !token.sub) {
        console.error(`DEBUG [${req.method} /api/preferences]: No valid token or sub found, returning 401.`);
        // GET podría devolver array vacío, POST debe fallar
        if (req.method !== 'GET') {
            return res.status(401).json({ message: 'No autenticado' });
        }
        // Si es GET y no hay token, no devolvemos preferencias de usuario
    }

    // Si hay token, obtenemos userId (solo para POST es estrictamente necesario aquí)
    const userId = token?.sub ? BigInt(token.sub) : null;
    if (userId) {
         console.log(`DEBUG [${req.method} /api/preferences]: Auth successful via token for user sub: ${token.sub}.`);
    }

    //const userId = BigInt(session.user.id);

    if (req.method === 'GET') {
        // --- Obtener TODAS las preferencias del usuario ---
        if (!userId) {
            // Si no hay usuario, no hay preferencias que devolver (solo hay prefs de usuario)
            return res.status(200).json([]);
        }
        try {
            const preferences = await prisma.userActivityPreference.findMany({
                where: { userId: userId },
            });
             const safePreferences = preferences.map(safeStringifyPreferences);
            return res.status(200).json(safePreferences);
        } catch (error) {
            console.error("Error fetching user preferences:", error);
            return res.status(500).json({ message: 'Error al obtener las preferencias' });
        }

    } else if (req.method === 'POST') { // Usaremos POST para crear/actualizar (Upsert)
        // --- Guardar/Actualizar UNA preferencia ---
        if (!userId) {
            // Doble chequeo, aunque el chequeo inicial ya debería haber retornado 401
            console.error(`DEBUG [POST /api/preferences]: Reached POST logic without valid userId from token.`);
            return res.status(401).json({ message: 'No autenticado' });
        }

        const { activityId, ...preferenceData } = req.body;

        if (!activityId) {
            return res.status(400).json({ message: 'activityId es requerido' });
        }

        const activityIdBigInt = BigInt(activityId);

        // Validar y parsear los datos de preferencia recibidos
         const dataToUpsert = {
            minTemp: preferenceData?.minTemp !== undefined ? (preferenceData.minTemp === '' ? null : parseInt(preferenceData.minTemp, 10)) : undefined,
            maxTemp: preferenceData?.maxTemp !== undefined ? (preferenceData.maxTemp === '' ? null : parseInt(preferenceData.maxTemp, 10)) : undefined,
            maxWindSpeed: preferenceData?.maxWindSpeed !== undefined ? (preferenceData.maxWindSpeed === '' ? null : parseInt(preferenceData.maxWindSpeed, 10)) : undefined,
            maxPrecipitationProbability: preferenceData?.maxPrecipitationProbability !== undefined ? (preferenceData.maxPrecipitationProbability === '' ? null : parseInt(preferenceData.maxPrecipitationProbability, 10)) : undefined,
            maxPrecipitationIntensity: preferenceData?.maxPrecipitationIntensity !== undefined ? (preferenceData.maxPrecipitationIntensity === '' ? null : parseFloat(preferenceData.maxPrecipitationIntensity)) : undefined,
            requiresNoPrecipitation: typeof preferenceData?.requiresNoPrecipitation === 'boolean' ? preferenceData.requiresNoPrecipitation : undefined,
            maxUv: preferenceData?.maxUv !== undefined ? (preferenceData.maxUv === '' ? null : parseInt(preferenceData.maxUv, 10)) : undefined,
            isActive: typeof preferenceData?.isActive === 'boolean' ? preferenceData.isActive : undefined,
         };
         // Eliminar claves undefined para que Prisma no intente poner NULL donde no debe
         Object.keys(dataToUpsert).forEach(key => dataToUpsert[key] === undefined && delete dataToUpsert[key]);


        try {
            console.log(`DEBUG [POST /api/preferences]: Upserting for userId ${userId}, activityId ${activityIdBigInt}`);
            const upsertedPreference = await prisma.userActivityPreference.upsert({
                where: {
                    // Usamos el índice único definido en el schema
                    userId_activityId: {
                        userId: userId,
                        activityId: activityIdBigInt,
                    },
                },
                // Datos a usar si se CREA una nueva preferencia
                create: {
                    userId: userId,
                    activityId: activityIdBigInt,
                    // Valores por defecto si no se proporcionan en la primera creación (opcional)
                    minTemp: dataToUpsert.minTemp ?? null, // Usa el valor parseado o null
                    maxTemp: dataToUpsert.maxTemp ?? null,
                    maxWindSpeed: dataToUpsert.maxWindSpeed ?? null,
                    maxPrecipitationProbability: dataToUpsert.maxPrecipitationProbability ?? null,
                    maxPrecipitationIntensity: dataToUpsert.maxPrecipitationIntensity ?? null,
                    requiresNoPrecipitation: dataToUpsert.requiresNoPrecipitation ?? false,
                    maxUv: dataToUpsert.maxUv ?? null,
                    isActive: dataToUpsert.isActive ?? true,
                },
                 // Datos a usar si se ACTUALIZA una preferencia existente
                 update: dataToUpsert, // Solo actualiza los campos proporcionados
            });

            // Convertir BigInts a String para la respuesta
             const safePreference = safeStringifyPreferences(upsertedPreference);

            return res.status(200).json(safePreference);

        } catch (error) {
            console.error("Error upserting preference:", error);
             // Podría fallar si el activityId no existe (Foreign Key constraint)
            if (error.code === 'P2003') {
                 return res.status(404).json({ message: 'La actividad especificada no existe.' });
            }
            return res.status(500).json({ message: 'Error al guardar la preferencia' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}