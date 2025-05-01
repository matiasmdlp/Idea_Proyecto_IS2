// pages/activities.js
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import ActivityCard from '@/components/ActivityCard'; // Ajusta la ruta si es necesario
import PreferencesFormModal from '@/components/PreferencesFormModal'; // <-- Importar
import NewActivityModal from '@/components/NewActivityModal'; // <-- Importar
import styles from '@/styles/Activities.module.css'; // Ajusta la ruta
import '../components/ModalStyles.css'
// Importar Iconos (ejemplo con react-icons, puedes usar otra librería)

// O incluir Material Icons globalmente (ver nota al final)


export default function ActivitiesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activities, setActivities] = useState([]);
    const [userPreferences, setUserPreferences] = useState({}); // Objeto para mapeo rápido
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Estados para Modales ---
    const [isPrefsModalOpen, setIsPrefsModalOpen] = useState(false);
    const [isNewActivityModalOpen, setIsNewActivityModalOpen] = useState(false);
    const [selectedActivityForPrefs, setSelectedActivityForPrefs] = useState(null); // Qué actividad editar
    const [preFilledActivityData, setPreFilledActivityData] = useState(null); // Para pre-llenar el modal de nueva actividad

    // Redirección si no está autenticado
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    // Fetch de datos (Actividades y Preferencias)
    useEffect(() => {
        if (status === 'authenticated') {
            setLoading(true);
            setError(null);

            const fetchData = async () => {
                try {
                    // Peticiones en paralelo
                    const [activitiesRes, preferencesRes] = await Promise.all([
                        fetch('/api/activities'), // GET por defecto
                        fetch('/api/preferences') // GET por defecto
                    ]);

                    if (!activitiesRes.ok) {
                        throw new Error(`Error al cargar actividades (${activitiesRes.status})`);
                    }
                    if (!preferencesRes.ok) {
                        // Podríamos funcionar sin preferencias, pero logueamos el error
                        console.error(`Error al cargar preferencias (${preferencesRes.status})`);
                         // throw new Error(`Error al cargar preferencias (${preferencesRes.status})`);
                    }

                    const activitiesData = await activitiesRes.json();
                    const preferencesData = preferencesRes.ok ? await preferencesRes.json() : [];

                    setActivities(activitiesData);

                    // Mapear preferencias por activityId para fácil acceso
                    const prefsMap = preferencesData.reduce((map, pref) => {
                         // Asegúrate que activityId es string si viene de la API como string
                        map[pref.activityId.toString()] = pref;
                        return map;
                    }, {});
                    setUserPreferences(prefsMap);

                } catch (err) {
                    console.error("Fetch error:", err);
                    setError(err.message || 'No se pudieron cargar los datos.');
                    setActivities([]);
                    setUserPreferences({});
                } finally {
                    setLoading(false);
                }
            };

            fetchData();
        }
    }, [status]); // Se ejecuta cuando cambia el estado de autenticación

    // Renderizado
    if (status === 'loading' || loading) {
        return <div className={styles.loading}>Cargando actividades...</div>;
    }

     if (status === 'unauthenticated') {
        // Ya está redirigiendo, muestra null o un spinner
        return null;
     }

    
    // --- Handlers para Modales ---
    const handleEditPreferences = (activity) => {
        if (activity.userId === null) { // Es una actividad estándar/sugerida
            console.log("Copiando actividad sugerida:", activity.name);
            // Pre-llena los datos básicos para el modal de NUEVA actividad
            setPreFilledActivityData({
                name: activity.name, // Puedes añadir "(copia)" si quieres
                description: activity.description,
                iconName: activity.iconName
            });
            setIsNewActivityModalOpen(true); // Abre el modal de NUEVA actividad
        } else { // Es una actividad del usuario
            console.log("Editando preferencias para actividad personal:", activity.name);
            setSelectedActivityForPrefs(activity); // Guarda para el modal de PREFERENCIAS
            setIsPrefsModalOpen(true);          // Abre el modal de PREFERENCIAS
        }
    };

    const handleCreateNewActivity = () => {
        console.log("Crear nueva actividad");
        setIsNewActivityModalOpen(true); // Abre el modal de nueva actividad
    };

    const handleClosePrefsModal = () => {
        setIsPrefsModalOpen(false);
        setSelectedActivityForPrefs(null); // Limpia la actividad seleccionada
    };

    const handleCloseNewActivityModal = () => {
        setIsNewActivityModalOpen(false);
    };

    // --- Handler cuando se GUARDAN preferencias ---
    const handleSavePreferences = (updatedPreference) => {
        console.log("Preferencia guardada:", updatedPreference);
        // Actualiza el estado local de preferencias
        setUserPreferences(prev => ({
            ...prev,
            // Usa activityId (como string) como clave
            [updatedPreference.activityId.toString()]: updatedPreference
        }));
         // No necesitamos cerrar el modal aquí, lo hace el propio modal
         // handleClosePrefsModal();
    };

    // --- Handler cuando se CREA una actividad ---
     const handleNewActivityCreated = (result) => {
        // 'result' contiene { activity, preference } de la API
        console.log("Nueva actividad creada:", result);

        // Añade la nueva actividad a la lista
        setActivities(prev => [...prev, result.activity]);

         // Añade la nueva preferencia al mapa
         setUserPreferences(prev => ({
             ...prev,
             [result.preference.activityId.toString()]: result.preference
         }));

         // No necesitamos cerrar el modal aquí, lo hace el propio modal
         // handleCloseNewActivityModal();
     };

     const handleDeleteActivity = async (activityIdToDelete) => {
        // Busca el nombre para la confirmación
        const activityName = activities.find(act => act.id === activityIdToDelete)?.name || 'esta actividad';

        // Pide confirmación al usuario
        if (!window.confirm(`¿Estás seguro de que quieres eliminar "${activityName}"? Esta acción no se puede deshacer.`)) {
            return; // El usuario canceló
        }

        console.log(`Intentando eliminar actividad ID: ${activityIdToDelete}`);

        try {
            const response = await fetch(`/api/activities/${activityIdToDelete}`, {
                method: 'DELETE',
                // credentials: 'include' // Añadir si tuvimos problemas con POST y cookies
            });

            const result = await response.json(); // Intenta leer el mensaje de éxito/error

            if (!response.ok) {
                 // Muestra el mensaje de error de la API si existe
                throw new Error(result.message || `Error al eliminar la actividad (${response.status})`);
            }

            console.log(`Actividad ${activityIdToDelete} eliminada.`);
            // Actualiza el estado local para quitar la actividad de la UI
            setActivities(prevActivities => prevActivities.filter(act => act.id !== activityIdToDelete));
            // También elimina las preferencias asociadas del estado local (opcional pero bueno)
            setUserPreferences(prevPrefs => {
                 const newPrefs = { ...prevPrefs };
                 delete newPrefs[activityIdToDelete.toString()]; // Elimina la entrada
                 return newPrefs;
            });

             // Mostrar notificación de éxito (opcional)
             // alert(result.message || 'Actividad eliminada');


        } catch (err) {
            console.error("Error deleting activity:", err);
            // Mostrar error al usuario (más amigable que un alert)
            setError(`Error al eliminar: ${err.message}`);
            // Podrías usar un state para un mensaje de error temporal en la UI
        } finally {
             // Quitar estado de loading de borrado si lo implementaste
        }
    };


    // ... (Renderizado: if loading, if unauthenticated, separación de actividades) ...
    const standardActivities = activities.filter(act => act.userId === null);
    const userActivities = activities.filter(act => act.userId !== null);


    return (
        <div className={styles.pageContainer}>
            <Head>
                <title>Mis Actividades</title>
                 {/* Asegúrate de incluir Material Icons si los usas */}
                 <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
            </Head>

            <Link href="/" className={styles.backLink}>
                ← Volver al Dashboard
            </Link>

            <div className={styles.pageHeader}>
                 <h1 className={styles.pageTitle}>Actividades y Preferencias</h1>
                 <div className={styles.pageActions}>
                     <button onClick={handleCreateNewActivity} className={styles.actionButton}>
                         + Crear Actividad
                     </button>
                 </div>
            </div>

            

            {error && <p className={styles.error}>{error}</p>}



             {/* Mis Actividades Personalizadas */}
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
                                    onDeleteActivity={handleDeleteActivity} // <-- PASAR EL NUEVO HANDLER
                                />
                            );
                        })}
                    </div>
                  </>
             )}
            {/* Mensaje si no hay actividades */}


            
             {/* Sección Actividades Estándar */}
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
                                    // No pasamos onDeleteActivity a las estándar
                                />
                            );
                        })}
                    </div>
                </>
             )}


            {/* --- Renderizado de Modales --- */}
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
                 initialData={preFilledActivityData} // <-- PASAR DATOS PRE-LLENADOS
             />

            


             {/* Mensaje si no hay actividades */}
             {!loading && activities.length === 0 && !error && (
                 <p className={styles.loading}>No hay actividades disponibles.</p>
             )}

             {/* Aquí irán los Modales (Preferencias y Nueva Actividad) */}
             {/* <PreferencesFormModal isOpen={...} onClose={...} ... /> */}
             {/* <NewActivityModal isOpen={...} onClose={...} ... /> */}

        </div>
    );
}