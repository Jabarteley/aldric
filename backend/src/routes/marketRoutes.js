import express from "express";
import { getBtcMarketData, getMarketCandles, getMarketDiagnostics } from "../controllers/marketController.js";

const router = express.Router();

router.get("/btc", getBtcMarketData);
router.get("/candles", getMarketCandles);
router.get("/diagnostics", getMarketDiagnostics);

export default router;
