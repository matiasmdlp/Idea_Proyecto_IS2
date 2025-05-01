// pages/index.js
import React, { useState, useEffect } from 'react';
import { getSession, useSession, signOut } from 'next-auth/react'; // Importa getSession
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import prisma from '@/lib/prisma'; // Importa Prisma para llamadas directas
import UpcomingAgendaItem from '@/components/UpcomingAgendaItem';
import styles from '../styles/Dashboard.module.css';
import { filterFutureAgendaItemsByEndTime } from '@/lib/filters';


const formatDisplayTime = (timeStr) => { // <-- AÑADE ESTA FUNCIÓN COMPLETA
  if (!timeStr || typeof timeStr !== 'string') {
       return "Inválida";
  }
  try {
      const match = timeStr.match(/^(\d{2}:\d{2})/); // Extrae HH:MM
      if (match && match[1]) {
          return match[1];
      }
      return "Inválida";
  } catch (e) {
       return "Inválida";
  }
};


const formatDate = (dateStr) => {
  // Log de entrada

  // 1. Chequeo inicial de nulidad/tipo
  if (!dateStr || typeof dateStr !== 'string') {
      return "Fecha inválida";
  }

  try {
    const parts = dateStr.split('-'); // Divide "YYYY-MM-DD" en partes
    if (parts.length !== 3) {
        return "Formato inválido";
    }

    // parseInt para obtener números (base 10)
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Meses en JS son 0-11
    const day = parseInt(parts[2], 10);

    // Verifica si los números son válidos
    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 0 || month > 11) {
         return "Fecha num. inválida";
    }

    // Crea el objeto Date usando los números (más fiable)
    // new Date(year, month, day) interpreta en zona horaria local
    const date = new Date(year, month, day);

    // Doble chequeo por si acaso (ej. día 31 en febrero)
    if (isNaN(date.getTime())) {
       return "Fecha inválida final";
    }
    // --- FIN PARSEO MANUAL ---


    // Ahora formatea el objeto Date que sabemos que es válido
    const formatted = date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    return formatted;

  } catch (e) {
      return "Fecha inválida"; // Devuelve en caso de error inesperado
  }
};

const formatDay = (dateObj) => { // Recibirá objeto Date
  if (!dateObj || !(dateObj instanceof Date)) return '?';
   return dateObj.toLocaleDateString('es-ES', { weekday: 'short' });
}

