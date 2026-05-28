import { analyzeCandles } from "./technicalAnalysis.service.js";

const DEFAULT_SYMBOLS = {
  XAUUSD: { pipSize: 0.01, tickValue: 1, minLot: 0.01, maxLot: 0.05, lotStep: 0.01, contractSize: 100 },
  BTCUSD: { pipSize: 1, tickValue: 0.01, minLot: 0.01, maxLot: 0.05, lotStep: 0.01, contractSize: 1 },
  BTCUSDT: { pipSize: 1, tickValue: 0.01, minLot: 0.01, maxLot: 0.05, lotStep: 0.01, contractSize: 1 },
  EURUSD: { pipSize: 0.0001, tickValue: 1, minLot: 0.01, maxLot: 0.05, lotStep: 0.01, contractSize: 100000 },
  GBPUSD: { pipSize: 0.0001, tickValue: 1, minLot: 0.01, maxLot: 0.05, lotStep: 0.01, contractSize: 100000 },
  USDJPY: { pipSize: 0.01, tickValue: 1, minLot: 0.01, maxLot: 0.05, lotStep: 0.01, contractSize: 100000 },
  GBPJPY: { pipSize: 0.01, tickValue: 1, minLot: 0.01, maxLot: 0.05, lotStep: 0.01, contractSize: 100000 }
};

function normalizeSymbol(symbol = "") {
  return String(symbol).toUpperCase().replace(/[^A-Z]/g, "");
}

function roundToStep(value, step) {
  return Math.floor(value / step) * step;
}

function detectSession(now = new Date()) {
  const hour = now.getUTCHours();
  if (hour >= 8 && hour < 12) return "London";
  if (hour >= 13 && hour < 17) return "New York";
  if (hour >= 13 && hour < 16) return "London/NY Overlap";
  if (hour >= 0 && hour < 8) return "Asian";
  return "Off Session";
}

function hasRedFlagNews(newsEvents = []) {
  const now = Date.now();
  return newsEvents.some((event) => {
    const impact = String(event.impact || "").toUpperCase();
    const eventTime = new Date(event.time || event.timestamp || 0).getTime();
    return impact === "HIGH" && Number.isFinite(eventTime) && Math.abs(eventTime - now) <= 30 * 60 * 1000;
  });
}

function countConfluence(technicalData, decisionHint) {
  let count = 0;
  if (decisionHint === "BUY" && technicalData.ema20 > technicalData.ema50 && technicalData.currentPrice > technicalData.ema200) count += 1;
  if (decisionHint === "SELL" && technicalData.ema20 < technicalData.ema50 && technicalData.currentPrice < technicalData.ema200) count += 1;
  if (decisionHint === "BUY" && technicalData.rsi14 > 50 && technicalData.rsi14 < 70) count += 1;
  if (decisionHint === "SELL" && technicalData.rsi14 < 50 && technicalData.rsi14 > 30) count += 1;
  if (decisionHint === "BUY" && technicalData.macd?.histogram > 0) count += 1;
  if (decisionHint === "SELL" && technicalData.macd?.histogram < 0) count += 1;
  if (technicalData.atr > 0) count += 1;
  if (technicalData.marketCondition === "BULLISH_TREND" || technicalData.marketCondition === "BEARISH_TREND") count += 1;
  return count;
}

export function normalizeMt4Candles(candles = []) {
  return candles
    .map((candle) => ({
      openTime: candle.openTime || candle.time || candle.timestamp,
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: Number(candle.volume || candle.tickVolume || 0),
      closeTime: candle.closeTime || candle.time || candle.timestamp
    }))
    .filter((candle) => [candle.open, candle.high, candle.low, candle.close].every(Number.isFinite));
}

