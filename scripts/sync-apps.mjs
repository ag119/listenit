#!/usr/bin/env node
/**
 * Pushes every app in js/apps-data.js into Firestore's `apps` collection —
 * makes Firestore a live mirror of the static file, so the client's
 * getApps()/loadFirebaseApps() (js/firebase-app.mjs, js/app.js) has real
 * data to merge in instead of an empty collection, and so you can edit or
 * add listings later via the Firebase Console without touching code (see
 * README "Adding an app without redeploying").
 *
 * Upsert only — safe to re-run any time (e.g. after editing apps-data.js).
 * It does NOT delete Firestore docs for apps removed from the static file;
 * remove those by hand in the Console if you want the mirror exact.
 *
 * Also ensures every app has appStats/reactions/ratings docs (same as
 * scripts/seed-firebase.mjs — running both isn't necessary, this alone
 * covers it).
 *
 * Usage: node scripts/sync-apps.mjs
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import admin from "firebase-admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const keyPath = path.join(ROOT, "serviceAccountKey.json");

let serviceAccount;
try {
  serviceAccount = JSON.parse(await readFile(keyPath, "utf8"));
} catch {
  console.error(
    `Missing ${keyPath}.\n` +
    "Download it from Firebase Console → Project settings → Service accounts → Generate new private key,\n" +
    "and save it as serviceAccountKey.json at the repo root."
  );
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const { FieldValue } = admin.firestore;

const APPS = (await import(path.join(ROOT, "js", "apps-data.js"))).default;

// Firestore batched writes cap at 500 ops; chunk generously under that.
async function commitInChunks(items, buildOp) {
  const CHUNK = 400;
  for (let i = 0; i < items.length; i += CHUNK) {
    const batch = db.batch();
    for (const item of items.slice(i, i + CHUNK)) buildOp(batch, item);
    await batch.commit();
  }
}

await commitInChunks(APPS, (batch, app) => {
  const { id, ...fields } = app;
  batch.set(db.collection("apps").doc(id), fields);
});
console.log(`Synced ${APPS.length} app(s) to the Firestore "apps" collection.`);

await commitInChunks(APPS, (batch, app) => {
  batch.set(db.collection("appStats").doc(app.id), { plays: FieldValue.increment(0) }, { merge: true });
  batch.set(
    db.collection("reactions").doc(app.id),
    { fire: FieldValue.increment(0), heart: FieldValue.increment(0), sad: FieldValue.increment(0) },
    { merge: true }
  );
  batch.set(
    db.collection("ratings").doc(app.id),
    { sum: FieldValue.increment(0), count: FieldValue.increment(0) },
    { merge: true }
  );
});
console.log(`Ensured appStats/reactions/ratings docs for ${APPS.length} app(s).`);

process.exit(0);