export default function HomePage({
  initialWeatherData,
  initialUpcomingAgenda,
  initialUserPreferences, // <-- Recibe preferencias
  initialError
}) {
    console.log("Initial Upcoming Agenda (SSR):", initialUpcomingAgenda);
  const { data: session, status } = useSession();
  const router = useRouter();

  // --- Estados (Inicializados con props) ---
  const [location, setLocation] = useState({ lat: null, lon: null, source: 'server' }); // Fuente inicial
  const [weatherData, setWeatherData] = useState(initialWeatherData);
  const [upcomingAgenda, setUpcomingAgenda] = useState(initialUpcomingAgenda);
  const [userPreferences, setUserPreferences] = useState(initialUserPreferences || {}); // <-- Inicializa con prop o vacío
  const [loading, setLoading] = useState(false); // Carga para fetches del cliente
  const [error, setError] = useState(initialError);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentDate] = useState(new Date());
  const [forecastViewMode, setForecastViewMode] = useState('daily');
  const [currentLocationTarget, setCurrentLocationTarget] = useState(null); // Puede ser {lat, lon} o {city}

  useEffect(() => {
    if (status === 'authenticated' && !initialWeatherData && !initialError) { // Si SSR no trajo datos válidos
      // Intenta obtener ubicación del navegador o usa default
      if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
              (pos) => setCurrentLocationTarget({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
              () => setCurrentLocationTarget({ lat: 40.4168, lon: -3.7038 }) // Fallback Madrid
          );
      } else {
          setCurrentLocationTarget({ lat: 40.4168, lon: -3.7038 }); // Fallback Madrid
      }
    } else if (initialWeatherData?.location) {
          // Usa la ubicación de los datos iniciales del servidor
          setCurrentLocationTarget({ lat: initialWeatherData.location.lat, lon: initialWeatherData.location.lon });
    }
  }, [status, session, initialWeatherData, initialError]);


  // --- Obtener Ubicación ---
  useEffect(() => {
    console.log("Effect Triggered! Target:", currentLocationTarget, "Status:", status);
    if (currentLocationTarget && status === 'authenticated') {
      console.log("Effect Condition Met! Fetching data...");
      setLoading(true);
      setError(null);
      setWeatherData(null); // Limpia datos viejos
      setUpcomingAgenda([]); // Limpia agenda vieja

      const fetchDataForTarget = async () => {
          let queryParams = '';
          if (currentLocationTarget.lat && currentLocationTarget.lon) {
              queryParams = `lat=${currentLocationTarget.lat}&lon=${currentLocationTarget.lon}`;
          } else if (currentLocationTarget.city) {
              queryParams = `city=${encodeURIComponent(currentLocationTarget.city)}`;
          } else {
               setLoading(false);
               return; // No hacer fetch si no hay target
          }
          if (!queryParams) {
            console.log("Effect: No valid query params, exiting fetch."); // <-- Log 3
            setLoading(false);
            setIsSearching(false); // Reset here too if exiting early
            return;
          }

          console.log("Effect: Fetching with params:", queryParams); // <-- Log 4
          
          let weatherError = null; let agendaError = null;
          let weatherResult = null; let agendaResult = [];

          try {
               const [weatherRes, upcomingAgendaRes] = await Promise.all([
                   fetch(`/api/weather/data?${queryParams}`), // Pasa lat/lon O city
                   fetch(`/api/agenda/upcoming`)
               ]);
               console.log("Effect: Fetch Response Status - Weather:", weatherRes.status, "Agenda:", upcomingAgendaRes.status);
               // Procesar Clima
               let weatherResult = null;
               if (weatherRes.ok) {
                weatherResult = await weatherRes.json();
                console.log("Effect: Weather data fetched:", weatherResult); // <-- Log 6
                setWeatherData(weatherResult);
                } else {
                    const errorText = await weatherRes.text();
                    console.error("Effect: Weather fetch failed:", weatherRes.status, errorText); // <-- Log 7
                    setError(prev => `${prev ? prev + '; ' : ''}Error clima ${weatherRes.status}`);
                }

              // Procesar Agenda
              if (!upcomingAgendaRes.ok) { /* ... */ } else { agendaResult = await upcomingAgendaRes.json(); }
              setUpcomingAgenda(agendaResult);

              // ... combinar errores ...

            } catch (err) {
                console.error("Effect: General fetch error:", err); // <-- Log 8
                setError(err.message || 'Failed to fetch data.');
                setWeatherData(null);
                setUpcomingAgenda([]);
            } finally {
                setLoading(false);
                setIsSearching(false); // Reset searching state
                console.log("Effect: Fetch finished."); // <-- Log 9
        }
      };
      fetchDataForTarget();
  } else {
      console.log("Effect Condition NOT Met.");
       // Si no hay target o no está autenticado, asegura no estar cargando
       // setLoading(false); // Puede causar bucle si se pone aquí?
  }
// Depende de currentLocationTarget (y status para asegurar autenticación)
}, [currentLocationTarget, status, session]); 

  

  const handleSearch = async (event) => {
      event.preventDefault(); 
      const cityToSearch = searchQuery.trim(); // Guarda antes de limpiar
      if (!cityToSearch || isSearching) return;

      setIsSearching(true); // Indica que estamos en proceso de búsqueda
      setError(null);
      setSearchQuery('');
  // No ponemos setLoading(true) aquí directamente

      console.log(`HandleSearch: Setting location target to city: ${cityToSearch}`);
      // --- Actualiza el target para disparar el useEffect de fetch ---
      setCurrentLocationTarget({ city: cityToSearch });
  }
      

   const current = weatherData?.current; // Datos actuales
   const locationInfo = weatherData?.location; // Info de ubicación
   const forecastDays = weatherData?.forecast?.forecastday; // Array de días de pronóstico


   const nowClientTimestamp = new Date().getTime(); // Milisegundos UTC actuales
   console.log("--- Filtering Upcoming Agenda ---"); // Start marker
    console.log("Current Timestamp:", nowClientTimestamp, `(${new Date(nowClientTimestamp).toISOString()})`);
    console.log("Original upcomingAgenda state:", upcomingAgenda);

    const futureUpcomingAgenda = filterFutureAgendaItemsByEndTime(upcomingAgenda, "[Index Filter]");
    console.log("Filtered futureUpcomingAgenda:", futureUpcomingAgenda);
    console.log(`DEBUG [Index Filter]: Total upcoming: ${upcomingAgenda.length}, Filtered future: ${futureUpcomingAgenda.length}`); // Log actualizado
    console.log("--- End Filtering ---");

     
   // Pronóstico horario (solo viene para hoy y próximos días, extraemos de hoy)
   // WeatherAPI devuelve las 24h del día en forecastday[0].hour
   let todayHourlyProcessed = [];
   if (forecastDays && forecastDays[0]?.hour) {
       const currentHour = new Date().getHours();
       todayHourlyProcessed = forecastDays[0].hour
           .filter(h => new Date(h.time_epoch * 1000).getHours() >= currentHour) // Filtra horas pasadas
           .slice(0, 8) // Limita a las próximas 8
           .map(h => ({ // Mapea a la estructura que usaba tu vista
               time: new Date(h.time_epoch * 1000).getHours(),
               temp: h.temp_c,
               icon: h.condition.icon, // Puede ser URL completa
               description: h.condition.text,
               pop: h.chance_of_rain // Probabilidad 0-100
           }));
   }

   let dailyProcessed = [];
   if (forecastDays && forecastDays.length > 0) {
       dailyProcessed = forecastDays/*.slice(1)*/ // Quita slice(1) si quieres incluir hoy
           .map(d => ({
               date: new Date(d.date_epoch * 1000), // Usa epoch para crear Date
               maxTemp: d.day.maxtemp_c,
               minTemp: d.day.mintemp_c, // También tenemos mínima
               icon: d.day.condition.icon, // Puede ser URL completa
               description: d.day.condition.text,
           }));
   }

   if (status === 'loading') return <div className={styles.loadingText}>Verificando sesión...</div>;
   if (status === 'unauthenticated') return null; // Redirigiendo
   if (status === 'loading' || loading) return <div className={styles.loadingText}>Cargando dashboard...</div>;
  

  return (
    <div className={styles.dashboardContainer}>
      <Head>
        <title>Dashboard del Clima</title>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      </Head>

      {/* --- Sidebar --- */}
      <aside className={styles.sidebar}>
        <div className={styles.locationHeader}>
           <div className={styles.locationName}>
                <span className={styles.locationIcon}>📍</span>
                 {/* Usa locationInfo o current */}
                 {locationInfo?.name ? `${locationInfo.name}, ${locationInfo.region}` : 'Buscando...'}
           </div>
           <div className={styles.currentDate}>
                {currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
           </div>
        </div>

         {/* --- USA 'current' aquí --- */}
         {current ? ( // <--- ¿Usas 'current'?
            <>
            <div className={styles.currentWeather}>
                 {/* ¿Usas current.condition...? */}
                {current.condition?.icon && <img
                            // Añade "https:" si la URL del icono de WeatherAPI empieza con "//"
                            src={current.condition.icon.startsWith('//') ? `https:${current.condition.icon}` : current.condition.icon}
                            alt={current.condition.text} // Usa texto de condición como alt
                            className={styles.weatherIcon} // Asegúrate que este estilo exista
                            width={100} // Puedes añadir tamaño explícito si quieres
                            height={100}
                        />}
                <div className={styles.temperature}>
                     {/* ¿Usas current.temp_c? */}
                    {Math.round(current.temp_c ?? 0)}<sup>°C</sup>
                </div>
                <div className={styles.weatherDescription}>
                     {/* ¿Usas current.condition.text? */}
                    {current.condition?.text ?? 'N/A'}
                </div>
            </div>

            <ul className={styles.detailsList}>
                <li className={styles.detailItem}>
                     {/* ¿Usas todayHourlyProcessed? */}
                     <span>Precipitación (Prob)</span>
                     <span>{todayHourlyProcessed[0]?.pop ?? 'N/A'}%</span>
                </li>
                <li className={styles.detailItem}>
                     {/* ¿Usas current.humidity? */}
                    <span>Humedad</span>
                    <span>{current.humidity ?? 'N/A'}%</span>
                    <span>{locationInfo?.name || 'Buscando...'}</span>
                </li>
                <li className={styles.detailItem}>
                     {/* ¿Usas current.wind_kph? */}
                    <span>Viento</span>
                    <span>{Math.round(current.wind_kph ?? 0)} km/h</span>
                </li>
            </ul>
            </>
         ) : (
             // Mostrar mensaje si no hay datos del clima actual
             <div className={styles.loadingText} style={{color: 'white', marginTop: '3rem'}}>
                {isSearching ? 'Buscando...' : (loading ? 'Cargando clima...' : 'Datos no disponibles')}
             </div>
        )}

      </aside>

      {/* --- Main Content --- */}
      <main className={styles.mainContent}>
        <div className={styles.mainHeader}>
            <div>   
                
            </div>
           <div>
            <h1 className={styles.sectionTitle}>Proyecto Ingeniería de Software II</h1>
           </div>
           <div className={styles.headerActions}>
             {/* --- Formulario de Búsqueda --- */}
             <form onSubmit={handleSearch} className={styles.searchForm}>
                <input
                    type="text"
                    placeholder="Buscar ciudad..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchBar}
                    disabled={isSearching || loading} // Deshabilita mientras busca
                />

                {loading && <p className={styles.loadingTextSmall}>Actualizando datos...</p>} {/* Indicador general */}
                {/* Puedes añadir un botón de búsqueda o confiar en Enter */}
                {/* <button type="submit" disabled={isSearching}>Buscar</button> */}
             </form>
             {/* --- Fin Formulario de Búsqueda --- */}

             <div className={styles.profileIcon} title={session.user.email}>
                {session.user.email?.[0]?.toUpperCase()}
             </div>
           </div>
        </div>

        {error && <p className={styles.errorText} style={{marginBottom:'1rem'}}>Error: {error}</p>}

        {/* --- Forecast Section --- */}
        <section className={styles.forecastSection}>
            {/* Navegación de Pronóstico (Placeholder funcional) */}
             <nav className={styles.forecastNav}>
                <button
                    className={`${styles.navButton} ${forecastViewMode === 'daily' ? styles.navButtonActive : ''}`}
                    onClick={() => setForecastViewMode('daily')}
                >
                    Próximos 7 días
                </button>
                <button
                    className={`${styles.navButton} ${forecastViewMode === 'hourly' ? styles.navButtonActive : ''}`}
                    onClick={() => setForecastViewMode('hourly')}
                >
                    Hoy (por horas)
                </button>
            </nav>

             {error && <p className={styles.errorText}>Error: {error}</p>}

             {loading || isSearching ? (
                <div className={styles.loadingText}>{isSearching ? 'Buscando...' : 'Cargando pronóstico...'}</div>
            ) : forecastViewMode === 'daily' ? (
                // Vista Diaria (Usa dailyProcessed)
                dailyProcessed.length > 0 ? (
                    <div className={styles.forecastGrid}>
                        {dailyProcessed.map((day, index) => (
                            <div key={index} className={styles.forecastCard}>
                                <div className={styles.forecastDay}>{formatDay(day.date)}</div>
                                {day.icon && <img src={day.icon.startsWith('//')?`https:${day.icon}`:day.icon} alt={day.description} className={styles.forecastIcon} />}
                                <div className={styles.forecastTemp}>{Math.round(day.maxTemp)}<sup>°C</sup></div>
                                {/* Podrías añadir minTemp: <div className={styles.forecastTempMin}>{Math.round(day.minTemp)}<sup>°C</sup></div> */}
                            </div>
                        ))}
                    </div>
                ) : !error && <div className={styles.loadingTextSmall}>No hay pronóstico diario.</div>
            ) : (
                // --- Vista Horaria ---
                todayHourlyProcessed.length > 0 ? (
                  <div className={styles.forecastGrid}>
                      {todayHourlyProcessed.map((hour, index) => (
                          <div key={index} className={styles.forecastCard}>
                              <div className={styles.forecastDay}>{hour.time}:00</div>
                              {hour.icon && <img src={hour.icon.startsWith('//')?`https:${hour.icon}`:hour.icon} alt={hour.description} className={styles.forecastIcon} />}
                              <div className={styles.forecastTemp}>{Math.round(hour.temp)}<sup>°C</sup></div>
                              <div className={styles.forecastPop}>{hour.pop}%</div>
                          </div>
                      ))}
                  </div>
              ) : (
                   !error && !loadingWeather && <div className={styles.loadingText}>No hay datos de pronóstico horario disponibles.</div>
               )
            )}
            {/* --- Fin Renderizado Condicional --- */}

        </section>

        <section className={styles.upcomingAgendaSection}>
                 <h2 className={styles.sectionTitle}>Próximas Actividades</h2>
                 {loading && <p className={styles.loadingTextSmall}>Cargando agenda...</p>}

                 {/* --- CAMBIO AQUÍ: Usa futureUpcomingAgenda --- */}
                 {!loading && futureUpcomingAgenda.length === 0 && !error && (
                     <p className={styles.emptyMessageSmall}>No hay actividades próximas agendadas.</p>
                 )}
                 {/* --- FIN CAMBIO --- */}

                 {/* --- CAMBIO AQUÍ: Usa futureUpcomingAgenda --- */}
                 {!loading && futureUpcomingAgenda.length > 0 && (
                      <ul className={styles.upcomingAgendaList}>
                          {futureUpcomingAgenda.map(item => { // <-- Itera sobre el array filtrado
                              const preference = userPreferences[item.activityId?.toString()];
                              if (!item || !item.id) return null;
                              console.log("Rendering item:", item.id);

                              return (
                                  <UpcomingAgendaItem
                                      key={item.id}
                                      item={item}
                                      preference={preference}
                                      weatherData={weatherData}
                                  />
                              );
                          })}
                     </ul>
                 )}
                 {/* --- FIN CAMBIO --- */}

                 {/* Link Ver toda la agenda (sin cambios) */}
                 <div className={styles.viewAllLinkContainer}>
                    <Link href="/agenda" className={styles.viewAllLink}>
                        Ver toda la agenda →
                    </Link>
                  </div>
             </section>

         {/* --- User Actions / Links --- */}
         <div className={styles.userActions}>
              <Link href="/activities" className={styles.actionButton}> {/* Pasa className a Link */}
                  Actividades {/* Elimina el <a> */}
              </Link>
              <Link href="/agenda" className={styles.actionButton}> {/* Pasa className a Link */}
                 Agenda {/* Elimina el <a> */}
              </Link>
              <button onClick={() => signOut({ callbackUrl: '/login' })} className={`${styles.actionButton} ${styles.signOutButton}`}>
                  Cerrar sesión
              </button>
         </div>

      </main>
    </div>
  );
}



