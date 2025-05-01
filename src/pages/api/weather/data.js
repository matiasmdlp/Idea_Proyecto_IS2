// pages/api/weather/data.js
import { getToken } from 'next-auth/jwt'; // Usamos getToken por consistencia

export default async function handler(req, res) {
    const token = await getToken({ req });
    // Aunque la API de clima podría ser pública, mantenemos la autenticación
    // por si en el futuro limitas el uso o basas algo en el perfil de usuario.
    if (!token || !token.sub) {
        return res.status(401).json({ message: 'No autenticado' });
    }

    const { lat, lon, city } = req.query;
    let locationQuery = ''; // Este será el valor para el parámetro 'q' de WeatherAPI

    if (lat && lon) {
        // Valida lat/lon si quieres ser estricto
        const parsedLat = parseFloat(lat);
        const parsedLon = parseFloat(lon);
        if (!isNaN(parsedLat) && !isNaN(parsedLon) && parsedLat >= -90 && parsedLat <= 90 && parsedLon >= -180 && parsedLon <= 180) {
             locationQuery = `${parsedLat},${parsedLon}`; // Formato "lat,lon"
             console.log(`DEBUG [/api/weather/data]: Using lat/lon query: ${locationQuery}`);
        } else {
             console.warn(`DEBUG [/api/weather/data]: Invalid lat/lon provided: ${lat}, ${lon}`);
             // Decide qué hacer: ¿error 400 o intentar con city si existe?
             // Por ahora, devolvemos error si son inválidos.
             return res.status(400).json({ message: 'Latitud o longitud inválida.' });
        }
    } else if (city) {
        locationQuery = city.trim(); // Usa el nombre de la ciudad directamente
        console.log(`DEBUG [/api/weather/data]: Using city query: "${locationQuery}"`);
    } else {
        // Si no se proporciona ni lat/lon válidos ni city
        return res.status(400).json({ message: 'Se requiere latitud/longitud o nombre de ciudad.' });
    }

    // --- Usa la nueva variable de entorno ---
    const apiKey = process.env.WEATHERAPI_API_KEY;
    if (!apiKey) {
        console.error("Error: WEATHERAPI_API_KEY no está configurada.");
        return res.status(500).json({ message: 'Error de configuración del servidor (WeatherAPI Key)' });
    }

    const daysForecast = 7; // Pide 7 días de pronóstico diario
    // aqi=no (calidad aire no), alerts=no, lang=es (español)
    const apiUrl = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${locationQuery}&days=${daysForecast}&aqi=no&alerts=no&lang=es`;

    console.log(`DEBUG [/api/weather/data]: Calling WeatherAPI: ${apiUrl.replace(apiKey, '***')}`);

    try {
        const weatherResponse = await fetch(apiUrl);
        const weatherData = await weatherResponse.json(); // WeatherAPI suele devolver JSON incluso en errores

        if (!weatherResponse.ok || weatherData.error) {
            // Manejo de errores específico de WeatherAPI
            const errorInfo = weatherData.error || { code: weatherResponse.status, message: `HTTP Error ${weatherResponse.status}`};
            console.error("Error from WeatherAPI:", errorInfo);
            const errorMessage = errorInfo.message || 'Error desconocido de WeatherAPI';
            // Mapea códigos de error a status HTTP
            let statusCode = weatherResponse.status;
             if (errorInfo.code === 1002 || errorInfo.code === 2006) statusCode = 401; // API Key issues
             if (errorInfo.code === 1003 || errorInfo.code === 1005 || errorInfo.code === 9999) statusCode = 400; // Bad request / Invalid URL
             if (errorInfo.code === 1006) statusCode = 404; // Location not found
             if (errorInfo.code === 2007 || errorInfo.code === 2008) statusCode = 403; // Quota exceeded / Key disabled

            return res.status(statusCode).json({ message: errorMessage, details: errorInfo });
        }

        // Devolvemos la respuesta completa de WeatherAPI si todo está OK
        console.log('DEBUG [/api/weather/data]: WeatherAPI response OK.');
        res.status(200).json(weatherData);

    } catch (error) {
        console.error("Error fetching from WeatherAPI endpoint:", error);
        res.status(500).json({ message: 'Error interno del servidor al contactar WeatherAPI' });
    }
}