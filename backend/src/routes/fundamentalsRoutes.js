import express from "express";
import { createFundamentalEvent, getFundamentalEvents, syncFundamentals } from "../controllers/fundamentalsController.js";

const router = express.Router();

router.get("/events", getFundamentalEvents);
router.post("/events", createFundamentalEvent);
router.post("/sync", syncFundamentals);

export default router;
