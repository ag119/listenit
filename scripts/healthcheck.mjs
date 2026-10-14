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

const TIMEOUT_MS = 15000;
// Checking every app at once (the old Promise.all) exhausted sockets/DNS on
// the runner — dozens of perfectly healthy sites came back "fetch failed" in
// the same run. A small pool keeps the load realistic.
const CONCURRENCY = 8;
// Network errors, timeouts and 5xx are retried within a run before counting
// as a failure at all.
const ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;
// A site must fail this many runs in a row (runs are ~30 min apart) before
// it's reported down, unless it returned a definitive client error.
const FAILURES_BEFORE_DOWN = 2;
const BROWSER_UA = "Mozilla/5.0 (compatible; ListenIt-HealthCheck/1.0; +https://listenit.in)";

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function attemptOnce(app) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(app.url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": BROWSER_UA, "Accept": "text/html,*/*" }
    });
    // Drain the body so the socket is released instead of piling up.
    try { await res.arrayBuffer(); } catch { /* ignore */ }
    return { statusCode: res.status, ok: res.status >= 200 && res.status < 400 };
  } catch (err) {
    return { ok: false, error: err.name === "AbortError" ? "timeout" : String(err.cause?.code || err.message || err) };
  } finally {
    clearTimeout(t);
  }
}

// 4xx (other than timeout/rate-limit codes) is the site telling us it's
// gone or disabled — no point retrying or waiting a second run.
function isDefinitive(r) {
  const c = r.statusCode;
  return c >= 400 && c < 500 && c !== 408 && c !== 425 && c !== 429;
}

async function checkOne(app, previousEntry) {
  const result = { id: app.id, url: app.url, checkedAt: new Date().toISOString() };
  let last;
  for (let i = 0; i < ATTEMPTS; i++) {
    last = await attemptOnce(app);
    if (last.ok || isDefinitive(last)) break;
    if (i < ATTEMPTS - 1) await sleep(RETRY_DELAY_MS * (i + 1));
  }
  result.statusCode = last.statusCode;
  result.error = last.error;

  if (last.ok) {
    result.up = true;
    result.failures = 0;
  } else if (isDefinitive(last)) {
    result.up = false;
    result.failures = FAILURES_BEFORE_DOWN;
  } else {
    // Transient-looking failure (network error, timeout, 5xx): only flip to
    // down once it's repeated across consecutive runs.
    result.failures = ((previousEntry && previousEntry.failures) || 0) + 1;
    result.up = result.failures < FAILURES_BEFORE_DOWN;
  }
  return result;
}

async function runPool(items, worker) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await worker(items[i]);
    }
  }));
  return out;
}

async function main() {
  const firebaseApps = await loadFirebaseApps();
  const apps = mergeApps(STATIC_APPS, firebaseApps);

  const statusPath = path.join(ROOT, "status.json");
  let previous = null;
  try {
    previous = JSON.parse(await readFile(statusPath, "utf8"));
  } catch { /* first run, no previous file */ }

  const results = await runPool(apps, (app) => checkOne(app, previous?.apps?.[app.id]));

  const statusByApp = {};
  for (const r of results) {
    statusByApp[r.id] = {
      up: r.up,
      statusCode: r.statusCode ?? null,
      error: r.error ?? null,
      failures: r.failures,
      checkedAt: r.checkedAt
    };
  }

  const payload = { generatedAt: new Date().toISOString(), apps: statusByApp };
  await writeFile(statusPath, JSON.stringify(payload, null, 2) + "\n");

  const changed = !previous || JSON.stringify(previous.apps) !== JSON.stringify(statusByApp);

  for (const r of results) {
    const flag = r.up ? (r.failures ? "WARN" : "UP  ") : "DOWN";
    console.log(`${flag}  ${r.id.padEnd(24)} ${r.statusCode ?? r.error ?? ""}`);
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
