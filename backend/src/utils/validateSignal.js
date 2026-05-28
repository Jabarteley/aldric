const VALID_DECISIONS = new Set(["BUY", "SELL", "NO_TRADE"]);

function numberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function validateSignal(aiSignal, fallback) {
  const signal = {
    symbol: aiSignal?.symbol || fallback.symbol,
    decision: VALID_DECISIONS.has(aiSignal?.decision) ? aiSignal.decision : "NO_TRADE",
    confidence: Math.max(0, Math.min(100, numberOrZero(aiSignal?.confidence))),
    entryPrice: numberOrZero(aiSignal?.entryPrice || fallback.entryPrice),
    stopLoss: numberOrZero(aiSignal?.stopLoss || fallback.stopLoss),
    takeProfit: numberOrZero(aiSignal?.takeProfit || fallback.takeProfit),
    riskAmount: numberOrZero(aiSignal?.riskAmount || fallback.riskAmount),
    rewardToRiskRatio: numberOrZero(aiSignal?.rewardToRiskRatio || fallback.rewardToRiskRatio),
    marketCondition: aiSignal?.marketCondition || fallback.marketCondition,
    reason: aiSignal?.reason || fallback.reason,
    riskWarning: aiSignal?.riskWarning || "Trading involves risk. This signal is for real-time analysis only.",
    invalidationCondition: aiSignal?.invalidationCondition || "Setup is invalid if price action breaks the risk plan.",
    timeframe: aiSignal?.timeframe || fallback.timeframe,
    shouldExecute: false
  };

  const mustNoTrade =
    signal.confidence < 75 ||
    signal.rewardToRiskRatio < 2.5 ||
    !signal.stopLoss ||
    !signal.takeProfit ||
    !VALID_DECISIONS.has(signal.decision);

  if (mustNoTrade || signal.decision === "NO_TRADE") {
    signal.decision = "NO_TRADE";
    signal.shouldExecute = false;
  }

  return signal;
}
