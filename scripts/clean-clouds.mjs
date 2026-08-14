#!/usr/bin/env node
/**
 * Deletes expired message clouds from the Realtime Database. Not required
 * for correctness — js/app.js already hides any cloud whose expiresAt has
 * passed, and RTDB rules block clients from writing past their allotted
 * TTL (see database.rules.json) — this just keeps the /clouds node from
 * growing forever, since RTDB has no server-side TTL of its own. Safe to
 * run any time, e.g. from cron; deletes nothing that's still visible on
 * the site.
 *
 * Usage:
 *   npm install
 *   node scripts/clean-clouds.mjs
 *
 * Needs serviceAccountKey.json at the repo root, see scripts/seed-firebase.mjs.
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

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://listenit-ae6a9-default-rtdb.firebaseio.com"
});
const db = admin.database();

const snap = await db.ref("clouds").once("value");
const clouds = snap.val() || {};
const now = Date.now();
const expiredIds = Object.keys(clouds).filter((id) => (clouds[id].expiresAt || 0) < now);

if (!expiredIds.length) {
  console.log(`Nothing to clean — ${Object.keys(clouds).length} cloud(s), all still active.`);
  process.exit(0);
}

const updates = {};
expiredIds.forEach((id) => { updates[id] = null; });
await db.ref("clouds").update(updates);

console.log(`Deleted ${expiredIds.length} expired cloud(s), ${Object.keys(clouds).length - expiredIds.length} still active.`);
process.exit(0);
