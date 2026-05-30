import { createSignal } from "../models/Signal.js";
import {
  createMt4Order,
  getMt4Account,
  getMt4MarketData,
  getMt4Order,
  listMt4MarketData,
  listMt4Orders,
  saveMt4Account,
  saveMt4MarketData,
  saveMt4TradeResult,
  updateMt4Order
} from "../models/Mt4.js";
import { generateAiSignal } from "../services/aiAnalysis.service.js";
import { checkHighImpactEventRisk } from "../services/economicCalendar.service.js";
import { getExecutionSettings, saveExecutionSettings } from "../services/executionSettings.service.js";
import { buildMt4TradePlan, executionMode } from "../services/mt4Risk.service.js";
import { relevantEventsForSymbol } from "../models/FundamentalEvent.js";
import { validateSignal } from "../utils/validateSignal.js";

const ALLOWED_TIMEFRAMES = new Set(["M1", "M5", "M15", "M30", "H1", "H4", "D1"]);

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function normalizeTimeframe(timeframe = "M15") {
  const clean = String(timeframe).toUpperCase();
  return ALLOWED_TIMEFRAMES.has(clean) ? clean : "M15";
}

function normalizeAccountId(value) {
  return String(value || "default").trim();
}

function applyNewsRiskToSignal(signal, newsRisk) {
  if (newsRisk?.hasHighImpactEvent) {
    signal.decision = "NO_TRADE";
    signal.shouldExecute = false;
    signal.confidence = Math.min(Number(signal.confidence || 0), 74);
    signal.marketCondition = "NO_TRADE";
    signal.reason = `${newsRisk.reason} ${signal.reason || ""}`.trim();
    signal.riskWarning = "High-impact economic event risk detected. Aldric will not generate a trade inside the news avoidance window.";
    return signal;
  }

  if (newsRisk?.calendarStatus === "UNAVAILABLE") {
    signal.confidence = Math.max(0, Number(signal.confidence || 0) - 5);
    signal.riskWarning = `${signal.riskWarning || ""} Economic calendar unavailable. News-risk filter was skipped.`.trim();
  }

  if (Number(signal.confidence || 0) < 75) {
    signal.decision = "NO_TRADE";
    signal.shouldExecute = false;
  }
  return signal;
}

function buildMt4FallbackSignal({ symbol, timeframe, tradePlan, marketData }) {
  const confidence = Math.min(92, 75 + Number(tradePlan.riskPlan?.confluenceCount || 0) * 4);
  const direction = tradePlan.blocked ? "NO_TRADE" : tradePlan.decisionHint;
  const entryPrice = tradePlan.riskPlan?.entryPrice || Number(marketData.ask || marketData.bid || 0);

  return {
    symbol,
    decision: direction,
    confidence,
    entryPrice,
    stopLoss: tradePlan.riskPlan?.stopLoss || 0,
    takeProfit: tradePlan.riskPlan?.takeProfit || 0,
    riskAmount: tradePlan.riskPlan?.riskAmount || 0,
    rewardToRiskRatio: tradePlan.riskPlan?.rewardToRiskRatio || 0,
    marketCondition: tradePlan.blocked ? tradePlan.blockReason : tradePlan.technicalData?.marketCondition,
    reason: tradePlan.blocked
      ? tradePlan.blockReason
      : `MT4 risk-approved ${direction} setup: entry ${entryPrice}, SL ${tradePlan.riskPlan?.stopLoss}, TP ${tradePlan.riskPlan?.takeProfit}, ${tradePlan.riskPlan?.riskPercentage}% risk, ${tradePlan.riskPlan?.rewardToRiskRatio}R, ${tradePlan.riskPlan?.confluenceCount} confluence signals, ${tradePlan.riskPlan?.session} session.`,
    riskWarning: "Automatic MT4 execution is still gated by account limits, kill switches, stop loss, take profit, minimum 2.5R, and EA local auto permission.",
    invalidationCondition: direction === "BUY"
      ? `Setup is invalid if price trades through ${tradePlan.riskPlan?.stopLoss}.`
      : `Setup is invalid if price trades through ${tradePlan.riskPlan?.stopLoss}.`,
    timeframe
  };
}

function applyMt4RiskApprovedFallback(signal, fallback, tradePlan) {
  if (tradePlan.blocked || fallback.decision === "NO_TRADE") return signal;
  const aiProducedExecutableTrade =
    signal.decision === fallback.decision &&
    Number(signal.confidence || 0) >= 75 &&
    Number(signal.rewardToRiskRatio || 0) >= 2.5 &&
    Number(signal.stopLoss || 0) > 0 &&
    Number(signal.takeProfit || 0) > 0;

  if (aiProducedExecutableTrade) return signal;

  return {
    ...signal,
    ...fallback,
    reason: `${fallback.reason} AI commentary was not executable, so Aldric used the deterministic MT4 risk plan for the trade candidate.`,
    shouldExecute: false
  };
}

