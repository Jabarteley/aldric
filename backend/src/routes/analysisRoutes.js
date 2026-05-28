import express from "express";
import { generateAnalysis } from "../controllers/analysisController.js";

const router = express.Router();

router.post("/generate", generateAnalysis);

export default router;
