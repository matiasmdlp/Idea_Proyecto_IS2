/**
 * Filtra una lista de items de agenda para devolver solo aquellos
 * cuya hora de finalización es posterior a la hora actual.
 * @param {Array<object>} agendaItems - Array de objetos de agenda (deben tener id, fecha, horaFin).
 * @param {string} logPrefix - Prefijo para los mensajes de consola (ej. "[Index Filter]").
 * @returns {Array<object>} - Array filtrado de items de agenda.
 */
export function filterFutureAgendaItemsByEndTime(agendaItems, logPrefix = "[Filter]") {
    const nowClientTimestamp = new Date().getTime();
    console.log(`--- ${logPrefix} Filtering Upcoming Agenda By End Time ---`);
    console.log(`${logPrefix} Current Timestamp:`, nowClientTimestamp, `(${new Date(nowClientTimestamp).toISOString()})`);
    console.log(`${logPrefix} Original items count:`, agendaItems?.length);

    if (!Array.isArray(agendaItems)) {
        console.warn(`${logPrefix} Input is not an array.`);
        return [];
    }

    const filteredItems = agendaItems.filter(item => {
        console.log(`${logPrefix} Checking item ID=${item?.id}, Date=${item?.fecha}, EndTime=${item?.horaFin}`);

        if (!item || !item.id || !item.fecha || !item.horaFin || typeof item.fecha !== 'string' || typeof item.horaFin !== 'string') {
            console.log(`${logPrefix}  -> Skipping item ${item?.id} (missing/invalid data)`);
            return false; // Excluir items inválidos
        }

        try {
            const endTimeStr = item.horaFin; // HH:MM:SS
            const eventEndDate = new Date(`${item.fecha}T${endTimeStr}Z`); // Fecha/Hora FIN UTC

            if (isNaN(eventEndDate.getTime())) {
                console.warn(`${logPrefix}  -> Skipping item ${item.id} (Invalid eventEndDate). Date: ${item.fecha}, Time: ${endTimeStr}`);
                return false;
            }

            const eventEndTimestamp = eventEndDate.getTime();
            const isFuture = eventEndTimestamp > nowClientTimestamp; // Hora FIN > Ahora

            console.log(`${logPrefix}  -> Item ${item.id}: Event End Timestamp = ${eventEndTimestamp}`);
            console.log(`${logPrefix}  -> Item ${item.id}: Is Future? (${eventEndTimestamp} > ${nowClientTimestamp}) = ${isFuture}`);

            return isFuture;

        } catch (e) {
            console.error(`${logPrefix}  -> Error comparing dates for item ${item.id}:`, e);
            return false; // Excluir si hay error
        }
    });

    console.log(`${logPrefix} Filtered items count:`, filteredItems.length);
    console.log(`--- ${logPrefix} End Filtering ---`);
    return filteredItems;
}