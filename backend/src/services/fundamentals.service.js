import axios from "axios";
import { listFundamentalEvents, saveFundamentalEvent, saveFundamentalEvents } from "../models/FundamentalEvent.js";

function normalizeImpact(value) {
  const clean = String(value || "").toUpperCase();
  if (["HIGH", "3", "IMPORTANT"].includes(clean)) return "HIGH";
  if (["MEDIUM", "2", "MODERATE"].includes(clean)) return "MEDIUM";
  if (["LOW", "1"].includes(clean)) return "LOW";
  return clean || "UNKNOWN";
}

function currenciesFromEvent(event) {
  const currency = event.Currency || event.currency;
  const country = String(event.Country || event.country || "").toUpperCase();
  if (currency) return [String(currency).toUpperCase()];
  if (country.includes("UNITED STATES") || country === "US") return ["USD"];
  if (country.includes("EURO")) return ["EUR"];
  if (country.includes("UNITED KINGDOM") || country === "UK") return ["GBP"];
  if (country.includes("JAPAN")) return ["JPY"];
  return ["GLOBAL"];
}

function normalizeTradingEconomicsEvent(event) {
  const time = event.Date || event.date;
  const title = event.Event || event.event || event.Category || "Economic Event";
  return {
    id: `tradingeconomics_${event.CalendarId || `${time}_${title}`}`.replace(/[^a-zA-Z0-9_-]/g, "_"),
    source: "tradingeconomics",
    title,
    country: event.Country || event.country || "",
    currencies: currenciesFromEvent(event),
    impact: normalizeImpact(event.Importance || event.importance),
    time: new Date(time).toISOString(),
    actual: event.Actual ?? event.actual,
    forecast: event.Forecast ?? event.forecast,
    previous: event.Previous ?? event.previous,
    raw: event
  };
}

export async function fetchTradingEconomicsCalendar({ from, to } = {}) {
  const client = process.env.TRADING_ECONOMICS_CLIENT;
  const secret = process.env.TRADING_ECONOMICS_SECRET;
  if (!client || !secret) {
    const error = new Error("Trading Economics credentials are not configured.");
    error.status = 400;
    throw error;
  }

  const start = from || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const end = to || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data } = await axios.get(`https://api.tradingeconomics.com/calendar/country/all/${start}/${end}`, {
    params: { c: `${client}:${secret}`, f: "json" },
    timeout: 20000,
    proxy: false
  });

  return Array.isArray(data) ? data.map(normalizeTradingEconomicsEvent) : [];
}

export async function syncFundamentalEvents({ provider = "tradingeconomics", from, to } = {}) {
  if (provider !== "tradingeconomics") {
    const error = new Error(`Unsupported fundamentals provider: ${provider}`);
    error.status = 400;
    throw error;
  }
  const events = await fetchTradingEconomicsCalendar({ from, to });
  return saveFundamentalEvents(events);
}

export async function addManualFundamentalEvent(input) {
  const title = String(input.title || "").trim();
  if (!title) {
    const error = new Error("title is required.");
    error.status = 400;
    throw error;
  }
  const time = new Date(input.time);
  if (!Number.isFinite(time.getTime())) {
    const error = new Error("A valid event time is required.");
    error.status = 400;
    throw error;
  }

  return saveFundamentalEvent({
    source: "manual",
    title,
    country: input.country || "",
    currencies: Array.isArray(input.currencies) ? input.currencies : [input.currency || "USD"],
    impact: normalizeImpact(input.impact || "HIGH"),
    time: time.toISOString(),
    actual: input.actual,
    forecast: input.forecast,
    previous: input.previous,
    raw: input
  });
}

export { listFundamentalEvents };
