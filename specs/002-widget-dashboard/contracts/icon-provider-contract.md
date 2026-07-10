# Icon Provider Contract: Shortcut Icon Resolution

Defines the behavior of the `iconProvider` service, which resolves an
`IconSource` (see [data-model.md](../data-model.md#iconsource)) for a shortcut.

## When resolution runs

- Resolution runs **only** when a shortcut is created or explicitly
  (re)saved/re-checked in `SettingsDrawer` — never during normal dashboard
  render or on a polling interval.
- The result is written to the shortcut's persisted `icon` field. Subsequent
  dashboard loads read this cached value; they never re-trigger resolution.

## Provider fallback order

Evaluated in order; the first step that produces a usable icon wins:

1. **`lucide`** — used when the user explicitly picks a generic/system icon
   from the Lucide set for this shortcut (manual choice, not automatic).
2. **`simple-icons`** — attempted automatically: if the shortcut's URL host
   maps to a known Simple Icons brand slug (e.g. `github.com` → `github`),
   use it.
3. **`custom-svg`** — used when the user has supplied their own SVG for this
   shortcut (manual choice always takes precedence over automatic steps run
   after it, so re-running resolution never overwrites a custom SVG).
4. **`favicon`** — attempted automatically if no brand match was found: fetch
   candidate favicon URLs for the shortcut's origin (`/favicon.ico`, then any
   `<link rel="icon">` declared on the origin's root document) with a request
   timeout (aligned with the monitoring contract's timeout philosophy — fail
   fast, don't block the settings UI). The first successfully-loaded image is
   cached as `provider: "favicon"`.
5. **`fallback`** — used when every prior step fails, times out, or is blocked
   by the target site's CORS/network policy: renders a generic tile using the
   shortcut's initials on a deterministic color derived from its name.

## Error handling

- A failed or blocked favicon fetch MUST NOT surface an error to the user —
  it silently falls through to `fallback`.
- Resolution MUST complete (success or fallback) without leaving the shortcut
  editor in a stuck/loading state indefinitely; a timeout always resolves to
  `fallback` rather than hanging.
- Re-running resolution (user action) MUST NOT downgrade a manually-set
  `lucide` or `custom-svg` icon back to an automatic one — manual choices are
  only replaced by another explicit manual choice.

## Security & privacy notes

- Favicon requests are outbound, client-side, same-origin-policy/CORS subject
  requests to the shortcut's own target host — no third-party favicon-proxy
  service is used by default, avoiding a dependency on/leak to an external
  party for every shortcut the user adds.
- No credentials are attached to favicon requests.
