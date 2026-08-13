/**
 * Loaded as a module (see index.html script tag) — modules are deferred, so
 * this runs after js/firebase-config.js and js/app.js (both classic
 * scripts) have already executed. It upgrades the window.ListenIt no-op
 * stub in place; app.js never needs to know whether that's happened.
 *
 * Only does anything if js/firebase-config.js has real values. Any failure
 * along the way (bad config, offline, ad blocker, Firebase outage) is
 * caught and logged — the site keeps working on the no-op stub either way.
 */
const SDK_VERSION = "10.12.2";
const cfg = window.LISTENIT_FIREBASE_CONFIG || {};
const isConfigured = !!cfg.apiKey && !cfg.apiKey.startsWith("YOUR_");

if (isConfigured) {
  init().catch((err) => {
    console.warn("[ListenIt] Firebase failed to initialize, continuing without it.", err);
    announce(false);
  });
} else {
  announce(false);
}

function announce(ok) {
  window.dispatchEvent(new CustomEvent("listenit-firebase-ready", { detail: { ok } }));
}

async function init() {
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`);
  const { getFirestore, doc, getDoc, collection, getDocs, updateDoc, increment } =
    await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`);

  const app = initializeApp(cfg);
  const db = getFirestore(app);

  /* ---------------- Analytics ---------------- */
  try {
    const { getAnalytics, logEvent, isSupported } =
      await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-analytics.js`);
    if (await isSupported()) {
      const analytics = getAnalytics(app);
      window.ListenIt.trackEvent = (name, params) => {
        try { logEvent(analytics, name, params || {}); } catch (e) { /* ignore */ }
      };
    }
  } catch (e) {
    console.warn("[ListenIt] Analytics unavailable", e);
  }

  /* ---------------- App listings ----------------
   * Public read-only per firestore.rules — clients can never write here.
   * Add/edit entries via the Firebase Console's Firestore data tab, or
   * scripts/add-app.mjs, not from the site itself. See README "Firebase".
   */
  window.ListenIt.getApps = async () => {
    try {
      const snap = await getDocs(collection(db, "apps"));
      const out = [];
      snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
      return out;
    } catch (e) {
      return [];
    }
  };

  /* ---------------- Trending (play counts) ---------------- */
  window.ListenIt.recordPlay = async (appId) => {
    try {
      await updateDoc(doc(db, "appStats", appId), { plays: increment(1) });
    } catch (e) {
      // Doc may not exist yet (new app not seeded, see README) or rules
      // rejected it — sorting/badges just fall back to 0, nothing breaks.
    }
  };
  window.ListenIt.getTrendingCounts = async () => {
    try {
      const snap = await getDocs(collection(db, "appStats"));
      const out = {};
      snap.forEach((d) => { out[d.id] = d.data().plays || 0; });
      return out;
    } catch (e) {
      return {};
    }
  };

  /* ---------------- Reactions ---------------- */
  const REACTION_KEYS = ["fire", "heart", "sad"];
  window.ListenIt.react = async (appId, key) => {
    if (!REACTION_KEYS.includes(key)) return;
    try {
      await updateDoc(doc(db, "reactions", appId), { [key]: increment(1) });
    } catch (e) { /* ignore */ }
  };
  window.ListenIt.getReactionCounts = async (appId) => {
    try {
      const snap = await getDoc(doc(db, "reactions", appId));
      return snap.exists() ? snap.data() : {};
    } catch (e) {
      return {};
    }
  };

  /* ---------------- Live user count ---------------- */
  if (cfg.databaseURL) {
    try {
      const { getAuth, signInAnonymously, onAuthStateChanged } =
        await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`);
      const { getDatabase, ref, onValue, onDisconnect, set, off } =
        await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-database.js`);

      const auth = getAuth(app);
      const rtdb = getDatabase(app);

      const user = await new Promise((resolve) => {
        const unsub = onAuthStateChanged(auth, (u) => {
          if (u) { unsub(); resolve(u); }
        });
        signInAnonymously(auth).catch(() => resolve(null));
      });

      if (user) {
        const myRef = ref(rtdb, `presence/${user.uid}`);
        const connectedRef = ref(rtdb, ".info/connected");
        onValue(connectedRef, (snap) => {
          if (snap.val() === true) {
            onDisconnect(myRef).remove();
            set(myRef, true);
          }
        });
      }

      window.ListenIt.subscribeLiveUsers = (cb) => {
        const presenceRef = ref(rtdb, "presence");
        const handler = (snap) => {
          const val = snap.val();
          cb(val ? Object.keys(val).length : 0);
        };
        onValue(presenceRef, handler);
        return () => off(presenceRef, "value", handler);
      };
    } catch (e) {
      console.warn("[ListenIt] Live user count unavailable", e);
    }
  }

  announce(true);
}
