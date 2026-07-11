import { describe, expect, it } from 'vitest'
import { Globe } from 'lucide-react'
import { resolveShortcutIcon } from '../../src/services/iconResolver'

/**
 * `resolveShortcutIcon` is a synchronous, pure URL -> brand icon lookup
 * (distinct from `iconProvider.ts`'s async, persisted, editor-driven
 * `IconSource` resolution): it never touches the network or a shortcut's
 * label, so every case here only varies the URL.
 */
describe('resolveShortcutIcon', () => {
  it('resolves GitHub with its brand color', () => {
    const icon = resolveShortcutIcon('https://github.com/anthropics/claude-code')

    expect(icon.match).toBe('brand')
    expect(icon.label).toBe('GitHub')
    expect(icon.color).toBe('#181717')
    expect(icon.svg).toContain('<svg')
    expect(icon.svg).toContain('fill="#181717"')
  })

  it('resolves Gmail from mail.google.com with its brand color', () => {
    const icon = resolveShortcutIcon('https://mail.google.com/mail/u/0/')

    expect(icon.match).toBe('brand')
    expect(icon.label).toBe('Gmail')
    expect(icon.color).toBe('#EA4335')
    expect(icon.svg).toBeDefined()
  })

  it('resolves Gmail from the gmail.com apex domain too', () => {
    const icon = resolveShortcutIcon('https://gmail.com')

    expect(icon.match).toBe('brand')
    expect(icon.label).toBe('Gmail')
  })

  it('resolves YouTube with its brand color', () => {
    const icon = resolveShortcutIcon('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

    expect(icon.match).toBe('brand')
    expect(icon.label).toBe('YouTube')
    expect(icon.color).toBe('#FF0000')
  })

  it('resolves WhatsApp from web.whatsapp.com with its brand color', () => {
    const icon = resolveShortcutIcon('https://web.whatsapp.com/')

    expect(icon.match).toBe('brand')
    expect(icon.label).toBe('WhatsApp')
    expect(icon.color).toBe('#25D366')
  })

  it('resolves Claude with its brand color', () => {
    const icon = resolveShortcutIcon('https://claude.ai/new')

    expect(icon.match).toBe('brand')
    expect(icon.label).toBe('Claude')
    expect(icon.color).toBe('#D97757')
    expect(icon.svg).toBeDefined()
  })

  it('resolves ChatGPT (chatgpt.com) with a colored icon component', () => {
    const icon = resolveShortcutIcon('https://chatgpt.com/c/123')

    expect(icon.match).toBe('brand')
    expect(icon.label).toBe('ChatGPT')
    expect(icon.color).toBe('#10A37F')
    expect(icon.Icon).toBeDefined()
    expect(icon.svg).toBeUndefined()
  })

  it('resolves ChatGPT from the legacy chat.openai.com host too', () => {
    const icon = resolveShortcutIcon('https://chat.openai.com/')

    expect(icon.match).toBe('brand')
    expect(icon.label).toBe('ChatGPT')
  })

  it('resolves Google Calendar with its brand color', () => {
    const icon = resolveShortcutIcon('https://calendar.google.com/calendar/u/0/r')

    expect(icon.match).toBe('brand')
    expect(icon.label).toBe('Google Calendar')
    expect(icon.color).toBe('#4285F4')
  })

  it('normalizes www./m. subdomains before matching', () => {
    expect(resolveShortcutIcon('https://www.github.com').label).toBe('GitHub')
    expect(resolveShortcutIcon('https://m.youtube.com').label).toBe('YouTube')
  })

  it('falls back to the generic Globe icon for an unrecognized URL', () => {
    const icon = resolveShortcutIcon('https://an-unrelated-site.example/page')

    expect(icon.match).toBe('unknown')
    expect(icon.color).toBe('currentColor')
    expect(icon.Icon).toBe(Globe)
    expect(icon.svg).toBeUndefined()
    // Never guesses at an unrelated brand for an unknown host.
    expect(icon.label).not.toBe('GitHub')
  })

  it('falls back to the generic Globe icon for an invalid URL, without throwing', () => {
    const icon = resolveShortcutIcon('not-a-valid-url')

    expect(icon.match).toBe('unknown')
    expect(icon.color).toBe('currentColor')
    expect(icon.Icon).toBe(Globe)
  })

  it('falls back to the generic Globe icon for an empty string', () => {
    const icon = resolveShortcutIcon('')

    expect(icon.match).toBe('unknown')
    expect(icon.Icon).toBe(Globe)
  })
})
