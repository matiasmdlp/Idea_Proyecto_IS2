// src/components/ActivitiesModal.js
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react'; // Sigue usando useSession
import Modal from 'react-modal';
import Head from 'next/head'; 

import ActivityCard from '@/components/ActivityCard';
import PreferencesFormModal from '@/components/PreferencesFormModal';
import NewActivityModal from '@/components/NewActivityModal';
import styles from '@/styles/Activities.module.css'; // Estilos de la página de actividades
import '../components/ModalStyles.css'; // Estilos comunes del modal

// Modal.setAppElement('#__next'); // Esto debería estar en _app.js

export default function ActivitiesModal({ isOpen, onClose, session }) { // Recibe session como prop
    // const { data: session, status } = useSession(); // O usa el session pasado como prop
    const status = session ? 'authenticated' : 'unauthenticated'; // Deriva status

    const [activities, setActivities] = useState([]);
    const [userPreferences, setUserPreferences] = useState({});
    const [loading, setLoading] = useState(true); // Carga interna del modal
    const [error, setError] = useState(null);

    const [isPrefsModalOpen, setIsPrefsModalOpen] = useState(false);
    const [isNewActivityModalOpen, setIsNewActivityModalOpen] = useState(false);
    const [selectedActivityForPrefs, setSelectedActivityForPrefs] = useState(null);
    const [preFilledActivityData, setPreFilledActivityData] = useState(null);

    // Fetch de datos cuando el modal se abre y el usuario está autenticado
    useEffect(() => {
        if (isOpen && status === 'authenticated') {
            setLoading(true);
            setError(null);
            // Resetear estados al abrir para asegurar datos frescos si el modal se reutiliza
            setActivities([]);
            setUserPreferences({});

            const fetchData = async () => {
                try {
                    const [activitiesRes, preferencesRes] = await Promise.all([
                        fetch('/api/activities'),
                        fetch('/api/preferences')
                    ]);

                    if (!activitiesRes.ok) throw new Error(`Error actividades (${activitiesRes.status})`);
                    const activitiesData = await activitiesRes.json();

                    let prefsMap = {};
                    if (preferencesRes.ok) {
                        const preferencesData = await preferencesRes.json();
                        prefsMap = preferencesData.reduce((map, pref) => {
                            map[pref.activityId.toString()] = pref;
                            return map;
                        }, {});
                    } else {
                        console.warn(`Error al cargar preferencias (${preferencesRes.status})`);
                    }

                    setActivities(activitiesData);
                    setUserPreferences(prefsMap);
                } catch (err) {
                    console.error("Fetch error in ActivitiesModal:", err);
                    setError(err.message || 'No se pudieron cargar los datos.');
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        } else if (!isOpen) {
            // Opcional: resetear estados cuando el modal se cierra para liberar memoria
            // o para que no muestre datos viejos brevemente al reabrir.
            setActivities([]);
            setUserPreferences({});
            setError(null);
            setLoading(true); // Para que muestre "cargando" la próxima vez
        }
    }, [isOpen, status, session]); // Depende de isOpen y status/session

    // ... (copia todos los handlers: handleEditPreferences, handleCreateNewActivity, etc.)
    const handleEditPreferences = (activity) => {
        if (activity.userId === null) {
            setPreFilledActivityData({
                name: activity.name,
                description: activity.description,
                iconName: activity.iconName
            });
            setIsNewActivityModalOpen(true);
        } else {
            setSelectedActivityForPrefs(activity);
            setIsPrefsModalOpen(true);
        }
    };

    const handleCreateNewActivity = () => {
        setPreFilledActivityData(null); // Asegura que no haya datos pre-llenados
        setIsNewActivityModalOpen(true);
    };

    const handleClosePrefsModal = () => {
        setIsPrefsModalOpen(false);
        setSelectedActivityForPrefs(null);
    };

    const handleCloseNewActivityModal = () => {
        setIsNewActivityModalOpen(false);
        setPreFilledActivityData(null); // Limpia datos pre-llenados
    };

    const handleSavePreferences = (updatedPreference) => {
        setUserPreferences(prev => ({
            ...prev,
            [updatedPreference.activityId.toString()]: updatedPreference
        }));
        // El modal de preferencias se cierra solo
    };

    const handleNewActivityCreated = (result) => {
        setActivities(prev => [...prev, result.activity]);
        setUserPreferences(prev => ({
            ...prev,
            [result.preference.activityId.toString()]: result.preference
        }));
        // El modal de nueva actividad se cierra solo
    };

    const handleDeleteActivity = async (activityIdToDelete) => {
        const activityName = activities.find(act => act.id === activityIdToDelete)?.name || 'esta actividad';
        if (!window.confirm(`¿Estás seguro de que quieres eliminar "${activityName}"?`)) return;

        try {
            const response = await fetch(`/api/activities/${activityIdToDelete}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || `Error al eliminar (${response.status})`);

            setActivities(prev => prev.filter(act => act.id !== activityIdToDelete));
            setUserPreferences(prev => {
                const newPrefs = { ...prev };
                delete newPrefs[activityIdToDelete.toString()];
                return newPrefs;
            });
        } catch (err) {
            console.error("Error deleting activity:", err);
            setError(`Error al eliminar: ${err.message}`);
        }
    };

    const standardActivities = activities.filter(act => act.userId === null);
    const userActivities = activities.filter(act => act.userId !== null);

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            overlayClassName="ReactModal__Overlay"
            className="ModalContent ModalContentLarge" // Puedes añadir una clase para hacerlo más grande
            contentLabel="Actividades y Preferencias"
            appElement={typeof window !== 'undefined' && document.getElementById('__next')}
        >
            {/* <Head> <title>Mis Actividades</title> </Head> */} {/* Opcional si el modal no cambia el título del navegador */}
            
            <div className="ModalHeader"> {/* Estructura común de modal */}
                <h2 className="ModalTitle">Actividades y Preferencias</h2>
                <button onClick={onClose} className="CloseButton" disabled={loading}>×</button>
            </div>

            {/* Área de contenido principal del modal, con scroll y crecimiento */}
            <div 
                className={styles.modalContentArea} // Puedes usar una clase de Activities.module.css o una global
                style={{
                    flexGrow: 1, // Para que ocupe el espacio vertical
                    overflowY: 'auto', // Para el scroll interno
                    padding: '0 1.5rem 1.5rem 1.5rem' // Padding interno para el contenido
                }}
            >
                {/* El pageHeader interno solo para acciones */}
                <div 
                    className={styles.pageHeaderActions} // Nueva clase o ajustar styles.pageHeader
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end', // Botón a la derecha
                        paddingTop: '1rem', // Espacio arriba del botón
                        paddingBottom: '1rem', // Espacio debajo del botón
                        borderBottom: '1px solid #eee',
                        marginBottom: '1.5rem'
                    }}
                >
                     <button 
                        onClick={handleCreateNewActivity} 
                        className={styles.actionButton} // Reutiliza el estilo del botón
                        disabled={loading || (isOpen && status !== 'authenticated')}
                     >
                         + Crear Actividad
                     </button>
                </div>
                
                {status === 'loading' || (isOpen && loading) ? (
                    <div className={styles.loading}>Cargando actividades...</div>
                ) : error ? (
                    <p className={styles.error}>{error}</p>
                ) : status !== 'authenticated' && isOpen ? (
                    <p className={styles.error}>Debes iniciar sesión para ver tus actividades.</p>
                ) : (
                    <>
                        {userActivities.length > 0 && (
                            <>
                                <h2 className={styles.sectionTitle}>Mis Actividades Personalizadas</h2>
                                <div className={styles.activitiesGrid}>
                                    {userActivities.map(activity => {
                                        if (!activity?.id) return null;
                                        const activityIdString = activity.id.toString();
                                        return (
                                            <ActivityCard
                                                key={activityIdString}
                                                activity={activity}
                                                userPreference={userPreferences[activityIdString]}
                                                onEditPreferences={handleEditPreferences}
                                                onDeleteActivity={handleDeleteActivity}
                                            />
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {standardActivities.length > 0 && (
                            <>
                                <h2 className={styles.sectionTitle}>Actividades Sugeridas</h2>
                                <div className={styles.activitiesGrid}>
                                    {standardActivities.map(activity => {
                                        if (!activity?.id) return null;
                                        const activityIdString = activity.id.toString();
                                        return (
                                            <ActivityCard
                                                key={activityIdString}
                                                activity={activity}
                                                userPreference={userPreferences[activityIdString]}
                                                onEditPreferences={handleEditPreferences}
                                            />
                                        );
                                    })}
                                </div>
                            </>
                        )}
                        
                        {!loading && activities.length === 0 && !error && status === 'authenticated' && (
                             <p className={styles.emptyMessage}>No hay actividades disponibles. Crea una nueva o personaliza una sugerida.</p>
                        )}
                    </>
                )}
            </div>

            {/* Modales anidados (PreferencesFormModal, NewActivityModal) se renderizan aquí */}
            {selectedActivityForPrefs && (
                 <PreferencesFormModal
                     isOpen={isPrefsModalOpen}
                     onClose={handleClosePrefsModal}
                     activity={selectedActivityForPrefs}
                     initialPreference={userPreferences[selectedActivityForPrefs.id.toString()]}
                     onSave={handleSavePreferences}
                 />
             )}

             <NewActivityModal
                 isOpen={isNewActivityModalOpen}
                 onClose={handleCloseNewActivityModal}
                 onActivityCreated={handleNewActivityCreated}
                 initialData={preFilledActivityData}
             />
        </Modal>
    );
}