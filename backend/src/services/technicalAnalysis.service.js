import { calculateATR, calculateEMA, calculateMACD, calculateRSI, supportResistance } from "../utils/indicators.js";

function classifyTrend(price, ema20, ema50, ema200) {
  if ([ema20, ema50, ema200].some((value) => value === null)) return "UNKNOWN";
  const emaSpread = Math.abs(ema20 - ema50) / price;

  if (emaSpread < 0.0015) return "RANGE";
  if (ema20 > ema50 && price > ema200) return "BULLISH";
  if (ema20 < ema50 && price < ema200) return "BEARISH";
  return "MIXED";
}

function classifyVolatility(price, atr) {
  if (!atr || !price) return "UNKNOWN";
  const atrPercent = (atr / price) * 100;
  if (atrPercent >= 2) return "HIGH_VOLATILITY";
  if (atrPercent <= 0.35) return "LOW_VOLATILITY";
  return "NORMAL_VOLATILITY";
}

function classifyMarketCondition(trendDirection, volatilityCondition, rsi) {
  if (volatilityCondition === "HIGH_VOLATILITY" || volatilityCondition === "UNKNOWN") return "HIGH_VOLATILITY";
  if (volatilityCondition === "LOW_VOLATILITY") return "LOW_VOLATILITY";
  if (trendDirection === "BULLISH" && rsi < 70) return "BULLISH_TREND";
  if (trendDirection === "BEARISH" && rsi > 30) return "BEARISH_TREND";
  if (trendDirection === "RANGE") return "RANGE";
  return "NO_TRADE";
}

export function analyzeCandles(candles) {
  const closes = candles.map((candle) => candle.close);
  const currentPrice = closes[closes.length - 1];
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const rsi14 = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const atr = calculateATR(candles, 14);
  const levels = supportResistance(candles);
  const trendDirection = classifyTrend(currentPrice, ema20, ema50, ema200);
  const volatilityCondition = classifyVolatility(currentPrice, atr);
  const marketCondition = classifyMarketCondition(trendDirection, volatilityCondition, rsi14 ?? 50);

  return {
    currentPrice,
    ema20,
    ema50,
    ema200,
    rsi14,
    macd,
    atr,
    support: levels.support,
    resistance: levels.resistance,
    trendDirection,
    volatilityCondition,
    marketCondition
  };
}