export function buildMt4TradePlan({ marketData, account }) {
  const candles = normalizeMt4Candles(marketData.candles);
  if (candles.length < 60) {
    return {
      decisionHint: "NO_TRADE",
      technicalData: null,
      riskPlan: null,
      blocked: true,
      blockReason: "At least 60 candles are required for MT4 setup detection."
    };
  }

  const technicalData = analyzeCandles(candles);
  const decisionHint =
    technicalData.marketCondition === "BULLISH_TREND"
      ? "BUY"
      : technicalData.marketCondition === "BEARISH_TREND"
        ? "SELL"
        : "NO_TRADE";
  const session = marketData.session || detectSession();
  const newsBlocked = hasRedFlagNews(marketData.newsEvents);
  const accountBalance = Number(account?.balance || 200);
  const dailyPnl = Number(account?.dailyPnl || 0);
  const dailyTarget = Number(account?.dailyTarget || 20);
  const maxDailyLoss = Number(account?.maxDailyLoss || accountBalance * 0.05);
  const maxTradesToday = Number(account?.maxTradesToday || 3);
  const tradesToday = Number(account?.tradesToday || 0);
  const riskPercentage = Math.min(Number(account?.riskPercentage || 2), 2);
  const riskAmount = Number(((accountBalance * riskPercentage) / 100).toFixed(2));
  const symbolKey = normalizeSymbol(marketData.symbol);
  const metadata = {
    ...(DEFAULT_SYMBOLS[symbolKey] || DEFAULT_SYMBOLS[marketData.symbol] || DEFAULT_SYMBOLS.EURUSD),
    ...(marketData.metadata || {})
  };
  const pipSize = Number(metadata.pipSize || marketData.point || 0.0001);
  const tickValue = Number(metadata.tickValue || 1);
  const minLot = Number(metadata.minLot || 0.01);
  const maxLot = Math.min(Number(metadata.maxLot || 0.05), 0.05);
  const lotStep = Number(metadata.lotStep || 0.01);
  const stopLossDistance = Number((technicalData.atr * 1.5).toFixed(marketData.digits || 5));
  const entryPrice = Number(marketData.ask || marketData.bid || technicalData.currentPrice);
  const rewardToRiskRatio = 2.5;
  const isBuy = decisionHint === "BUY";
  const stopLoss = decisionHint === "NO_TRADE" ? 0 : Number((isBuy ? entryPrice - stopLossDistance : entryPrice + stopLossDistance).toFixed(marketData.digits || 5));
  const takeProfit = decisionHint === "NO_TRADE" ? 0 : Number((isBuy ? entryPrice + stopLossDistance * rewardToRiskRatio : entryPrice - stopLossDistance * rewardToRiskRatio).toFixed(marketData.digits || 5));
  const stopLossPips = stopLossDistance / pipSize;
  const rawLotSize = stopLossPips > 0 ? riskAmount / (stopLossPips * tickValue) : 0;
  const lotSize = Number(Math.max(minLot, Math.min(maxLot, roundToStep(rawLotSize, lotStep))).toFixed(2));
  const confluenceCount = countConfluence(technicalData, decisionHint);
  const spread = Number(marketData.spread || 0);
  const stopLevel = Number(metadata.stopLevel || 0);
  const stopLevelOk = !stopLevel || stopLossPips >= stopLevel;
  const validSession = ["London", "New York", "London/NY Overlap"].includes(session);
  const blockedReasons = [];

  if (decisionHint === "NO_TRADE") blockedReasons.push("No bullish or bearish trend condition.");
  if (confluenceCount < 3) blockedReasons.push("Minimum 3 technical confluence signals not met.");
  if (!validSession) blockedReasons.push(`Session filter blocked trade: ${session}.`);
  if (newsBlocked) blockedReasons.push("Red-flag news event is within the restricted window.");
  if (dailyPnl <= -maxDailyLoss) blockedReasons.push("Daily drawdown limit has been reached.");
  if (dailyPnl >= dailyTarget) blockedReasons.push("Daily profit target has been reached. Session should close.");
  if (tradesToday >= maxTradesToday) blockedReasons.push("Maximum trades for the day has been reached.");
  if (!stopLevelOk) blockedReasons.push("Stop loss distance violates broker stop-level restrictions.");
  if (!stopLoss || !takeProfit) blockedReasons.push("Stop loss and take profit must be defined.");

  return {
    decisionHint: blockedReasons.length ? "NO_TRADE" : decisionHint,
    technicalData,
    riskPlan: {
      accountBalance,
      riskPercentage,
      riskAmount,
      entryPrice,
      stopLoss,
      takeProfit,
      stopLossDistance,
      stopLossPips: Number(stopLossPips.toFixed(2)),
      lotSize,
      rewardToRiskRatio,
      session,
      confluenceCount,
      symbolMetadata: metadata,
      maxDailyLoss,
      dailyTarget,
      tradesToday,
      maxTradesToday,
      isValid: blockedReasons.length === 0
    },
    blocked: blockedReasons.length > 0,
    blockReason: blockedReasons.join(" ")
  };
}

export function executionMode({ account, signal, settings = {} }) {
  const fullAutoEnabled = settings.globalAutoEnabled === true;
  const killSwitch = settings.globalKillSwitch === true || account?.killSwitch === true;
  const accountAuto = account?.fullAutoEnabled === true;
  const eaAuto = account?.eaAutoEnabled === true;
  const canExecute = fullAutoEnabled && accountAuto && eaAuto && !killSwitch && signal.decision !== "NO_TRADE";

  return {
    fullAutoEnabled,
    globalAutoEnabled: fullAutoEnabled,
    globalKillSwitch: settings.globalKillSwitch === true,
    accountAuto,
    eaAuto,
    killSwitch,
    shouldExecute: canExecute
  };
}
