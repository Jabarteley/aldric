import { createSignal } from "../models/Signal.js";
import { generateAiSignal } from "../services/aiAnalysis.service.js";
import { getBtcMarket } from "../services/binance.service.js";
import { checkHighImpactEventRisk } from "../services/economicCalendar.service.js";
import { calculateRiskPlan, inferDecisionHint } from "../services/riskManagement.service.js";
import { analyzeCandles } from "../services/technicalAnalysis.service.js";
import { validateSignal } from "../utils/validateSignal.js";

const ALLOWED_INTERVALS = new Set(["1m", "5m", "15m", "1h", "4h", "1d"]);

function normalizeBody(body = {}) {
  const timeframe = ALLOWED_INTERVALS.has(body.timeframe) ? body.timeframe : "15m";
  return {
    symbol: "BTCUSDT",
    timeframe,
    riskSettings: {
      accountBalance: body.accountBalance,
      riskPercentage: body.riskPercentage,
      dailyTarget: body.dailyTarget,
      maxDailyLossPercentage: body.maxDailyLossPercentage
    }
  };
}

export async function generateAnalysis(req, res, next) {
  try {
    const input = normalizeBody(req.body);
    const market = await getBtcMarket(input.timeframe);
    const technicalData = analyzeCandles(market.candles);
    const newsRisk = await checkHighImpactEventRisk({ symbol: input.symbol });
    const decisionHint = inferDecisionHint(technicalData);
    const riskPlan = calculateRiskPlan({
      technicalData,
      decisionHint,
      riskSettings: input.riskSettings
    });

    const aiPayload = {
      symbol: input.symbol,
      timeframe: input.timeframe,
      currentPrice: technicalData.currentPrice,
      technicalData,
      newsRisk,
      riskPlan,
      safetyRules: {
        maxRiskPerTradePercent: 2,
        minimumRewardToRiskRatio: 2.5,
        preferredRewardToRiskRatio: 3,
        allowNoTrade: true,
        shouldExecute: false
      }
    };

    const aiSignal = await generateAiSignal(aiPayload);
    const signal = validateSignal(aiSignal, {
      symbol: input.symbol,
      entryPrice: technicalData.currentPrice,
      stopLoss: riskPlan.stopLoss,
      takeProfit: riskPlan.takeProfit,
      riskAmount: riskPlan.riskAmount,
      rewardToRiskRatio: riskPlan.rewardToRiskRatio,
      marketCondition: technicalData.marketCondition,
      reason: riskPlan.reason,
      timeframe: input.timeframe
    });

    if (newsRisk.hasHighImpactEvent) {
      signal.decision = "NO_TRADE";
      signal.shouldExecute = false;
      signal.confidence = Math.min(Number(signal.confidence || 0), 74);
      signal.reason = `${newsRisk.reason} ${signal.reason || ""}`.trim();
      signal.riskWarning = "High-impact economic event risk detected. Aldric will not generate a trade inside the news avoidance window.";
      signal.marketCondition = "NO_TRADE";
    } else if (newsRisk.calendarStatus === "UNAVAILABLE") {
      signal.confidence = Math.max(0, Number(signal.confidence || 0) - 5);
      signal.riskWarning = `${signal.riskWarning || ""} Economic calendar unavailable. News-risk filter was skipped.`.trim();
    }

    if (Number(signal.confidence || 0) < 75) {
      signal.decision = "NO_TRADE";
      signal.shouldExecute = false;
    }

    const savedSignal = await createSignal({
      ...signal,
      technicalData,
      newsRisk,
      riskSettings: {
        accountBalance: riskPlan.accountBalance,
        riskPercentage: riskPlan.riskPercentage,
        dailyTarget: riskPlan.dailyTarget,
        maxDailyLossPercentage: riskPlan.maxDailyLossPercentage
      }
    });

    res.status(201).json(savedSignal);
  } catch (error) {
    next(error);
  }
}
