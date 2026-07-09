import './StatusMessage.css'

export type StatusMessageTone = 'info' | 'notice'

export interface StatusMessageProps {
  message: string
  tone?: StatusMessageTone
}

/**
 * Calm, non-disruptive fallback for empty/error/unavailable states (e.g.
 * weather unavailable, empty shortcut list) per the UI contract's
 * requirement that failures never block the rest of the dashboard.
 */
export function StatusMessage({ message, tone = 'info' }: StatusMessageProps) {
  return (
    <p className={`status-message status-message--${tone}`} role="status">
      {message}
    </p>
  )
}
