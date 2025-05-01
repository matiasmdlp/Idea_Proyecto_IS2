// components/PreferencesFormModal.js
import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import commonModalStyles from './ModalStyles.css'; // Importa los estilos CSS Modules
import formStyles from '@/styles/Activities.module.css'; // Reutiliza algunos estilos si quieres

// Define el elemento raíz de tu aplicación para accesibilidad (importante)
// Usualmente se hace una sola vez en _app.js o al inicio de tu app
if (typeof window !== 'undefined') {
    Modal.setAppElement('#__next'); // ID por defecto de Next.js
}

// Helper para parsear valores numéricos, manejando null/undefined/empty string
const parseNullableInt = (value) => (value === null || value === undefined || value === '') ? null : parseInt(value, 10);
const parseNullableFloat = (value) => (value === null || value === undefined || value === '') ? null : parseFloat(value);

export default function PreferencesFormModal({ isOpen, onClose, activity, initialPreference, onSave }) {
    // Estado inicial para cada campo del formulario
    const [minTemp, setMinTemp] = useState('');
    const [maxTemp, setMaxTemp] = useState('');
    const [maxWind, setMaxWind] = useState('');
    const [maxPrecipProb, setMaxPrecipProb] = useState('');
    const [maxPrecipIntensity, setMaxPrecipIntensity] = useState('');
    const [noPrecip, setNoPrecip] = useState(false);
    const [maxUv, setMaxUv] = useState('');
    const [isActive, setIsActive] = useState(true);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Efecto para poblar el formulario cuando cambian las props iniciales
    useEffect(() => {
        if (initialPreference) {
            setMinTemp(initialPreference.minTemp ?? '');
            setMaxTemp(initialPreference.maxTemp ?? '');
            setMaxWind(initialPreference.maxWindSpeed ?? '');
            setMaxPrecipProb(initialPreference.maxPrecipitationProbability ?? '');
            // Los decimales vienen como string de la API, pero el input es number
            setMaxPrecipIntensity(initialPreference.maxPrecipitationIntensity ?? '');
            setNoPrecip(initialPreference.requiresNoPrecipitation ?? false);
            setMaxUv(initialPreference.maxUv ?? '');
            setIsActive(initialPreference.isActive ?? true);
        } else {
             // Resetea a valores por defecto si no hay preferencia inicial
             setMinTemp('');
             setMaxTemp('');
             setMaxWind('');
             setMaxPrecipProb('');
             setMaxPrecipIntensity('');
             setNoPrecip(false);
             setMaxUv('');
             setIsActive(true);
        }
         setError(null); // Limpia errores al abrir/cambiar
         setIsLoading(false);
    }, [initialPreference, isOpen]); // Se ejecuta cuando initialPreference o isOpen cambian

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/preferences', { // o /api/activities
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ /* ... data ... */ }),
            credentials: 'include' // <--- AÑADIR ESTO
        });

        const preferenceData = {
            minTemp: parseNullableInt(minTemp),
            maxTemp: parseNullableInt(maxTemp),
            maxWindSpeed: parseNullableInt(maxWind),
            maxPrecipitationProbability: parseNullableInt(maxPrecipProb),
            maxPrecipitationIntensity: parseNullableFloat(maxPrecipIntensity),
            requiresNoPrecipitation: noPrecip,
            maxUv: parseNullableInt(maxUv),
            isActive: isActive,
        };

        // Validación simple (ejemplo)
        if (preferenceData.minTemp !== null && preferenceData.maxTemp !== null && preferenceData.minTemp > preferenceData.maxTemp) {
             setError('La temperatura mínima no puede ser mayor que la máxima.');
             setIsLoading(false);
             return;
        }


        try {
            const response = await fetch('/api/preferences', {
                method: 'POST', // Nuestra API usa POST para upsert
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activityId: activity.id, // Asegúrate que activity.id sea el ID correcto
                    ...preferenceData
                }),
                credentials: 'include'
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Error al guardar preferencias');
            }

            onSave(result); // Llama al callback del padre con la preferencia guardada/actualizada
            onClose(); // Cierra el modal

        } catch (err) {
            console.error("Error saving preferences:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Estilos personalizados para el modal
    const customStyles = {
        content: {
            // Puedes sobrescribir estilos aquí si es necesario
            // top: '50%', left: '50%', right: 'auto', bottom: 'auto',
            // marginRight: '-50%', transform: 'translate(-50%, -50%)',
            // width: '500px', padding: '2rem'
        },
         overlay: {
             backgroundColor: 'rgba(0, 0, 0, 0.6)',
             zIndex: 1000, // Asegura que esté por encima
         }
    };


    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose} // Cierra al hacer clic fuera o presionar Esc
            //style={customStyles} // Aplica estilos base
             // Usa clases CSS para más control (recomendado)
             overlayClassName="ReactModal__Overlay" // Nombre de clase base para overlay
             className="ModalContent" // Nombre de clase base para contenido
            contentLabel={`Preferencias para ${activity?.name}`} // Para accesibilidad
        >
            <div className="ModalHeader">
                <h2 className="ModalTitle">Preferencias para "{activity?.name}"</h2>
                <button onClick={onClose} className="CloseButton">×</button>
            </div>

            <form onSubmit={handleSubmit} className="ModalForm">
                {/* Grupo Temperatura */}
                <div className="FormGroup">
                    <label htmlFor="minTemp" className="FormLabel">Temp. Mínima (°C)</label>
                    <input type="number" id="minTemp" value={minTemp} onChange={e => setMinTemp(e.target.value)} className="FormInput" />
                </div>
                <div className="FormGroup">
                    <label htmlFor="maxTemp" className="FormLabel">Temp. Máxima (°C)</label>
                    <input type="number" id="maxTemp" value={maxTemp} onChange={e => setMaxTemp(e.target.value)} className="FormInput" />
                </div>

                 {/* Grupo Viento */}
                <div className="FormGroup">
                    <label htmlFor="maxWind" className="FormLabel">Viento Máx (km/h)</label>
                    <input type="number" id="maxWind" value={maxWind} onChange={e => setMaxWind(e.target.value)} className="FormInput" min="0"/>
                </div>

                 {/* Grupo UV */}
                 <div className="FormGroup">
                    <label htmlFor="maxUv" className="FormLabel">Índice UV Máx</label>
                    <input type="number" id="maxUv" value={maxUv} onChange={e => setMaxUv(e.target.value)} className="FormInput" min="0" max="15"/>
                </div>


                {/* Grupo Precipitación */}
                <div className="FormGroup">
                    <label htmlFor="maxPrecipProb" className="FormLabel">Prob. Precip. Máx (%)</label>
                    <input type="number" id="maxPrecipProb" value={maxPrecipProb} onChange={e => setMaxPrecipProb(e.target.value)} className="FormInput" min="0" max="100"/>
                </div>
                 <div className="FormGroup">
                    <label htmlFor="maxPrecipIntensity" className="FormLabel">Int. Precip. Máx (mm/h)</label>
                    <input type="number" step="0.1" id="maxPrecipIntensity" value={maxPrecipIntensity} onChange={e => setMaxPrecipIntensity(e.target.value)} className="FormInput" min="0" />
                </div>

                 {/* Checkboxes */}
                 <div className="FormGroup" style={{ gridColumn: 'span 2' }}> {/* Ocupa 2 columnas */}
                    <div className="FormCheckboxGroup">
                        <input type="checkbox" id="noPrecip" checked={noPrecip} onChange={e => setNoPrecip(e.target.checked)} className="FormCheckbox"/>
                        <label htmlFor="noPrecip" className="FormLabel">¿Requiere que NO llueva/nieve?</label>
                    </div>
                 </div>
                  <div className="FormGroup" style={{ gridColumn: 'span 2' }}>
                    <div className="FormCheckboxGroup">
                        <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="FormCheckbox"/>
                        <label htmlFor="isActive" className="FormLabel">¿Marcar como activa para notificaciones/agenda?</label>
                    </div>
                </div>


                {error && <p className="ModalError" style={{ gridColumn: 'span 2' }}>{error}</p>}

                <div className="ModalActions" style={{ gridColumn: 'span 2' }}>
                    <button type="button" onClick={onClose} className="ModalButton ModalButtonSecondary" disabled={isLoading}>
                        Cancelar
                    </button>
                    <button type="submit" className="ModalButton ModalButtonPrimary" disabled={isLoading}>
                        {isLoading ? 'Guardando...' : 'Guardar Preferencias'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}