export async function postMarketData(req, res, next) {
  try {
    if (!req.body?.symbol) throw badRequest("symbol is required.");
    if (!Array.isArray(req.body?.candles)) throw badRequest("candles array is required.");

    const payload = {
      accountId: normalizeAccountId(req.body.accountId),
      broker: req.body.broker || "",
      symbol: String(req.body.symbol).toUpperCase(),
      timeframe: normalizeTimeframe(req.body.timeframe),
      bid: Number(req.body.bid),
      ask: Number(req.body.ask),
      spread: Number(req.body.spread || 0),
      digits: Number(req.body.digits || 5),
      point: Number(req.body.point || 0),
      metadata: req.body.metadata || {},
      candles: req.body.candles.slice(-500),
      session: req.body.session,
      newsEvents: Array.isArray(req.body.newsEvents) ? req.body.newsEvents : []
    };

    const saved = await saveMt4MarketData(payload);
    res.status(201).json({ ok: true, marketData: saved });
  } catch (error) {
    next(error);
  }
}

export async function postAccountState(req, res, next) {
  try {
    const accountId = normalizeAccountId(req.body?.accountId);
    const existing = await getMt4Account(accountId);
    const balance = Number(req.body?.balance);
    const equity = Number(req.body?.equity);
    if (!Number.isFinite(balance) || balance <= 0) throw badRequest("balance must be a positive number.");
    if (!Number.isFinite(equity) || equity <= 0) throw badRequest("equity must be a positive number.");

    const saved = await saveMt4Account({
      accountId,
      broker: req.body.broker || "",
      currency: req.body.currency || "USD",
      balance,
      equity,
      margin: Number(req.body.margin || 0),
      freeMargin: Number(req.body.freeMargin || 0),
      dailyPnl: Number(req.body.dailyPnl || 0),
      dailyTarget: Number(req.body.dailyTarget || 20),
      currentDrawdown: Number(req.body.currentDrawdown || 0),
      maxDailyLoss: Number(req.body.maxDailyLoss || balance * 0.05),
      maxTradesToday: Number(req.body.maxTradesToday || 3),
      tradesToday: Number(req.body.tradesToday || 0),
      riskPercentage: Math.min(Number(req.body.riskPercentage || 2), 2),
      fullAutoEnabled: existing?.fullAutoEnabled === true,
      eaAutoEnabled: req.body.fullAutoEnabled === true,
      killSwitch: req.body.killSwitch === true || existing?.killSwitch === true,
      openTrades: Array.isArray(req.body.openTrades) ? req.body.openTrades : []
    });

    res.status(201).json({ ok: true, account: saved });
  } catch (error) {
    next(error);
  }
}

export async function updateExecutionSettings(req, res, next) {
  try {
    const accountId = normalizeAccountId(req.body?.accountId);
    const existing = await getMt4Account(accountId);
    if (!existing) throw badRequest("No MT4 account state found. POST /api/mt4/account first.");

    const saved = await saveMt4Account({
      ...existing,
      accountId,
      fullAutoEnabled: req.body.fullAutoEnabled === true,
      killSwitch: req.body.killSwitch === true
    });

    const settings = await getExecutionSettings();
    res.json({
      ok: true,
      account: saved,
      executionMode: executionMode({ account: saved, signal: { decision: "BUY" }, settings })
    });
  } catch (error) {
    next(error);
  }
}

