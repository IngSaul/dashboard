import { useState, type ChangeEvent } from 'react'
import { GlassTextarea } from '../../glass/GlassTextarea/GlassTextarea'
import { StatusMessage } from '../../StatusMessage/StatusMessage'
import { loadNote, saveNote } from '../../../services/notes'
import './NotesWidget.css'

const TRUNCATED_NOTICE = 'Tu nota era demasiado larga y se recortó para ajustarse al límite.'

/**
 * Freeform local note, persisted via the `notes` service on every edit.
 * Shows a visible notice when content is truncated to `NOTE_MAX_LENGTH`
 * (data-model.md's Note validation rule). Synchronous/local — no loading
 * state.
 */
export function NotesWidget() {
  const [content, setContent] = useState(() => loadNote().content)
  const [truncated, setTruncated] = useState(false)

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const result = saveNote(event.target.value)
    setContent(result.note.content)
    setTruncated(result.truncated)
  }

  return (
    <div className="notes-widget">
      <GlassTextarea
        label="Notas"
        hideLabel
        value={content}
        onChange={handleChange}
        placeholder="Escribe una nota…"
      />
      {truncated ? <StatusMessage message={TRUNCATED_NOTICE} tone="notice" /> : null}
    </div>
  )
}
