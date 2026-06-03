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
**How to apply:** When the secret is rotated/reconnected, delete the row:
`delete from oauth_tokens where provider='quickbooks';` so the new secret seeds.

## invalid_grant = dead connection
A 400 `invalid_grant` from the token endpoint means the refresh token is expired/revoked
(QBO refresh tokens expire after ~100 days, or immediately if already rotated elsewhere,
e.g. generated in the OAuth Playground and used once). The module sets `needsReauth=true`;
the fix is a human re-authorization to mint a fresh refresh token, not a code change.
