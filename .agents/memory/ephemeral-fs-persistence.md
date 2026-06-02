---
name: Ephemeral production filesystem
description: Why local-file data stores silently lose data in Replit deployments, and the durable pattern to use instead.
---

# Replit production filesystem is ephemeral

Data written to local files at runtime (e.g. `path.join(process.cwd(), "data")`) does NOT survive a redeploy or instance restart in a Replit deployment. The only file content that persists is what is committed to git and baked into the deploy image.

**Symptom seen:** WhatsApp webhook logged "message received" and returned 200, but inbound messages vanished from the UI after a redeploy. Root cause: messages were written to `./data/messages.json`; on restart the app reloaded the git-committed snapshot (a few old test messages) and discarded everything written at runtime.

**Why:** Deployments run from an image; the writable filesystem is per-instance and reset on restart/redeploy.

**How to apply:** For any data that must survive restarts (messages, queues, user state), use the Postgres DB (`@workspace/db`, Drizzle), not a JSON file. Run `pnpm --filter @workspace/db run push` after adding a schema, and `pnpm run typecheck:libs` so consumers see new exports.

## Dev and prod are SEPARATE databases
The development workspace and the published deployment use different Postgres databases. Data inserted in dev (e.g. via `executeSql` default `environment:"development"`, or a dev-run migration) does NOT appear in production, and vice-versa. The dev preview URL (`*.riker.replit.dev` while the dev workflow runs) reads the dev DB; Twilio/webhooks hit the deployment, which reads the prod DB.

**How to verify prod:** `executeSql({ environment: "production", ... })` (read-only replica), and `fetch_deployment_logs` for the deployment's request logs. Don't conclude "the message was lost" from the dev preview — check the prod DB directly.

**Prod schema:** the `messages` table existed in prod because Replit's publish flow diffs dev→prod schema and applies it on publish. Schema changes reach prod via Publish, not via a dev `db push`.

## Webhook durability contract
When a third party (e.g. Twilio) treats a 2xx as final delivery, persist to the DB BEFORE returning 200. On a write failure return non-2xx so the sender retries. Make retries idempotent with `onConflictDoNothing` on the provider's message id. Acking first and writing in a detached async task can silently lose messages if the write fails.
