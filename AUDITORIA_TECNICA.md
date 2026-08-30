# 1. Executive Summary

El proyecto está en una buena base técnica: React/TypeScript estricto, Fastify/SQLite, autenticación por sesión, aislamiento de datos por usuario, Docker multi-stage y una batería amplia de pruebas unitarias e integración. No recomiendo reescribirlo.

La deuda principal se concentra en el límite entre estado síncrono del frontend y persistencia remota asíncrona. `RemoteStorageProvider` puede perder cambios, sobrescribir cambios más nuevos y, al cerrar sesión/cambiar de cuenta rápidamente, intentar guardar la configuración de la cuenta anterior usando la sesión actual.

No encontré una vulnerabilidad crítica demostrable en el código. Sí hay un riesgo alto de transporte inseguro según la configuración de despliegue por defecto: Compose publica un router Traefik HTTP y permite `COOKIE_SECURE=false`.

Validaciones ejecutadas:

- `npm run lint` ✅
- `npm run build` ✅, con 18 advertencias de imports dinámicos inefectivos.
- Frontend: 44 archivos / 372 pruebas ✅
- Backend: 7 archivos / 35 pruebas ✅
- `npm run typecheck --workspace=server` ✅
- E2E: no quedó verde. La ejecución registró fallos por expectativas obsoletas y no produjo un resumen final completo.

# 2. Architecture Assessment

```text
React/Vite
  main.tsx → registro de plugins y fuentes de búsqueda
  App → AuthProvider → AuthGate → Dashboard/AppShell
  AppShell → Theme / Plugin / Workspace / Settings / Search providers
  servicios → configStore → StorageProvider local o remoto

Nginx (/api/*) → Fastify
  auth routes → sesiones SQLite
  dashboard routes → JSON de configuración por usuario
```

La separación frontend/backend es apropiada para un dashboard personal multiusuario. El backend es deliberadamente pequeño y usa consultas parametrizadas; el frontend tiene servicios puros razonablemente testeables.

El punto débil es que `configStore` conserva una API síncrona global, pero tras autenticación escribe por red de forma diferida. Eso reparte la propiedad de la configuración entre providers, servicios, hooks y un `eventBus`, sin un modelo explícito de sincronización, conflictos o errores.

# 3. Technical Debt Inventory

| ID | Severidad | Área | Ubicación | Problema | Impacto | Esfuerzo |
|---|---|---|---|---|---|---|
| TD-01 | ALTO* | Seguridad/deploy | `docker-compose.yml`, `.env.example` | HTTP y cookie no `Secure` por defecto | Posible robo de sesión si el host es accesible sin TLS | Bajo |
| TD-02 | ALTO | Persistencia | `RemoteStorageProvider.ts`, `AuthProvider.tsx` | Providers remotos no se cancelan ni destruyen al logout | Configuración de A puede guardarse en B | Medio |
| TD-03 | ALTO | Persistencia | RemoteStorageProvider, rutas `/dashboard` | Escrituras “fire-and-forget”, sin secuenciación, reintento ni versión | Pérdida o reversión silenciosa de cambios | Alto |
| TD-04 | MEDIO | Testing | `playwright.config.ts`, `tests/e2e/*` | E2E comparte usuario/configuración mutable y contiene expectativas antiguas | Suite no confiable para regresiones | Medio |
| TD-05 | MEDIO | DX/calidad | `eslint.config.js`, `package.json` | El backend está excluido de lint y los checks no están unificados | Riesgos en auth/backend pueden entrar sin gate común | Bajo |
| TD-06 | MEDIO | Validación/XSS | `ShortcutIcon.tsx`, `validation.ts` | SVG se inserta como HTML y cualquier URL absoluta es válida | Superficie de XSS/autoejecución y enlaces inseguros | Medio |
| TD-07 | MEDIO | Documentación | `README.md`, `CLAUDE.md` | Documentación contradice arquitectura y despliegue actuales | Onboarding y operaciones erróneos | Bajo |
| TD-08 | MEDIO | Datos | `server/src/db/migrate.ts` | DDL idempotente, pero sin historial/versionado de migraciones | Evolución de SQLite frágil | Medio |
| TD-09 | MEDIO | Rendimiento | `iconProvider.ts`, `iconResolver.ts` | Imports estáticos y dinámicos de los mismos iconos | Chunk de shortcuts: 330 KB / 89 KB gzip | Medio |
| TD-10 | BAJO | Dependencias/config | `server/package.json`, scripts raíz | `fastify-type-provider-zod` no tiene consumidores; `format` no formatea realmente | Ruido y expectativas incorrectas | Bajo |
| TD-11 | BAJO | Repositorio | `server/test/*.js`, `*.d.ts`, `*.map` | Artefactos compilados de tests están versionados junto a TypeScript | Diffs y conflictos innecesarios | Bajo |
| TD-12 | BAJO | Observabilidad | `server/src/app.ts`, frontend | Hay healthcheck y logs backend, no visibilidad de sync/error frontend | Diagnóstico lento de pérdidas de persistencia | Medio |

