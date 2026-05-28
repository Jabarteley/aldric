import { getDb } from "../config/db.js";

const COLLECTION = "signals";

function serializeDoc(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
  };
}

export async function createSignal(signal) {
  const db = getDb();
  const payload = {
    ...signal,
    createdAt: new Date().toISOString()
  };
  const ref = await db.collection(COLLECTION).add(payload);
  return { id: ref.id, ...payload };
}

export async function getSignals(limit = 50) {
  const db = getDb();
  const snapshot = await db
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snapshot.docs.map(serializeDoc);
}

export async function getSignalById(id) {
  const db = getDb();
  const doc = await db.collection(COLLECTION).doc(id).get();
  return doc.exists ? serializeDoc(doc) : null;
}

export async function deleteSignalById(id) {
  const db = getDb();
  await db.collection(COLLECTION).doc(id).delete();
}
