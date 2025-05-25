// pages/index.js
import React, { useState, useEffect } from 'react';
import { getSession, useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
// Link ya no es necesario para los botones que abren modales
import prisma from '@/lib/prisma';
import UpcomingAgendaItem from '@/components/UpcomingAgendaItem';
import styles from '../styles/Dashboard.module.css';
import { filterFutureAgendaItemsByEndTime } from '@/lib/filters';

// --- NUEVAS IMPORTACIONES ---
import ActivitiesModal from '@/components/ActivitiesModal';
import AgendaModal from '@/components/AgendaModal';
// --- FIN NUEVAS IMPORTACIONES ---


const formatDisplayTime = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return "Inválida";
  try {
      const match = timeStr.match(/^(\d{2}:\d{2})/);
      return match ? match[1] : "Inválida";
  } catch (e) { return "Inválida"; }
};

const formatDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return "Fecha inválida";
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return "Formato inválido";
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 0 || month > 11) return "Fecha num. inválida";
    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return "Fecha inválida final";
    return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch (e) { return "Fecha inválida"; }
};

const formatDay = (dateObj) => {
  if (!dateObj || !(dateObj instanceof Date)) return '?';
  return dateObj.toLocaleDateString('es-ES', { weekday: 'short' });
};

export default function HomePage({
  // Ya no recibimos initialWeatherData, initialUpcomingAgenda, initialUserPreferences directamente de SSR para el modal
  // Mantenemos los que usa el dashboard directamente.
  initialUpcomingAgenda, // Sigue siendo útil para el dashboard
  initialUserPreferences, // Sigue siendo útil para el dashboard
  initialError
}) {
  console.log("Initial Upcoming Agenda (SSR for Dashboard):", initialUpcomingAgenda);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [upcomingAgenda, setUpcomingAgenda] = useState(initialUpcomingAgenda || []);
  const [weatherData, setWeatherData] = useState(null);
  const [userPreferencesState, setUserPreferencesState] = useState(initialUserPreferences || {}); // Renombrar para evitar conflicto
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [error, setError] = useState(initialError);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentDate] = useState(new Date());
  const [forecastViewMode, setForecastViewMode] = useState('daily');
  const [currentLocationTarget, setCurrentLocationTarget] = useState(null);
  const [isActivitiesModalOpen, setIsActivitiesModalOpen] = useState(false);
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  
  // --- FUNCIÓN PARA REFESCAR PRÓXIMAS ACTIVIDADES DEL DASHBOARD ---
  const refreshUpcomingAgendaForDashboard = async () => {
    if (status !== 'authenticated') return;
    console.log("[HomePage] Refreshing upcoming agenda for dashboard...");
    try {
      // Podrías añadir un estado de loading específico para esta sección si quieres
      const res = await fetch('/api/agenda/upcoming');
      if (res.ok) {
        const data = await res.json();
        setUpcomingAgenda(data);
        console.log("[HomePage] Upcoming agenda refreshed, items:", data.length);
      } else {
        console.error("[HomePage] Failed to refresh upcoming agenda:", res.status);
      }
    } catch (err) {
      console.error("[HomePage] Error refreshing upcoming agenda:", err);
    }
  };
  


  // Lógica de ubicación y fetch de datos del dashboard (similar a antes)
  useEffect(() => {
    // ... (lógica de geolocalización)
    if (status === 'authenticated') {
      if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
              (pos) => setCurrentLocationTarget({ lat: pos.coords.latitude, lon: pos.coords.longitude, source: 'browser_dashboard' }),
              () => setCurrentLocationTarget({ lat: -36.82699, lon: -73.04977, source: 'default_dashboard' }) 
          );
      } else {
          setCurrentLocationTarget({ lat: -36.82699, lon: -73.04977, source: 'default_dashboard' });
      }
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);


  useEffect(() => {
    if (currentLocationTarget && status === 'authenticated') {
      setLoadingDashboard(true); 
      setError(null);
      
      const fetchDataForDashboard = async () => {
          // ... (lógica de queryParams)
          let queryParams = '';
          if (currentLocationTarget.lat && currentLocationTarget.lon) {
              queryParams = `lat=${currentLocationTarget.lat}&lon=${currentLocationTarget.lon}`;
          } else if (currentLocationTarget.city) {
              queryParams = `city=${encodeURIComponent(currentLocationTarget.city)}`;
          } else {
               setLoadingDashboard(false); return;
          }
          try {
               const weatherRes = await fetch(`/api/weather/data?${queryParams}`);
               if (weatherRes.ok) {
                   setWeatherData(await weatherRes.json());
               } else {
                   setError(prev => `${prev ? prev + '; ' : ''}Error clima ${weatherRes.status}`);
               }
               // Si upcomingAgenda no vino de SSR o es la primera carga post-autenticación, la cargamos.
               // La función de refresh se encargará de las actualizaciones posteriores.
               if (initialUpcomingAgenda === null || upcomingAgenda.length === 0) {
                   await refreshUpcomingAgendaForDashboard();
               }
            } catch (err) {
                setError(err.message || 'Failed to fetch dashboard data.');
                setWeatherData(null);
            } finally {
                setLoadingDashboard(false);
                setIsSearching(false);
            }
      };
      fetchDataForDashboard();
  }
}, [currentLocationTarget, status, session, initialUpcomingAgenda]);


  const handleSearch = async (event) => {
      event.preventDefault();
      const cityToSearch = searchQuery.trim();
      if (!cityToSearch || isSearching) return;
      setIsSearching(true);
      setError(null);
      setSearchQuery('');
      setCurrentLocationTarget({ city: cityToSearch });
  };
      
   const current = weatherData?.current;
   const locationInfo = weatherData?.location;
   const forecastDays = weatherData?.forecast?.forecastday;

   const futureUpcomingAgenda = filterFutureAgendaItemsByEndTime(upcomingAgenda, "[Index Filter]");
     
   let todayHourlyProcessed = [];
   if (forecastDays && forecastDays[0]?.hour) {
       const currentHour = new Date().getHours();
       todayHourlyProcessed = forecastDays[0].hour
           .filter(h => new Date(h.time_epoch * 1000).getHours() >= currentHour)
           .slice(0, 8)
           .map(h => ({
               time: new Date(h.time_epoch * 1000).getHours(),
               temp: h.temp_c,
               icon: h.condition.icon,
               description: h.condition.text,
               pop: h.chance_of_rain
           }));
   }

   let dailyProcessed = [];
   if (forecastDays && forecastDays.length > 0) {
       dailyProcessed = forecastDays
           .map(d => ({
               date: new Date(d.date_epoch * 1000),
               maxTemp: d.day.maxtemp_c,
               minTemp: d.day.mintemp_c,
               icon: d.day.condition.icon,
               description: d.day.condition.text,
           }));
   }

   if (status === 'loading') return <div className={styles.loadingText}>Verificando sesión...</div>;
   // La redirección ya se maneja en el primer useEffect
   if (status === 'unauthenticated') return null;
   // Si estamos cargando datos específicos del dashboard (clima) después de la sesión
   if (loadingDashboard && !weatherData) return <div className={styles.loadingText}>Cargando dashboard...</div>;
  

  return (
    <div className={styles.dashboardContainer}>
      <Head>
        <title>Dashboard del Clima</title>
        {/* ... otras etiquetas Head ... */}
      </Head>

      <aside className={styles.sidebar}>
            <div className={styles.sidebarOverlay}></div> {/* Para oscurecer/colorear fondo */}
            <div className={styles.sidebarContent}> {/* Contenedor para el contenido encima del overlay */}
                
                {/* Tarjeta 1: Ubicación y Fecha */}
                <div className={`${styles.infoCard} ${styles.locationCard}`}>
                    <div className={styles.locationHeader}>
                        <span className={styles.locationNameText}>
                            {locationInfo?.name ? `${locationInfo.name}, ${locationInfo.region}` : (isSearching ? 'Buscando...' : 'Ubicación...')}
                        </span>
                    </div>
                    <div className={styles.currentDateText}>
                        {currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    
                    
                        {current.condition?.icon && 
                            <img
                                src={current.condition.icon.startsWith('//') ? `https:${current.condition.icon}` : current.condition.icon}
                                alt={current.condition.text}
                                className={styles.weatherIconLarge} 
                            />}
                        <div className={styles.temperatureLarge}>
                            {Math.round(current.temp_c ?? 0)}
                            <sup className={styles.degreeSymbol}>°C</sup>
                        </div>
                        <div className={styles.weatherDescriptionLarge}>
                            {current.condition?.text ?? 'N/A'}
                        </div>
                </div>
                
                <br></br>
                <br></br>
                <br></br>
                <br></br>
                <br></br>
                <br></br>

                {current ? (
                    <>
                        {/* Tarjeta 3: Detalles del Clima */}
                        <div className={`${styles.infoCard} ${styles.detailsCard}`}>
                            <h3 className={styles.cardTitle}>Detalles Adicionales</h3>
                            <ul className={styles.detailsList}>
                                <li className={styles.detailItem}>
                                    <span>Precipitación (Prob)</span>
                                    <span>{todayHourlyProcessed[0]?.pop ?? (current.precip_mm > 0 ? 'Sí' : 'No')}%</span>
                                </li>
                                <li className={styles.detailItem}>
                                    <span>Humedad</span>
                                    <span>{current.humidity ?? 'N/A'}%</span>
                                </li>
                                <li className={styles.detailItem}>
                                    <span>Viento</span>
                                    <span>{Math.round(current.wind_kph ?? 0)} km/h</span>
                                </li>
                                {/* Puedes añadir más detalles si quieres, como UV Index */}
                                {current.uv && (
                                    <li className={styles.detailItem}>
                                        <span>Índice UV</span>
                                        <span>{current.uv}</span>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </>
                ) : (
                    <div className={`${styles.infoCard} ${styles.loadingCard}`}>
                        <p>
                            {isSearching ? 'Buscando datos del clima...' : (loadingDashboard ? 'Cargando clima...' : 'Datos de clima no disponibles')}
                        </p>
                    </div>
                )}
                
            </div>
        </aside>

      <main className={styles.mainContent}>
        <div className={styles.mainHeader}>
            <div></div>
           <div><h1 className={styles.sectionTitle}>Proyecto Ingeniería de Software II</h1></div>
           <div className={styles.headerActions}>
             <form onSubmit={handleSearch} className={styles.searchForm}>
                <input
                    type="text"
                    placeholder="Buscar ciudad..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchBar}
                    disabled={isSearching || loadingDashboard}
                />
             </form>
             {session?.user?.email &&
                <div className={styles.profileIcon} title={session.user.email}>
                    {session.user.email?.[0]?.toUpperCase()}
                </div>
             }
           </div>
        </div>

        {error && <p className={styles.errorText} style={{marginBottom:'1rem'}}>Error: {error}</p>}
        {(loadingDashboard && !weatherData) && <p className={styles.loadingTextSmall}>Actualizando datos...</p>}


        <section className={styles.forecastSection}>
             <nav className={styles.forecastNav}>
                <button className={`${styles.navButton} ${forecastViewMode === 'daily' ? styles.navButtonActive : ''}`} onClick={() => setForecastViewMode('daily')}>Próximos 7 días</button>
                <button className={`${styles.navButton} ${forecastViewMode === 'hourly' ? styles.navButtonActive : ''}`} onClick={() => setForecastViewMode('hourly')}>Hoy (por horas)</button>
            </nav>

             {(loadingDashboard && !weatherData) || isSearching ? (
                <div className={styles.loadingText}>{isSearching ? 'Buscando...' : 'Cargando pronóstico...'}</div>
            ) : forecastViewMode === 'daily' ? (
                dailyProcessed.length > 0 ? (
                    <div className={styles.forecastGrid}>
                        {dailyProcessed.map((day, index) => (
                            <div key={index} className={styles.forecastCard}>
                                <div className={styles.forecastDay}>{formatDay(day.date)}</div>
                                {day.icon && <img src={day.icon.startsWith('//')?`https:${day.icon}`:day.icon} alt={day.description} className={styles.forecastIcon} />}
                                <div className={styles.forecastTemp}>{Math.round(day.maxTemp)}<sup>°C</sup></div>
                            </div>
                        ))}
                    </div>
                ) : !error && <div className={styles.loadingTextSmall}>No hay pronóstico diario.</div>
            ) : (
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
              ) : !error && !(loadingDashboard && !weatherData) && <div className={styles.loadingText}>No hay datos de pronóstico horario.</div>
            )}
        </section>

        <section className={styles.upcomingAgendaSection}>
            <h2 className={styles.sectionTitle}>Próximas Actividades</h2>
            {loadingDashboard && upcomingAgenda.length === 0 && <p className={styles.loadingTextSmall}>Cargando agenda...</p>}
            {!loadingDashboard && futureUpcomingAgenda.length === 0 && !error && (
                <p className={styles.emptyMessageSmall}>No hay actividades próximas agendadas.</p>
            )}
            {!loadingDashboard && futureUpcomingAgenda.length > 0 && (
                <ul className={styles.upcomingAgendaList}>
                    {futureUpcomingAgenda.map(item => {
                        // Usa el estado renombrado para las preferencias
                        const preference = userPreferencesState[item.activityId?.toString()];
                        if (!item || !item.id) return null;
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
            <div className={styles.viewAllLinkContainer}>
            <button onClick={() => setIsAgendaModalOpen(true)} className={styles.viewAllLink}>
                Ver toda la agenda →
            </button>
            </div>
        </section>

          {/* ... (User Actions) ... */}
       <div className={styles.userActions}>
            <button onClick={() => setIsActivitiesModalOpen(true)} className={styles.actionButton}>Actividades</button>
            <button onClick={() => setIsAgendaModalOpen(true)} className={styles.actionButton}>Agenda</button>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className={`${styles.actionButton} ${styles.signOutButton}`}>Cerrar sesión</button>
       </div>
      </main>

      {/* --- RENDERIZADO DE MODALES --- */}
      {session && ( // Solo renderiza modales si hay sesión, para pasarla como prop
          <>
            <ActivitiesModal
                isOpen={isActivitiesModalOpen}
                onClose={() => setIsActivitiesModalOpen(false)}
                session={session} // Pasa la sesión
            />
            <AgendaModal
                isOpen={isAgendaModalOpen}
                onClose={() => {
                    setIsAgendaModalOpen(false);
                    refreshUpcomingAgendaForDashboard(); // <--- LLAMAR AL REFRESCO AL CERRAR
                }}
                session={session} // Pasa la sesión
                initialUserLocation={currentLocationTarget} // Pasa la ubicación actual del dashboard
                initialWeatherData={weatherData} // Pasa los datos del clima del dashboard
            />
          </>
      )}
      {/* --- FIN RENDERIZADO DE MODALES --- */}
    </div>
  );
}


// --- getServerSideProps (sin cambios, sigue proveyendo datos iniciales para el dashboard) ---
export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session || !session.user?.id) { return { redirect: { destination: '/login', permanent: false } }; }

  let initialUpcomingAgendaData = null; // Cambiado a null por defecto
  let initialUserPreferencesData = {};
  let ssrError = null; // Renombrado para evitar conflicto

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const requestHeaders = { 'Cookie': context.req.headers.cookie || '' };

  try {
    const results = await Promise.allSettled([
        fetch(`${baseUrl}/api/agenda/upcoming`, { headers: requestHeaders }),
        fetch(`${baseUrl}/api/preferences`, { headers: requestHeaders })
    ]);

    const agendaSettled = results[0];
    if (agendaSettled.status === 'fulfilled' && agendaSettled.value?.ok) {
        initialUpcomingAgendaData = await agendaSettled.value.json();
    } else if (agendaSettled.status === 'fulfilled') {
        ssrError = (ssrError || '') + `Error Agenda SSR ${agendaSettled.value.status}; `;
    } else { 
        ssrError = (ssrError || '') + `Error interno Agenda SSR; `;
    }

    const prefsSettled = results[1];
    if (prefsSettled.status === 'fulfilled' && prefsSettled.value?.ok) {
        const prefsData = await prefsSettled.value.json();
        initialUserPreferencesData = prefsData.reduce((map, pref) => { map[pref.activityId.toString()] = pref; return map; }, {});
    } else { /* ... log warning ... */ }

    return { 
        props: { 
            initialUpcomingAgenda: initialUpcomingAgendaData, // Pasa null si falló 
            initialUserPreferences: initialUserPreferencesData, 
            initialError: ssrError?.trim() || null,
        } 
    };
  } catch (error) {
     return { 
        props: { 
            initialUpcomingAgenda: null, 
            initialUserPreferences: {}, 
            initialError: 'Error cargando datos del servidor.',
        }
    };
  }
}