\* TD-01 es alto si `dashboard.avalonnova.com` o el host real acepta HTTP sin redirección global a HTTPS. Si Traefik fuerza HTTPS externamente fuera de este repositorio, baja a medio; el repositorio actual no lo demuestra.

# 4. Detailed Findings

## TD-01 — Transporte de sesión inseguro por configuración

`docker-compose.yml` define el router `entrypoints=web`, mientras `.env.example` y Compose permiten `COOKIE_SECURE=false`. La cookie sí tiene `HttpOnly` y `SameSite=Lax`, lo cual está bien, pero no evita su exposición en HTTP.

Recomendación: para producción, configurar explícitamente router TLS/`websecure`, redirección HTTP→HTTPS y exigir `COOKIE_SECURE=true` cuando `NODE_ENV=production`. Haz que valores inválidos como `COOKIE_SECURE=TRUE` fallen, en vez de convertirse silenciosamente en `false`.

Dependencia: ninguna. Tests: prueba de carga de env y prueba de opciones de cookie.

## TD-02 — Fuga de ciclo de vida entre sesiones

Cada login crea un `RemoteStorageProvider`; este instala un listener `pagehide` y timers, pero no expone `dispose()`. En logout solo se cambia el provider activo a local.

Escenario real:

1. Usuario A cambia un widget; queda un `PUT` pendiente.
2. A cierra sesión.
3. Usuario B inicia sesión en el mismo navegador.
4. El timer de A se ejecuta con la cookie de B y escribe configuración de A sobre B.

Recomendación: sustituir la interfaz implícita por una sesión de configuración con `dispose()`/`abort()`, cancelar timers/listeners/in-flight requests al logout y asociar toda escritura a una identidad de sesión.

Complejidad media; depende de TD-03. Añadir pruebas de logout antes del debounce, cambio A→B y `pagehide` tras logout.

## TD-03 — Persistencia sin contrato de consistencia

`RemoteStorageProvider.ts` descarta los fallos de `putDashboard`; tampoco serializa requests. Dos `PUT` pueden llegar al servidor en orden inverso. Además, dos pestañas del mismo usuario hacen “last writer wins” sin aviso.

El flujo de login tiene otro caso peligroso: si `GET /dashboard` falla, `migrateLocalConfig.ts` usa la configuración local y permite continuar. Un cambio posterior puede sobrescribir la configuración remota real cuando la red se recupere.

Recomendación:

- Mantener un estado de sincronización visible: `idle | saving | offline | conflict`.
- Serializar escrituras y conservar “latest desired state”.
- Reintentar con backoff y no descartar el fallo.
- Añadir `revision`/ETag a `dashboard_configs`; `PUT` debe usar precondición y devolver `409` ante conflicto.
- Ante error al hidratar, mostrar estado recuperable/retry; no activar escritura remota contra una configuración no confirmada.

