/**
 * Registers every built-in widget plugin with `widgetRegistry`. Called once
 * during app init (see `main.tsx`), before `AppShell` mounts, so every
 * widget type is available before `Workspace`/`WidgetSettings` first render
 * (per the UI contract's Widget Registry rule). Empty for now — plugin
 * modules are added one per widget type, and wired in here, in User Story 1
 * (T062-T069).
 */
export function registerBuiltInPlugins(): void {}
