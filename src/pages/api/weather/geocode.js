import { getToken } from 'next-auth/jwt';

// Helper function to fetch from Nominatim
async function fetchGeocodeData(query) {
    // IMPORTANT: Add a descriptive User-Agent header as required by Nominatim's Usage Policy
    // Replace 'YourAppName/1.0 (your-contact-email@example.com)' with your actual app info.
    const headers = {
        'User-Agent': 'YourAppName/1.0 (your-contact-email@example.com)'
    };

    // Use 'q=' for free-form query, 'format=jsonv2' for structured JSON output
    // 'limit=5' gets up to 5 results
    // 'addressdetails=1' includes structured address parts
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=5&addressdetails=1`;

    console.log(`[Geocode API] Calling Nominatim: ${url}`);

    try {
        const response = await fetch(url, { headers: headers });
        if (!response.ok) {
            throw new Error(`Nominatim request failed with status ${response.status}`);
        }
        const data = await response.json();
        console.log(`[Geocode API] Received ${data.length} results from Nominatim.`);
        return data; // Returns an array of location objects
    } catch (error) {
        console.error("[Geocode API] Error fetching from Nominatim:", error);
        throw error; // Re-throw the error to be caught in the handler
    }
}

export default async function handler(req, res) {
    // Optional: Secure this endpoint if needed, although geocoding is often public
    // const token = await getToken({ req });
    // if (!token) {
    //     return res.status(401).json({ message: 'No autenticado' });
    // }

    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { city } = req.query; // Get the city/query from the request URL

    if (!city || typeof city !== 'string' || city.trim().length === 0) {
        return res.status(400).json({ message: 'Parámetro "city" (o consulta) es requerido.' });
    }

    try {
        const results = await fetchGeocodeData(city.trim());

        // You might want to filter/map the results before sending back
        // For example, just send necessary fields like lat, lon, display_name
        const simplifiedResults = results.map(item => ({
            place_id: item.place_id,
            lat: parseFloat(item.lat), // Ensure they are numbers
            lon: parseFloat(item.lon),
            display_name: item.display_name,
            // Add more fields if needed from item.address (e.g., country, city, etc.)
            address: item.address
        }));

        // Return the array of results
        // The frontend currently just uses the first result (data[0])
        res.status(200).json(simplifiedResults);

    } catch (error) {
        res.status(500).json({ message: 'Error al realizar la geocodificación', details: error.message });
    }
}