Es el refactor de mayor impacto y debe realizarse antes de mover componentes o providers.

## TD-04 — Suite E2E desactualizada y no aislada

La suite inició 91 casos con seis workers. Se observaron fallos en `accessibilityAndTheme.spec.ts`: busca una barra de búsqueda visible y un toggle de tema directo. El toggle existe, pero dentro de `SettingsDrawer`, no como control inicial del dashboard.

Además, los proyectos Playwright reutilizan la sesión del administrador y el backend `:memory:` compartido. Pruebas paralelas modifican la misma configuración remota. Limpiar `localStorage` no restablece `/dashboard`.

Recomendación: crear usuarios/configuraciones por prueba o un fixture autenticado por worker; resetear el dashboard mediante API de test solamente habilitada en test. Actualizar escenarios a la UI actual antes de usar la suite como gate.

## TD-05 — Gates de calidad incompletos

El ESLint raíz ignora por completo `server`. `npm run build` no compila el backend y `npm test` no corre sus pruebas. No hay workflow CI versionado.

Recomendación: añadir scripts raíz `typecheck`, `test:all`, `build:all`, `lint:all` y un CI mínimo que los ejecute. Incluir server en ESLint o configurar un archivo de lint específico para él.

## TD-06 — Límites de entrada insuficientes

`isValidUrl()` acepta `javascript:`, `data:` y otros esquemas porque solo usa `new URL()`. Los shortcuts se abren con enlaces o `window.open`.

Además, `ShortcutIcon` usa `dangerouslySetInnerHTML` para `custom-svg` y `simple-icons`, mientras el backend acepta cualquier payload con `{ version: number }`. Hoy no hay UI para authoring de SVG, por lo que no es un XSS explotable por una ruta normal de usuario; pero la capacidad y la persistencia ya existen.

Recomendación: aceptar explícitamente `https:` y, si se desea, `http:`/`mailto:`. No renderizar SVG arbitrario: eliminar `custom-svg` hasta implementar sanitización robusta, o almacenar solo identificadores de iconos permitidos.

## TD-07 — Documentación no es fuente confiable

El README indica que Compose se visita en `http://<host>:8080`, aunque Compose no publica ese puerto. También describe búsqueda visible y estructura anterior. `CLAUDE.md` declara que no hay backend y que la feature activa es la primera especificación.

No eliminar `ThemeToggle`, `DateTime` ni `WeatherSummary`: están consumidos actualmente por secciones/widgets. El legacy aquí es documental y de pruebas, no esos componentes.

## TD-08 / TD-09 — Evolución y rendimiento

La migración actual solo crea tablas. Es adecuada para el primer esquema, pero no para alteraciones futuras. Introducir una tabla `schema_migrations` antes de cambiar el modelo.

El build reporta 18 imports dinámicos inefectivos de iconos; `ShortcutsWidget` es el mayor chunk. No es una emergencia, pero contradice el objetivo de arranque rápido. Medir tras eliminar duplicación estático/dinámico y cargar solo el catálogo realmente usado.

# 5. Risk Map

| Riesgo de regresión | Área | Protección necesaria antes de tocar |
|---|---|---|
| Muy alto | Login, migración local→remoto, logout | E2E por usuario aislado; pruebas de fallo/red |
| Muy alto | Orden global y DnD de shortcuts | Mantener tests puros e integración existentes |
| Alto | Configuración de widgets/layout | Tests de layout por breakpoint y persistencia |
| Alto | Provider remoto | Tests de concurrencia, logout y doble pestaña |
| Medio | Theme/settings | Actualizar E2E a `SettingsDrawer` |
| Bajo | Plugins/registro de widgets | Mantener contrato de lazy loading |
| Bajo | Docker/Nginx | Smoke test Compose con HTTPS simulado o checklist operativo |

# 6. Testing Assessment

La cobertura de comportamiento es buena en unitarias/integración: configuración, shortcuts, categorías, layout, tema, auth client, providers, backend de sesiones y rutas.

