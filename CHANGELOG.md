# Changelog

Todos los cambios importantes de este proyecto serán documentados aquí.

Este proyecto sigue Semantic Versioning.

---

## [Unreleased]

### Added

- Cuentas reales (usuario/contraseña) con sesión persistente en cookie
  `HttpOnly`, backend Fastify + SQLite y configuración por cuenta.
- Importación automática de la configuración local del navegador a la cuenta
  en el primer inicio de sesión.
- Motor de sincronización de configuración: una escritura en vuelo a la vez,
  reintento con backoff y estado visible cuando algo no se pudo guardar.
- Control de concurrencia por revisión (`ETag`/`If-Match`): si otra pestaña
  guardó primero, se avisa en lugar de sobrescribir.
- Migraciones de esquema versionadas, con comandos `migrate` y
  `migrate:check` y versión visible en `/healthz`.
- `npm run verify`: lint, typecheck, pruebas y build de ambos workspaces, y
  workflow de CI que lo ejecuta.

### Changed

- Despliegue solo por HTTPS: Traefik publica un router TLS y redirige el
  tráfico HTTP. Con `NODE_ENV=production` el backend no arranca si la cookie
  de sesión no es `Secure`.
- Las URLs se validan contra una lista explícita de protocolos
  (`https:`/`http:`/`mailto:`) en el editor, en la reparación de la
  configuración guardada y en el backend.
- Los iconos guardan un identificador en lugar de marcado SVG.
- La suite E2E aísla identidad y configuración por worker.

### Removed

- Proveedor de iconos `custom-svg`, que persistía SVG arbitrario.
- Dependencia `fastify-type-provider-zod` (sin consumidores) y los artefactos
  compilados versionados en `server/test/`.

### Fixed

- Una configuración pendiente de guardar ya no puede escribirse en la cuenta
  del siguiente usuario tras cerrar sesión.
- Los fallos de persistencia dejan de descartarse en silencio.
- Cerrar sesión guarda el último cambio en lugar de perderlo.

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
