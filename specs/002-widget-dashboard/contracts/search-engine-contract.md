# Search Engine Contract: CommandPalette Behavior

Defines the behavior of `searchEngine`, the service behind `CommandPalette`
and any future quick-action surface. See
[data-model.md](../data-model.md#searchsource--searchresult) for the
`SearchSource`/`SearchResult` shapes.

> **2026-07-12 update**: `SearchBar`, originally the other entry point behind
> `searchEngine`, was removed — see spec.md's Clarifications entry. No
> browser API lets a page or extension focus/write the native address bar or
> read the user's default search engine, so an in-page search box could only
> mimic the browser's omnibox, never proxy it. Everything below describing
> `SearchBar` documents prior, now-removed behavior.

## Registration

- Sources register once, at startup, via `searchEngine.registerSource(source)`
  — mirroring how Widgets register with `widgetRegistry`.
- This feature registers three sources: the existing web-search behavior
  (`kind: "web"`, from `search.ts`), jump-to-shortcut (`kind: "shortcut"`,
  from `shortcuts.ts`), and a small set of static navigation commands
  (`kind: "command"`, e.g. "Open Settings", "Open Wallpaper Settings") built
  into `AppShell`'s bootstrap.
- A `SearchSource.match(query)` implementation MUST be synchronous and MUST
  NOT perform network I/O — this keeps `query()` safe to call on every
  keystroke without debouncing being load-bearing for correctness (it may
  still be used for UI smoothness).

## Query behavior

- `searchEngine.query(input, { kinds? })` calls `match(input)` on every
  registered source (optionally filtered by `kinds`) and returns a merged,
  ranked `SearchResult[]`.
- Ranking MUST be deterministic for the same input and registered-source set
  (no randomness, no time-based tie-breaking) so results don't visibly jitter
  between keystrokes.
- An empty `input` MUST return an empty result set (or a fixed set of
  "suggested commands" for `CommandPalette` specifically) — never all
  possible results from every source.

## Entry points

- **`SearchBar`**: calls `query(input, { kinds: ["web", "shortcut"] })`;
  pressing Enter with no selected suggestion falls back to the existing
  feature-001 web-search behavior unchanged.
- **`CommandPalette`**: calls `query(input)` unscoped (all kinds); selecting a
  result invokes its `onSelect()`, which performs navigation directly (web/
  shortcut results) or emits an `eventBus` event (command results, e.g.
  opening a `SettingsDrawer` section) — `CommandPalette` and `searchEngine`
  never import `SettingsDrawer` directly.
- Both entry points MUST reuse the same keyboard-navigation behavior
  (`utils/keyboard.ts`) for moving through results — this contract does not
  permit each entry point implementing its own arrow-key/selection logic.

## Failure & Repair

- A `SearchSource` whose `match()` throws MUST be treated as returning zero
  results for that query — the exception MUST be caught by `searchEngine`
  per-source, so one broken source cannot break the other sources' results or
  crash the search UI.
