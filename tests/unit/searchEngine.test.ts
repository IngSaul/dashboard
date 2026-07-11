import { describe, expect, it, vi } from 'vitest'
import { createSearchEngine } from '../../src/services/searchEngine'
import type { SearchResult, SearchSource } from '../../src/types/search'

function makeResult(id: string, sourceId: string, label: string): SearchResult {
  return { id, sourceId, label, onSelect: () => {} }
}

function makeSource(
  id: string,
  kind: SearchSource['kind'],
  match: SearchSource['match'],
): SearchSource {
  return { id, label: id, kind, match }
}

describe('searchEngine', () => {
  describe('registerSource', () => {
    it('throws in development when registering a duplicate id', () => {
      const engine = createSearchEngine()
      const source = makeSource('web', 'web', () => [])

      engine.registerSource(source)

      expect(() => engine.registerSource(source)).toThrow('web')
    })

    it('unregisterSource removes a source so it no longer contributes results', () => {
      const engine = createSearchEngine()
      engine.registerSource(makeSource('web', 'web', (q) => [makeResult('r1', 'web', q)]))

      engine.unregisterSource('web')

      expect(engine.query('anything')).toEqual([])
    })

    it('unregisterSource is a no-op for an unknown id', () => {
      const engine = createSearchEngine()
      expect(() => engine.unregisterSource('nope')).not.toThrow()
    })
  })

  describe('query', () => {
    it('returns an empty result set for an empty or whitespace-only input', () => {
      const engine = createSearchEngine()
      engine.registerSource(makeSource('web', 'web', (q) => [makeResult('r1', 'web', q)]))

      expect(engine.query('')).toEqual([])
      expect(engine.query('   ')).toEqual([])
    })

    it('merges results from every registered source in registration order', () => {
      const engine = createSearchEngine()
      engine.registerSource(makeSource('web', 'web', () => [makeResult('web-1', 'web', 'Web')]))
      engine.registerSource(
        makeSource('shortcuts', 'shortcut', () => [makeResult('sc-1', 'shortcuts', 'Shortcut')]),
      )
      engine.registerSource(makeSource('commands', 'command', () => [makeResult('cmd-1', 'commands', 'Command')]))

      const results = engine.query('x')

      expect(results.map((r) => r.id)).toEqual(['web-1', 'sc-1', 'cmd-1'])
    })

    it('is deterministic across repeated calls with the same input and sources', () => {
      const engine = createSearchEngine()
      engine.registerSource(makeSource('web', 'web', (q) => [makeResult('r1', 'web', q), makeResult('r2', 'web', q)]))

      const first = engine.query('hello').map((r) => r.id)
      const second = engine.query('hello').map((r) => r.id)

      expect(first).toEqual(second)
    })

    it('filters sources by kinds when provided', () => {
      const engine = createSearchEngine()
      engine.registerSource(makeSource('web', 'web', () => [makeResult('web-1', 'web', 'Web')]))
      engine.registerSource(
        makeSource('shortcuts', 'shortcut', () => [makeResult('sc-1', 'shortcuts', 'Shortcut')]),
      )
      engine.registerSource(makeSource('commands', 'command', () => [makeResult('cmd-1', 'commands', 'Command')]))

      const results = engine.query('x', { kinds: ['web', 'shortcut'] })

      expect(results.map((r) => r.id)).toEqual(['web-1', 'sc-1'])
    })

    it("isolates a source whose match() throws — it contributes zero results, others are unaffected", () => {
      const engine = createSearchEngine()
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      engine.registerSource(
        makeSource('broken', 'web', () => {
          throw new Error('boom')
        }),
      )
      engine.registerSource(makeSource('shortcuts', 'shortcut', () => [makeResult('sc-1', 'shortcuts', 'Shortcut')]))

      const results = engine.query('x')

      expect(results.map((r) => r.id)).toEqual(['sc-1'])
      errorSpy.mockRestore()
    })

    it('returns an empty array when no sources are registered', () => {
      const engine = createSearchEngine()
      expect(engine.query('anything')).toEqual([])
    })
  })
})