Falta cobertura para:

- Cambio de cuenta con escritura pendiente.
- Orden inverso de dos `PUT`.
- Fallo temporal de persistencia y retry.
- Conflicto entre dos pestañas.
- ETag/revisión, una vez introducido.
- Rechazo de `javascript:` y SVG no permitido.
- Configuración de producción: TLS/cookie segura.
- Migraciones reales desde una base de datos existente.

No hay cobertura configurada ni script de coverage, y no hay CI que convierta los tests en una barrera de merge.

# 7. Security Assessment

Fortalezas verificadas:

- Contraseñas con Argon2id.
- Tokens de sesión aleatorios; solo se persiste su hash.
- Cookie `HttpOnly`, `SameSite=Lax`.
- CORS cerrado para la topología same-origin.
- Endpoints de dashboard siempre usan el `userId` de sesión.
- SQL parametrizado.
- Rate limit de login y lockout por cuenta.
- Backend no se publica directamente en Compose.

Riesgos reales o condicionales:

- TD-01: sesión por HTTP si no existe un redirect TLS externo.
- TD-06: URL schemes permisivos y SVG persistible no sanitizado.
- Weather consulta `ipwho.is` como fallback y revela IP al proveedor; es una decisión de privacidad que conviene documentar y hacer opcional.
- Monitoring hace `fetch` desde el navegador: no es SSRF del backend, pero puede acceder a servicios permitidos por CORS desde el navegador del usuario.

CSRF no es un hallazgo crítico en la topología actual: mismo origen, CORS cerrado y `SameSite=Lax` protegen los POST cross-site habituales.

# 8. Refactoring Strategy

Orden recomendado:

1. Corregir garantías de seguridad y crear una línea base de tests fiable.
2. Corregir el ciclo de vida y la fiabilidad de persistencia.
3. Formalizar control de concurrencia cliente-servidor.
4. Endurecer límites de entrada y migraciones.
5. Unificar tooling/documentación.
6. Optimizar bundle y añadir observabilidad proporcional.

# 9. Refactoring Phases

| Fase | Objetivo | Dependencias | Criterio de salida |
|---|---|---|---|
| 0 | Baseline E2E aislado y TLS seguro | Ninguna | E2E reproducible; producción no acepta cookie insegura |
| 1 | Provider remoto cancelable y session-bound | Fase 0 | Logout/cambio de usuario no genera escrituras ajenas |
| 2 | Persistencia fiable y control de conflictos | Fase 1 | No se pierde una escritura por orden de red o dos pestañas |
| 3 | Validación y migraciones | Fase 2 | Inputs permitidos explícitamente; DB evoluciona por versión |
| 4 | Calidad de repo/DX | Fase 0 | Un comando/CI valida cliente y servidor |
| 5 | Rendimiento y observabilidad | Fases 2 y 4 | Menor bundle de shortcuts; errores sync diagnosticables |

En cada fase, no cambiar la semántica de orden global, migración inicial ni layout de widgets sin preservar los tests de comportamiento actuales.

# 10. Quick Wins

- Corregir README, `CLAUDE.md` y pruebas E2E obsoletas.
- Eliminar `fastify-type-provider-zod` si se confirma sin consumidor.
- Renombrar `format` o introducir un formatter real; actualmente es solo `eslint --fix`.
- Eliminar JS, declarations y sourcemaps compilados de `server/test/` después de verificar que no hay consumidores.
- Hacer `COOKIE_SECURE` un booleano estricto y fallar en producción sin TLS.
- Incorporar backend a lint y crear scripts agregados.

# 11. High-Impact Refactors

1. Reemplazar el provider remoto por un `DashboardConfigSession` con caché local, cancelación, cola de escritura, estado de sync y `dispose`.
2. Añadir revisión/ETag al documento de dashboard y control optimista en Fastify.
3. Separar el contrato de configuración compartido entre frontend y backend: el backend debe validar una forma segura/versionada, no solo `{ version }` con passthrough.
4. Reestructurar E2E para que identidad, datos y configuración sean propios de cada test o worker.

