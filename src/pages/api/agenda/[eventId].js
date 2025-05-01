// pages/api/agenda/[eventId].js
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

// Función Helper para formatear cadena HH:MM o HH:MM:SS a HH:MM:SS
// Necesaria si el input type="time" devuelve solo HH:MM
const formatTimeForDB = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return null; // Devuelve null si no es string válido
    const parts = timeStr.split(':');
    if (parts.length === 2) return `${timeStr}:00`; // Añade segundos si faltan
    if (parts.length === 3) return timeStr; // Ya tiene segundos
    return null; // Formato inválido, devuelve null
};

// Función Helper para convertir objeto Date (potencialmente con fecha Epoch) a string HH:MM:SS
const formatDbTimeToHHMMSS = (dbTimeValue) => {
    // Prisma devuelve el tipo TIME como String 'HH:MM:SS' o 'HH:MM:SS.mmm'
    // cuando el schema se define como String @db.Time
    // Si tu schema es DateTime @db.Time, Prisma devuelve Date object con Epoch
    if (!dbTimeValue) return null;

    if (typeof dbTimeValue === 'string') {
        // Si ya es string, intenta extraer HH:MM:SS
         const match = dbTimeValue.match(/^(\d{2}:\d{2}:\d{2})/);
         return match ? match[1] : null;
    } else if (dbTimeValue instanceof Date && !isNaN(dbTimeValue.getTime())) {
         // Si es un objeto Date (probablemente de schema DateTime @db.Time)
         try {
             const hours = dbTimeValue.getUTCHours().toString().padStart(2, '0');
             const minutes = dbTimeValue.getUTCMinutes().toString().padStart(2, '0');
             const seconds = dbTimeValue.getUTCSeconds().toString().padStart(2, '0');
             return `${hours}:${minutes}:${seconds}`;
         } catch { return null; }
    }
    return null; // Devuelve null si no se puede formatear
};


// Función Helper para convertir BigInt/Decimal/Date seguros para JSON en la respuesta
const safeStringifyAgendaItem = (item) => {
    if (!item) return null;
    return {
        id: item.id?.toString(),
        userId: item.userId?.toString(),
        activityId: item.activityId?.toString(),
        locationLatitude: item.locationLatitude?.toString(), // Convertir Decimal a string
        locationLongitude: item.locationLongitude?.toString(), // Convertir Decimal a string
        fecha: item.fecha?.toISOString().split('T')[0], // Formato YYYY-MM-DD
        horaInicio: formatDbTimeToHHMMSS(item.horaInicio), // Formatea a HH:MM:SS string
        horaFin: formatDbTimeToHHMMSS(item.horaFin),       // Formatea a HH:MM:SS string
        createdAt: item.createdAt?.toISOString(),
        updatedAt: item.updatedAt?.toISOString(),
        activity: item.activity ? { // Asegúrate que el 'include' trae estos campos
            id: item.activity.id?.toString(),
            userId: item.activity.userId ? item.activity.userId.toString() : null,
            name: item.activity.name,
            iconName: item.activity.iconName
        } : undefined,
        notes: item.notes,
        periodicidad: item.periodicidad,
        reminderEnabled: item.reminderEnabled,
        reminderOffsetMinutes: item.reminderOffsetMinutes
    };
};


