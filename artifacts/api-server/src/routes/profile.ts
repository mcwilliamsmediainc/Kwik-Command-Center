import { Router, type IRouter } from "express";
import { applyProfilePatch, publicProfile, businessProfile } from "../lib/businessProfile.js";

const router: IRouter = Router();

router.get("/profile", (_req, res) => {
  res.json(publicProfile(businessProfile));
});

router.patch("/profile", (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    res.status(400).json({ error: "body must be a JSON object" });
    return;
  }
  try {
    const updated = applyProfilePatch(req.body);
    req.log.info({ keys: Object.keys(req.body) }, "profile patched");
    res.json(publicProfile(updated));
  } catch (err) {
    req.log.error({ err }, "profile patch failed");
    res.status(500).json({ error: "patch failed" });
  }
});

export default router;
