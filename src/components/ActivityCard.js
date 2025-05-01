// components/ActivityCard.js
import React, { useState } from 'react';
import styles from '@/styles/ActivityCard.module.css';

// Componente interno para mostrar una línea de preferencia
const PreferenceLine = ({ label, value, unit = '', isSet }) => {
    return (
        <div className={styles.preferenceItem}>
            <span className={styles.preferenceLabel}>{label}:</span>
            {isSet ? (
                 <span className={styles.preferenceValue}>{value}{unit}</span>
            ) : (
                 <span className={styles.preferenceValueNotSet}>No definido</span>
            )}
        </div>
    );
};


export default function ActivityCard({ activity, userPreference, onEditPreferences, onDeleteActivity }) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Determina si la actividad es estándar o del usuario
    const isStandard = activity.userId === null;

     // Usamos las preferencias del usuario si existen, si no, son "default" (no definidas)
     // Creamos un objeto 'displayPreference' para simplificar el acceso en el JSX
     const hasUserPreference = !!userPreference;
     const displayPreference = userPreference || {}; // Usa pref de usuario o un objeto vacío

     // Función para manejar el click en el botón de editar
     const handleEditClick = (e) => {
         e.stopPropagation(); // Evita que el click expanda/colapse la card si usamos onClick en la card
         onEditPreferences(activity); // Llama a la función pasada desde la página
     }

     const handleDeleteClick = (e) => {
        e.stopPropagation(); // Evita que se active el hover/click de la tarjeta
        // Llama a la función pasada desde la página, pasando el ID
        onDeleteActivity(activity.id);
    }

     return (
        <div
            className={`${styles.card} ${isExpanded ? styles.cardExpanded : ''}`}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            {/* --- CAMBIO: Mostrar siempre el botón editar --- */}
            {/* (Podrías añadir lógica extra si quieres ocultarlo bajo condiciones muy específicas) */}
            <button onClick={handleEditClick} className={styles.editButton} title={isStandard ? "Crear copia personalizada" : "Editar preferencias"}>
                <span className="material-icons">
                    {/* Cambia el icono si es estándar para indicar "copiar/añadir" */}
                    {isStandard ? 'add_circle_outline' : 'edit'}
                </span>
            </button>
            {/* --- FIN CAMBIO --- */}


            <div className={styles.cardHeader}>
                {activity.iconName && (
                     <span className={`material-icons ${styles.icon}`}>{activity.iconName}</span>
                 )}
                <span className={styles.activityName}>{activity.name}</span>
                 <span className={`${styles.activityType} ${isStandard ? '' : styles.activityTypeUser}`}>
                     {isStandard ? 'Sugerida' : 'Personal'}
                 </span>
            </div>

            {!isStandard && (
                 <button
                    onClick={handleDeleteClick}
                    className={`${styles.actionButton} ${styles.deleteButton}`} // Añade clase específica para borrar
                    title="Eliminar actividad"
                 >
                    <span className="material-icons">delete_outline</span>
                </button>
            )}

            <p className={styles.activityDescription}>{activity.description || 'Sin descripción.'}</p>

            <div className={styles.preferencesSection}>
                 <h4 className={styles.preferencesTitle}>
                     {/* Ajusta título si no hay preferencias */}
                     {hasUserPreference ? 'Tus Preferencias:' : (isStandard ? 'Preferencias (Default):' : 'Preferencias (Sin definir):')}
                 </h4>
                {/* Mostrar las preferencias (sin cambios aquí) */}
                <PreferenceLine label="Temp Min" value={displayPreference.minTemp} unit="°C" isSet={displayPreference.minTemp !== null && displayPreference.minTemp !== undefined} />
                 <PreferenceLine label="Temp Max" value={displayPreference.maxTemp} unit="°C" isSet={displayPreference.maxTemp !== null && displayPreference.maxTemp !== undefined} />
                 <PreferenceLine label="Viento Max" value={displayPreference.maxWindSpeed} unit=" km/h" isSet={displayPreference.maxWindSpeed !== null && displayPreference.maxWindSpeed !== undefined} />
                 <PreferenceLine label="Prob. Precip Max" value={displayPreference.maxPrecipitationProbability} unit="%" isSet={displayPreference.maxPrecipitationProbability !== null && displayPreference.maxPrecipitationProbability !== undefined} />
                 <PreferenceLine label="Int. Precip Max" value={displayPreference.maxPrecipitationIntensity} unit=" mm/h" isSet={displayPreference.maxPrecipitationIntensity !== null && displayPreference.maxPrecipitationIntensity !== undefined} />
                 <PreferenceLine label="Sin Precipitación" value={displayPreference.requiresNoPrecipitation ? 'Sí' : 'No'} isSet={hasUserPreference || isStandard} /> {/* Considera 'false' como definido */}
                 <PreferenceLine label="UV Max" value={displayPreference.maxUv} isSet={displayPreference.maxUv !== null && displayPreference.maxUv !== undefined} />
                 <PreferenceLine label="Activa" value={displayPreference.isActive ? 'Sí' : 'No'} isSet={hasUserPreference || isStandard} /> {/* Considera 'true' como definido */}

            </div>
        </div>
    );
}