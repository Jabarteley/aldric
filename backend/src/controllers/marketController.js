import { diagnoseBinanceConnection, getBtcMarket, getCandles } from "../services/binance.service.js";
import { analyzeCandles } from "../services/technicalAnalysis.service.js";

const ALLOWED_INTERVALS = new Set(["1m", "5m", "15m", "1h", "4h", "1d"]);

function safeInterval(interval = "15m") {
  return ALLOWED_INTERVALS.has(interval) ? interval : "15m";
}

export async function getBtcMarketData(req, res, next) {
  try {
    const interval = safeInterval(req.query.interval);
    const market = await getBtcMarket(interval);
    const technicalData = analyzeCandles(market.candles);
    res.json({ ...market, technicalData });
  } catch (error) {
    next(error);
  }
}

export async function getMarketCandles(req, res, next) {
  try {
    const symbol = String(req.query.symbol || "BTCUSDT").toUpperCase();
    const interval = safeInterval(req.query.interval);
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 20), 500);
    const candles = await getCandles(symbol, interval, limit);
    res.json({ symbol, interval, limit, candles });
  } catch (error) {
    next(error);
  }
}

export async function getMarketDiagnostics(req, res, next) {
  try {
    const diagnostics = await diagnoseBinanceConnection();
    res.status(diagnostics.ok ? 200 : 502).json(diagnostics);
  } catch (error) {
    next(error);
  }
}
