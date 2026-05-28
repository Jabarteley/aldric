import axios from "axios";

const AVOIDANCE_WINDOW_MS = 30 * 60 * 1000;

const SYMBOL_CURRENCIES = {
  BTCUSDT: ["USD"],
  BTCUSD: ["USD"],
  XAUUSD: ["USD"],
  EURUSD: ["EUR", "USD"],
  GBPUSD: ["GBP", "USD"],
  USDJPY: ["USD", "JPY"],
  GBPJPY: ["GBP", "JPY"]
};

function dateOnly(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function configuredProvider() {
  return String(process.env.ECONOMIC_CALENDAR_PROVIDER || "fmp").toLowerCase();
}

function normalizeImpact(value) {
  const clean = String(value || "").trim().toUpperCase();
  if (["HIGH", "3", "IMPORTANT", "HIGH IMPACT"].includes(clean)) return "HIGH";
  if (["MEDIUM", "2", "MODERATE", "MEDIUM IMPACT"].includes(clean)) return "MEDIUM";
  if (["LOW", "1", "LOW IMPACT"].includes(clean)) return "LOW";
  return clean || "UNKNOWN";
}

function countryToCurrency(country = "") {
  const clean = String(country).toUpperCase();
  if (["US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA"].includes(clean)) return "USD";
  if (["EU", "EMU", "EURO AREA", "EURO ZONE", "EUROZONE"].includes(clean)) return "EUR";
  if (["UK", "GB", "GREAT BRITAIN", "UNITED KINGDOM"].includes(clean)) return "GBP";
  if (["JP", "JAPAN"].includes(clean)) return "JPY";
  return "";
}

function symbolCurrencies(symbol) {
  const clean = String(symbol || "").toUpperCase().replace(/[^A-Z]/g, "");
  return SYMBOL_CURRENCIES[clean] || [];
}

function eventCurrencies(event) {
  const raw = event.currency || event.Currency || event.currencies;
  if (Array.isArray(raw)) return raw.map((item) => String(item).toUpperCase()).filter(Boolean);
  if (raw) return [String(raw).toUpperCase()];
  const mapped = countryToCurrency(event.country || event.Country);
  return mapped ? [mapped] : [];
}

function normalizeFmpEvent(event) {
  const time = event.date || event.time || event.datetime;
  const title = event.event || event.title || event.name || "Economic Event";
  return {
    id: `fmp_${time}_${title}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180),
    source: "fmp",
    title,
    country: event.country || "",
    currencies: eventCurrencies(event),
    impact: normalizeImpact(event.impact || event.importance),
    time: new Date(time).toISOString(),
    actual: event.actual,
    forecast: event.forecast,
    previous: event.previous,
    raw: event
  };
}

function normalizeFinnhubEvent(event) {
  const time = event.time || event.date || event.datetime;
  const title = event.event || event.title || event.name || "Economic Event";
  return {
    id: `finnhub_${time}_${title}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180),
    source: "finnhub",
    title,
    country: event.country || "",
    currencies: eventCurrencies(event),
    impact: normalizeImpact(event.impact || event.importance),
    time: new Date(time).toISOString(),
    actual: event.actual,
    forecast: event.estimate ?? event.forecast,
    previous: event.prev ?? event.previous,
    raw: event
  };
}

