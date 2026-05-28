import { getDb } from "../config/db.js";

const COLLECTION = "appSettings";

export async function getSetting(id) {
  const db = getDb();
  const doc = await db.collection(COLLECTION).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function upsertSetting(id, data) {
  const db = getDb();
  const payload = {
    ...data,
    updatedAt: new Date().toISOString()
  };
  await db.collection(COLLECTION).doc(id).set(payload, { merge: true });
  return { id, ...payload };
}