export async function getMt4Signal(req, res, next) {
  try {
    const accountId = normalizeAccountId(req.query.accountId);
    const symbol = String(req.query.symbol || "XAUUSD").toUpperCase();
    const timeframe = normalizeTimeframe(req.query.timeframe);
    const [account, marketData] = await Promise.all([
      getMt4Account(accountId),
      getMt4MarketData(accountId, symbol, timeframe)
    ]);

    if (!account) throw badRequest("No MT4 account state found. POST /api/mt4/account first.");
    if (!marketData) throw badRequest("No MT4 market data found. POST /api/mt4/market-data first.");

    const fundamentalEvents = await relevantEventsForSymbol(symbol);
    marketData.newsEvents = [...(marketData.newsEvents || []), ...fundamentalEvents];
    const newsRisk = await checkHighImpactEventRisk({ symbol });
    const tradePlan = buildMt4TradePlan({ marketData, account });
    const fallback = buildMt4FallbackSignal({ symbol, timeframe, tradePlan, marketData });

    const aiPayload = {
      source: "MT4",
      account,
      marketData: {
        ...marketData,
        candles: marketData.candles?.slice(-120)
      },
      technicalData: tradePlan.technicalData,
      newsRisk,
      riskPlan: tradePlan.riskPlan,
      deterministicDecision: tradePlan.decisionHint,
      blocked: tradePlan.blocked,
      blockReason: tradePlan.blockReason,
      outputRequirement: "Return valid JSON only. shouldExecute must be false unless executionMode permits it."
    };

    const aiSignal = await generateAiSignal(aiPayload);
    let signal = validateSignal(aiSignal, fallback);
    signal = applyMt4RiskApprovedFallback(signal, fallback, tradePlan);

    if (tradePlan.blocked) {
      signal.decision = "NO_TRADE";
      signal.shouldExecute = false;
      signal.marketCondition = tradePlan.blockReason;
      signal.rewardToRiskRatio = 0;
    }
    applyNewsRiskToSignal(signal, newsRisk);

    const settings = await getExecutionSettings();
    const mode = executionMode({ account, signal, settings });
    signal.shouldExecute = mode.shouldExecute;

    const savedSignal = await createSignal({
      ...signal,
      source: "MT4",
      accountId,
      technicalData: tradePlan.technicalData,
      newsRisk,
      riskPlan: tradePlan.riskPlan,
      executionMode: mode
    });

    let order = null;
    if (signal.decision !== "NO_TRADE") {
      order = await createMt4Order({
        accountId,
        signalId: savedSignal.id,
        symbol,
        timeframe,
        direction: signal.decision,
        entryPrice: signal.entryPrice,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        lotSize: tradePlan.riskPlan?.lotSize || 0,
        riskAmount: signal.riskAmount,
        rewardToRiskRatio: signal.rewardToRiskRatio,
        shouldExecute: signal.shouldExecute,
        executionMode: mode,
        status: signal.shouldExecute ? "READY_FOR_EA" : "PENDING_CONFIRMATION"
      });
    }

    res.json({ signal: savedSignal, order, executionMode: mode });
  } catch (error) {
    next(error);
  }
}

async function generateSignalFromMt4Data({ accountId, account, marketData }) {
  const symbol = marketData.symbol;
  const timeframe = marketData.timeframe;
  const fundamentalEvents = await relevantEventsForSymbol(symbol);
  marketData.newsEvents = [...(marketData.newsEvents || []), ...fundamentalEvents];
  const newsRisk = await checkHighImpactEventRisk({ symbol });
  const tradePlan = buildMt4TradePlan({ marketData, account });
  const fallback = buildMt4FallbackSignal({ symbol, timeframe, tradePlan, marketData });

  const aiPayload = {
    source: "MT4_AUTO_SCAN",
    account,
    marketData: {
      ...marketData,
      candles: marketData.candles?.slice(-120)
    },
    technicalData: tradePlan.technicalData,
    newsRisk,
    riskPlan: tradePlan.riskPlan,
    deterministicDecision: tradePlan.decisionHint,
    blocked: tradePlan.blocked,
    blockReason: tradePlan.blockReason,
    outputRequirement: "Return valid JSON only. shouldExecute must be false unless executionMode permits it."
  };

  const aiSignal = await generateAiSignal(aiPayload);
  let signal = validateSignal(aiSignal, fallback);
  signal = applyMt4RiskApprovedFallback(signal, fallback, tradePlan);

  if (tradePlan.blocked) {
    signal.decision = "NO_TRADE";
    signal.shouldExecute = false;
    signal.marketCondition = tradePlan.blockReason;
    signal.rewardToRiskRatio = 0;
  }
  applyNewsRiskToSignal(signal, newsRisk);

  const settings = await getExecutionSettings();
  const mode = executionMode({ account, signal, settings });
  signal.shouldExecute = mode.shouldExecute;

  const savedSignal = await createSignal({
    ...signal,
    source: "MT4",
    accountId,
    technicalData: tradePlan.technicalData,
    newsRisk,
    riskPlan: tradePlan.riskPlan,
    executionMode: mode
  });

  let order = null;
  if (signal.decision !== "NO_TRADE") {
    order = await createMt4Order({
      accountId,
      signalId: savedSignal.id,
      symbol,
      timeframe,
      direction: signal.decision,
      entryPrice: signal.entryPrice,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      lotSize: tradePlan.riskPlan?.lotSize || 0,
      riskAmount: signal.riskAmount,
      rewardToRiskRatio: signal.rewardToRiskRatio,
      shouldExecute: signal.shouldExecute,
      executionMode: mode,
      status: signal.shouldExecute ? "READY_FOR_EA" : "PENDING_CONFIRMATION"
    });
  }

  return { signal: savedSignal, order, executionMode: mode, tradePlan };
}

