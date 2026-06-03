---
name: QuickBooks Online OAuth token handling
description: Non-obvious rules for the QBO service module's refresh-token lifecycle.
---

# QuickBooks Online OAuth

Module: `artifacts/api-server/src/lib/quickbooks.ts` (routes in `routes/quickbooks.ts`).
Refresh token persisted in Postgres `oauth_tokens` table (provider="quickbooks").

## Refresh tokens ROTATE
Every successful refresh may return a NEW refresh_token; the old one dies.
**Why:** Intuit invalidates the prior refresh token on rotation.
**How to apply:**
- Persist the rotated token to DB immediately; never re-use the env secret after first run.
- A single-flight lock funnels concurrent callers through ONE refresh — without it,
  parallel refreshes reuse the same token and all-but-one get `invalid_grant`, falsely
  flipping `needsReauth=true`.

## DB-first read shadows a freshly-provided secret
`loadRefreshToken()` reads the DB row first and only seeds from `QBO_REFRESH_TOKEN`
when no row exists. So after the user rotates the secret, a stale DB row will still be
used and keep failing.
**How to apply:** Prefer the in-app OAuth reconnect (below), which upserts the row.
Manual fallback when there is no UI access: `delete from oauth_tokens where provider='quickbooks';`
so the env secret re-seeds.

## In-app OAuth Authorization Code flow (connect / reconnect)
Routes `GET /api/auth/quickbooks` (→ Intuit authorize) and `/api/auth/quickbooks/callback`
let an admin re-authorize without touching secrets. `realmId` is now a column on
`oauth_tokens` (no longer env-only); `getRealmId()` reads DB first, falls back to
`QBO_REALM_ID`, and caches in memory for the sync `getQboStatus()`.
- CSRF state rides a short-lived HttpOnly+Secure+SameSite=Lax cookie scoped to
  `/api/auth/quickbooks` (this app has NO express-session).
- redirect_uri must be byte-identical on authorize + token exchange AND registered in
  the Intuit app; defaults to the prod callback, overridable via `QBO_REDIRECT_URI`.
- The full handshake only completes in production (redirect_uri is the prod domain);
  locally you can only verify the 302, the state cookie, and callback state rejection.

## Reconnect vs in-flight refresh: generation guard
**Why:** A reconnect (`persistQboConnection`) and an already in-flight single-flight
refresh of the OLD token chain race — without coordination the old refresh can finish
later and overwrite the new refresh_token/realm/cache or resurrect `needsReauth`.
**How to apply:** A module-level `connectionGeneration` counter is bumped at the start
of `persistQboConnection`. `refreshAccessToken` snapshots it; on completion, if it
changed, the refresh returns its access token to current callers but persists NOTHING
(no DB write, no cache/needsReauth mutation). Any new reconnect-related write path must
respect this generation check.

## Auth (now gated)
`/api/auth/quickbooks` (initiation) is now protected by the shared-secret layer — see
[api-auth-layer.md]. The browser reconnect link is a top-level navigation, so it
authenticates via the HTTP Basic prompt (not `x-api-key`). The callback stays open.

## invalid_grant = dead connection
A 400 `invalid_grant` from the token endpoint means the refresh token is expired/revoked
(QBO refresh tokens expire after ~100 days, or immediately if already rotated elsewhere,
e.g. generated in the OAuth Playground and used once). The module sets `needsReauth=true`;
the fix is a human re-authorization to mint a fresh refresh token, not a code change.
