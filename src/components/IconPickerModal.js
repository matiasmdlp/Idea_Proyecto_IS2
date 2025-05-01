import React, { useState, useEffect, useMemo } from 'react';
import Modal from 'react-modal';
import commonModalStyles from './ModalStyles.css'; // Reutiliza estilos comunes
import styles from '@/styles/IconPicker.module.css'; // Crea este archivo CSS

// --- LISTA DE ICONOS ---
// IMPORTANTE: Necesitas una lista de los nombres de los Material Icons.
// Opción A: Hardcodear una lista (más fácil para empezar, difícil de mantener)
// Opción B: Encontrar una fuente JSON/API (ideal pero puede no existir fácilmente)
// Opción C: Extraerla de algún paquete (si usas una librería de componentes que los tenga)
// Para este ejemplo, usaremos una lista CORTA hardcodeada. ¡Reemplázala con una completa!
const MATERIAL_ICONS_LIST = [
    'home', 'search', 'settings', 'done', 'delete', 'add', 'edit', 'menu',
    'close', 'person', 'group', 'notifications', 'email', 'location_on',
    'schedule', 'calendar_today', 'cloud', 'wb_sunny', 'nights_stay',
    'directions_run', 'hiking', 'fitness_center', 'restaurant', 'local_cafe',
    'shopping_cart', 'attach_money', 'bar_chart', 'pie_chart', 'warning',
    'error', 'info', 'help_outline', 'category', 'flag', 'pets', 'eco',
    'directions_bike', 'directions_car', 'flight', 'train', 'work', 'build',
    'science', 'school', 'book', 'music_note', 'movie', 'sports_esports',
    'brush', 'palette', 'favorite', 'star', 'thumb_up', 'lightbulb',
    // --- AÑADE MUCHOS MÁS ICONOS AQUÍ ---
];

// Asegúrate de que Modal.setAppElement esté configurado en _app.js o similar
// Modal.setAppElement('#__next');

export default function IconPickerModal({ isOpen, onClose, onIconSelect, currentIconName }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredIcons, setFilteredIcons] = useState(MATERIAL_ICONS_LIST);

    // Filtrar iconos cuando cambia el término de búsqueda
    useEffect(() => {
        if (!searchTerm) {
            setFilteredIcons(MATERIAL_ICONS_LIST);
        } else {
            const lowerCaseSearch = searchTerm.toLowerCase();
            setFilteredIcons(
                MATERIAL_ICONS_LIST.filter(iconName =>
                    iconName.toLowerCase().includes(lowerCaseSearch)
                )
            );
        }
    }, [searchTerm]);

    // Resetear búsqueda al abrir
    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    const handleSelect = (iconName) => {
        onIconSelect(iconName); // Llama al callback del padre
        onClose(); // Cierra este modal
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            overlayClassName="ReactModal__Overlay"
            className="ModalContent" // Puedes usar una clase más específica si quieres
            contentLabel="Seleccionar Icono"
            style={{ content: { maxWidth: '800px' } }} // Ejemplo de estilo para ancho
        >
            <div className="ModalHeader">
                <h2 className="ModalTitle">Seleccionar Icono</h2>
                <button onClick={onClose} className="CloseButton">×</button>
            </div>

            <div className={styles.pickerContainer}>
                <input
                    type="search"
                    placeholder="Buscar icono por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                />

                <div className={styles.iconGrid}>
                    {filteredIcons.length > 0 ? (
                        filteredIcons.map(iconName => (
                            <button
                                key={iconName}
                                className={`${styles.iconButton} ${iconName === currentIconName ? styles.selected : ''}`}
                                onClick={() => handleSelect(iconName)}
                                title={iconName}
                                type="button" // Importante para que no envíe el form padre
                            >
                                <span className="material-icons">{iconName}</span>
                                {/* Opcional: mostrar nombre debajo */}
                                {/* <span className={styles.iconNameLabel}>{iconName}</span> */}
                            </button>
                        ))
                    ) : (
                        <p>No se encontraron iconos.</p>
                    )}
                </div>
            </div>
        </Modal>
    );
}