#!/usr/bin/env node
/**
 * Creates (or safely re-touches, without resetting existing counts) the
 * appStats/{id} and reactions/{id} Firestore docs every app in
 * js/apps-data.js needs. Required because firestore.rules deliberately
 * disallows clients from creating these docs themselves (only
 * increment-by-1 updates are allowed) — so an admin has to pre-create them.
 *
 * Run this once after setting up Firebase, and again any time you add a
 * new app to js/apps-data.js.
 *
 * Usage:
 *   npm install
 *   node scripts/seed-firebase.mjs
 *
 * Needs serviceAccountKey.json at the repo root — download it from
 * Firebase Console → Project settings → Service accounts → Generate new
 * private key. That file IS a secret (unlike js/firebase-config.js) — it's
 * already in .gitignore, keep it that way.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import admin from "firebase-admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const keyPath = path.join(ROOT, "serviceAccountKey.json");

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
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

for (const app of APPS) {
  // increment(0) creates the field at 0 if missing, and leaves it untouched
  // if it already exists — safe to re-run any time.
  await db.collection("appStats").doc(app.id).set({ plays: FieldValue.increment(0) }, { merge: true });
  await db.collection("reactions").doc(app.id).set(
    {
      fire: FieldValue.increment(0),
      heart: FieldValue.increment(0),
      sad: FieldValue.increment(0)
    },
    { merge: true }
  );
  console.log("seeded", app.id);
}

console.log(`\nDone — ${APPS.length} app(s) seeded.`);
process.exit(0);