export async function scanMt4Signals(req, res, next) {
  try {
    const accountId = normalizeAccountId(req.body?.accountId || req.query.accountId);
    const timeframe = normalizeTimeframe(req.body?.timeframe || req.query.timeframe);
    const account = await getMt4Account(accountId);
    if (!account) throw badRequest("No MT4 account state found. POST /api/mt4/account first.");

    const feeds = (await listMt4MarketData(accountId, 100)).filter((item) => item.timeframe === timeframe);
    if (!feeds.length) throw badRequest("No MT4 market feeds found for this timeframe.");

    const ranked = [];
    for (const marketData of feeds) {
      const fundamentalEvents = await relevantEventsForSymbol(marketData.symbol);
      const enrichedMarketData = { ...marketData, newsEvents: [...(marketData.newsEvents || []), ...fundamentalEvents] };
      ranked.push({ marketData: enrichedMarketData, plan: buildMt4TradePlan({ marketData: enrichedMarketData, account }) });
    }
    ranked.sort((a, b) => {
        const aScore = (a.plan.riskPlan?.confluenceCount || 0) + (a.plan.blocked ? -10 : 10);
        const bScore = (b.plan.riskPlan?.confluenceCount || 0) + (b.plan.blocked ? -10 : 10);
        return bScore - aScore;
      });

    const best = ranked.find((item) => !item.plan.blocked) || ranked[0];
    const result = await generateSignalFromMt4Data({ accountId, account, marketData: best.marketData });

    res.json({
      ok: true,
      scanned: feeds.length,
      selectedSymbol: best.marketData.symbol,
      selectedTimeframe: best.marketData.timeframe,
      signal: result.signal,
      order: result.order,
      executionMode: result.executionMode,
      scanSummary: ranked.map((item) => ({
        symbol: item.marketData.symbol,
        blocked: item.plan.blocked,
        confluenceCount: item.plan.riskPlan?.confluenceCount || 0,
        reason: item.plan.blockReason || item.plan.technicalData?.marketCondition
      }))
    });
  } catch (error) {
    next(error);
  }
}

export async function listMt4State(req, res, next) {
  try {
    const accountId = normalizeAccountId(req.query.accountId);
    const [account, marketData, orders, executionSettings] = await Promise.all([
      getMt4Account(accountId),
      listMt4MarketData(accountId),
      listMt4Orders(accountId),
      getExecutionSettings()
    ]);
    res.json({ account, marketData, orders, executionSettings });
  } catch (error) {
    next(error);
  }
}

export async function confirmMt4Order(req, res, next) {
  try {
    const order = await getMt4Order(req.params.id);
    if (!order) return res.status(404).json({ message: "MT4 order not found." });
    const account = await getMt4Account(order.accountId);
    const settings = await getExecutionSettings();
    const mode = executionMode({ account, signal: { decision: order.direction }, settings });
    const status = mode.killSwitch ? "BLOCKED_KILL_SWITCH" : "READY_FOR_EA";
    const updated = await updateMt4Order(order.id, {
      status,
      humanConfirmed: true,
      shouldExecute: status === "READY_FOR_EA"
    });
    return res.json({ order: updated, executionMode: mode });
  } catch (error) {
    return next(error);
  }
}

export async function getNextMt4Order(req, res, next) {
  try {
    const accountId = normalizeAccountId(req.query.accountId);
    const orders = await listMt4Orders(accountId, 20);
    const order = orders.find((item) => item.status === "READY_FOR_EA" && item.shouldExecute === true);
    res.json({ order: order || null });
  } catch (error) {
    next(error);
  }
}

export async function postTradeResult(req, res, next) {
  try {
    const result = await saveMt4TradeResult({
      accountId: normalizeAccountId(req.body.accountId),
      orderId: req.body.orderId,
      ticket: req.body.ticket,
      symbol: req.body.symbol,
      direction: req.body.direction,
      lots: Number(req.body.lots || 0),
      entryPrice: Number(req.body.entryPrice || 0),
      exitPrice: Number(req.body.exitPrice || 0),
      stopLoss: Number(req.body.stopLoss || 0),
      takeProfit: Number(req.body.takeProfit || 0),
      profit: Number(req.body.profit || 0),
      outcome: req.body.outcome || "UNKNOWN",
      openedAt: req.body.openedAt,
      closedAt: req.body.closedAt
    });
    res.status(201).json({ ok: true, tradeResult: result });
  } catch (error) {
    next(error);
  }
}

export async function updateGlobalExecutionSettings(req, res, next) {
  try {
    const executionSettings = await saveExecutionSettings({
      globalAutoEnabled: req.body?.globalAutoEnabled,
      globalKillSwitch: req.body?.globalKillSwitch
    });
    res.json({ ok: true, executionSettings });
  } catch (error) {
    next(error);
  }
}
