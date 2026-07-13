# Changelog

Todos los cambios importantes de este proyecto serán documentados aquí.

Este proyecto sigue Semantic Versioning.

---

## [2.1.0] - 2026-07-13

Esta versión mejora significativamente la experiencia del dashboard, incorporando un sistema de organización de accesos directos mediante Drag & Drop, una nueva arquitectura de orden global, mejoras visuales en el widget del clima y una interfaz más limpia y consistente.

### Added

- Reordenamiento de ShortcutCards mediante Drag & Drop.
- Persistencia del orden global de los accesos directos.
- Reorganización de accesos entre categorías.
- Creación automática de la categoría "General" como categoría por defecto para nuevos accesos.
- Imágenes representativas del estado del clima.

### Changed

- Refactor completo del modelo de orden de ShortcutCards.
- La categoría ahora funciona únicamente como un filtro de visualización.
- Se eliminó la Search Bar del dashboard principal.
- Se simplificó el panel de Settings eliminando opciones innecesarias.
- Se rediseñó el widget de accesos directos para soportar Drag & Drop.
- Se optimizó la distribución del dashboard para aprovechar mejor el espacio.
- Se redujo el tamaño de las tarjetas y de sus etiquetas para mostrar más accesos.
- Se tradujo completamente la interfaz al español.
- Se mejoró el widget del clima con geolocalización más robusta y mejor presentación.

### Fixed

- Corregido el desfase entre el cursor y el elemento arrastrado durante el Drag & Drop.
- Corregida la persistencia del orden de los ShortcutCards.
- Corregido el comportamiento del Drag & Drop entre categorías.
- Corregido el manejo de accesos directos sin categoría.
- Corregidos diversos problemas de UX relacionados con el widget de accesos directos.

---

## [2.0.0] - 2026-07-10

### Added

- Nuevo sistema de widgets.
- Glassmorphism.
- Calendario.
- Reloj.
- Motor de búsqueda.
- Command Palette.
- Temas.
- Fondos personalizados.

### Changed

- Nuevo Layout Engine.
- Nuevo sistema de almacenamiento.

### Fixed

- Persistencia de configuración.
- Correcciones de renderizado.
