import express from "express";
import {
  confirmMt4Order,
  getMt4Signal,
  getNextMt4Order,
  listMt4State,
  postAccountState,
  postMarketData,
  postTradeResult,
  scanMt4Signals,
  updateGlobalExecutionSettings,
  updateExecutionSettings
} from "../controllers/mt4Controller.js";
import { requireMt4Secret } from "../utils/mt4Auth.js";

const router = express.Router();

router.use(requireMt4Secret);

router.post("/market-data", postMarketData);
router.post("/account", postAccountState);
router.post("/execution-mode", updateExecutionSettings);
router.post("/global-execution-settings", updateGlobalExecutionSettings);
router.post("/scan", scanMt4Signals);
router.get("/signal", getMt4Signal);
router.get("/state", listMt4State);
router.get("/orders/next", getNextMt4Order);
router.post("/orders/:id/confirm", confirmMt4Order);
router.post("/trade-result", postTradeResult);

export default router;
