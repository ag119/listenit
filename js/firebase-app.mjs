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
  const { getFirestore, doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, increment, serverTimestamp } =
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

  /* ---------------- Ratings ----------------
   * Stored as a running sum + count per app (average = sum/count, computed
   * client-side) rather than one doc per rater — there's no auth on this
   * site to key a per-user doc off of anyway. firestore.rules only allows
   * a write that bumps count by 1 and sum by 1–5 in the same update, i.e.
   * exactly one new star rating, ever — see the rules file for why that
   * also means a rating can't be changed once cast (increment-only).
   */
  window.ListenIt.rate = async (appId, stars) => {
    const n = Math.round(stars);
    if (!(n >= 1 && n <= 5)) return;
    try {
      await updateDoc(doc(db, "ratings", appId), { sum: increment(n), count: increment(1) });
    } catch (e) { /* ignore — UI already applied it optimistically */ }
  };
  window.ListenIt.getAllRatings = async () => {
    try {
      const snap = await getDocs(collection(db, "ratings"));
      const out = {};
      snap.forEach((d) => { out[d.id] = d.data(); });
      return out;
    } catch (e) {
      return {};
    }
  };

  /* ---------------- Site rating ----------------
   * How people feel about ListenIt itself, not any one app — same running
   * sum+count pattern as per-app ratings, but its own doc (`siteRating/
   * overall`) so it can never leak into the `ratings` collection that
   * drives the IMDb-weighted app ranking.
   */
  window.ListenIt.rateSite = async (stars) => {
    const n = Math.round(stars);
    if (!(n >= 1 && n <= 5)) return;
    try {
      await updateDoc(doc(db, "siteRating", "overall"), { sum: increment(n), count: increment(1) });
    } catch (e) { /* ignore — UI already applied it optimistically */ }
  };
  window.ListenIt.getSiteRating = async () => {
    try {
      const snap = await getDoc(doc(db, "siteRating", "overall"));
      return snap.exists() ? snap.data() : { sum: 0, count: 0 };
    } catch (e) {
      return { sum: 0, count: 0 };
    }
  };

  /* ---------------- Feedback & feature requests ----------------
   * A public board — anyone can post an idea, anyone can upvote/downvote
   * it once. Votes are increment-only and create-once per doc, same
   * philosophy as ratings/reactions: no client can edit someone else's
   * post, change its own past vote, or touch anything but the two
   * counters — see firestore.rules for the exact logic.
   */
  window.ListenIt.submitFeedback = async (title, description, authorName) => {
    const t = String(title || "").trim().slice(0, 80);
    if (!t) return null;
    try {
      const ref = await addDoc(collection(db, "featureRequests"), {
        title: t,
        description: String(description || "").trim().slice(0, 300),
        authorName: String(authorName || "").trim().slice(0, 24) || "Anon",
        upvotes: 0,
        downvotes: 0,
        status: "open",
        createdAt: serverTimestamp()
      });
      return ref.id;
    } catch (e) {
      return null;
    }
  };
  window.ListenIt.getFeedback = async () => {
    try {
      const snap = await getDocs(collection(db, "featureRequests"));
      const out = [];
      snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
      return out;
    } catch (e) {
      return [];
    }
  };
  window.ListenIt.voteFeedback = async (id, direction) => {
    const field = direction === "up" ? "upvotes" : "downvotes";
    try {
      await updateDoc(doc(db, "featureRequests", id), { [field]: increment(1) });
      return true;
    } catch (e) {
      return false;
    }
  };

  /* ---------------- Social listing board (promote.html) ----------------
   * Public leaderboard, ranked by bid amount — `socialListings` is
   * read-only from the client (every write happens through the local
   * admin tool, only after a payment is manually verified, see
   * firestore.rules). Submitting a bid files a request into
   * `socialListingRequests`, which the client can write but never read
   * back — see firestore.rules for why.
   *
   * Both collections are keyed by a deterministic id derived from
   * platform+handle (js/promote.js's listingKey()), not an auto-id.
   * Resubmitting the same account overwrites its own pending request
   * instead of creating a duplicate — the bug that motivated this was a
   * real one: a client that briefly re-enabled its submit button let one
   * person's impatient re-clicks pile up four identical requests.
   */
  window.ListenIt.getSocialListings = async () => {
    try {
      const snap = await getDocs(collection(db, "socialListings"));
      const out = [];
      snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
      return out;
    } catch (e) {
      return [];
    }
  };
  window.ListenIt.submitSocialListingRequest = async (key, data) => {
    try {
      await setDoc(doc(db, "socialListingRequests", key), {
        displayName: String(data.displayName || "").trim().slice(0, 40),
        platform: data.platform,
        handle: String(data.handle || "").trim().slice(0, 40),
        url: String(data.url || "").trim().slice(0, 200),
        tagline: String(data.tagline || "").trim().slice(0, 140),
        bidAmount: Math.round(Number(data.bidAmount)),
        contactNote: String(data.contactNote || "").trim().slice(0, 140),
        submittedAt: serverTimestamp()
      });
      return key;
    } catch (e) {
      return null;
    }
  };

  /* ---------------- Live user count ---------------- */
  if (cfg.databaseURL) {
    try {
      const { getAuth, signInAnonymously, onAuthStateChanged } =
        await import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`);
      const { getDatabase, ref, onValue, onDisconnect, set, off, push, get, update, serverTimestamp } =
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

      /* ---------------- Message clouds ----------------
       * Floating, self-expiring public messages. RTDB has no server-side
       * TTL, so expiry is enforced two ways: database.rules.json caps how
       * far a write can push expiresAt into the future, and the client
       * only ever renders clouds whose expiresAt is still ahead of
       * Date.now() (see js/app.js) — an expired cloud just stops being
       * drawn, nothing has to delete it (scripts/clean-clouds.mjs prunes
       * them from the DB later so it doesn't grow forever).
       */
      const CLOUD_BASE_TTL_MS = 3 * 60 * 1000;
      const CLOUD_REPLY_BONUS_MS = 60 * 1000;
      const CLOUD_MAX_LIFETIME_MS = 30 * 60 * 1000;
      const CLOUD_MAX_REPLIES = 40;

      window.ListenIt.postCloud = async (name, text) => {
        if (!user) return null;
        const newRef = push(ref(rtdb, "clouds"));
        try {
          await set(newRef, {
            name: String(name).trim().slice(0, 24),
            text: String(text).trim().slice(0, 100),
            createdAt: serverTimestamp(),
            expiresAt: Date.now() + CLOUD_BASE_TTL_MS,
            replyCount: 0
          });
          return newRef.key;
        } catch (e) {
          return null;
        }
      };

      // A plain multi-path update (not a transaction — RTDB transactions
      // re-validate the *entire* node on commit, which would trip the
      // create-only rule on every existing reply). Reads current
      // replyCount/expiresAt first to compute the bump, so two replies
      // landing in the same instant can in theory race and the loser gets
      // rejected by the rules — acceptable at this site's scale (same
      // trust level as reactions/ratings), and worth one retry rather than
      // silently dropping the reply.
      async function attemptReply(cloudId, name, text) {
        const snap = await get(ref(rtdb, `clouds/${cloudId}`));
        if (!snap.exists()) return false;
        const cur = snap.val();
        if ((cur.replyCount || 0) >= CLOUD_MAX_REPLIES) return false;
        const replyKey = push(ref(rtdb, `clouds/${cloudId}/replies`)).key;
        const newExpiresAt = Math.min(
          (cur.expiresAt || Date.now()) + CLOUD_REPLY_BONUS_MS,
          (cur.createdAt || Date.now()) + CLOUD_MAX_LIFETIME_MS
        );
        await update(ref(rtdb), {
          [`clouds/${cloudId}/replyCount`]: (cur.replyCount || 0) + 1,
          [`clouds/${cloudId}/expiresAt`]: newExpiresAt,
          [`clouds/${cloudId}/replies/${replyKey}`]: {
            name: String(name).trim().slice(0, 24),
            text: String(text).trim().slice(0, 100),
            createdAt: serverTimestamp()
          }
        });
        return true;
      }
      window.ListenIt.replyToCloud = async (cloudId, name, text) => {
        if (!user) return false;
        try {
          return await attemptReply(cloudId, name, text);
        } catch (e) {
          try {
            return await attemptReply(cloudId, name, text); // one retry against fresh data
          } catch (e2) {
            return false;
          }
        }
      };

      window.ListenIt.subscribeClouds = (cb) => {
        const cloudsRef = ref(rtdb, "clouds");
        const handler = (snap) => {
          const val = snap.val() || {};
          cb(Object.keys(val).map((id) => ({ id, ...val[id] })));
        };
        onValue(cloudsRef, handler);
        return () => off(cloudsRef, "value", handler);
      };
    } catch (e) {
      console.warn("[ListenIt] Live user count / message clouds unavailable", e);
    }
  }

  announce(true);
}
