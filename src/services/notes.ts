import { NOTE_MAX_LENGTH } from '../config/schema'
import { loadDashboardConfig, saveDashboardConfig } from './configStore'
import { defaultStorageProvider } from './storage/LocalStorageProvider'
import type { StorageProvider } from './storage/StorageProvider'
import type { Note } from '../types/widgets'

export { NOTE_MAX_LENGTH }

export interface SaveNoteResult {
  note: Note
  /** `true` if `content` exceeded `NOTE_MAX_LENGTH` and was truncated to fit — the notes widget shows a visible notice in that case (data-model.md's Note validation rule). */
  truncated: boolean
}

/** Reads the persisted note, defaulting/repairing via `configStore` like every other persisted section. */
export function loadNote(provider: StorageProvider = defaultStorageProvider): Note {
  return loadDashboardConfig(provider).note
}

/**
 * Persists `content` as the note, truncating to `NOTE_MAX_LENGTH` and
 * stamping `updatedAt`. Truncating on the write path (and reporting it) —
 * rather than only on load, like `config/schema.ts`'s `repairNote` — is
 * what lets the notes widget show a visible notice at the moment
 * truncation actually happens, per data-model.md's Note validation rule.
 */
export function saveNote(
  content: string,
  provider: StorageProvider = defaultStorageProvider,
): SaveNoteResult {
  const truncated = content.length > NOTE_MAX_LENGTH
  const note: Note = {
    content: truncated ? content.slice(0, NOTE_MAX_LENGTH) : content,
    updatedAt: new Date().toISOString(),
  }

  const config = loadDashboardConfig(provider)
  saveDashboardConfig({ ...config, note }, provider)

  return { note, truncated }
}
