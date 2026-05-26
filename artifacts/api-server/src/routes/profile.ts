import { Router, type IRouter } from "express";
import { businessProfile } from "../lib/businessProfile.js";

const router: IRouter = Router();

router.get("/profile", (_req, res) => {
  res.json(businessProfile);
});

export default router;
