const DEFAULTS = {
  accountBalance: 200,
  riskPercentage: 1,
  maxDailyLossPercentage: 5,
  dailyTarget: 20
};

function normalizeRiskInput(input = {}) {
  const accountBalance = Number(input.accountBalance) > 0 ? Number(input.accountBalance) : DEFAULTS.accountBalance;
  const requestedRisk = Number(input.riskPercentage) > 0 ? Number(input.riskPercentage) : DEFAULTS.riskPercentage;
  const riskPercentage = Math.min(requestedRisk, 2);
  const maxDailyLossPercentage =
    Number(input.maxDailyLossPercentage) > 0 ? Number(input.maxDailyLossPercentage) : DEFAULTS.maxDailyLossPercentage;
  const dailyTarget = Number(input.dailyTarget) >= 0 ? Number(input.dailyTarget) : DEFAULTS.dailyTarget;

  return { accountBalance, riskPercentage, maxDailyLossPercentage, dailyTarget };
}

export function calculateRiskPlan({ technicalData, decisionHint = "NO_TRADE", riskSettings = {} }) {
  const settings = normalizeRiskInput(riskSettings);
  const price = technicalData.currentPrice;
  const atr = technicalData.atr;
  const riskAmount = Number(((settings.accountBalance * settings.riskPercentage) / 100).toFixed(2));

  if (!price || !atr || atr <= 0 || decisionHint === "NO_TRADE") {
    return {
      ...settings,
      decisionHint: "NO_TRADE",
      riskAmount,
      stopLossDistance: null,
      positionSize: 0,
      stopLoss: null,
      takeProfit: null,
      rewardToRiskRatio: 0,
      isValid: false,
      reason: "No valid trade bias or ATR data available."
    };
  }

  const stopLossDistance = Number((atr * 1.5).toFixed(2));
  const rewardToRiskRatio = 2.5;
  const takeProfitDistance = stopLossDistance * rewardToRiskRatio;
  const isBuy = decisionHint === "BUY";
  const stopLoss = Number((isBuy ? price - stopLossDistance : price + stopLossDistance).toFixed(2));
  const takeProfit = Number((isBuy ? price + takeProfitDistance : price - takeProfitDistance).toFixed(2));
  const positionSize = Number((riskAmount / stopLossDistance).toFixed(6));

  return {
    ...settings,
    decisionHint,
    riskAmount,
    stopLossDistance,
    positionSize,
    stopLoss,
    takeProfit,
    rewardToRiskRatio,
    isValid: rewardToRiskRatio >= 2.5 && stopLoss > 0 && takeProfit > 0,
    reason: "Risk plan uses 1.5 ATR stop and 2.5:1 minimum reward-to-risk."
  };
}

export function inferDecisionHint(technicalData) {
  if (technicalData.marketCondition === "BULLISH_TREND") return "BUY";
  if (technicalData.marketCondition === "BEARISH_TREND") return "SELL";
  return "NO_TRADE";
}
