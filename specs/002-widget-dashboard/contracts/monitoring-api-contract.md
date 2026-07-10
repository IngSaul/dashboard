# Monitoring API Contract: Server Status & Docker Container Widgets

Defines the JSON shape the dashboard expects from the user-configured
`MonitoringSourceConfig.endpointUrl`. This is an external contract the
dashboard **consumes** — it does not implement or host this endpoint. The user
is responsible for fronting their own monitoring tool (e.g. a small exporter,
Glances, a custom script) with an endpoint matching this shape, or an adapter
in front of it.

## Request

- Method: `GET`
- Sent by the dashboard client-side, on a poll interval (`pollIntervalSeconds`)
  and on demand when Widget Settings changes the endpoint.
- Request MUST be aborted after `timeoutMs`; a timeout is treated identically
  to a network error (widget shows `unavailable`).

## Response (200 OK)

```json
{
  "host": {
    "name": "string",
    "status": "up" | "degraded" | "down",
    "cpuPercent": 0,
    "memoryPercent": 0
  },
  "containers": [
    {
      "id": "string",
      "name": "string",
      "status": "running" | "stopped" | "restarting" | "unknown",
      "uptimeSeconds": 0
    }
  ]
}
```

- `host` is used by the **server-status** widget. `containers` is used by the
  **docker-status** widget. Both fields are optional independently — an
  endpoint may report only one — so each widget renders `not-configured`
  (rather than `unavailable`) if its relevant field is absent from an otherwise
  successful response.
- `cpuPercent`/`memoryPercent` are optional numeric fields (0–100); absent
  values render the widget without that metric rather than as an error.
- Unknown/extra fields in the response MUST be ignored (forward compatibility),
  never cause a parse failure.

## Error handling

- Any non-2xx response, network failure, timeout, or malformed JSON body MUST
  result in both widgets (or whichever widget depends on the missing field)
  showing their `unavailable` state — never a thrown error visible to the user
  or a blocked dashboard.
- The dashboard MUST NOT retry more than once per poll interval (no aggressive
  retry loops against the user's self-hosted endpoint).

## Security notes

- The endpoint URL is user-supplied local configuration; the dashboard MUST NOT
  send any credentials automatically and MUST NOT embed a default/hardcoded
  endpoint pointing at a third-party service.
- Requests are same-origin-policy/CORS subject like any browser fetch — the
  user's endpoint must allow the dashboard's origin if hosted cross-origin;
  this is documented as an operational note, not something the dashboard code
  works around (e.g. no proxying through a dashboard-owned backend, since this
  project has none).
