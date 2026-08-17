/**
 * Firebase web config — this is NOT a secret. Firebase's client config is
 * designed to be public (it's in every Firebase web app's page source);
 * the actual security boundary is the Firestore/Database rules in
 * firebase-rules/, not hiding these values. See README "Firebase setup".
 *
 * Fill these in from: Firebase Console → Project settings → General →
 * Your apps → SDK setup and configuration → Config.
 * Leave apiKey as "YOUR_API_KEY" to keep Firebase disabled — the site
 * works identically either way, see js/firebase-app.mjs.
 */
window.LISTENIT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBRuxTfmj-Etslzfv-3mU7uWSjxn7yBbbs",
  authDomain: "listenit-ae6a9.firebaseapp.com",
  projectId: "listenit-ae6a9",
  storageBucket: "listenit-ae6a9.firebasestorage.app",
  messagingSenderId: "665006992120",
  appId: "1:665006992120:web:60b8038d5a7bc044b1690d",
  measurementId: "G-Y62NV4X4G5",
  // Realtime Database, used only for the live-user-count feature.
  databaseURL: "https://listenit-ae6a9-default-rtdb.firebaseio.com"
};

/**
 * Safe no-op stub, active from page load. js/firebase-app.mjs (loaded as a
 * module, so it runs after this classic script) upgrades these functions in
 * place once — and only if — Firebase actually initializes. Every call site
 * in app.js can call window.ListenIt.* unconditionally: before upgrade (or
 * if Firebase is left unconfigured, or fails to load) these just no-op, so
 * the rest of the site behaves exactly as it does without Firebase at all.
 */
window.ListenIt = {
  trackEvent() {},
  async recordPlay() {},
  async getTrendingCounts() { return {}; },
  async react() {},
  async getReactionCounts() { return {}; },
  subscribeLiveUsers() { return () => {}; },
  async getApps() { return []; },
  async rate() {},
  async getAllRatings() { return {}; },
  async postCloud() { return null; },
  async replyToCloud() { return false; },
  subscribeClouds() { return () => {}; },
  async rateSite() {},
  async getSiteRating() { return { sum: 0, count: 0 }; },
  async submitFeedback() { return null; },
  async getFeedback() { return []; },
  async voteFeedback() { return false; }
};
