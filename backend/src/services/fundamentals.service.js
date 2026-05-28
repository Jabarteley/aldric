import { listFundamentalEvents, saveFundamentalEvent, saveFundamentalEvents } from "../models/FundamentalEvent.js";
import { getEconomicEvents } from "./economicCalendar.service.js";

function normalizeImpact(value) {
  const clean = String(value || "").toUpperCase();
  if (["HIGH", "3", "IMPORTANT"].includes(clean)) return "HIGH";
  if (["MEDIUM", "2", "MODERATE"].includes(clean)) return "MEDIUM";
  if (["LOW", "1"].includes(clean)) return "LOW";
  return clean || "UNKNOWN";
}

export async function syncFundamentalEvents({ from, to } = {}) {
  const result = await getEconomicEvents({ from, to });
  if (!result.available) return [];
  const events = result.events.map((event) => ({ ...event, impact: normalizeImpact(event.impact) }));
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
