// pages/api/activities.js
import { getToken } from 'next-auth/jwt'; // <-- SOLO ESTA
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        // --- Lógica GET usando getToken ---
        const token = await getToken({ req });
        console.log(`DEBUG [GET /api/activities]: Token check:`, token ? 'OK' : 'No token');

        // Definir userId basado en token.sub
        const userId = token?.sub ? BigInt(token.sub) : null;
        console.log(`DEBUG [GET /api/activities]: userId defined via token as:`, userId);

        try {
            const whereClause = userId
                ? { OR: [{ userId: null }, { userId: userId }] }
                : { userId: null };
            console.log(`DEBUG [GET /api/activities]: Using whereClause:`, whereClause);

            // ... (resto de la lógica findMany, map, return 200) ...
             const activities = await prisma.activity.findMany({ where: whereClause, /* ... orderBy ... */ });
             const safeActivities = activities.map(activity => {
                if (!activity || activity.id === null || activity.id === undefined) {
                     console.warn("API Warning: Skipping activity with missing/null ID:", activity);
                     return null; // O un objeto vacío, o filtrar después
                }
                return {
                    ...activity,
                    // Usa optional chaining por si acaso, aunque id no debería ser null
                    id: activity.id?.toString(),
                    userId: activity.userId ? activity.userId.toString() : null,
                };
            }).filter(Boolean);
             return res.status(200).json(safeActivities);

        } catch (error) {
             // ... (manejo de error 500) ...
             console.error("Error fetching activities:", error);
             return res.status(500).json({ message: 'Error al obtener actividades' });
        }

    } else if (req.method === 'POST') {
          // ... (obtener y validar sesión) ...
        const token = await getToken({ req });
        console.log(`DEBUG [POST /api/activities]: Token object after getToken:`, token);

        if (!token || !token.sub) {
            console.error(`DEBUG [POST /api/activities]: No valid token or sub found, returning 401.`);
            return res.status(401).json({ message: 'No autenticado (token inválido)' });
        }


         console.log(`DEBUG [POST /api/activities]: Authentication successful via token for user sub: ${token.sub}.`);
         const userId = BigInt(token.sub);
         // --- ¡¡ASEGÚRATE DE QUE ESTA LÍNEA ESTÉ AQUÍ Y SEA CORRECTA!! ---
         const { name, description, iconName, preferences } = req.body;
         console.log(`DEBUG [POST /api/activities]: Received body:`, { name, description, iconName, preferences });
         // --- FIN DE LA VERIFICACIÓN ---


         if (!name) {
            return res.status(400).json({ message: 'El nombre de la actividad es requerido.' });
         }

         
         
         // ... resto del POST ...
          try {
            const result = await prisma.$transaction(async (tx) => {
            // 1. Crear actividad (Ahora 'name', 'description', etc., deberían estar definidas)
            console.log(`DEBUG [Transaction]: Creating activity with:`, { name, description, iconName, userId });
            const newActivity = await tx.activity.create({
                data: { name, description, iconName, userId } // Usa las variables del scope exterior
            });
            console.log(`DEBUG [Transaction]: Activity created with ID: ${newActivity.id}`);

            // 2. Crear preferencia
            console.log(`DEBUG [Transaction]: Preferences received in body:`, preferences);
            // Asegúrate de que 'preferences' tenga la estructura correcta
            // y convierte los valores numéricos si vienen como string del form
            const preferenceData = {
                minTemp: preferences?.minTemp ? parseInt(preferences.minTemp, 10) : null,
                maxTemp: preferences?.maxTemp ? parseInt(preferences.maxTemp, 10) : null,
                maxWindSpeed: preferences?.maxWindSpeed ? parseInt(preferences.maxWindSpeed, 10) : null,
                maxPrecipitationProbability: preferences?.maxPrecipitationProbability ? parseInt(preferences.maxPrecipitationProbability, 10) : null,
                maxPrecipitationIntensity: preferences?.maxPrecipitationIntensity ? parseFloat(preferences.maxPrecipitationIntensity) : null,
                requiresNoPrecipitation: preferences?.requiresNoPrecipitation ?? false,
                maxUv: preferences?.maxUv ? parseInt(preferences.maxUv, 10) : null,
                isActive: preferences?.isActive ?? true,
            };
            console.log(`DEBUG [Transaction]: Parsed preferenceData:`, preferenceData);

            const dataToCreatePref = {
                userId: userId,
                activityId: newActivity.id,
                minTemp: preferenceData.minTemp ?? null,
                maxTemp: preferenceData.maxTemp ?? null,
                maxWindSpeed: preferenceData.maxWindSpeed ?? null,
                maxPrecipitationProbability: preferenceData.maxPrecipitationProbability ?? null,
                maxPrecipitationIntensity: preferenceData.maxPrecipitationIntensity ?? null,
                requiresNoPrecipitation: preferenceData.requiresNoPrecipitation ?? false,
                maxUv: preferenceData.maxUv ?? null,
                isActive: preferenceData.isActive ?? true,
            };
            console.log(`DEBUG [Transaction]: Creating preference with:`, dataToCreatePref);

            const newPreference = await tx.userActivityPreference.create({ data: dataToCreatePref });
            console.log(`DEBUG [Transaction]: Preference created with ID: ${newPreference.preferencesId}`);

            return { activity: newActivity, preference: newPreference };
        });




              // --- CORRECCIÓN AQUÍ ---
        // Convierte los BigInts del objeto 'result'
        const safeActivityResult = {
            activity: {
                ...(result.activity || {}), // Usa spread seguro
                id: result.activity?.id?.toString(), // Convierte id de actividad
                userId: result.activity?.userId?.toString(), // Convierte userId de actividad
            },
            preference: {
                ...(result.preference || {}), // Usa spread seguro
                preferencesId: result.preference?.preferencesId?.toString(), // Convierte id de preferencia
                userId: result.preference?.userId?.toString(), // Convierte userId de preferencia
                activityId: result.preference?.activityId?.toString(), // Convierte activityId de preferencia
                // Los decimales también a string
                maxPrecipitationIntensity: result.preference?.maxPrecipitationIntensity?.toString()
            }
        };
        

        console.log("DEBUG [POST /api/activities]: Activity created successfully, returning:", safeActivityResult);
        return res.status(201).json(safeActivityResult); // Devuelve el objeto con strings

    } catch (error) {
        // ... (manejo de errores, incluyendo P2002) ...
         console.error("Error creating activity in DB:", error);
         if (error.code === 'P2002') { return res.status(409).json({ message: `Ya tienes una actividad llamada "${name}".` }); }
         return res.status(500).json({ message: 'Error al crear la actividad' });
    }

} else {
        // ... (manejo de otros métodos) ...
         res.setHeader('Allow', ['GET', 'POST']);
         return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}