import { getDb } from "../config/db.js";

const COLLECTION = "fundamentalEvents";

function serializeDoc(doc) {
  const data = doc.data();
  return { id: doc.id, ...data };
}

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, stripUndefined(item)])
    );
  }
  return value;
}

export async function saveFundamentalEvent(event) {
  const db = getDb();
  const id = event.id || `${event.source || "manual"}_${event.country || "GLOBAL"}_${event.time}_${event.title}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180);
  const payload = stripUndefined({
    ...event,
    id,
    updatedAt: new Date().toISOString()
  });
  await db.collection(COLLECTION).doc(id).set(payload, { merge: true });
  return payload;
}

export async function saveFundamentalEvents(events = []) {
  const saved = [];
  for (const event of events) {
    saved.push(await saveFundamentalEvent(event));
  }
  return saved;
}

export async function listFundamentalEvents({ from, to, limit = 100 } = {}) {
  const db = getDb();
  const snapshot = await db.collection(COLLECTION).limit(Math.min(limit, 500)).get();
  const fromMs = from ? new Date(from).getTime() : 0;
  const toMs = to ? new Date(to).getTime() : Number.MAX_SAFE_INTEGER;
  return snapshot.docs
    .map(serializeDoc)
    .filter((event) => {
      const time = new Date(event.time).getTime();
      return Number.isFinite(time) && time >= fromMs && time <= toMs;
    })
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

export async function relevantEventsForSymbol(symbol, windowMinutes = 30) {
  const now = Date.now();
  const from = new Date(now - windowMinutes * 60 * 1000).toISOString();
  const to = new Date(now + windowMinutes * 60 * 1000).toISOString();
  const events = await listFundamentalEvents({ from, to, limit: 300 });
  const cleanSymbol = String(symbol || "").toUpperCase();
  return events.filter((event) => {
    const impact = String(event.impact || "").toUpperCase();
    const currencies = Array.isArray(event.currencies) ? event.currencies.map((item) => String(item).toUpperCase()) : [];
    if (impact !== "HIGH") return false;
    if (cleanSymbol.includes("XAU") || cleanSymbol.includes("BTC")) return currencies.includes("USD") || currencies.includes("GLOBAL");
    return currencies.some((currency) => cleanSymbol.includes(currency));
  });
}
