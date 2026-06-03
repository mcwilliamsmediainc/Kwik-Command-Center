---
name: API shared-secret auth layer
description: How the Command Center API is gated, why it's a stopgap, and what remains open.
---

# API shared-secret auth layer

A single shared secret `COMMAND_CENTER_API_KEY` gates all business-data routes.
Gate runs as one `router.use` in the API router; everything is protected EXCEPT an
explicit exact-match `OPEN_PATHS` allowlist.

## Design
- Middleware accepts the key via `x-api-key` header OR the password half of HTTP
  Basic auth; compares constant-time; **fails closed** (503) if the secret is unset.
- Returns `WWW-Authenticate: Basic` ONLY when `Accept: text/html` (top-level
  navigations) so browsers show a native prompt; plain JSON 401 for fetch/XHR so the
  SPA handles it without a spurious browser dialog.
- SPA: `window.fetch` is patched once to attach `x-api-key` (from localStorage) to
  same-origin `/api` requests; an `AdminGate` blocks the app until a key validates
  against `GET /api/auth/verify`. Key is entered once by the user; it is the SAME
  value as the secret.

## Why two auth channels (header + Basic)
**Why:** The "Reconnect QuickBooks" flow is a top-level browser navigation to
`GET /api/auth/quickbooks` — a navigation cannot carry custom headers, so the
`x-api-key` path can't cover it. Basic auth lets the browser prompt and cache creds.
**How to apply:** Any new browser-navigation route that needs protection relies on
the Basic-auth branch; any fetch/XHR uses `x-api-key`.

## OPEN_PATHS — must stay unauthenticated
`/healthz` (probe), `/auth/quickbooks/callback` (Intuit redirect, state-cookie
protected), `/webhooks/whatsapp`, `/webhooks/housecallpro`, `/voice`, `/retell-voice`
(external callers). Matching is EXACT against the `/api`-stripped path — adding a new
external/webhook endpoint means adding it here, or it will start returning 401.

## Known follow-ups (NOT yet done)
- This is a single shared secret, not per-user auth. No rotation UX beyond changing
  the secret + re-entering the key.
- The OPEN_PATHS webhook/voice endpoints have NO upstream signature verification
  (Twilio signature, HCP token, Retell auth). They are spoofable/abusable by anyone.
  This predates the auth layer; the shared-secret gate cannot cover them without
  breaking the external callers. Proper fix = per-integration signature middleware.
