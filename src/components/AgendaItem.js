// components/AgendaItem.js
import React, { useState, useEffect } from 'react';
import { checkWeatherConditions } from '@/lib/weatherCheck'; // Ajusta ruta
import styles from '@/styles/Agenda.module.css'; // Reutiliza estilos

// Re-define helpers o impórtalos si los moviste a utils
const formatDisplayTime = (timeStr) => {
    // Log de entrada (MANTENER ESTE LOG)
    console.log(`DEBUG [formatDisplayTime - AgendaItem]: Input timeStr: "${timeStr}" (Type: ${typeof timeStr})`);

    if (!timeStr || typeof timeStr !== 'string') {
        console.warn("DEBUG [formatDisplayTime - AgendaItem]: Invalid input.");
        return "-"; // Devuelve "-" en lugar de "Inválida" si prefieres
    }
    try {
        // La Regex busca HH:MM al PRINCIPIO de la cadena
        const match = timeStr.match(/^(\d{2}:\d{2})/);
        if (match && match[1]) {
            console.log(`DEBUG [formatDisplayTime - AgendaItem]: Match found! Returning: "${match[1]}"`);
            return match[1]; // Devuelve HH:MM
        }
        // Si no hubo match
        console.warn("DEBUG [formatDisplayTime - AgendaItem]: No HH:MM match found at start. Returning '-'. Input was:", timeStr);
        return "-"; // Devuelve "-" en lugar de "Inválida"
    } catch (e) {
        console.error("DEBUG [formatDisplayTime - AgendaItem]: Error during regex match:", timeStr, e);
        return "-"; // Devuelve "-" en caso de error
    }
};
const formatDate = (dateStr) => { /* ... */ };

   
// Componente para mostrar el indicador de clima
const WeatherIndicator = ({ status }) => {
    let icon = 'help_outline'; // Default: sin datos o cargando
    let color = '#adb5bd';    // Gris
    let title = 'Verificando clima...';

    switch (status) {
        case 'ok':
            icon = 'check_circle_outline';
            color = '#198754'; // Verde
            title = 'Condiciones OK';
            break;
        case 'precaucion':
            icon = 'warning_amber';
            color = '#ffc107'; // Amarillo/Naranja
            title = 'Precaución (revisa detalles)';
            break;
        case 'no_ok':
            icon = 'error_outline';
            color = '#dc3545'; // Rojo
            title = 'Condiciones NO adecuadas';
            break;
         case 'sin_datos':
             icon = 'help_outline';
             color = '#6c757d'; // Gris oscuro
             title = 'Faltan datos de pronóstico o preferencias';
             break;
         case 'error':
             icon = 'error';
             color = '#dc3545';
             title = 'Error al verificar clima';
             break;
        default: // 'loading' o estado inicial
            icon = 'hourglass_empty'; // O un spinner
            color = '#adb5bd';
            title = 'Verificando clima...';
    }

    return (
        <span className={`material-icons ${styles.weatherIndicator}`} style={{ color: color }} title={title}>
            {icon}
        </span>
    );
};


