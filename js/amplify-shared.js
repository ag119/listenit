/**
 * Shared between the homepage's Amplify teaser section, amplify.html
 * (rankings/Spotlight/activity), and amplify-submit.html (the boost /
 * Spotlight forms) — classic scripts, loaded after js/apps-data.js (for
 * the global APPS array) and before any page-specific script, so
 * everything here hangs off window.AmplifyShared. Mirrors the structure
 * of js/promote-shared.js, kept as its own file rather than merged with
 * it since the two features (social listings vs. app rankings) don't
 * otherwise share any state.
 */
(function () {
  "use strict";

  const WHATSAPP_NUMBER = "918853487447";
  const UPI_ID = "8853487447@ybl";

  const LI = window.ListenIt || {
    trackEvent() {},
    async getAppPoints() { return {}; },
    async getFeaturedApps() { return []; },
    async getAppPointActivity() { return []; },
    async getAppPointRejections() { return []; },
    async getFeaturedAppRejections() { return []; },
    async getAmplifyConfig() { return {}; },
    async submitAppPointRequest() { return null; },
    async deleteAppPointRequest() { return false; },
    async submitFeaturedAppRequest() { return null; },
    async deleteFeaturedAppRequest() { return false; }
  };

  function showToast(msg) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove("hidden");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.add("hidden"), 2400);
  }

  function tsMillis(ts) {
    if (ts && typeof ts.seconds === "number") return ts.seconds * 1000;
    return 0;
  }
  function timeAgo(ms) {
    const diff = Date.now() - ms;
    const min = Math.floor(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return min + "m ago";
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + "h ago";
    return Math.floor(hr / 24) + "d ago";
  }
  function daysLeft(ms) {
    const days = Math.ceil((ms - Date.now()) / 86400000);
    if (days <= 0) return "today";
    if (days === 1) return "1 day";
    return days + " days";
  }
  function formatRupees(n) {
    return "₹" + Number(n).toLocaleString("en-IN");
  }
  function formatDb(n) {
    return Number(n).toLocaleString("en-IN") + " dB";
  }

  // js/apps-data.js must be loaded before this script — APPS is its global.
  const APPS_BY_ID = {};
  (typeof APPS !== "undefined" ? APPS : []).forEach((a) => { APPS_BY_ID[a.id] = a; });
  function appById(id) {
    return APPS_BY_ID[id] || null;
  }
  function allApps() {
    return typeof APPS !== "undefined" ? APPS : [];
  }

  /* ---------------- "Your requests" — remembered locally, not an account ----------------
   * Same reasoning as promote.js's "Your entries": there's no login on
   * this site, so this is just "what did this browser ask for," a
   * courtesy status display, not a security boundary. Holds both dB
   * requests and Spotlight requests in one list, told apart by `kind`.
   */
  const MY_REQUESTS_KEY = "listenit_my_amplify_requests";
  function getMyRequests() {
    try { return JSON.parse(localStorage.getItem(MY_REQUESTS_KEY)) || []; } catch (e) { return []; }
  }
  function saveMyRequest(entry) {
    const all = getMyRequests();
    const idx = all.findIndex((e) => e.id === entry.id);
    if (idx >= 0) all[idx] = entry; else all.push(entry);
    localStorage.setItem(MY_REQUESTS_KEY, JSON.stringify(all));
  }
  function removeMyRequest(id) {
    localStorage.setItem(MY_REQUESTS_KEY, JSON.stringify(getMyRequests().filter((e) => e.id !== id)));
  }

  // A rejection only counts if it's newer than this browser's own last
  // submission for that id — same resubmit-clears-rejection logic as
  // promote-shared.js's rejectionFor().
  function rejectionFor(entry, rejections) {
    const r = rejections.find((x) => x.id === entry.id);
    if (!r) return null;
    const rejectedAtMs = r.rejectedAt && typeof r.rejectedAt.seconds === "number" ? r.rejectedAt.seconds * 1000 : 0;
    if (!rejectedAtMs || rejectedAtMs <= (entry.submittedAt || 0)) return null;
    return r;
  }

  /* ---------------- Cross-page handoff to amplify-submit.html ---------------- */
  const PREFILL_KEY = "listenit_amplify_prefill";
  function goToSubmitWithPrefill(payload) {
    try { sessionStorage.setItem(PREFILL_KEY, JSON.stringify(payload)); } catch (e) { /* ignore */ }
    window.location.href = "amplify-submit.html";
  }
  function consumePrefill() {
    try {
      const raw = sessionStorage.getItem(PREFILL_KEY);
      sessionStorage.removeItem(PREFILL_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /* ---------------- Theme (standalone copy — these pages don't load js/app.js) ---------------- */
  function initTheme() {
    const root = document.documentElement;
    const themeToggle = document.getElementById("themeToggle");
    const sunIcon = document.getElementById("themeIconSun");
    const moonIcon = document.getElementById("themeIconMoon");
    if (!themeToggle) return;
    function applyTheme(theme) {
      if (theme === "light") {
        root.setAttribute("data-theme", "light");
        sunIcon.classList.remove("hidden");
        moonIcon.classList.add("hidden");
      } else {
        root.setAttribute("data-theme", "dark");
        sunIcon.classList.add("hidden");
        moonIcon.classList.remove("hidden");
      }
    }
    const savedTheme = localStorage.getItem("listenit-theme");
    applyTheme(savedTheme || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
    themeToggle.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(next);
      localStorage.setItem("listenit-theme", next);
    });
  }
  initTheme();

  window.AmplifyShared = {
    WHATSAPP_NUMBER, UPI_ID, LI,
    showToast, tsMillis, timeAgo, daysLeft, formatRupees, formatDb,
    appById, allApps,
    getMyRequests, saveMyRequest, removeMyRequest, rejectionFor,
    goToSubmitWithPrefill, consumePrefill
  };
})();
