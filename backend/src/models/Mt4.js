import { getDb } from "../config/db.js";

const collections = {
  marketData: "mt4MarketData",
  accounts: "mt4Accounts",
  orders: "mt4Orders",
  tradeResults: "mt4TradeResults",
  scans: "mt4Scans"
};

function cleanSymbol(symbol = "") {
  return String(symbol).replace(/[^a-zA-Z0-9._-]/g, "").toUpperCase();
}

function serializeDoc(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
  };
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

export function marketDataId(accountId, symbol, timeframe) {
  return `${accountId}_${cleanSymbol(symbol)}_${timeframe}`;
}

export async function saveMt4MarketData(payload) {
  const db = getDb();
  const id = marketDataId(payload.accountId, payload.symbol, payload.timeframe);
  const data = stripUndefined({
    ...payload,
    symbol: cleanSymbol(payload.symbol),
    updatedAt: new Date().toISOString()
  });
  await db.collection(collections.marketData).doc(id).set(data, { merge: true });
  return { id, ...data };
}

export async function getMt4MarketData(accountId, symbol, timeframe = "M15") {
  const db = getDb();
  const doc = await db.collection(collections.marketData).doc(marketDataId(accountId, symbol, timeframe)).get();
  return doc.exists ? serializeDoc(doc) : null;
}

export async function listMt4MarketData(accountId, limit = 50) {
  const db = getDb();
  const snapshot = await db
    .collection(collections.marketData)
    .where("accountId", "==", accountId)
    .limit(limit)
    .get();
  return snapshot.docs
    .map(serializeDoc)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

export async function saveMt4Account(payload) {
  const db = getDb();
  const data = stripUndefined({
    ...payload,
    updatedAt: new Date().toISOString()
  });
  await db.collection(collections.accounts).doc(payload.accountId).set(data, { merge: true });
  return { id: payload.accountId, ...data };
}

export async function getMt4Account(accountId) {
  const db = getDb();
  const doc = await db.collection(collections.accounts).doc(accountId).get();
  return doc.exists ? serializeDoc(doc) : null;
}

export async function createMt4Order(payload) {
  const db = getDb();
  const data = stripUndefined({
    ...payload,
    status: payload.status || "PENDING_CONFIRMATION",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  const ref = await db.collection(collections.orders).add(data);
  return { id: ref.id, ...data };
}

export async function getMt4Order(id) {
  const db = getDb();
  const doc = await db.collection(collections.orders).doc(id).get();
  return doc.exists ? serializeDoc(doc) : null;
}

export async function updateMt4Order(id, updates) {
  const db = getDb();
  const data = stripUndefined({
    ...updates,
    updatedAt: new Date().toISOString()
  });
  await db.collection(collections.orders).doc(id).set(data, { merge: true });
  return getMt4Order(id);
}

export async function listMt4Orders(accountId, limit = 50) {
  const db = getDb();
  const snapshot = await db
    .collection(collections.orders)
    .where("accountId", "==", accountId)
    .limit(limit)
    .get();
  return snapshot.docs
    .map(serializeDoc)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

export async function saveMt4Scan(payload) {
  const db = getDb();
  const data = stripUndefined({
    ...payload,
    createdAt: new Date().toISOString()
  });
  const ref = await db.collection(collections.scans).add(data);
  return { id: ref.id, ...data };
}

export async function listMt4Scans(accountId, limit = 20) {
  const db = getDb();
  const snapshot = await db
    .collection(collections.scans)
    .where("accountId", "==", accountId)
    .limit(limit)
    .get();
  return snapshot.docs
    .map(serializeDoc)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

export async function saveMt4TradeResult(payload) {
  const db = getDb();
  const data = stripUndefined({
    ...payload,
    createdAt: new Date().toISOString()
  });
  const ref = await db.collection(collections.tradeResults).add(data);
  if (payload.orderId) {
    await updateMt4Order(payload.orderId, {
      status: "RESULT_REPORTED",
      tradeResultId: ref.id,
      ticket: payload.ticket,
      outcome: payload.outcome,
      profit: Number(payload.profit || 0)
    });
  }
  return { id: ref.id, ...data };
}