// --- getServerSideProps ---
export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || !session.user?.id) { return { redirect: { destination: '/login', permanent: false } }; }
  const userId = BigInt(session.user.id);

  let initialWeatherData = null;
  let initialUpcomingAgenda = [];
  let initialUserPreferences = {}; // <-- Inicializa como objeto vacío
  let initialError = null;
  let userDefaultLocation = { lat: null, lon: null };

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const requestHeaders = { 'Cookie': context.req.headers.cookie || '' };

  try {
    const results = await Promise.allSettled([
        fetch(`${baseUrl}/api/agenda/upcoming`, { headers: requestHeaders }),
        fetch(`${baseUrl}/api/preferences`, { headers: requestHeaders })
    ]);

    // Procesar Agenda
    const agendaSettled = results[0];
    if (agendaSettled.status === 'fulfilled' && agendaSettled.value?.ok) { initialUpcomingAgenda = await agendaSettled.value.json(); }
    else if(agendaSettled.value) { initialError = (initialError || '') + `Error Agenda ${agendaSettled.value.status}; `; }
    else if(agendaSettled.status === 'rejected') { initialError = (initialError || '') + `Error interno Agenda; `; }

    // Procesar Preferencias
    const prefsSettled = results[1];
    if (prefsSettled.status === 'fulfilled' && prefsSettled.value?.ok) {
        const prefsData = await prefsSettled.value.json();
        initialUserPreferences = prefsData.reduce((map, pref) => { map[pref.activityId] = pref; return map; }, {});
    } else if(prefsSettled.value) { console.warn("SSR: Could not load preferences", prefsSettled.value?.status); }
     else if(prefsSettled.status === 'rejected') { console.error("SSR: Fetch Prefs rejected:", prefsSettled.reason); }


    console.log("SSR: Returning props (Agenda, Prefs only).");
    return { props: { initialUpcomingAgenda, initialUserPreferences, initialError: initialError?.trim() || null } };

} catch (error) {
     console.error("SSR: General error:", error);
     return { props: { initialUpcomingAgenda: [], initialUserPreferences: {}, initialError: 'Error cargando datos del servidor.' } };
}
}