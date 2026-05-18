import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import jobsRouter from "./jobs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(jobsRouter);

export default router;
