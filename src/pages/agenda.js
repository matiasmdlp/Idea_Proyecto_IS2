
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AgendaFormModal from '@/components/AgendaFormModal';
import AgendaItem from '@/components/AgendaItem'; // Crearemos este
import styles from '@/styles/Agenda.module.css'; // Crear este archivo
import commonModalStyles from '../components/ModalStyles.css'; // Estilos comunes de modal
import { filterFutureAgendaItemsByEndTime } from '@/lib/filters'; 


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

const formatDateTime = (timeStr) => {
    // Log de entrada (MANTENER ESTE LOG)
    console.log(`DEBUG [formatDateTime]: Input timeStr: "${timeStr}" (Type: ${typeof timeStr})`);

    if (!timeStr || typeof timeStr !== 'string') {
        console.log("DEBUG [formatDateTime]: Returning 'Inválida' due to invalid input type or value.");
        return "Inválida";
    }
    try {
        // La Regex busca HH:MM al PRINCIPIO de la cadena
        const match = timeStr.match(/^(\d{2}:\d{2})/);
        if (match && match[1]) {
            console.log(`DEBUG [formatDateTime]: Match found! Returning: "${match[1]}"`);
            return match[1]; // Devuelve HH:MM
        }
        // Si llega aquí, no hubo match
        console.warn("DEBUG [formatDateTime]: No HH:MM match found at start. Returning 'Inválida'. Input was:", timeStr);
        return "Inválida";
    } catch (e) {
        console.error("DEBUG [formatDateTime]: Error during regex match:", timeStr, e);
        return "Inválida"; // Devuelve Inválida en caso de error
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


export default function AgendaPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [agendaItems, setAgendaItems] = useState([]);
    const [activities, setActivities] = useState([]); // Necesario para el modal
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEventData, setEditingEventData] = useState(null); 
    const [userPreferences, setUserPreferences] = useState({});
    const [weatherData, setWeatherData] = useState(null);
    const [loadingWeather, setLoadingWeather] = useState(true);
    const [userLocation, setUserLocation] = useState({ lat: null, lon: null, source: null });
    const [weatherError, setWeatherError] = useState(null); 


    // Redirección
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        if (status === 'authenticated' && session?.user) {
            console.log("Attempting to get user location...");

            if ("geolocation" in navigator) {
                 console.log("Trying browser geolocation...");
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        console.log("Browser geolocation successful:", position.coords);
                        setUserLocation({
                            lat: position.coords.latitude,
                            lon: position.coords.longitude,
                            source: 'browser'
                        });
                    },
                    (err) => { // Error al obtener del navegador
                        console.warn("Browser geolocation failed:", err.message);
                        // 3. Usar un default fijo si todo falla
                        console.log("Falling back to default location.");
                        setUserLocation({ lat: 40.4168, lon: -3.7038, source: 'default' }); // Madrid por defecto
                    },
                    { timeout: 7000 } // Timeout para evitar esperas largas
                );
            } else { // Navegador no soporta geolocalización
                 console.warn("Browser geolocation not supported.");
                 // 3. Usar un default fijo
                 console.log("Falling back to default location.");
                 setUserLocation({ lat: 40.4168, lon: -3.7038, source: 'default' }); // Madrid
            }
        } else if (status !== 'loading') {
             // Si no está autenticado, o no hay sesión, no buscamos ubicación
             setUserLocation({ lat: null, lon: null, source: 'none'});
        }
    }, [status, session])

    // Fetch inicial de agenda y actividades
    useEffect(() => {
        if (status === 'authenticated' && userLocation.lat && userLocation.lon) {
            setLoading(true);
            setLoadingWeather(true);
            setError(null);
            setWeatherError(null);
            setAgendaItems([]); 
            setActivities([]);
            setUserPreferences({});
            setWeatherData(null);

            console.log(`Fetching data for location: ${userLocation.lat}, ${userLocation.lon} (Source: ${userLocation.source})`);
    
            const fetchData = async () => {
                let agendaError = null;
                let activitiesError = null;
                let prefsError = null; // Añade para preferencias también
                let weatherFetchError = null;

                let agendaData = [];
                let activitiesData = [];
                let prefsData = [];
                let weatherResult = null;
                let apiErrors = [];
                try {
                    // 1. Asigna los resultados a las variables correctas
                    const [agendaRes, activitiesRes, preferencesRes, weatherRes] = await Promise.all([
                        fetch('/api/agenda'),
                        fetch('/api/activities'),
                        fetch('/api/preferences'),
                        fetch(`/api/weather/data?lat=${userLocation.lat}&lon=${userLocation.lon}`)
                    ]);
    
                    // 2. Usa SIEMPRE las variables asignadas (agendaResponse, activitiesResponse)
                    try {
                        const data = await agendaRes.json(); // Lee UNA VEZ
                        if (!agendaRes.ok) {
                            throw new Error(data.message || `Error Agenda ${agendaRes.status}`);
                        }
                        agendaData = data;
                    } catch (err) {
                        console.error("Error processing Agenda response:", err);
                        apiErrors.push(err.message || 'Error cargando agenda.');
                    }
                    
                    // Actividades
                    try {
                        const data = await activitiesRes.json(); // Lee UNA VEZ
                        if (!activitiesRes.ok) {
                            throw new Error(data.message || `Error Actividades ${activitiesRes.status}`);
                        }
                        activitiesData = data;
                    } catch (err) {
                        console.error("Error processing Activities response:", err);
                        apiErrors.push(err.message || 'Error cargando actividades.');
                    }

                    // Preferencias
                    try {
                    // No es crítico si falla, pero lee el cuerpo
                        const data = await preferencesRes.json(); // Lee UNA VEZ
                        if (!preferencesRes.ok) {
                            console.warn("Could not load preferences:", data.message || `Status ${preferencesRes.status}`);
                        } else {
                            prefsData = data; // Guarda si OK
                        }
                    } catch(err) {
                        console.warn("Error processing Preferences response:", err);
                        // No añadimos error crítico si solo fallan las prefs (opcional)
                    }

                    // Clima
                    try {
                        const data = await weatherRes.json(); // Lee UNA VEZ
                        if (!weatherRes.ok) {
                             throw new Error(data.message || `Error Clima ${weatherRes.status}`);
                        }
                        weatherResult = data;
                    } catch (err) {
                        console.error("Error processing Weather response:", err);
                        apiErrors.push(err.message || 'Error cargando clima.');
                    }
                    

                    const combinedError = [agendaError, activitiesError, weatherFetchError].filter(Boolean).join('; ');
                    

                    console.log("DEBUG [AgendaPage]: Fetched Data:", { agendaData, activitiesData, prefsData, weatherResult });
                    setAgendaItems(agendaData);
                    setActivities(activitiesData);
                    const prefsMap = prefsData.reduce((map, pref) => { map[pref.activityId] = pref; return map; }, {});
                    setUserPreferences(prefsMap);
                    setWeatherData(weatherResult);


                    if (combinedError) setError(combinedError);
                    if (weatherFetchError) setWeatherError(weatherFetchError);
                    // Establecer error combinado si hubo alguno
                    if (apiErrors.length > 0) {
                        setError(apiErrors.join('; '));
                    }

                } catch (err) { // Captura errores generales (ej. red, Promise.all)
                    console.error("General fetch error in AgendaPage:", err);
                    setError(err.message || 'No se pudieron cargar todos los datos.');
                    // Limpia todos los estados
                    setAgendaItems([]); setActivities([]); setUserPreferences({}); setWeatherData(null);
                } finally {
                    setLoading(false);
                    setLoadingWeather(false); // Podríamos unificar en solo 'loading'
                }
            };
            fetchData();
        } else if (status === 'authenticated' && !userLocation.lat) {
            // Si está autenticado pero aún no hay ubicación, indica carga de ubicación
            setLoading(false); // Termina carga de agenda/acts
            setLoadingWeather(true); // Mantiene carga de clima
            console.log("Waiting for user location...");
       } else {
           // Si no está autenticado o algo más falla, termina cargas
            setLoading(false);
            setLoadingWeather(false);
       }
       // Depende de userLocation para re-hacer fetch si cambia la ubicación
   }, [status, session, userLocation]); 

   const nowClient = new Date(); // Hora actual del cliente
   const futureAgendaItems = filterFutureAgendaItemsByEndTime(agendaItems, "[Agenda Filter]");

    console.log(`DEBUG [AgendaPage]: Total items from API: ${agendaItems.length}, Future items displayed: ${futureAgendaItems.length}`);

    // Abre el modal (para nuevo o editar)
    const handleOpenModal = (eventToEdit = null) => {
        setEditingEventData(eventToEdit); // Guarda el evento (o null si es nuevo)
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEventData(null); // Limpia al cerrar
    };

    // Función para añadir el nuevo evento a la lista localmente
    const handleEventSaved = (savedEvent) => {
        console.log("handleEventSaved received:", savedEvent);
        setAgendaItems(prevItems => {
            let newItems;
            const isEditing = !!editingEventData; // Verifica si estábamos editando

            if (isEditing) {
                // Reemplaza el item existente
                newItems = prevItems.map(item =>
                    item.id === savedEvent.id ? savedEvent : item
                );
                 console.log("Updating state after edit");
            } else {
                // Añade el nuevo item
                newItems = [...prevItems, savedEvent];
                 console.log("Adding new event to state");
            }
            // Reordena por fecha/hora
            newItems.sort((a, b) => {
                 // Compara fechas primero, luego horas
                 const dateA = new Date(a.fecha);
                 const dateB = new Date(b.fecha);
                 if (dateA < dateB) return -1;
                 if (dateA > dateB) return 1;
                 // Si las fechas son iguales, compara por hora de inicio
                 const timeA = a.horaInicio || '00:00:00';
                 const timeB = b.horaInicio || '00:00:00';
                 if (timeA < timeB) return -1;
                 if (timeA > timeB) return 1;
                 return 0;
            });
            return newItems;
        });
        // El modal se cierra solo internamente al guardar
    };

    const handleDeleteEvent = async (eventIdToDelete) => {
        const eventToDelete = agendaItems.find(item => item.id === eventIdToDelete);
        if (!eventToDelete) return;

        const activityName = eventToDelete.activity?.name || 'este evento';
        const eventDate = formatDate(eventToDelete.fecha);

       if (!window.confirm(`¿Estás seguro de que quieres eliminar "${activityName}" del ${eventDate}?`)) {
           return;
       }

       console.log(`Attempting delete for event ID: ${eventIdToDelete}`);
       // Podrías añadir un estado de loading específico para el botón/item

       try {
           const response = await fetch(`/api/agenda/${eventIdToDelete}`, {
               method: 'DELETE',
               credentials: 'include' // Mantenlo por consistencia
           });

           if (!response.ok) {
               let errorMsg = `Error ${response.status}`;
               try { const data = await response.json(); errorMsg = data.message || errorMsg; } catch(e) {}
               throw new Error(errorMsg);
           }

           console.log(`Event ${eventIdToDelete} deleted successfully.`);
           // Actualiza estado local eliminando el item
           setAgendaItems(prevItems => prevItems.filter(item => item.id !== eventIdToDelete));
           // Mostrar notificación de éxito (opcional)

       } catch (err) {
            console.error("Error deleting event:", err);
            setError(`Error al eliminar: ${err.message}`); // Muestra error en la página
       } finally {
            // Quitar loading específico si se usó
       }
   };


   if (status === 'loading') {
    return <div className={styles.loading}>Verificando sesión...</div>;
    }
    if (status === 'unauthenticated') {
        // Ya está redirigiendo, o mostrar mensaje si se prefiere
        return <div className={styles.loading}>Redirigiendo a login...</div>;
    }
    // Si llegamos aquí, status es 'authenticated'
    if (loading) {
        return <div className={styles.loading}>Cargando agenda...</div>;
    }

    if (status === 'loading') { /* ... Verificando sesión ... */ }
    if (status === 'unauthenticated') { /* ... Redirigiendo ... */ }

    return (
        <div className={styles.pageContainer}>
            <Head>
                <title>Mi Agenda</title>
                <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
            </Head>

             <Link href="/" className={styles.backLink}>
                ← Volver al Dashboard
             </Link>

            <div className={styles.pageHeader}>
                 <h1 className={styles.pageTitle}>Mi Agenda</h1>
                 <button onClick={() => handleOpenModal()} className={styles.actionButton}>
                     + Agendar Actividad
                 </button>
            </div>

             {error && <p className={styles.error}>{error}</p>}

             {agendaItems.length === 0 && !error && (
                 <p className={styles.emptyMessage}>No tienes actividades agendadas.</p>
             )}

             {futureAgendaItems.length > 0 && !loading &&  (
                 <ul className={styles.agendaList}>
                    {futureAgendaItems.map(item => { 
                         // Verificación extra por si acaso
                         if (!item || !item.id) {
                             return null;
                         }
                         const preference = userPreferences[item.activityId?.toString()];

                         return (
                             <AgendaItem
                                 key={item.id}
                                 item={item}
                                 preference={preference} // Pasa la preferencia encontrada
                                 weatherData={weatherData} // Pasa TODOS los datos del clima
                                 onEdit={handleOpenModal} // Renombrado para claridad
                                 onDelete={handleDeleteEvent}
                             />
                         );
                     })}

                    
                 </ul>
             )}

            {/* El Modal para Crear/Editar */}
            <AgendaFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onEventSaved={handleEventSaved} // Callback unificado
                availableActivities={activities}
                initialEventData={editingEventData} // Pasa el evento (o null)
            />
        </div>
    );
}