export default async function handler(req, res) {
    const token = await getToken({ req });
    const { eventId } = req.query;

    if (!token || !token.sub) { return res.status(401).json({ message: 'No autenticado' }); }
    const userId = BigInt(token.sub);
    let eventIdBigInt;
    try { eventIdBigInt = BigInt(eventId); } catch { return res.status(400).json({ message: 'ID evento inválido.' }); }
    console.log(`DEBUG [${req.method} /api/agenda/${eventId}]: Auth OK for user ${userId}.`);

    
    console.log(`--- Received Request: ${req.method} /api/agenda/${eventId} ---`);

    // --- Verificar Propiedad ---
    let eventToModify;
    try {
        eventToModify = await prisma.agenda.findUnique({ where: { id: eventIdBigInt }, select: { userId: true } });
        if (!eventToModify) { return res.status(404).json({ message: 'Evento no encontrado.' }); }
        if (eventToModify.userId !== userId) { return res.status(403).json({ message: 'No tienes permiso.' }); }
        console.log(`DEBUG [${req.method} /api/agenda/${eventId}]: Ownership verified.`);
    } catch (error) { /* ... manejo error verificación ... */ }
    // --- FIN VERIFICACIÓN PROPIEDAD ---


    // --- MANEJAR PUT (Actualizar) ---
    if (req.method === 'PUT') {
        console.log("--- Entering PUT block ---");

        const {
            activityId, fecha, horaInicio, horaFin, notes,
            locationLatitude, locationLongitude, reminderEnabled, reminderOffsetMinutes
            // ... incluye otros campos si permites editarlos (ej. periodicidad)
        } = req.body;


         // --- Validación ---
         if (!activityId || !fecha || !horaInicio || !horaFin) { return res.status(400).json({ message: 'Faltan campos requeridos.' }); }

         const formattedStartTime = formatTimeForDB(horaInicio);
         const formattedEndTime = formatTimeForDB(horaFin);

         if (!formattedStartTime || !formattedEndTime) { return res.status(400).json({ message: 'Formato de hora inválido (HH:MM o HH:MM:SS).' });}
         if (formattedEndTime <= formattedStartTime) { return res.status(400).json({ message: 'Hora de fin debe ser posterior a inicio.' }); }

          // Validar lat/lon si se proporcionan
         if ((locationLatitude && !locationLongitude) || (!locationLatitude && locationLongitude)) { return res.status(400).json({ message: 'Proporciona Latitud y Longitud juntas o ninguna.' }); }
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

        const dataToUpdate = {
            activityId: BigInt(activityId),
            fecha: fechaDate,           // Prisma espera Date
            horaInicio: horaInicioDate, // Prisma espera Date
            horaFin: horaFinDate,       // Prisma espera Date
            notes: notes || null,
            locationLatitude: finalLatitude,
            locationLongitude: finalLongitude,
            reminderEnabled: reminderEnabled ?? false,
            reminderOffsetMinutes: reminderEnabled ? (parseInt(reminderOffsetMinutes, 10) || null) : null,
        };
        console.log(`DEBUG [PUT /api/agenda/${eventId}]: Data to update (Schema: DateTime @db.Time):`, dataToUpdate);


        try {
            const updatedAgendaItem = await prisma.agenda.update({
                where: { id: eventIdBigInt },
                data: dataToUpdate,
                include: { // <-- ¡ASEGURA QUE ESTO ESTÉ PRESENTE!
                    activity: {
                        select: { name: true, iconName: true, id: true, userId: true }
                    }
                }
            });
            const safeItem = safeStringifyAgendaItem(updatedAgendaItem);
            console.log(`DEBUG [PUT /api/agenda/${eventId}]: Update successful.`);
            // --- ¡RETURN AQUÍ! ---
            return res.status(200).json(safeItem);
            // --- FIN RETURN ---
        } catch (error) {
             console.error(`Error updating agenda item ${eventIdBigInt}:`, error);
             // ... (manejo de errores específicos de PUT) ...
             // --- ¡RETURN AQUÍ TAMBIÉN! ---
             return res.status(500).json({ message: 'Error al actualizar el evento' });
             // --- FIN RETURN ---
        }

    }
    // --- MANEJAR DELETE (Borrar) ---
    else if (req.method === 'DELETE') {
        console.log("--- Entering DELETE block ---");
        try {
            console.log(`DEBUG [DELETE /api/agenda/${eventId}]: Deleting event.`);
            await prisma.agenda.delete({ where: { id: eventIdBigInt } });
            console.log(`DEBUG [DELETE /api/agenda/${eventId}]: Delete successful.`);
            // --- ¡RETURN AQUÍ! ---
            return res.status(200).json({ message: 'Evento eliminado correctamente' });
            // --- FIN RETURN ---
        } catch (error) {
             console.error(`Error deleting agenda item ${eventIdBigInt}:`, error);
             // ... (manejo de errores específicos de DELETE) ...
             // --- ¡RETURN AQUÍ TAMBIÉN! ---
             return res.status(500).json({ message: 'Error al eliminar el evento' });
             // --- FIN RETURN ---
        }
    }
    // --- Método no permitido ---
    else {
        console.log(`--- Method ${req.method} Not Allowed ---`);
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}