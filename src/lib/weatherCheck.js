// lib/weatherCheck.js

/**
 * Compara las preferencias del usuario con las condiciones pronosticadas por hora de WeatherAPI.
 * @param {object | null | undefined} prefs - El objeto de preferencias del usuario ({ minTemp, maxTemp, maxWindSpeed... }).
 * @param {object | null | undefined} forecastHour - El objeto de pronóstico horario de WeatherAPI para la hora relevante ({ temp_c, wind_kph, chance_of_rain, uv, condition: { code, text } }).
 * @returns {{ status: 'ok' | 'no_ok' | 'precaucion' | 'sin_datos', reasons: string[] }} - Objeto con el estado y una lista de razones/advertencias.
 */
export function checkWeatherConditions(prefs, forecastHour) {
    const reasons = [];
    let status = 'ok'; // Estado inicial

    // --- Caso Base: Faltan Datos ---
    if (!forecastHour) {
        return { status: 'sin_datos', reasons: ['No hay datos de pronóstico para esta hora.'] };
    }
    // Si no hay preferencias definidas por el usuario, podríamos asumir 'ok' o 'sin_datos'
    // Por ahora, si no hay prefs, no podemos validar, así que es 'sin_datos'.
    if (!prefs || Object.keys(prefs).length === 0) {
        return { status: 'sin_datos', reasons: ['No has definido preferencias para esta actividad.'] };
    }

    // --- Chequeos Individuales ---

    // Temperatura (temp_c)
    const temp = forecastHour.temp_c;
    if (temp !== undefined && temp !== null) {
        if (prefs.minTemp !== null && temp < prefs.minTemp) {
            reasons.push(`Temp. (${temp.toFixed(0)}°C) < Mín. (${prefs.minTemp}°C)`);
            status = 'no_ok'; // Temperatura fuera de rango es crítico
        }
        if (prefs.maxTemp !== null && temp > prefs.maxTemp) {
            reasons.push(`Temp. (${temp.toFixed(0)}°C) > Máx. (${prefs.maxTemp}°C)`);
            status = 'no_ok'; // Temperatura fuera de rango es crítico
        }
    } else {
        reasons.push("Info de temperatura no disponible.");
        if (status === 'ok') status = 'precaucion'; // Si falta un dato, es precaución
    }

    // Viento (wind_kph) - Asumimos que prefs.maxWindSpeed también está en km/h
    const windSpeed = forecastHour.wind_kph;
    if (windSpeed !== undefined && windSpeed !== null) {
        if (prefs.maxWindSpeed !== null && windSpeed > prefs.maxWindSpeed) {
            reasons.push(`Viento (${windSpeed.toFixed(0)} km/h) > Máx. (${prefs.maxWindSpeed} km/h)`);
            status = 'no_ok'; // Viento excesivo es crítico
        }
    } else {
        reasons.push("Info de viento no disponible.");
         if (status === 'ok') status = 'precaucion';
    }

    // Precipitación (chance_of_rain, condition.text/code)
    // WeatherAPI no da intensidad directa por hora fácilmente, usamos chance_of_rain y condition
    const chanceOfRain = forecastHour.chance_of_rain; // 0-100
    const chanceOfSnow = forecastHour.chance_of_snow; // 0-100 (si aplica)
    const conditionCode = forecastHour.condition?.code; // Código numérico de condición
    const conditionText = forecastHour.condition?.text?.toLowerCase() || ""; // Texto descriptivo

    // Códigos de condición de WeatherAPI que implican precipitación (lista no exhaustiva, ref: https://www.weatherapi.com/docs/weather_conditions.json)
    const precipCodes = [
        1063, 1066, 1069, 1072, 1087, 1114, 1117,
        1150, 1153, 1168, 1171, 1180, 1183, 1186, 1189, 1192, 1195, 1198, 1201,
        1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225, 1237,
        1240, 1243, 1246, 1249, 1252, 1255, 1258, 1261, 1264,
        1273, 1276, 1279, 1282
    ];
    const isPrecipitating = precipCodes.includes(conditionCode);

    if (prefs.requiresNoPrecipitation && isPrecipitating) {
        reasons.push(`Requiere sin precip. y pronóstico es "${conditionText}"`);
        status = 'no_ok'; // Requerir sin precipitación es crítico
    }

    if (chanceOfRain !== undefined && chanceOfRain !== null) {
         if (prefs.maxPrecipitationProbability !== null && chanceOfRain > prefs.maxPrecipitationProbability) {
             reasons.push(`Prob. Lluvia (${chanceOfRain}%) > Máx. (${prefs.maxPrecipitationProbability}%)`);
              // Podría ser 'precaucion' en lugar de 'no_ok' dependiendo de la actividad
             if (status === 'ok') status = 'precaucion';
         }
    } else {
         reasons.push("Info de prob. lluvia no disponible.");
         if (status === 'ok') status = 'precaucion';
    }
     // Podríamos añadir chequeo similar para chanceOfSnow si las prefs lo tuvieran

    // Intensidad (no tenemos dato directo, podríamos inferir muy burdamente)
    // Si prefs.maxPrecipitationIntensity existe y isPrecipitating es true, podríamos marcar como precaución?
     if (prefs.maxPrecipitationIntensity !== null && isPrecipitating) {
         reasons.push(`Precipitación pronosticada ("${conditionText}"). Verifica intensidad.`);
          if (status === 'ok') status = 'precaucion'; // No podemos confirmar si excede, así que precaución
     }


    // UV (WeatherAPI lo proporciona)
    const uvIndex = forecastHour.uv;
    if (uvIndex !== undefined && uvIndex !== null) {
        if (prefs.maxUv !== null && uvIndex > prefs.maxUv) {
            reasons.push(`Índice UV (${uvIndex.toFixed(0)}) > Máx. (${prefs.maxUv})`);
            // Generalmente es precaución, no crítico
            if (status === 'ok') status = 'precaucion';
        }
    } else {
        reasons.push("Info de Índice UV no disponible.");
         if (status === 'ok') status = 'precaucion';
    }


    // --- Resultado Final ---
    console.log(`Weather Check Result: Status=${status}, Reasons=${reasons.join('; ')}`, { prefs, forecastHour });
    // Si no hubo problemas críticos ni de precaución, aseguramos que sea 'ok'
    if (status === 'ok' && reasons.length > 0) status = 'precaucion'; // Si hubo avisos menores
    if (reasons.length === 0) status = 'ok'; // Si no hay razones, está OK

    // Aseguramos devolver un array vacío si no hay razones
    return { status, reasons: reasons.length > 0 ? reasons : [] };
}