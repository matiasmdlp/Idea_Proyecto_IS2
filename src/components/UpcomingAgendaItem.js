// components/UpcomingAgendaItem.js
import React, { useState, useEffect } from 'react';
import { checkWeatherConditions } from '@/lib/weatherCheck'; // Reutiliza la función
import styles from '@/styles/Dashboard.module.css'; // Usa estilos del Dashboard

// --- Helpers (Copiar/Importar formatDate y formatDisplayTime) ---
const formatDisplayTime = (timeStr) => { // <-- AÑADE ESTA FUNCIÓN
    if (!timeStr || typeof timeStr !== 'string') {
         console.warn("formatDisplayTime received invalid input:", timeStr);
         return "Inválida"; // Devuelve explícitamente "Inválida"
    }
    try {
        const match = timeStr.match(/^(\d{2}:\d{2})/);
        return match ? match[1] : "Inválida"; // Devuelve explícitamente "Inválida"
    } catch(e) {
         console.error("Error formatting display time:", timeStr, e);
         return "Inválida"; // Devuelve explícitamente "Inválida"
    }
}; 
const formatDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return "Inválida";
    try {
        const date = new Date(dateStr + 'T00:00:00');
        if (isNaN(date.getTime())) return "Inválida";
        return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch { return "Inválida"; }
};
// --- Fin Helpers ---

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


export default function UpcomingAgendaItem({ item, preference, weatherData }) {
    const [weatherStatus, setWeatherStatus] = useState({ status: 'loading', reasons: [] });

    useEffect(() => {
        setWeatherStatus({ status: 'loading', reasons: [] });

        const checkItemWeather = () => {
            if (!item || !item.fecha || !item.horaInicio || !weatherData) {
                // Nota: No marcamos 'sin_datos' si falta preference, checkWeatherConditions lo maneja
                setWeatherStatus({ status: 'sin_datos', reasons: ['Faltan datos evento/clima'] });
                return;
            }

            const forecastDay = weatherData.forecast?.forecastday?.find(day => day.date === item.fecha);
            if (!forecastDay || !forecastDay.hour) {
                setWeatherStatus({ status: 'sin_datos', reasons: [`Pronóstico no disponible para ${formatDate(item.fecha)}`] });
                return;
            }

            const itemStartHour = parseInt(item.horaInicio.substring(0, 2), 10);
            if (isNaN(itemStartHour)) {
                 setWeatherStatus({ status: 'sin_datos', reasons: ['Hora inicio inválida'] });
                 return;
            }

            const relevantHourForecast = forecastDay.hour.find(h => new Date(h.time_epoch * 1000).getHours() === itemStartHour);
            if (!relevantHourForecast) {
                setWeatherStatus({ status: 'sin_datos', reasons: [`Pronóstico no disponible para las ${itemStartHour}:00`] });
                 return;
            }

            // Llama a la comparación (preference puede ser undefined)
            const result = checkWeatherConditions(preference, relevantHourForecast);
            setWeatherStatus(result);
        };

        const timerId = setTimeout(checkItemWeather, 100); // Delay
        return () => clearTimeout(timerId);

    }, [item, preference, weatherData]);


    if (!item || !item.id) return null;

    // --- Renderizado (usa clases de Dashboard.module.css) ---
    return (
        <li className={styles.upcomingAgendaItem}> {/* Usa clase del Dashboard */}
            {/* 1. Indicador Clima */}
            <WeatherIndicator status={weatherStatus.status} reasons={weatherStatus.reasons} />

            {/* 2. Fecha */}
            <span className={styles.upcomingDate}>{formatDate(item.fecha)}</span>

            {/* 3. Hora */}
            <span className={styles.upcomingTime}>{formatDisplayTime(item.horaInicio)}</span>

            {/* 4. Icono Actividad */}
            {item.activity?.iconName && <span className={`material-icons ${styles.upcomingIcon}`}>{item.activity.iconName}</span>}

            {/* 5. Nombre Actividad */}
            <span className={styles.upcomingName}>{item.activity?.name || '?'}</span>

             {/* 6. (Opcional) Muestra advertencia si no es ok */}
             {weatherStatus.reasons.length > 0 && weatherStatus.status !== 'ok' && (
                <span title={weatherStatus.reasons.join('. ')} style={{marginLeft:'auto', fontSize:'0.8em'}}>⚠️</span>
             )}
        </li>
    );
}