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

const router: IRouter = Router();

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