function normalizeTradingEconomicsEvent(event) {
  const time = event.Date || event.date;
  const title = event.Event || event.event || event.Category || "Economic Event";
  return {
    id: `tradingeconomics_${event.CalendarId || `${time}_${title}`}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180),
    source: "tradingeconomics",
    title,
    country: event.Country || event.country || "",
    currencies: eventCurrencies(event),
    impact: normalizeImpact(event.Importance || event.importance),
    time: new Date(time).toISOString(),
    actual: event.Actual ?? event.actual,
    forecast: event.Forecast ?? event.forecast,
    previous: event.Previous ?? event.previous,
    raw: event
  };
}

function filterEvents(events, { countries = [], currencies = [], impact } = {}) {
  const countrySet = new Set(countries.map((item) => String(item).toUpperCase()));
  const currencySet = new Set(currencies.map((item) => String(item).toUpperCase()));
  const impactSet = Array.isArray(impact)
    ? new Set(impact.map((item) => normalizeImpact(item)))
    : impact
      ? new Set([normalizeImpact(impact)])
      : null;

  return events.filter((event) => {
    if (countrySet.size && !countrySet.has(String(event.country || "").toUpperCase())) return false;
    if (currencySet.size && !event.currencies?.some((currency) => currencySet.has(currency))) return false;
    if (impactSet && !impactSet.has(normalizeImpact(event.impact))) return false;
    return true;
  });
}

async function fetchFmpEvents({ from, to }) {
  if (!process.env.FMP_API_KEY) return { available: false, provider: "fmp", events: [], reason: "FMP_API_KEY is not configured." };
  const { data } = await axios.get("https://financialmodelingprep.com/api/v3/economic_calendar", {
    params: {
      from: dateOnly(from),
      to: dateOnly(to),
      apikey: process.env.FMP_API_KEY
    },
    timeout: 15000,
    proxy: false
  });
  return { available: true, provider: "fmp", events: Array.isArray(data) ? data.map(normalizeFmpEvent) : [] };
}

async function fetchFinnhubEvents({ from, to }) {
  if (!process.env.FINNHUB_API_KEY) return { available: false, provider: "finnhub", events: [], reason: "FINNHUB_API_KEY is not configured." };
  const { data } = await axios.get("https://finnhub.io/api/v1/calendar/economic", {
    params: {
      from: dateOnly(from),
      to: dateOnly(to),
      token: process.env.FINNHUB_API_KEY
    },
    timeout: 15000,
    proxy: false
  });
  const rows = Array.isArray(data?.economicCalendar) ? data.economicCalendar : Array.isArray(data) ? data : [];
  return { available: true, provider: "finnhub", events: rows.map(normalizeFinnhubEvent) };
}

async function fetchTradingEconomicsEvents({ from, to }) {
  const client = process.env.TRADING_ECONOMICS_CLIENT;
  const secret = process.env.TRADING_ECONOMICS_SECRET;
  if (!client || !secret) {
    return { available: false, provider: "tradingeconomics", events: [], reason: "Trading Economics credentials are not configured." };
  }
  const { data } = await axios.get(`https://api.tradingeconomics.com/calendar/country/all/${dateOnly(from)}/${dateOnly(to)}`, {
    params: { c: `${client}:${secret}`, f: "json" },
    timeout: 20000,
    proxy: false
  });
  return {
    available: true,
    provider: "tradingeconomics",
    events: Array.isArray(data) ? data.map(normalizeTradingEconomicsEvent) : []
  };
}

export async function getEconomicEvents({ from, to, countries = [], currencies = [], impact } = {}) {
  const start = from || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const end = to || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const provider = configuredProvider();

  try {
    const result =
      provider === "finnhub"
        ? await fetchFinnhubEvents({ from: start, to: end })
        : provider === "tradingeconomics"
          ? await fetchTradingEconomicsEvents({ from: start, to: end })
          : await fetchFmpEvents({ from: start, to: end });

    return {
      ...result,
      events: filterEvents(result.events || [], { countries, currencies, impact })
    };
  } catch (error) {
    return {
      available: false,
      provider,
      events: [],
      reason: `Economic calendar unavailable. ${error.message}`
    };
  }
}

export async function checkHighImpactEventRisk({ symbol, now = new Date() } = {}) {
  const affectedCurrencies = symbolCurrencies(symbol);
  if (!affectedCurrencies.length) {
    return {
      hasHighImpactEvent: false,
      symbol,
      affectedCurrencies,
      events: [],
      riskLevel: "NONE",
      calendarStatus: "SKIPPED",
      provider: configuredProvider(),
      reason: "No economic-calendar currency mapping is configured for this symbol."
    };
  }

  const currentTime = new Date(now);
  const from = new Date(currentTime.getTime() - AVOIDANCE_WINDOW_MS).toISOString();
  const to = new Date(currentTime.getTime() + AVOIDANCE_WINDOW_MS).toISOString();
  const calendar = await getEconomicEvents({ from, to, currencies: affectedCurrencies, impact: "HIGH" });

  if (!calendar.available) {
    return {
      hasHighImpactEvent: false,
      symbol,
      affectedCurrencies,
      events: [],
      riskLevel: "NONE",
      calendarStatus: "UNAVAILABLE",
      provider: calendar.provider,
      warning: "Economic calendar unavailable. News-risk filter was skipped.",
      reason: calendar.reason || "Economic calendar unavailable. News-risk filter was skipped."
    };
  }

  const events = calendar.events.filter((event) => {
    const eventTime = new Date(event.time).getTime();
    return Number.isFinite(eventTime) && Math.abs(eventTime - currentTime.getTime()) <= AVOIDANCE_WINDOW_MS;
  });

  return {
    hasHighImpactEvent: events.length > 0,
    symbol,
    affectedCurrencies,
    events,
    riskLevel: events.length ? "HIGH" : "NONE",
    calendarStatus: "AVAILABLE",
    provider: calendar.provider,
    reason: events.length
      ? `High-impact ${affectedCurrencies.join("/")} event is inside the 30-minute news avoidance window.`
      : "No matching high-impact event inside the 30-minute avoidance window."
  };
}
