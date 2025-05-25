// src/lib/filters.js
import { DateTime } from "luxon";
/**
 * Filtra una lista de items de agenda para devolver solo aquellos
 * cuya hora de finalización es posterior a la hora actual.
 * Asume que item.fecha es 'YYYY-MM-DD' y item.horaFin es 'HH:MM:SS'.
 * Las fechas y horas se interpretan como UTC para la comparación.
 * @param {Array<object>} agendaItems - Array de objetos de agenda.
 * @param {string} logPrefix - Prefijo para los mensajes de consola.
 * @returns {Array<object>} - Array filtrado de items de agenda.
 */
export function filterFutureAgendaItemsByEndTime(agendaItems, logPrefix = "[Filter]") {
    // Obtener la hora actual en UTC para una comparación consistente
    const nowUtc = new Date(); 
    console.log(`--- ${nowUtc} ****************`);
    //const nowClientTimestamp = nowUtc.getTime(); 
    
    const nowClientTimestamp = nowUtc.getTime() - 14400000;

    console.log(`--- ${logPrefix} Filtering Upcoming Agenda By End Time ---`);
    console.log(`${logPrefix} Current Timestamp (UTC from client):`, nowClientTimestamp, `(${nowUtc.toISOString()})`);
    
    if (!Array.isArray(agendaItems)) {
        console.warn(`${logPrefix} Input is not an array. Returning empty array.`);
        return [];
    }
    console.log(`${logPrefix} Original items count:`, agendaItems.length);
    // console.log(`${logPrefix} Original items:`, JSON.stringify(agendaItems.slice(0, 5), null, 2)); // Loguea algunos items

    const filteredItems = agendaItems.filter(item => {
        // console.log(`${logPrefix} Checking item ID=${item?.id}, Date=${item?.fecha}, EndTime=${item?.horaFin}`);

        if (!item || typeof item.id === 'undefined' || !item.fecha || !item.horaFin || 
            typeof item.fecha !== 'string' || typeof item.horaFin !== 'string') {
            console.warn(`${logPrefix}  -> Skipping item (ID: ${item?.id || 'N/A'}) due to missing/invalid essential data (fecha, horaFin). Item:`, item);
            return false;
        }

        // Validar formato de fecha (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.fecha)) {
            console.warn(`${logPrefix}  -> Skipping item ID=${item.id}. Invalid fecha format: "${item.fecha}". Expected YYYY-MM-DD.`);
            return false;
        }
        // Validar formato de hora (HH:MM:SS)
        if (!/^\d{2}:\d{2}:\d{2}$/.test(item.horaFin)) {
            console.warn(`${logPrefix}  -> Skipping item ID=${item.id}. Invalid horaFin format: "${item.horaFin}". Expected HH:MM:SS.`);
            return false;
        }

        try {
            // Construye la fecha/hora de finalización del evento COMO UTC.
            const eventEndDateTimeString = `${item.fecha}T${item.horaFin}Z`; // Ej: "2025-05-24T11:06:00Z"
            const eventEndDate = new Date(eventEndDateTimeString);

            if (isNaN(eventEndDate.getTime())) {
                console.warn(`${logPrefix}  -> Skipping item ID=${item.id}. Invalid Date constructed from "${eventEndDateTimeString}".`);
                return false;
            }

            const eventEndTimestamp = eventEndDate.getTime(); // Timestamp UTC de la hora de finalización
            
            // LA LÓGICA CLAVE: ¿La hora de finalización es posterior a la hora actual?
            const isFutureOrOngoing = eventEndTimestamp > nowClientTimestamp;

            // Logs para depuración detallada (descomenta si es necesario):
            console.log(
                `${logPrefix} Item ID=${item.id} (${item.activity?.name || 'N/A'}): \n` +
                `  Fecha: ${item.fecha}, HoraFin: ${item.horaFin}\n` +
                 `  EventEndString: "${eventEndDateTimeString}"\n` +
                 `  EventEnd (Date Obj): ${eventEndDate.toISOString()} (Timestamp: ${eventEndTimestamp})\n` +
                 `  Now (Date Obj): ${nowUtc.toISOString()} (Timestamp: ${nowClientTimestamp})\n` +
                 `  Condition (EventEnd > Now): ${eventEndTimestamp} > ${nowClientTimestamp} = ${isFutureOrOngoing}`
             );

            return isFutureOrOngoing;

        } catch (e) {
            console.error(`${logPrefix}  -> Error processing item ID=${item.id}:`, e, "Item data:", item);
            return false; // Excluir si hay error
        }
    });

    console.log(`${logPrefix} Filtered items count:`, filteredItems.length);
    // console.log(`${logPrefix} Filtered items:`, JSON.stringify(filteredItems.slice(0,5), null, 2));
    console.log(`--- ${logPrefix} End Filtering ---`);
    return filteredItems;
}