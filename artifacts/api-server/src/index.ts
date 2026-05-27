import app from "./app";
import { logger } from "./lib/logger";

// MULTI-TENANT NOTE: To add a new client,
// 1. Fork this Replit
// 2. Drop their profile JSON at src/profiles/<their-id>.json
// 3. Register it in the PROFILES map in src/lib/businessProfile.ts
//    (one import + one map entry — profiles are bundled at build time
//    by esbuild, not discovered from disk at runtime, so this step is
//    required)
// 4. Set TENANT_ID=<their-id> in that Replit's Secrets
// 5. Update all API keys (HCP, QB, Google, Twilio) in Secrets — each
//    client's Replit carries its own
// 6. Deploy — new client instance live
//
// The profile itself is loaded by src/lib/businessProfile.ts based on
// process.env.TENANT_ID. Boot fails fast if TENANT_ID is missing or
// unknown.

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  console.log("WhatsApp sender:", process.env["TWILIO_WHATSAPP_NUMBER"]);
});
