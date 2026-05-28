import admin from "firebase-admin";

let firestore;

export function initializeFirebase() {
  if (firestore) return firestore;

  if (!admin.apps.length) {
    const hasInlineCredentials =
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY;

    if (hasInlineCredentials) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
        })
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    }
  }

  firestore = admin.firestore();
  return firestore;
}

export function getDb() {
  if (!firestore) return initializeFirebase();
  return firestore;
}
