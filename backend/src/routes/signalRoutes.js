import express from "express";
import { listSignals, removeSignal, showSignal } from "../controllers/signalController.js";

const router = express.Router();

router.get("/", listSignals);
router.get("/:id", showSignal);
router.delete("/:id", removeSignal);

export default router;
