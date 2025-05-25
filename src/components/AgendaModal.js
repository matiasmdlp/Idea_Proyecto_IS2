// src/components/AgendaModal.js
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Modal from 'react-modal';
// import Link from 'next/link'; // No más "Volver"

import AgendaFormModal from '@/components/AgendaFormModal';
import AgendaItem from '@/components/AgendaItem';
import styles from '@/styles/Agenda.module.css';
import '../components/ModalStyles.css';
import { filterFutureAgendaItemsByEndTime } from '@/lib/filters';

// Modal.setAppElement('#__next');

// Re-define helpers o impórtalos si los moviste a utils
const formatDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return "Inválida";
    try {
        const date = new Date(dateStr + 'T00:00:00Z'); // Asumir UTC para consistencia con backend
        if (isNaN(date.getTime())) return "Inválida";
        return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch { return "Inválida"; }
};


export default function AgendaModal({ 
    isOpen, 
    onClose, 
    session, 
    initialUserLocation, 
    initialWeatherData,
    onDataChanged 
}) {
    const status = session ? 'authenticated' : 'unauthenticated';

    const [agendaItems, setAgendaItems] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEventFormModalOpen, setIsEventFormModalOpen] = useState(false);
    const [editingEventData, setEditingEventData] = useState(null);
    const [userPreferences, setUserPreferences] = useState({});
    const [weatherData, setWeatherData] = useState(initialWeatherData || null);
    const [loadingWeather, setLoadingWeather] = useState(!initialWeatherData);
    const [weatherError, setWeatherError] = useState(null);
    const [userLocationModal, setUserLocationModal] = useState(initialUserLocation || { lat: null, lon: null, source: null }); // Estado interno para la ubicación del modal
    


    useEffect(() => {
        // Si el modal está abierto y autenticado, carga los datos principales
        if (isOpen && status === 'authenticated') {
            setLoading(true);
            setError(null);
            setAgendaItems([]);
            setActivities([]);
            setUserPreferences({});

            // Si no tenemos userLocation de props, intentamos obtenerla
            if (initialUserLocation && initialUserLocation.lat && !userLocationModal.lat) {
                setUserLocationModal(initialUserLocation);
            } else if (!initialUserLocation && !userLocationModal.lat && !userLocationModal.source) {
                // Lógica para obtener geolocalización si no viene de props
                if ("geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => setUserLocationModal({ lat: position.coords.latitude, lon: position.coords.longitude, source: 'browser_modal' }),
                        () => setUserLocationModal({ lat: 40.4168, lon: -3.7038, source: 'default_modal' }),
                        { timeout: 5000 }
                    );
                } else {
                    setUserLocationModal({ lat: 40.4168, lon: -3.7038, source: 'default_modal' });
                }
            }


            const fetchCoreData = async () => {
                let apiErrors = [];
                try {
                    const [agendaRes, activitiesRes, preferencesRes] = await Promise.all([
                        fetch('/api/agenda'),
                        fetch('/api/activities'),
                        fetch('/api/preferences')
                    ]);

                    // Agenda
                    try {
                        const data = await agendaRes.json();
                        if (!agendaRes.ok) throw new Error(data.message || `Error Agenda ${agendaRes.status}`);
                        setAgendaItems(data);
                    } catch (err) { apiErrors.push(err.message || 'Error cargando agenda.'); }

                    // Activities
                    try {
                        const data = await activitiesRes.json();
                        if (!activitiesRes.ok) throw new Error(data.message || `Error Actividades ${activitiesRes.status}`);
                        setActivities(data);
                    } catch (err) { apiErrors.push(err.message || 'Error cargando actividades.'); }
                    
                    // Preferences
                    try {
                        const data = await preferencesRes.json();
                        if (preferencesRes.ok) {
                            const prefsMap = data.reduce((map, pref) => { map[pref.activityId] = pref; return map; }, {});
                            setUserPreferences(prefsMap);
                        } else { console.warn("Could not load preferences in modal:", data.message); }
                    } catch (err) { console.warn("Error processing prefs in modal:", err); }
                    
                    if (apiErrors.length > 0) setError(apiErrors.join('; '));

                } catch (err) {
                    console.error("General fetch error in AgendaModal (core):", err);
                    setError(err.message || 'No se pudieron cargar los datos principales de la agenda.');
                } finally {
                    setLoading(false);
                }
            };
            fetchCoreData();

        } else if (!isOpen) {
            // Resetear al cerrar
            setAgendaItems([]); setActivities([]); setUserPreferences({}); setError(null);
            setLoading(true); setLoadingWeather(true); // Para próxima apertura
        }
    }, [isOpen, status, session, initialUserLocation]); // Carga datos de agenda/acts/prefs cuando se abre


    // Fetch weather data si la ubicación cambia o se define, y el modal está abierto
    useEffect(() => {
        if (isOpen && status === 'authenticated' && userLocationModal.lat && userLocationModal.lon) {
            setLoadingWeather(true);
            setWeatherError(null);
            console.log(`[AgendaModal] Fetching weather for location: ${userLocationModal.lat}, ${userLocationModal.lon}`);
            
            fetch(`/api/weather/data?lat=${userLocationModal.lat}&lon=${userLocationModal.lon}`)
                .then(res => res.json().then(data => ({ ok: res.ok, status: res.status, data })))
                .then(response => {
                    if (!response.ok) throw new Error(response.data.message || `Error Clima ${response.status}`);
                    setWeatherData(response.data);
                })
                .catch(err => {
                    console.error("[AgendaModal] Error fetching weather:", err);
                    setWeatherError(err.message || 'Error cargando datos del clima.');
                    setWeatherData(null); // Limpia datos viejos en caso de error
                })
                .finally(() => setLoadingWeather(false));
        }
    }, [isOpen, status, userLocationModal]); // Carga clima cuando se abre Y hay ubicación


    const futureAgendaItems = filterFutureAgendaItemsByEndTime(agendaItems, "[AgendaModal Filter]");

    const handleOpenEventFormModal = (eventToEdit = null) => {
        setEditingEventData(eventToEdit);
        setIsEventFormModalOpen(true);
    };

    const handleCloseEventFormModal = () => {
        setIsEventFormModalOpen(false);
        setEditingEventData(null);
    };

    const handleEventSaved = (savedEvent) => {
        setAgendaItems(prevItems => {
            let newItems;
            const isEditing = !!editingEventData;
            if (isEditing) {
                newItems = prevItems.map(item => item.id === savedEvent.id ? savedEvent : item);
            } else {
                newItems = [...prevItems, savedEvent];
            }
            newItems.sort((a, b) => {
                 const dateA = new Date(a.fecha); const dateB = new Date(b.fecha);
                 if (dateA < dateB) return -1; if (dateA > dateB) return 1;
                 const timeA = a.horaInicio || '00:00:00'; const timeB = b.horaInicio || '00:00:00';
                 return timeA.localeCompare(timeB);
            });
            return newItems;
        });
        // El modal de formulario de evento se cierra solo
    };

    const handleDeleteEvent = async (eventIdToDelete) => {
        const eventName = agendaItems.find(item => item.id === eventIdToDelete)?.activity?.name || 'este evento';
        if (!window.confirm(`¿Estás seguro de que quieres eliminar "${eventName}" de la agenda?`)) return;

        try {
            const response = await fetch(`/api/agenda/${eventIdToDelete}`, { method: 'DELETE' });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || `Error al eliminar (${response.status})`);
            }
            setAgendaItems(prev => prev.filter(item => item.id !== eventIdToDelete));
        } catch (err) {
            console.error("Error deleting event in modal:", err);
            setError(`Error al eliminar: ${err.message}`);
        }
    };
    
    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            overlayClassName="ReactModal__Overlay"
            className="ModalContent ModalContentLarge" // Clase para tamaño
            contentLabel="Mi Agenda"
            appElement={typeof window !== 'undefined' && document.getElementById('__next')}
        >
            <div className="ModalHeader">
                <h2 className="ModalTitle">Mi Agenda</h2>
                <button onClick={onClose} className="CloseButton" disabled={loading || loadingWeather}>×</button>
            </div>

            <div className={styles.pageContainer} style={{padding: 0, maxHeight: '75vh', overflowY: 'auto'}}>
                <div className={styles.modalContentArea} style={{paddingTop: '0.5rem', position: 'sticky', top: 0, background: 'white', zIndex: 1}}>
                    <div style={{
                    flexGrow: 1, // Para que ocupe el espacio vertical
                    overflowY: 'auto', // Para el scroll interno
                    padding: '0 1.5rem 1.5rem 1.5rem' // Padding interno para el contenido
                    }}></div>
                    <button onClick={() => handleOpenEventFormModal()} className={styles.actionButton} disabled={loading}>
                        + Agendar Actividad
                    </button>
                </div>

                {loading ? (
                    <div className={styles.loading}>Cargando agenda...</div>
                ) : error ? (
                    <p className={styles.error} style={{textAlign: 'center', padding: '1rem'}}>{error}</p>
                ) : (
                    <>
                        {weatherError && <p className={styles.error} style={{textAlign: 'center', padding: '0.5rem'}}>{weatherError}</p>}
                        {loadingWeather && !weatherData && <p className={styles.loading} style={{textAlign: 'center', padding: '0.5rem'}}>Cargando clima...</p>}

                        {futureAgendaItems.length === 0 && !error && (
                            <p className={styles.emptyMessage}>No tienes actividades próximas agendadas.</p>
                        )}
                        {futureAgendaItems.length > 0 && (
                            <ul className={styles.agendaList}>
                                {futureAgendaItems.map(item => {
                                    if (!item || !item.id) return null;
                                    const preference = userPreferences[item.activityId?.toString()];
                                    return (
                                        <AgendaItem
                                            key={item.id}
                                            item={item}
                                            preference={preference}
                                            weatherData={weatherData}
                                            onEdit={handleOpenEventFormModal}
                                            onDelete={handleDeleteEvent}
                                        />
                                    );
                                })}
                            </ul>
                        )}
                    </>
                )}
            </div>

            {/* Modal para agendar/editar evento */}
            <AgendaFormModal
                isOpen={isEventFormModalOpen}
                onClose={handleCloseEventFormModal}
                onEventSaved={handleEventSaved}
                availableActivities={activities} // Pasa las actividades cargadas
                initialEventData={editingEventData}
            />
        </Modal>
    );
}