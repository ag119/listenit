#!/usr/bin/env node
/**
 * Creates the two Amplify pricing config docs with sensible starting
 * values, if they don't already exist. After this, prices are edited
 * from the admin tool (admin-tool/index.html) — this script won't
 * overwrite values that are already there, so it's safe to re-run.
 *
 * Usage:
 *   node scripts/seed-amplify-config.mjs
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
  console.error(`Missing ${keyPath}. See scripts/seed-firebase.mjs for how to get one.`);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const DEFAULTS = {
  featuredPricing: { rank1: 50, rank2: 40, rank3: 30, rank4: 20, rank5: 15 },
  pointsPricing: { upPerPoint: 5, downPerPoint: 10 }
};

for (const [id, data] of Object.entries(DEFAULTS)) {
  const ref = db.collection("config").doc(id);
  const snap = await ref.get();
  if (snap.exists) {
    console.log(`config/${id} already exists — left untouched.`);
    continue;
  }
  await ref.set(data);
  console.log(`config/${id} created:`, data);
}

process.exit(0);