# 12. Do Not Touch Yet

- Algoritmos de shortcuts/categorías y orden global: tienen reglas de negocio delicadas y buena cobertura.
- Registry/lazy loading de widgets: funciona como extensión acotada; no requiere un framework de plugins más complejo.
- Argon2, hash de tokens y autorización por `request.user`: son decisiones correctas.
- Layout engine y DnD: refactorizarlos ahora tendría alto riesgo y poco retorno.
- No introducir Redux/Zustand solo para reemplazar contexts; primero resuelve la propiedad y sincronización de configuración.

# 13. Recommended Target Architecture

Mantener React + Fastify + SQLite, pero con esta frontera:

```text
UI/features
  ↓ acciones de dominio
DashboardConfigSession
  cache + estado sync + cola + dispose + conflicto
  ↓ API con revision
Fastify dashboard service
  validación versionada + autorización
  ↓
repository SQLite
```

Los componentes solo leen estado y emiten intenciones. Los servicios puros siguen resolviendo shortcuts, layout, tema y validaciones. El `eventBus` queda para eventos realmente transversales de UI, no como mecanismo de coherencia de datos.

# 14. Claude Code Implementation Plan

1. **Estabilizar E2E**
   - Archivos: `tests/e2e/*`, `playwright.config.ts`.
   - Crear identidad/configuración aislada por test o worker.
   - Aceptación: ejecución paralela repetible; no depende de `localStorage` para resetear backend.

2. **Asegurar transporte**
   - Archivos: Compose, env, cookie tests, docs.
   - Configurar TLS/`websecure`; exigir cookie segura en producción.
   - Aceptación: configuración insegura de producción falla al arrancar.

3. **Agregar ciclo de vida al provider remoto**
   - Archivos: storage remoto, AuthProvider, tests.
   - Implementar cancelación de timers/listeners/requests.
   - Aceptación: A→logout→B nunca escribe datos de A en B.

4. **Implementar cola de persistencia**
   - Archivos: provider remoto, AuthClient, tests.
   - Serializar requests, conservar último estado, reintentar y exponer fallo.
   - Aceptación: requests desordenadas no revierten cambios.

5. **Añadir revisiones de configuración**
   - Archivos: schema/rutas/repository backend, AuthClient.
   - Persistir revisión y rechazar PUT obsoletos.
   - Aceptación: dos pestañas reciben conflicto controlado, no pérdida silenciosa.

6. **Endurecer validación**
   - Archivos: validación frontend, schema backend, iconos.
   - Limitar protocolos y eliminar/sanitizar SVG arbitrario.
   - Aceptación: payloads peligrosos quedan rechazados.

7. **Versionar migraciones SQLite**
   - Archivos: `server/src/db/*`, tests.
   - Introducir historial de migración antes de cambiar tablas.
   - Aceptación: una base existente puede evolucionar de forma determinista.

8. **Unificar quality gates**
   - Archivos: package scripts, ESLint, CI.
   - Validar lint/typecheck/test/build de ambos workspaces.
   - Aceptación: un comando de CI cubre frontend y backend.

9. **Reconciliar documentación y legacy**
   - Archivos: README, CLAUDE, docs, tests obsoletos.
   - Reflejar backend, widgets, deploy real y UI actual.
   - Aceptación: guía de instalación funciona literalmente.

10. **Optimizar iconos y medir**
    - Archivos: icon provider/resolver, build checks.
    - Evitar imports duplicados y medir el chunk resultante.
    - Aceptación: desaparecen advertencias de import dinámico inefectivo y baja el chunk de shortcuts.

Si este fuera mi proyecto y tuviera que reducir la deuda técnica sin detener el desarrollo, ejecutaría exactamente: **E2E aislado + TLS → ciclo de vida del provider → persistencia/versionado → validación/migraciones → quality gates/documentación → rendimiento/observabilidad**.
