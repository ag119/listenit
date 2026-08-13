#!/usr/bin/env node
/**
 * Curls every app — the static list in js/apps-data.js, plus anything added
 * to the Firestore `apps` collection (see scripts/add-app.mjs / README
 * "Adding an app without redeploying") — and writes status.json at the repo
 * root. Runs server-side (GitHub Actions) because most third-party sites
 * don't send CORS headers, so the browser can't reliably tell "reachable
 * but broken" (e.g. a Vercel deployment returning 402) from "actually
 * fine" on its own.
 *
 * Firestore apps are included only if credentials are available (see
 * loadFirebaseApps() below) — without them this just checks the static
 * list, same as before. Firestore entries override a static entry with the
 * same id, matching the merge behaviour in js/app.js's loadFirebaseApps().
 *
 * Usage: node scripts/healthcheck.mjs
 */
import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const STATIC_APPS = (await import(path.join(ROOT, "js", "apps-data.js"))).default;

const TIMEOUT_MS = 12000;

/**
 * Looks for Firebase Admin credentials in, in order:
 *   1. FIREBASE_SERVICE_ACCOUNT env var (JSON string) — how GitHub Actions
 *      supplies it, via a repo secret. See .github/workflows/healthcheck.yml
 *      and README "Covering Firebase-added apps in the health check".
 *   2. serviceAccountKey.json at the repo root — same file used locally by
 *      scripts/seed-firebase.mjs / add-app.mjs.
 * Returns [] (not an error) if neither is present, or if firebase-admin
 * isn't installed — health-checking Firestore apps is optional, the static
 * list always gets checked regardless.
 */
async function loadFirebaseApps() {
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT?.trim()) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch {
      console.warn("FIREBASE_SERVICE_ACCOUNT is set but isn't valid JSON — skipping Firestore apps.");
      return [];
    }
  } else {
    try {
      serviceAccount = JSON.parse(await readFile(path.join(ROOT, "serviceAccountKey.json"), "utf8"));
    } catch {
      console.log("No Firebase credentials found (FIREBASE_SERVICE_ACCOUNT / serviceAccountKey.json) — checking the static list only.");
      return [];
    }
  }

  let admin;
  try {
    admin = (await import("firebase-admin")).default;
  } catch {
    console.warn("firebase-admin isn't installed (run `npm install`) — skipping Firestore apps.");
    return [];
  }

  try {
    const fbApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    const snap = await admin.firestore(fbApp).collection("apps").get();
    const apps = [];
    snap.forEach((d) => apps.push({ id: d.id, ...d.data() }));
    console.log(`Loaded ${apps.length} app(s) from Firestore.`);
    return apps;
  } catch (err) {
    console.warn("Failed to read Firestore `apps` collection — skipping.", err.message || err);
    return [];
  }
}

function mergeApps(staticApps, firebaseApps) {
  const byId = new Map(staticApps.map((a) => [a.id, a]));
  for (const a of firebaseApps) {
    if (a && a.id) byId.set(a.id, a); // Firestore overrides a static entry with the same id
  }
  return [...byId.values()];
}

async function checkOne(app) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const result = { id: app.id, url: app.url, checkedAt: new Date().toISOString() };
  try {
    const res = await fetch(app.url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "ListenIt-HealthCheck/1.0 (+https://listenit.in)" }
    });
    result.statusCode = res.status;
    result.up = res.status >= 200 && res.status < 400;
  } catch (err) {
    result.up = false;
    result.error = err.name === "AbortError" ? "timeout" : String(err.message || err);
  } finally {
    clearTimeout(t);
  }
  return result;
}

async function main() {
  const firebaseApps = await loadFirebaseApps();
  const apps = mergeApps(STATIC_APPS, firebaseApps);

  const results = await Promise.all(apps.map(checkOne));

  const statusPath = path.join(ROOT, "status.json");
  let previous = null;
  try {
    previous = JSON.parse(await readFile(statusPath, "utf8"));
  } catch { /* first run, no previous file */ }

  const statusByApp = {};
  for (const r of results) {
    statusByApp[r.id] = {
      up: r.up,
      statusCode: r.statusCode ?? null,
      error: r.error ?? null,
      checkedAt: r.checkedAt
    };
  }

  const payload = { generatedAt: new Date().toISOString(), apps: statusByApp };
  await writeFile(statusPath, JSON.stringify(payload, null, 2) + "\n");

  const changed = !previous || JSON.stringify(previous.apps) !== JSON.stringify(statusByApp);

  for (const r of results) {
    const flag = r.up ? "UP  " : "DOWN";
    console.log(`${flag}  ${r.id.padEnd(20)} ${r.statusCode ?? r.error ?? ""}`);
  }
  console.log(changed ? "\nstatus.json changed." : "\nstatus.json unchanged.");

  // Signal to the workflow whether a commit is needed.
  if (process.env.GITHUB_OUTPUT) {
    await writeFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`, { flag: "a" });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
