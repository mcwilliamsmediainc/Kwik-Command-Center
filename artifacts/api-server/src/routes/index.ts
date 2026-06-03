import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import jobsRouter from "./jobs";
import hcpRouter from "./hcp";
import scoutRouter from "./scout";
import dispatchRouter from "./dispatch";
import profileRouter from "./profile";
import retellRouter from "./retell";
import calltrackerRouter from "./calltracker";
import quickbooksRouter from "./quickbooks";
import authRouter from "./auth";
import { requireApiKey } from "../middlewares/auth.js";

const router: IRouter = Router();

/*
 * Paths that must remain open (no shared-secret required):
 *  - /healthz                    — liveness/deploy health probe
 *  - /auth/quickbooks/callback   — Intuit redirects here (state-cookie protected)
 *  - /webhooks/*                 — inbound webhooks (Twilio WhatsApp, HouseCall Pro)
 *  - /voice, /retell-voice       — Retell AI voice bridge callbacks
 * Everything else exposes business data and requires COMMAND_CENTER_API_KEY.
 */
const OPEN_PATHS = new Set<string>([
  "/healthz",
  "/auth/quickbooks/callback",
  "/webhooks/whatsapp",
  "/webhooks/housecallpro",
  "/voice",
  "/retell-voice",
]);

router.use((req, res, next) => {
  const path = req.path.replace(/^\/api(?=\/|$)/, "");
  if (OPEN_PATHS.has(path)) {
    next();
    return;
  }
  requireApiKey(req, res, next);
});

router.use(healthRouter);
router.use(chatRouter);
router.use(jobsRouter);
router.use(hcpRouter);
router.use(scoutRouter);
router.use(dispatchRouter);
router.use(profileRouter);
router.use(retellRouter);
router.use(calltrackerRouter);
router.use(quickbooksRouter);
router.use(authRouter);

export default router;
