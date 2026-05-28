import express from "express";
import { getPrompt, restorePrompt, updatePrompt } from "../controllers/settingsController.js";

const router = express.Router();

router.get("/prompt", getPrompt);
router.put("/prompt", updatePrompt);
router.post("/prompt/reset", restorePrompt);

export default router;
