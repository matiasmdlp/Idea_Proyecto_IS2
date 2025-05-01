// pages/api/agenda/index.js
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

// --- Helper Functions ---

// Formatea cadena HH:MM o HH:MM:SS a HH:MM:SS (para procesar input)
const formatTimeForDB = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':');
    if (parts.length === 2) return `${timeStr}:00`;
    if (parts.length === 3) return timeStr;
    return null;
};

// Formatea objeto Date (con fecha Epoch UTC de Prisma) a string HH:MM:SS (para respuesta JSON)
const formatDbTimeToHHMMSS = (dbTimeValue) => {
    if (!dbTimeValue || !(dbTimeValue instanceof Date) || isNaN(dbTimeValue.getTime())) return null;
    try {
        const hours = dbTimeValue.getUTCHours().toString().padStart(2, '0');
        const minutes = dbTimeValue.getUTCMinutes().toString().padStart(2, '0');
        const seconds = dbTimeValue.getUTCSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    } catch { return null; }
};

// Convierte el item completo para la respuesta JSON
const safeStringifyAgendaItem = (item) => {
    if (!item) return null;
    const formattedHoraInicio = formatDbTimeToHHMMSS(item.horaInicio);
    const formattedHoraFin = formatDbTimeToHHMMSS(item.horaFin);
    if (formattedHoraInicio === null || formattedHoraFin === null && (item.horaInicio || item.horaFin)) {
         console.warn(`Warning: Could not format time for agenda item ID ${item.id}. Inicio: ${item.horaInicio}, Fin: ${item.horaFin}`);
    }
    return {
        id: item.id?.toString(),
        userId: item.userId?.toString(),
        activityId: item.activityId?.toString(),
        locationLatitude: item.locationLatitude?.toString(),
        locationLongitude: item.locationLongitude?.toString(),
        fecha: item.fecha?.toISOString().split('T')[0],
        horaInicio: formattedHoraInicio, // String HH:MM:SS
        horaFin: formattedHoraFin,       // String HH:MM:SS
        createdAt: item.createdAt?.toISOString(),
        updatedAt: item.updatedAt?.toISOString(),
        activity: item.activity ? { // <-- ASEGURA ESTE BLOQUE
            id: item.activity.id?.toString(),
            userId: item.activity.userId ? item.activity.userId.toString() : null,
            name: item.activity.name,     // Pasa el nombre
            iconName: item.activity.iconName // Pasa el icono
        } : undefined, 
        notes: item.notes,
        periodicidad: item.periodicidad,
        reminderEnabled: item.reminderEnabled,
        reminderOffsetMinutes: item.reminderOffsetMinutes
    };
};
// --- Fin Helpers ---


export default async function handler(req, res) {
    const token = await getToken({ req });
    if (!token || !token.sub) { return res.status(401).json({ message: 'No autenticado' }); }
    const userId = BigInt(token.sub);
    console.log(`DEBUG [${req.method} /api/agenda]: Auth OK for user ${userId}.`);

    // --- MANEJAR GET ---
    if (req.method === 'GET') {
        try {
            const now = new Date(); now.setHours(0, 0, 0, 0);
            const agendaItems = await prisma.agenda.findMany({
                where: { userId: userId, fecha: { gte: now } },
                include: { activity: { select: { name: true, iconName: true, id: true, userId: true } } },
                orderBy: [ { fecha: 'asc' }, { horaInicio: 'asc' } ],
            });
            console.log(`DEBUG [GET /api/agenda]: Found ${agendaItems.length} raw items.`);
            // Loguear primer item crudo si existe (ya no debería fallar)
            if(agendaItems.length > 0) console.log("First raw item from Prisma:", agendaItems[0]);

            const safeItems = agendaItems.map(safeStringifyAgendaItem).filter(Boolean);
            console.log(`DEBUG [GET /api/agenda]: Sending ${safeItems.length} safe items.`);
            return res.status(200).json(safeItems);
        } catch (error) { /* ... manejo de error GET ... */ }
    }
    // --- MANEJAR POST ---
    else if (req.method === 'POST') {
        const { activityId, fecha, horaInicio, horaFin, notes, locationLatitude, locationLongitude, /* ... reminders */ } = req.body;

        // Validación básica
        if (!activityId || !fecha || !horaInicio || !horaFin) { return res.status(400).json({ message: 'Faltan campos requeridos.' }); }

        const formattedStartTime = formatTimeForDB(horaInicio); // "HH:MM:SS" o null
        const formattedEndTime = formatTimeForDB(horaFin);     // "HH:MM:SS" o null

        if (!formattedStartTime || !formattedEndTime) { return res.status(400).json({ message: 'Formato de hora inválido.' });}
        if (formattedEndTime <= formattedStartTime) { return res.status(400).json({ message: 'Hora de fin debe ser posterior a inicio.' }); }

        // Parsear fecha y horas a objetos Date (con Epoch UTC para horas)
        let fechaDate, horaInicioDate, horaFinDate;
        try {
             fechaDate = new Date(fecha + 'T00:00:00Z');
             horaInicioDate = new Date(`1970-01-01T${formattedStartTime}Z`); // CORRECTO para DateTime @db.Time
             horaFinDate = new Date(`1970-01-01T${formattedEndTime}Z`);     // CORRECTO para DateTime @db.Time
             if (isNaN(fechaDate.getTime()) || isNaN(horaInicioDate.getTime()) || isNaN(horaFinDate.getTime())) throw new Error('Fecha/Hora inválida');
        } catch(e) { return res.status(400).json({ message: `Formato fecha/hora inválido: ${e.message}` }); }

        // Parsear y validar Lat/Lon
        let finalLatitude = locationLatitude ? parseFloat(locationLatitude) : null;
        let finalLongitude = locationLongitude ? parseFloat(locationLongitude) : null;
        if (finalLatitude !== null && (isNaN(finalLatitude) || finalLatitude < -90 || finalLatitude > 90)) { /* ... error lat ... */ }
        if (finalLongitude !== null && (isNaN(finalLongitude) || finalLongitude < -180 || finalLongitude > 180)) { /* ... error lon ... */ }

        // Lógica opcional para usar default Lat/Lon si no se proporcionaron
        if (finalLatitude === null && finalLongitude === null) { /* ... fetch user default ... */ }

        // Preparar datos para Prisma (usando Date objects para horas)
        const dataToCreate = {
            userId,
            activityId: BigInt(activityId),
            fecha: fechaDate,           // Prisma espera Date
            horaInicio: horaInicioDate, // Prisma espera Date
            horaFin: horaFinDate,       // Prisma espera Date
            notes: notes || null,
            locationLatitude: finalLatitude,
            locationLongitude: finalLongitude,
            // ... reminders ...
        };
        console.log("DEBUG [POST /api/agenda]: Data to create (Schema: DateTime @db.Time):", dataToCreate);

        try {
            const newAgendaItem = await prisma.agenda.create({ data: dataToCreate, include: { activity: { select: { name: true, iconName: true, id: true, userId: true } }  } });
            const safeItem = safeStringifyAgendaItem(newAgendaItem); // Formatea respuesta
            return res.status(201).json(safeItem);
        } catch (error) { /* ... manejo de error POST ... */ }
    }
    // --- MANEJAR OTROS MÉTODOS ---
    else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}