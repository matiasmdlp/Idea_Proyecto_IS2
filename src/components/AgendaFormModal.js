// components/AgendaFormModal.js
import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import commonModalStyles from './ModalStyles.css'; // Estilos comunes

// Modal.setAppElement ya debería estar configurado

export default function AgendaFormModal({ isOpen, onClose, onEventSaved, availableActivities, initialEventData }) {
    const isEditing = !!initialEventData?.id;
    console.log("DEBUG [AgendaFormModal]: isEditing =", isEditing, "initialEventData =", initialEventData);
    // Estado del formulario
    const [activityId, setActivityId] = useState('');
    const [fecha, setFecha] = useState('');
    const [horaInicio, setHoraInicio] = useState('');
    const [horaFin, setHoraFin] = useState('');
    const [locationLat, setLocationLat] = useState('');
    const [locationLon, setLocationLon] = useState('');
    const [notes, setNotes] = useState('');

    const [locationQuery, setLocationQuery] = useState(''); // Input para ciudad/dirección
    const [resolvedLocation, setResolvedLocation] = useState(null); // { lat, lon, name }
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [geocodeError, setGeocodeError] = useState(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

     // Resetea el formulario al abrir/cerrar
     useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                // Pre-fill for editing
                console.log("Pre-filling Agenda Modal for Edit:", initialEventData);
                setActivityId(initialEventData.activityId || '');
                setFecha(initialEventData.fecha || ''); // Fecha ya viene YYYY-MM-DD
                // Hora viene HH:MM:SS de la API, necesita HH:MM para input
                setHoraInicio(initialEventData.horaInicio?.substring(0, 5) || '');
                setHoraFin(initialEventData.horaFin?.substring(0, 5) || '');
                setNotes(initialEventData.notes || '');
                // Location: No pre-llenamos query, pero guardamos coords si existen
                setLocationQuery(''); // Reset query field
                setResolvedLocation(
                    (initialEventData.locationLatitude && initialEventData.locationLongitude)
                        ? { lat: parseFloat(initialEventData.locationLatitude), lon: parseFloat(initialEventData.locationLongitude), name: 'Ubicación guardada' }
                        : null
                );
                // Reset reminder state if implemented
            } else {
                // Reset for new event
                setActivityId('');
                setFecha(new Date().toISOString().split('T')[0]); // Default a hoy
                setHoraInicio('');
                setHoraFin('');
                setNotes('');
                setLocationQuery('');
                setResolvedLocation(null);
                // Reset reminder state
            }
            // Reset errors and loading state
            setError(null);
            setGeocodeError(null);
            setIsLoading(false);
            setIsGeocoding(false);
        }
    }, [isOpen, initialEventData, isEditing]); 

     const handleGeocodeLookup = async () => {
        if (!locationQuery.trim()) {
            setResolvedLocation(null); // Limpia si el input está vacío
            setGeocodeError(null);
            return;
        }
        setIsGeocoding(true);
        setGeocodeError(null);
        setResolvedLocation(null); // Limpia resultado anterior

        try {
            const response = await fetch(`/api/weather/geocode?city=${encodeURIComponent(locationQuery.trim())}`);
            const data = await response.json();

            if (!response.ok || !Array.isArray(data) || data.length === 0) {
                throw new Error(data.message || `No se encontró la ubicación "${locationQuery}"`);
            }
            // Tomamos el primer resultado
            const firstResult = data[0];
            console.log("Geocode result:", firstResult);
            setResolvedLocation({
                lat: firstResult.lat,
                lon: firstResult.lon,
                // Intenta obtener un nombre más descriptivo si es posible
                name: firstResult.display_name || firstResult.name || locationQuery
            });

        } catch (err) {
             console.error("Geocoding error:", err);
             setGeocodeError(err.message);
             setResolvedLocation(null); // Asegura limpiar en error
        } finally {
             setIsGeocoding(false);
        }
     };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setGeocodeError(null);

        // Validación simple
        if (!activityId || !fecha || !horaInicio || !horaFin) {
            setError('Por favor, completa todos los campos de actividad, fecha y hora.');
            setIsLoading(false);
            return;
        }
        if (horaFin <= horaInicio) {
            setError('La hora de fin debe ser posterior a la hora de inicio.');
            setIsLoading(false);
            return;
        }
        // Validación más robusta de lat/lon si se ingresan
         if ((locationLat && !locationLon) || (!locationLat && locationLon)) {
              setError('Debes ingresar Latitud y Longitud juntas, o ninguna.');
              setIsLoading(false);
              return;
         }
         if (locationLat && (isNaN(parseFloat(locationLat)) || parseFloat(locationLat) < -90 || parseFloat(locationLat) > 90)) {
              setError('Latitud inválida. Debe ser un número entre -90 y 90.');
              setIsLoading(false);
              return;
         }
         if (locationLon && (isNaN(parseFloat(locationLon)) || parseFloat(locationLon) < -180 || parseFloat(locationLon) > 180)) {
             setError('Longitud inválida. Debe ser un número entre -180 y 180.');
             setIsLoading(false);
             return;
         }


         const isEditing = !!initialEventData?.id;
         const apiUrl = isEditing ? `/api/agenda/${initialEventData.id}` : '/api/agenda';
         const apiMethod = isEditing ? 'PUT' : 'POST'; // <-- ASEGÚRATE DE ESTO
         console.log(`Submitting to ${apiMethod} ${apiUrl}`);

         const eventData = {
            activityId,
            fecha,
            horaInicio,
            horaFin,
            notes,
            // Pasa las coordenadas resueltas si las hay
            locationLatitude: resolvedLocation ? resolvedLocation.lat : null,
            locationLongitude: resolvedLocation ? resolvedLocation.lon : null,
            // Podríamos pasar también resolvedLocation.name si quisiéramos guardarlo
        };



        console.log(`Submitting to ${apiMethod} ${apiUrl} with data:`, eventData);

        try {
            const response = await fetch(apiUrl, {
                method: apiMethod,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData),
                credentials: 'include' // Importante para enviar cookies de sesión
            });
            const result = await response.json(); // Intenta parsear siempre
            if (!response.ok) { throw new Error(result.message || `Error ${response.status}`); }
            console.log("API call successful:", result);
            onEventSaved(result); // Pasa el evento guardado/actualizado al padre
            onClose();            // Cierra el modal
        } catch (err) {
            console.error(`Error ${isEditing ? 'updating' : 'saving'} event:`, err);
            setError(err.message); // Muestra error en el modal
        } finally {
            setIsLoading(false);
        }setIsLoading(false);
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            overlayClassName="ReactModal__Overlay"
            className="ModalContent"
            contentLabel={isEditing ? 'Editar Evento' : 'Agendar Actividad'}
        >
            <div className="ModalHeader">
                <h2 className="ModalTitle">{isEditing ? 'Editar Evento Agendado' : 'Agendar Actividad'}</h2>
                <button onClick={onClose} className="CloseButton" disabled={isLoading}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="ModalForm">
                {/* Selección de Actividad */}
                <div className="FormGroup" style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="agendaActivity" className="FormLabel">Actividad *</label>
                    <select id="agendaActivity" value={activityId} onChange={e => setActivityId(e.target.value)} required className="FormSelect" disabled={isLoading}>
                        <option value="" disabled>-- Selecciona --</option>
                        {/* Separa estándar y personal si quieres */}
                        <optgroup label="Sugeridas">
                            {availableActivities.filter(a => a.userId === null).map(act => (
                                <option key={act.id} value={act.id}>{act.name}</option>
                            ))}
                        </optgroup>
                        <optgroup label="Personales">
                             {availableActivities.filter(a => a.userId !== null).map(act => (
                                <option key={act.id} value={act.id}>{act.name}</option>
                            ))}
                        </optgroup>
                    </select>
                </div>

                {/* Fecha y Horas */}
                <div className="FormGroup">
                    <label htmlFor="agendaDate" className="FormLabel">Fecha *</label>
                    <input type="date" id="agendaDate" value={fecha} onChange={e => setFecha(e.target.value)} required className="FormInput" disabled={isLoading} />
                </div>
                 <div className="FormGroup"></div> {/* Placeholder para alinear grid */}

                 <div className="FormGroup">
                    <label htmlFor="agendaStartTime" className="FormLabel">Hora Inicio *</label>
                    <input type="time" id="agendaStartTime" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} required className="FormInput" disabled={isLoading} />
                </div>
                 <div className="FormGroup">
                    <label htmlFor="agendaEndTime" className="FormLabel">Hora Fin *</label>
                    <input type="time" id="agendaEndTime" value={horaFin} onChange={e => setHoraFin(e.target.value)} required className="FormInput" step="1800" />
                </div>

                {/* Ubicación Opcional */}
                 <hr style={{ gridColumn: 'span 2', border: 'none', borderTop: '1px solid #eee', margin: '1rem 0' }} />
                 <h3 style={{ gridColumn: 'span 2', fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 500 }}>Ubicación (Opcional)</h3>

                 <div className="FormGroup" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                     <div style={{ flexGrow: 1 }}>
                        <label htmlFor="agendaLocation" className="FormLabel">Ciudad o Dirección</label>
                        <input
                            type="text"
                            id="agendaLocation"
                            value={locationQuery}
                            onChange={e => {setLocationQuery(e.target.value); setResolvedLocation(null); setGeocodeError(null);}} // Limpia resultado al escribir
                            className="FormInput"
                            placeholder="Ej: Valparaíso, Chile / Plaza Italia"
                            disabled={isGeocoding || isLoading}
                        />
                     </div>
                     <button
                        type="button"
                        onClick={handleGeocodeLookup}
                        className="ModalButton ModalButtonSecondary" // Reutiliza estilo
                        disabled={!locationQuery.trim() || isGeocoding || isLoading}
                        style={{ height: 'fit-content', padding: '0.6rem 1rem', marginBottom:'1px'}} // Ajusta altura
                     >
                         {isGeocoding ? 'Buscando...' : 'Verificar'}
                     </button>
                </div>
                 {/* Muestra error o resultado de geocoding */}
                 <div style={{ gridColumn: 'span 2', minHeight: '20px', marginTop: '-0.5rem' }}>
                     {geocodeError && <small style={{ color: '#dc3545' }}>{geocodeError}</small>}
                     {resolvedLocation && !geocodeError && (
                         <small style={{ color: '#198754' }}>
                             ✓ Usando: {resolvedLocation.name} ({resolvedLocation.lat.toFixed(4)}, {resolvedLocation.lon.toFixed(4)})
                         </small>
                     )}
                      {!resolvedLocation && !geocodeError && !isGeocoding && locationQuery && (
                          <small style={{ color: '#6c757d' }}>Haz clic en Verificar para confirmar la ubicación.</small>
                      )}
                       {!resolvedLocation && !geocodeError && !locationQuery && (
                          <small style={{ color: '#6c757d' }}>Si dejas la ubicación vacía, se usará tu ubicación por defecto.</small>
                      )}
                 </div>

                 {/* Notas */}
                  <hr style={{ gridColumn: 'span 2', border: 'none', borderTop: '1px solid #eee', margin: '1rem 0' }} />
                 <div className="FormGroup" style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="agendaNotes" className="FormLabel">Notas (Opcional)</label>
                    <textarea id="agendaNotes" value={notes} onChange={e => setNotes(e.target.value)} className="FormTextarea" rows={3}></textarea>
                 </div>

                 {/* TODO: Añadir campos para Reminder aquí si se implementa */}


                {error && <p className="ModalError" style={{ gridColumn: 'span 2' }}>{error}</p>}

                {/* Acciones */}
                <div className="ModalActions" style={{ gridColumn: 'span 2' }}>
                    <button type="button" onClick={onClose} className="ModalButton ModalButtonSecondary" disabled={isLoading}>Cancelar</button>
                    <button type="submit" className="ModalButton ModalButtonPrimary" disabled={isLoading}>
                        {isLoading ? (isEditing ? 'Guardando...' : 'Agendando...') : (isEditing ? 'Guardar Cambios' : 'Agendar Actividad')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}