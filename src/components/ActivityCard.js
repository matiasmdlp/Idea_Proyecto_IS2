// components/ActivityCard.js
import React from 'react';
import styles from '@/styles/ActivityCard.module.css';

const PreferenceLine = ({ label, value, unit = '', isSet }) => {
    // ... (sin cambios)
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
    const isStandard = activity.userId === null;
    const hasUserPreference = !!userPreference;
    const displayPreference = userPreference || {};

    const handleEditClick = (e) => {
        e.stopPropagation();
        onEditPreferences(activity);
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        onDeleteActivity(activity.id);
    };

    return (
        <div className={styles.card}>
            {/* Contenido base de la tarjeta (siempre visible en el flujo, pero visualmente tapado por preferencesSection en hover) */}
            <div className={styles.cardHeader}>
                {activity.iconName && (
                     <span className={`material-icons ${styles.icon}`}>{activity.iconName}</span>
                 )}
                <span className={styles.activityName}>{activity.name}</span>
                 <span className={`${styles.activityType} ${isStandard ? '' : styles.activityTypeUser}`}>
                     {isStandard ? 'Sugerida' : 'Personal'}
                 </span>
            </div>
            <p className={styles.activityDescription}>{activity.description || 'Sin descripción.'}</p>

            {/* Botones de acción (editar/eliminar) */}
            <button onClick={handleEditClick} className={styles.editButton} title={isStandard ? "Crear copia personalizada" : "Editar preferencias"}>
                <span className="material-icons">
                    {isStandard ? 'add_circle_outline' : 'edit'}
                </span>
            </button>

            {!isStandard && (
                 <button
                    onClick={handleDeleteClick}
                    className={styles.deleteButton}
                    title="Eliminar actividad"
                 >
                    <span className="material-icons">delete_outline</span>
                </button>
            )}

            {/* Sección de Preferencias (Contenido que aparece al hacer hover) */}
            <div className={styles.preferencesSection}>
                {/* --- INICIO: Contenido base REPETIDO para la vista expandida --- */}
                <div className={styles.cardHeader}> {/* Reutilizamos la clase para consistencia de estilo */}
                    {activity.iconName && (
                        <span className={`material-icons ${styles.icon}`}>{activity.iconName}</span>
                    )}
                    <span className={styles.activityName}>{activity.name}</span>
                    {/* No necesitamos el .activityType aquí de nuevo, ya que la tarjeta ya lo muestra */}
                </div>
                <p className={styles.activityDescription} style={{marginBottom: '1.5rem' /* Más espacio antes de preferencias */}}>
                    {activity.description || 'Sin descripción.'}
                </p>
                {/* --- FIN: Contenido base REPETIDO --- */}
                
                <h4 className={styles.preferencesTitle}>
                     {hasUserPreference ? 'Tus Preferencias:' : (isStandard ? 'Preferencias (Default):' : 'Preferencias (Sin definir):')}
                 </h4>
                <PreferenceLine label="Temp Min" value={displayPreference.minTemp} unit="°C" isSet={displayPreference.minTemp !== null && displayPreference.minTemp !== undefined} />
                <PreferenceLine label="Temp Max" value={displayPreference.maxTemp} unit="°C" isSet={displayPreference.maxTemp !== null && displayPreference.maxTemp !== undefined} />
                <PreferenceLine label="Viento Max" value={displayPreference.maxWindSpeed} unit=" km/h" isSet={displayPreference.maxWindSpeed !== null && displayPreference.maxWindSpeed !== undefined} />
                <PreferenceLine label="Prob. Precip Max" value={displayPreference.maxPrecipitationProbability} unit="%" isSet={displayPreference.maxPrecipitationProbability !== null && displayPreference.maxPrecipitationProbability !== undefined} />
                <PreferenceLine label="Int. Precip Max" value={displayPreference.maxPrecipitationIntensity} unit=" mm/h" isSet={displayPreference.maxPrecipitationIntensity !== null && displayPreference.maxPrecipitationIntensity !== undefined} />
                <PreferenceLine label="Sin Precipitación" value={displayPreference.requiresNoPrecipitation ? 'Sí' : 'No'} isSet={hasUserPreference || isStandard} />
                <PreferenceLine label="UV Max" value={displayPreference.maxUv} isSet={displayPreference.maxUv !== null && displayPreference.maxUv !== undefined} />
                <PreferenceLine label="Activa" value={displayPreference.isActive ? 'Sí' : 'No'} isSet={hasUserPreference || isStandard} />
            </div>
        </div>
    );
}