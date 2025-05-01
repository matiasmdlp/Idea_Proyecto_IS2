// components/NewActivityModal.js
import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { getSession } from 'next-auth/react';
import commonModalStyles from './ModalStyles.css';
import IconPickerModal from './IconPickerModal'; // <-- Importar
import activityModalStyles from '@/styles/Activities.module.css'; 

// Modal.setAppElement ya debería estar configurado

// Helpers de parseo (puedes ponerlos en un archivo utils si quieres)
const parseNullableInt = (value) => (value === null || value === undefined || value === '') ? null : parseInt(value, 10);
const parseNullableFloat = (value) => (value === null || value === undefined || value === '') ? null : parseFloat(value);


export default function NewActivityModal({ isOpen, onClose, onActivityCreated, initialData }) {
    // Estado para los detalles de la actividad
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [iconName, setIconName] = useState(''); // Puedes usar un selector de iconos aquí

    // Estado para las preferencias iniciales
    const [minTemp, setMinTemp] = useState('');
    const [maxTemp, setMaxTemp] = useState('');
    const [maxWind, setMaxWind] = useState('');
    const [maxPrecipProb, setMaxPrecipProb] = useState('');
    const [maxPrecipIntensity, setMaxPrecipIntensity] = useState('');
    const [noPrecip, setNoPrecip] = useState(false);
    const [maxUv, setMaxUv] = useState('');
    const [isActive, setIsActive] = useState(true); // Activa por defecto

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

     // Limpia el formulario cuando se cierra o abre
     useEffect(() => {
        if (isOpen) {
            if (initialData) { // Si se proporcionan datos iniciales (copiando)
                console.log("Pre-filling NewActivityModal with:", initialData);
                setName(initialData.name || '');
                setDescription(initialData.description || '');
                setIconName(initialData.iconName || '');
                // NO pre-llenamos las preferencias, el usuario las define para su copia
                setMinTemp('');
                setMaxTemp('');
                setMaxWind('');
                setMaxPrecipProb('');
                setMaxPrecipIntensity('');
                setNoPrecip(false);
                setMaxUv('');
                setIsActive(true); // O podrías copiar initialData.isActive si tuviera sentido
            } else { // Si se abre para crear desde cero
                console.log("Resetting NewActivityModal for new entry");
                setName('');
                setDescription('');
                setIconName('');
                setMinTemp('');
                setMaxTemp('');
                setMaxWind('');
                setMaxPrecipProb('');
                setMaxPrecipIntensity('');
                setNoPrecip(false);
                setMaxUv('');
                setIsActive(true);
            }
            setError(null); // Limpia errores al abrir
            setIsLoading(false); // Resetea estado de carga
            setIsIconPickerOpen(false);
        }
        // No hacemos nada si isOpen es false (no reseteamos al cerrar)
    }, [isOpen, initialData]); // Depende de ambos


    const handleIconSelected = (selectedIconName) => {
        setIconName(selectedIconName);
        // No necesitamos cerrar el picker aquí, lo hace él mismo
        // setIsIconPickerOpen(false);
    };

    const handleSubmit = async (e) => {
        console.log("--- handleSubmit triggered! ---");
        e.preventDefault();
        

        const sessionCheck = await getSession(); // Llama a la función importada
        console.log("DEBUG: Client-side session check before POST:", sessionCheck);
        if (!sessionCheck) {
            setError("Tu sesión parece haber expirado. Por favor, refresca la página e intenta de nuevo.");
            setIsLoading(false); // Detiene el loading si hay error de sesión
            return;
        }// Aquí puedes agregar la lógica para enviar los datos a tu API o backend

        setIsLoading(true);
        setError(null);

        
        //const response = await fetch('/api/preferences', { // o /api/activities
        //    method: 'POST',
        //    headers: { 'Content-Type': 'application/json' },
        //    body: JSON.stringify({ /* ... data ... */ }),
        //    credentials: 'include' // <--- AÑADIR ESTO
        //});

        if (!name.trim()) {
            setError('El nombre de la actividad es obligatorio.');
            setIsLoading(false);
            return;
        }

        // Prepara el objeto de preferencias iniciales
        const initialPreferences = {
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
        if (initialPreferences.minTemp !== null && initialPreferences.maxTemp !== null && initialPreferences.minTemp > initialPreferences.maxTemp) {
             setError('La temperatura mínima no puede ser mayor que la máxima.');
             setIsLoading(false);
             return;
        }

        

        try {
            const response = await fetch('/api/activities', { // Llama a la API de actividades
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || null,
                    iconName: iconName.trim() || null, // Asegúrate que sea un nombre de icono válido
                    preferences: initialPreferences // Envía el objeto anidado
                }),
                credentials: 'include'
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Error al crear la actividad');
            }

            onActivityCreated(result); // Llama al callback con { activity, preference }
            onClose(); // Cierra el modal

        } catch (err) {
            console.error("Error creating activity:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            overlayClassName="ReactModal__Overlay"
            className="ModalContent"
            contentLabel={initialData ? `Crear Copia de "${initialData.name}"` : "Crear Nueva Actividad Personalizada"}
        >
            <div className="ModalHeader">
                <h2 className="ModalTitle">{initialData ? `Personalizar "${initialData.name}"` : "Crear Nueva Actividad"}</h2>
                <button onClick={onClose} className="CloseButton">×</button>
            </div>

            {/* Usamos un div como contenedor del form para poder aplicar scroll si es necesario */}
             {/* El grid se aplica directamente al form */}
            <form onSubmit={handleSubmit} className="ModalForm">

                 {/* Detalles de la Actividad */}
                 <div className="FormGroup" style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="activityName" className="FormLabel">Nombre Actividad *</label>
                    <input type="text" id="activityName" value={name} onChange={e => setName(e.target.value)} className="FormInput" required />
                 </div>
                 <div className="FormGroup" style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="activityDesc" className="FormLabel">Descripción (Opcional)</label>
                    <textarea id="activityDesc" value={description} onChange={e => setDescription(e.target.value)} className="FormTextarea" rows={2}></textarea>
                 </div>
                 <div className="FormGroup" style={{ gridColumn: 'span 2' }}>
                    <label className="FormLabel" style={{ display: 'block', marginBottom: '5px' }}>Icono</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                            className="material-icons"
                            style={{
                                fontSize: '2.5rem', // Emparejar con el tamaño en el picker
                                padding: '10px',
                                backgroundColor: '#eee',
                                borderRadius: '4px',
                                minWidth: '60px', // Para que tenga tamaño aunque no haya icono
                                textAlign: 'center'
                             }}
                        >
                            {iconName || 'category'} {/* Muestra icono seleccionado o uno default */}
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsIconPickerOpen(true)}
                            className="ModalButton ModalButtonSecondary" // Reutilizar estilo
                            disabled={isLoading}
                        >
                            {iconName ? 'Cambiar Icono' : 'Seleccionar Icono'}
                        </button>
                    </div>
                     {/* Muestra el nombre seleccionado para información (opcional) */}
                     {iconName && <small style={{ marginTop: '5px', display: 'block', color: '#555' }}>Seleccionado: {iconName}</small>}
                </div>

                
                <IconPickerModal
                    isOpen={isIconPickerOpen}
                    onClose={() => setIsIconPickerOpen(false)}
                    onIconSelect={handleIconSelected}
                    currentIconName={iconName} // Pasa el icono actual para resaltarlo
                />


                {/* Separador Visual (Opcional) */}
                <hr style={{ gridColumn: 'span 2', border: 'none', borderTop: '1px solid #eee', margin: '1rem 0' }} />
                <h3 style={{ gridColumn: 'span 2', fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 500 }}>Preferencias Iniciales</h3>


                 {/* Preferencias (copiar/pegar campos de PreferencesFormModal) */}
                 {/* Grupo Temperatura */}
                <div className="FormGroup">
                    <label htmlFor="newMinTemp" className="FormLabel">Temp. Mínima (°C)</label>
                    <input type="number" id="newMinTemp" value={minTemp} onChange={e => setMinTemp(e.target.value)} className="FormInput" />
                </div>
                <div className="FormGroup">
                    <label htmlFor="newMaxTemp" className="FormLabel">Temp. Máxima (°C)</label>
                    <input type="number" id="newMaxTemp" value={maxTemp} onChange={e => setMaxTemp(e.target.value)} className="FormInput" />
                </div>
                 {/* Grupo Viento */}
                <div className="FormGroup">
                    <label htmlFor="newMaxWind" className="FormLabel">Viento Máx (km/h)</label>
                    <input type="number" id="newMaxWind" value={maxWind} onChange={e => setMaxWind(e.target.value)} className="FormInput" min="0"/>
                </div>
                 {/* Grupo UV */}
                 <div className="FormGroup">
                    <label htmlFor="newMaxUv" className="FormLabel">Índice UV Máx</label>
                    <input type="number" id="newMaxUv" value={maxUv} onChange={e => setMaxUv(e.target.value)} className="FormInput" min="0" max="15"/>
                </div>
                {/* Grupo Precipitación */}
                <div className="FormGroup">
                    <label htmlFor="newMaxPrecipProb" className="FormLabel">Prob. Precip. Máx (%)</label>
                    <input type="number" id="newMaxPrecipProb" value={maxPrecipProb} onChange={e => setMaxPrecipProb(e.target.value)} className="FormInput" min="0" max="100"/>
                </div>
                 <div className="FormGroup">
                    <label htmlFor="newMaxPrecipIntensity" className="FormLabel">Int. Precip. Máx (mm/h)</label>
                    <input type="number" step="0.1" id="newMaxPrecipIntensity" value={maxPrecipIntensity} onChange={e => setMaxPrecipIntensity(e.target.value)} className="FormInput" min="0" />
                </div>
                 {/* Checkboxes */}
                 <div className="FormGroup" style={{ gridColumn: 'span 2' }}>
                    <div className="FormCheckboxGroup">
                        <input type="checkbox" id="newNoPrecip" checked={noPrecip} onChange={e => setNoPrecip(e.target.checked)} className="FormCheckbox"/>
                        <label htmlFor="newNoPrecip" className="FormLabel">¿Requiere que NO llueva/nieve?</label>
                    </div>
                 </div>
                  <div className="FormGroup" style={{ gridColumn: 'span 2' }}>
                    <div className="FormCheckboxGroup">
                        <input type="checkbox" id="newIsActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="FormCheckbox"/>
                        <label htmlFor="newIsActive" className="FormLabel">¿Marcar como activa por defecto?</label>
                    </div>
                </div>


                {error && <p className="ModalError" style={{ gridColumn: 'span 2' }}>{error}</p>}

                <div className="ModalActions" style={{ gridColumn: 'span 2' }}>
                    <button type="button" onClick={onClose} className="ModalButton ModalButtonSecondary" disabled={isLoading}>
                        Cancelar
                    </button>
                    <button type="submit" className="ModalButton ModalButtonPrimary" disabled={isLoading}>
                        {isLoading ? (initialData ? 'Guardando...' : 'Creando...') : (initialData ? 'Guardar Copia Personalizada' : 'Crear Actividad')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}