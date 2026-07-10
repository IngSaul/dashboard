import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadNote, NOTE_MAX_LENGTH, saveNote } from '../../src/services/notes'
import { loadDashboardConfig } from '../../src/services/configStore'
import { clearDashboardStorage } from '../fixtures/dashboardConfig'

/**
 * `notes.ts` does not exist yet (built in T061); these tests define its
 * persistence/size-bounding contract per data-model.md's `Note` entity and
 * are expected to fail to resolve until then. Persists through
 * `configStore` (like every other 002-widget-dashboard section), under
 * `DashboardConfiguration.note` — no parallel persistence mechanism.
 *
 * `NOTE_MAX_LENGTH` mirrors `config/schema.ts`'s `repairNote` bound (same
 * 20,000-character limit): `schema.ts` truncates silently when *loading*
 * possibly-corrupted storage, while `saveNote` here truncates on the
 * *write* path and reports whether it did, so the notes widget can show
 * the "visible notice" data-model.md's validation rule requires — that
 * repair-vs-report distinction is why both exist rather than one replacing
 * the other.
 */

describe('loadNote', () => {
  beforeEach(() => clearDashboardStorage())
  afterEach(() => clearDashboardStorage())

  it('returns the default empty note when storage is empty', () => {
    const note = loadNote()

    expect(note.content).toBe('')
  })

  it('returns the persisted note content', () => {
    saveNote('Buy milk')

    expect(loadNote().content).toBe('Buy milk')
  })
})

describe('saveNote', () => {
  beforeEach(() => clearDashboardStorage())
  afterEach(() => clearDashboardStorage())

  it('persists content and stamps updatedAt', () => {
    const result = saveNote('Buy milk')

    expect(result.note.content).toBe('Buy milk')
    expect(result.truncated).toBe(false)
    expect(new Date(result.note.updatedAt).toString()).not.toBe('Invalid Date')
  })

  it('persists the note through configStore under the note field', () => {
    saveNote('Buy milk')

    expect(loadDashboardConfig().note.content).toBe('Buy milk')
  })

  it('truncates content beyond NOTE_MAX_LENGTH and reports truncation', () => {
    const oversized = 'a'.repeat(NOTE_MAX_LENGTH + 500)

    const result = saveNote(oversized)

    expect(result.note.content).toHaveLength(NOTE_MAX_LENGTH)
    expect(result.truncated).toBe(true)
  })

  it('does not report truncation for content at exactly the limit', () => {
    const exact = 'a'.repeat(NOTE_MAX_LENGTH)

    const result = saveNote(exact)

    expect(result.truncated).toBe(false)
    expect(result.note.content).toHaveLength(NOTE_MAX_LENGTH)
  })

  it('accepts empty content', () => {
    const result = saveNote('')

    expect(result.note.content).toBe('')
    expect(result.truncated).toBe(false)
  })
})
