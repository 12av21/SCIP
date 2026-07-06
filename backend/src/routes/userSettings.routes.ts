import { Router } from "express";
import { getSettings, updateSettings } from "../controllers/userSettings.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.use(requireAuth);

router.get("/", getSettings);
router.patch("/", updateSettings);

export default router;
