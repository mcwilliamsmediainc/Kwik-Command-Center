---
name: Ryder AI prompt + pricing source of truth
description: How the customer-facing AI (Ryder) gets its knowledge, and where pricing lives, in the tkd-command-center app.
---

# Ryder prompt architecture & pricing source of truth

`/api/chat` (api-server) is a thin Anthropic proxy: it takes `{ system, messages }` from the CLIENT and forwards to Claude. It holds NO business knowledge itself. So every agent's grounding lives in a client-built system prompt.

**Single source of truth for business facts/pricing:** the tenant profile JSON (`artifacts/api-server/src/profiles/<tenant>.json`, selected by `TENANT_ID`). It is served by `GET /api/profile`, loaded into `ProfileContext`, and a duplicate `FALLBACK_PROFILE` exists in `ProfileContext.tsx` — **keep the JSON and the fallback in sync when editing pricing.**

**Customer-reply drafts (Dispatch + Inbox)** build their system prompt via the shared `buildRyderDraftSystem(profile)` in `ProfileContext.tsx`, which wraps `buildBusinessContext(profile)` (services + `pricing_notes` + area/hours/booking) plus accuracy guardrails. Other agent pages (Ryder chat, Ask, Blaze, Sage) use `buildBusinessContext` directly.

**Why:** before this, Dispatch/Inbox drafts sent only booking_url+phone+a one-line context and NO pricing, so Ryder invented prices. Grounding pricing in the profile means future price changes need only a profile edit (no code change).

**How to apply:** to change what Ryder quotes, edit the profile JSON (and the matching `FALLBACK_PROFILE`) — not the prompt code. Detailed per-service prices go in `services[].description`; cross-cutting policy (minimum charge, add-on fees, bundles) go in `pricing_notes[]`. Approval flow is preserved: Ryder only DRAFTS; a human sends.
