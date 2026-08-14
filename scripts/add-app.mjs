#!/usr/bin/env node
/**
 * Adds one app to the live site WITHOUT a redeploy — writes straight to
 * Firestore (which js/firebase-app.mjs's getApps() reads on every page
 * load), plus its appStats/reactions/ratings docs so trending, reactions
 * and ratings all work immediately. This is the CLI alternative to adding the doc by hand in
 * the Firebase Console; either works equally well (client writes are
 * disabled by firestore.rules, this only works because it uses your own
 * admin credentials).
 *
 * Usage:
 *   npm install
 *   node scripts/add-app.mjs '{
 *     "id": "night-auto-radio",
 *     "name": "Night Auto Radio",
 *     "url": "https://example.com",
 *     "domain": "example.com",
 *     "tagline": "One short line about it.",
 *     "category": "Desi Nostalgia",
 *     "embeddable": true
 *   }'
 *
 * Or from a file:
 *   node scripts/add-app.mjs --file my-app.json
 *
 * "thumbnail" is optional — omit it and the site falls back to a generic
 * placeholder image plus the live thum.io screenshot, same as everything
 * else. Needs serviceAccountKey.json at the repo root, see
 * scripts/seed-firebase.mjs.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import admin from "firebase-admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FIELDS = ["id", "name", "url", "domain", "tagline", "category"];

function readInput() {
  const args = process.argv.slice(2);
  if (args[0] === "--file") {
    if (!args[1]) { console.error("Usage: node scripts/add-app.mjs --file my-app.json"); process.exit(1); }
    return readFileSync(path.resolve(args[1]), "utf8");
  }
  if (args[0]) return args[0];
  console.error(
    "Usage:\n" +
    "  node scripts/add-app.mjs '{\"id\":\"...\", \"name\":\"...\", \"url\":\"...\", \"domain\":\"...\", \"tagline\":\"...\", \"category\":\"...\"}'\n" +
    "  node scripts/add-app.mjs --file my-app.json"
  );
  process.exit(1);
}

let app;
try {
  app = JSON.parse(readInput());
} catch (e) {
  console.error("That wasn't valid JSON:", e.message);
  process.exit(1);
}

const missing = REQUIRED_FIELDS.filter((f) => !app[f]);
if (missing.length) {
  console.error("Missing required field(s): " + missing.join(", "));
  process.exit(1);
}
if (typeof app.embeddable !== "boolean") app.embeddable = true;
if (!app.addedAt) app.addedAt = new Date().toISOString().slice(0, 10);

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

const { id, ...fields } = app;

await db.collection("apps").doc(id).set(fields);
await db.collection("appStats").doc(id).set({ plays: FieldValue.increment(0) }, { merge: true });
await db.collection("reactions").doc(id).set(
  {
    fire: FieldValue.increment(0),
    heart: FieldValue.increment(0),
    sad: FieldValue.increment(0)
  },
  { merge: true }
);
await db.collection("ratings").doc(id).set(
  { sum: FieldValue.increment(0), count: FieldValue.increment(0) },
  { merge: true }
);

console.log(`Added "${fields.name}" (${id}) — it'll show up on the site on next page load, no redeploy needed.`);
process.exit(0);
