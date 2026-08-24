/**
 * Shared between promote.html (leaderboard/status) and promote-submit.html
 * (the actual form) — both classic scripts, loaded before their own
 * page-specific script, so everything here hangs off window.PromoteShared
 * rather than using ES modules (matches the rest of the site, which has no
 * build step).
 */
(function () {
  "use strict";

  const WHATSAPP_NUMBER = "918853487447";
  const UPI_ID = "8853487447@ybl";
  const MIN_BID = 100;

  const LI = window.ListenIt || {
    trackEvent() {},
    async getSocialListings() { return []; },
    async getSocialListingRejections() { return []; },
    async submitSocialListingRequest() { return null; },
    async deleteSocialListingRequest() { return false; }
  };

  const platformIcon = { Instagram: "📷", YouTube: "▶️", "X / Twitter": "𝕏", Facebook: "📘", Other: "🔗" };

  // Known platforms get an auto-generated profile link from just the
  // handle — one less thing to type, and one less thing to get wrong.
  // "Other" has no fixed domain, so it always needs a manual URL.
  const PLATFORM_URL = {
    Instagram: { base: "https://instagram.com/", domains: ["instagram.com"] },
    YouTube: { base: "https://youtube.com/@", domains: ["youtube.com", "youtu.be"] },
    "X / Twitter": { base: "https://x.com/", domains: ["x.com", "twitter.com"] },
    Facebook: { base: "https://facebook.com/", domains: ["facebook.com", "fb.com"] }
  };
  function buildProfileUrl(platform, rawHandle) {
    const conf = PLATFORM_URL[platform];
    if (!conf || !rawHandle) return "";
    return conf.base + rawHandle;
  }
  // Only meaningful once someone's typed a non-auto-generated link in —
  // checks it's actually on the platform's own domain, https, and not
  // (say) a Google link pasted into the Instagram field by mistake.
  function urlMatchesPlatform(platform, url) {
    const conf = PLATFORM_URL[platform];
    if (!conf) return /^https:\/\/.+/.test(url.trim()); // "Other" — any https link
    try {
      const u = new URL(url.trim());
      if (u.protocol !== "https:") return false;
      const host = u.hostname.toLowerCase().replace(/^www\./, "");
      return conf.domains.some((d) => host === d || host.endsWith("." + d));
    } catch (e) {
      return false;
    }
  }

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
  function formatRupees(n) {
    return "₹" + Number(n).toLocaleString("en-IN");
  }

  function sortedListings(listings) {
    return [...listings].sort((a, b) => {
      if (b.bidAmount !== a.bidAmount) return b.bidAmount - a.bidAmount;
      return tsMillis(a.createdAt) - tsMillis(b.createdAt);
    });
  }
  // Minimum bid needed to occupy a given 1-indexed rank right now.
  function priceForRank(listings, rank) {
    const sorted = sortedListings(listings);
    const holder = sorted[rank - 1];
    if (!holder) return MIN_BID;
    return Math.max(MIN_BID, holder.bidAmount + 1);
  }
  // Rank a given bid amount would land at right now (ties lose to existing entries — first-come-first-served).
  function rankForPrice(listings, amount) {
    const sorted = sortedListings(listings);
    return sorted.filter((l) => l.bidAmount >= amount).length + 1;
  }
  // The actual current rank of an already-listed id (not a hypothetical bid).
  function rankOf(listings, id) {
    const idx = sortedListings(listings).findIndex((l) => l.id === id);
    return idx === -1 ? null : idx + 1;
  }
  function findExistingListing(listings, platform, handle) {
    if (!handle.trim()) return null;
    const key = listingKey(platform, handle);
    return listings.find((l) => l.id === key) || null;
  }

  // Deterministic key from platform+handle — used as the Firestore doc id
  // for both socialListingRequests and (once approved) socialListings, so
  // resubmitting the same account overwrites its own pending request
  // instead of creating a duplicate, and the admin tool can tell "is this
  // a top-up" just by checking whether this id already exists.
  function listingKey(platform, handle) {
    const p = platform.toLowerCase().replace(/[^a-z0-9]/g, "");
    const h = handle.trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9]/g, "");
    return `${p}_${h}`;
  }

  /* ---------------- "Your entries" — remembered locally, not an account -----------
   * There's no login on this site, so "which entries are mine" only ever
   * means "which ones did I submit from this browser" — tracked here, not
   * a source of truth for anything security-relevant (submitting is
   * already keyed by platform+handle regardless of who's asking, see
   * firestore.rules). This is purely a courtesy so a returning visitor
   * sees their own status and doesn't wonder whether their earlier
   * submission accidentally created a duplicate.
   */
  const MY_LISTINGS_KEY = "listenit_my_listings";
  function getMyListings() {
    try { return JSON.parse(localStorage.getItem(MY_LISTINGS_KEY)) || []; } catch (e) { return []; }
  }
  function saveMyListing(entry) {
    const all = getMyListings();
    const idx = all.findIndex((e) => e.key === entry.key);
    if (idx >= 0) all[idx] = entry; else all.push(entry);
    localStorage.setItem(MY_LISTINGS_KEY, JSON.stringify(all));
  }
  function removeMyListing(key) {
    localStorage.setItem(MY_LISTINGS_KEY, JSON.stringify(getMyListings().filter((e) => e.key !== key)));
  }
  // "Mine" only ever means "this browser submitted it" — there's no login
  // to check against. Not cryptographic proof of ownership (someone could
  // clear storage, or type a matching handle straight into the form on a
  // different device), but it stops the obvious path — a stranger
  // browsing the leaderboard clicking Boost on someone else's card — and
  // the admin still reviews every request by hand before anything changes.
  function isMine(id) {
    return getMyListings().some((e) => e.key === id);
  }

  // A rejection only counts if it happened after this browser's *current*
  // submission for that account — otherwise resubmitting a previously
  // rejected entry would keep showing "Rejected" forever, since the old
  // rejection doc never gets deleted (the client can't write to it).
  function rejectionFor(entry, rejections) {
    const r = rejections.find((x) => x.id === entry.key);
    if (!r) return null;
    const rejectedAtMs = r.rejectedAt && typeof r.rejectedAt.seconds === "number" ? r.rejectedAt.seconds * 1000 : 0;
    if (!rejectedAtMs || rejectedAtMs <= (entry.submittedAt || 0)) return null;
    return r;
  }

  /* ---------------- Cross-page handoff for Boost / Edit & resubmit ----------------
   * promote.html's leaderboard and "Your entries" panel can't fill in the
   * form directly any more — it lives on promote-submit.html now. A tiny
   * sessionStorage handoff carries the prefill data across the navigation;
   * promote-submit.js reads and clears it on load.
   */
  const PREFILL_KEY = "listenit_promote_prefill";
  function goToSubmitWithPrefill(payload) {
    try { sessionStorage.setItem(PREFILL_KEY, JSON.stringify(payload)); } catch (e) { /* ignore */ }
    window.location.href = "promote-submit.html";
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

  /* ---------------- Shareable card ----------------
   * Rendered entirely client-side with Canvas — no backend, no image
   * hosting. Uses the Web Share API with a real file where that's
   * supported (Android Chrome, iOS Safari 16.4+) so it drops straight
   * into WhatsApp/Instagram's native share sheet; falls back to
   * downloading the PNG plus opening a WhatsApp share with the text,
   * since most desktop browsers can't share files at all.
   */
  function truncateText(s, max) {
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
  }

  function buildShareCanvas(entry) {
    const W = 1080, H = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#7c3aed");
    grad.addColorStop(1, "#ec4899");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = "700 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("🎧 LISTENIT LEADERBOARD", W / 2, 140);

    ctx.fillStyle = "#ffffff";
    if (entry.pending) {
      ctx.font = "800 52px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("I JUST BID", W / 2, 330);
      ctx.font = "900 150px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(formatRupees(entry.bidAmount), W / 2, 490);
    } else {
      ctx.font = "800 52px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("RANKED", W / 2, 330);
      ctx.font = "900 190px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("#" + entry.rank, W / 2, 510);
    }

    ctx.font = "700 46px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(truncateText(entry.displayName || "Someone", 22), W / 2, entry.pending ? 600 : 630);

    ctx.font = "500 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(`${platformIcon[entry.platform] || "🔗"} ${entry.platform} · ${truncateText(entry.handle || "", 24)}`, W / 2, entry.pending ? 655 : 685);

    if (!entry.pending) {
      ctx.font = "600 30px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(`${formatRupees(entry.bidAmount)} bid`, W / 2, 735);
    }

    ctx.font = "700 30px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("List your page too 👉 listenit.in/promote.html", W / 2, H - 90);

    return canvas;
  }

  async function shareEntry(entry) {
    const canvas = buildShareCanvas(entry);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) { showToast("Couldn't generate the image — try again"); return; }

    const shareText = entry.pending
      ? `I just bid ${formatRupees(entry.bidAmount)} on ListenIt's leaderboard! 🏆`
      : `I'm ranked #${entry.rank} on ListenIt's leaderboard! 🏆`;
    const fileName = "listenit-leaderboard.png";

    let file = null;
    try { file = new File([blob], fileName, { type: "image/png" }); } catch (e) { /* File constructor unsupported — fall through */ }

    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "ListenIt Leaderboard", text: shareText + "\nhttps://listenit.in/promote.html" });
        LI.trackEvent("share_listing", { pending: !!entry.pending });
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return; // explicit cancel — don't nag with a fallback
      }
    }

    // Fallback: download the image, then open WhatsApp with the caption —
    // no way to attach a file to a wa.me link, so they attach it by hand.
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showToast("Image downloaded — attach it when you share!");
    const waText = encodeURIComponent(shareText + "\nhttps://listenit.in/promote.html");
    window.open(`https://wa.me/?text=${waText}`, "_blank", "noopener");
    LI.trackEvent("share_listing_fallback", { pending: !!entry.pending });
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

  window.PromoteShared = {
    WHATSAPP_NUMBER, UPI_ID, MIN_BID, LI, platformIcon, PLATFORM_URL,
    buildProfileUrl, urlMatchesPlatform,
    showToast, tsMillis, timeAgo, formatRupees, listingKey,
    sortedListings, priceForRank, rankForPrice, rankOf, findExistingListing,
    getMyListings, saveMyListing, removeMyListing, isMine, rejectionFor,
    goToSubmitWithPrefill, consumePrefill,
    truncateText, buildShareCanvas, shareEntry
  };
})();
