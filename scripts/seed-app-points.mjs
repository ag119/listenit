#!/usr/bin/env node
/**
 * One-time Decibel (dB) score seed for the Amplify ranking — every app
 * gets a starting score computed from its existing weighted rating and
 * play count, exactly once. After that, only approved appPointRequests
 * (via the admin tool) ever move an app's score.
 *
 * Formula: 100 base + up to 100 from its IMDb-weighted rating (same
 * formula as appWeightedScore() in js/app.js, reimplemented here against
 * live Firestore data since this runs outside the browser) + up to 100
 * from play count (capped at 500 plays so one viral app can't blow the
 * scale out for everyone else). A brand new, unrated, unplayed app still
 * starts at a respectable ~100 rather than 0, so it isn't buried before
 * anyone's had a chance to see it.
 *
 * Idempotent by design — skips any app that already has an appPoints doc,
 * so it's safe to re-run after adding new apps to js/apps-data.js; it
 * will only seed the new ones, never re-touch a score someone already
 * paid to move.
 *
 * Usage:
 *   node scripts/seed-app-points.mjs
 *
 * Needs serviceAccountKey.json at the repo root (gitignored) — see
 * scripts/seed-firebase.mjs for how to get one.
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

const APPS = (await import(path.join(ROOT, "js", "apps-data.js"))).default;

const IMDB_M = 5;
const BASE_POINTS = 100;
const MAX_RATING_BONUS = 100;
const MAX_PLAYS_BONUS = 100;
const PLAYS_CAP = 500;

const [statsSnap, ratingsSnap] = await Promise.all([
  db.collection("appStats").get(),
  db.collection("ratings").get()
]);
const plays = {};
statsSnap.forEach((d) => { plays[d.id] = d.data().plays || 0; });
const ratings = {};
ratingsSnap.forEach((d) => { ratings[d.id] = d.data(); });

let totalSum = 0, totalCount = 0;
Object.values(ratings).forEach((r) => { totalSum += r.sum || 0; totalCount += r.count || 0; });
const globalMean = totalCount > 0 ? totalSum / totalCount : 0;

function weightedRating(sum, count) {
  if (count === 0) return globalMean;
  const R = sum / count;
  return (count / (count + IMDB_M)) * R + (IMDB_M / (count + IMDB_M)) * globalMean;
}

let seeded = 0, skipped = 0;
for (const app of APPS) {
  const existing = await db.collection("appPoints").doc(app.id).get();
  if (existing.exists) { skipped++; continue; }

  const r = ratings[app.id];
  const wr = weightedRating(r ? r.sum || 0 : 0, r ? r.count || 0 : 0); // 0–5
  const ratingBonus = Math.round((wr / 5) * MAX_RATING_BONUS);
  const playsBonus = Math.round((Math.min(plays[app.id] || 0, PLAYS_CAP) / PLAYS_CAP) * MAX_PLAYS_BONUS);
  const points = BASE_POINTS + ratingBonus + playsBonus;

  await db.collection("appPoints").doc(app.id).set({ points });
  seeded++;
  console.log(`${app.id.padEnd(28)} ${String(points).padStart(4)} dB  (rating ${wr.toFixed(2)}, plays ${plays[app.id] || 0})`);
}

console.log(`\nSeeded ${seeded} app(s), skipped ${skipped} already-seeded app(s).`);
process.exit(0);