export default function AgendaItem({ item, preference, weatherData, onEdit, onDelete }) {
    console.log(`DEBUG [AgendaItem ID: ${item?.id}]: Received Props:`, { item, preference, weatherData }); // <-- LOG AQUÍ

    const [weatherStatus, setWeatherStatus] = useState({ status: 'loading', reasons: [] });

    useEffect(() => {
        // Resetea estado al cambiar el item
        setWeatherStatus({ status: 'loading', reasons: [] });

        // Encuentra el pronóstico relevante y compara
        const checkItemWeather = () => {
            if (!weatherData || !item || !preference) {
                console.log(`Check skipped for item ${item?.id}: Missing data (weatherData, item, or preference)`);
                setWeatherStatus({ status: 'sin_datos', reasons: ['Faltan datos iniciales'] });
                return;
            }

            // 1. Encuentra el día correcto en el pronóstico
            const forecastDay = weatherData.forecast?.forecastday?.find(day => day.date === item.fecha);
            if (!forecastDay || !forecastDay.hour) {
                 console.log(`Check skipped for item ${item.id}: No forecast data for date ${item.fecha}`);
                setWeatherStatus({ status: 'sin_datos', reasons: [`Pronóstico no disponible para ${item.fecha}`] });
                return;
            }

            // 2. Encuentra la hora más cercana en el pronóstico horario
            const itemStartHour = parseInt(item.horaInicio?.substring(0, 2), 10); // Hora de inicio del evento (0-23)
            if (isNaN(itemStartHour)) {
                 console.log(`Check skipped for item ${item.id}: Invalid start hour ${item.horaInicio}`);
                 setWeatherStatus({ status: 'sin_datos', reasons: ['Hora de inicio inválida'] });
                 return;
            }

            // WeatherAPI devuelve las 24h, busca la hora exacta
            const relevantHourForecast = forecastDay.hour.find(h => {
                const forecastHour = new Date(h.time_epoch * 1000).getHours();
                return forecastHour === itemStartHour;
            });

            if (!relevantHourForecast) {
                console.log(`Check skipped for item ${item.id}: No hourly forecast found for hour ${itemStartHour} on ${item.fecha}`);
                 setWeatherStatus({ status: 'sin_datos', reasons: [`Pronóstico no disponible para las ${itemStartHour}:00`] });
                 return;
            }

            console.log(`Checking weather for item ${item.id} (Activity: ${item.activity?.name}) at hour ${itemStartHour}`, { preference, relevantHourForecast });

            // 3. Llama a la función de comparación
            const result = checkWeatherConditions(preference, relevantHourForecast);
            setWeatherStatus(result);
        };

         // Ejecuta el chequeo (quizás con un pequeño delay para no bloquear UI)
        const timer = setTimeout(checkItemWeather, 50); // Pequeño delay
        return () => clearTimeout(timer); // Limpia timer si el componente se desmonta

    }, [item, preference, weatherData]); // Depende de estos datos



    console.log(`DEBUG [Render AgendaItem ID: ${item?.id}]: horaInicio='${item?.horaInicio}', horaFin='${item?.horaFin}'`);
    // --- Renderizado del Item ---
    if (!item || !item.id) return null; // Guarda contra items inválidos

    return (
        <li className={styles.agendaItem}>

            {/* 1. Info Actividad (Icono + Nombre) */}
            <div className={styles.itemActivityInfo}>
                {item.activity?.iconName && <span className={`material-icons ${styles.itemIcon}`}>{item.activity.iconName}</span>}
                <span className={styles.itemName}>{item.activity?.name || 'Actividad ?'}</span>
            </div>

            {/* 2. Indicador Clima */}
            <WeatherIndicator status={weatherStatus.status} />

            {/* 3. Notas (en línea, opcional) */}
            {item.notes && <span className={styles.itemNotesInline}>{item.notes}</span>}

            {/* 4. Acciones */}
            <div className={styles.itemActions}>
                <button onClick={() => onEdit(item)} className={`${styles.actionButtonSmall} ${styles.editButton}`} title="Editar evento">
                    <span className="material-icons">edit</span>
                </button>
                <button onClick={() => onDelete(item.id)} className={`${styles.actionButtonSmall} ${styles.deleteButton}`} title="Eliminar evento">
                    <span className="material-icons">delete_outline</span>
                </button>
            </div>

            {/* 5. Detalles Inferiores (Fecha/Hora, Ubicación, Warning) - Ocupan todo el ancho */}
            {/* Solo renderiza este div si hay algo que mostrar */}
            {(item.fecha || item.locationLatitude || weatherStatus.reasons.length > 0) && (
                 <div className={styles.itemBottomDetails}>
                     {/* Fecha y Hora */}
                     {(item.fecha || item.horaInicio) && ( // Muestra solo si hay fecha u hora
                         <div className={styles.itemDateTime}>
                            {item.fecha && <span className={styles.itemDate}>{formatDate(item.fecha)}</span>}
                             {(item.horaInicio || item.horaFin) && ( // Muestra solo si hay horas
                                <span className={styles.itemTime}>
                                    {formatDisplayTime(item.horaInicio)}
                                    {item.horaInicio && item.horaFin && ' - '} {/* Separador si ambos existen */}
                                    {formatDisplayTime(item.horaFin)}
                                </span>
                             )}
                         </div>
                     )}

                     {/* Ubicación */}
                     {item.locationLatitude && item.locationLongitude && (
                        <p className={styles.itemLocation}>
                            📍 {parseFloat(item.locationLatitude).toFixed(4)}, {parseFloat(item.locationLongitude).toFixed(4)}
                        </p>
                     )}

                     {/* Advertencia Clima */}
                     {weatherStatus.reasons.length > 0 && (
                         <p className={styles.itemWarning}>
                             <span className="material-icons" style={{fontSize: '1em', verticalAlign: 'bottom'}}>warning_amber</span>
                             {' '} {weatherStatus.reasons.join('. ')}
                         </p>
                     )}
                 </div>
            )}

        </li>
    );
}