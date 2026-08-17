(function () {
  "use strict";

  const WHATSAPP_NUMBER = "918853487447"; // +91 88534 87447

  // Set up by js/firebase-config.js (always present, no-ops until Firebase
  // is configured and finishes initializing — see js/firebase-app.mjs).
  // Falls back to an inline no-op if that script somehow didn't load (e.g.
  // offline on a first-ever visit, before the service worker has cached
  // it) — every LI.* call below must never throw, or it'd break the whole
  // site, not just the Firebase features.
  const LI = window.ListenIt || {
    trackEvent() {},
    async recordPlay() {},
    async getTrendingCounts() { return {}; },
    async react() {},
    async getReactionCounts() { return {}; },
    subscribeLiveUsers() { return () => {}; },
    async getApps() { return []; }
  };

  /* ---------------- Body scroll lock ----------------
   * Plain `overflow: hidden` on <body> doesn't reliably stop the page from
   * moving on iOS Safari — the underlying page can still shift while a
   * full-screen overlay is open, which on notched iPhones showed up as a
   * gap at the top with the grid/header peeking through above the viewer.
   * The standard fix: pin body in place with a negative top offset instead
   * of just hiding overflow, then restore the exact scroll position after.
   */
  let lockedScrollY = 0;
  function lockBodyScroll() {
    lockedScrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = -lockedScrollY + "px";
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
  }
  function unlockBodyScroll() {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.overflow = "";
    window.scrollTo(0, lockedScrollY);
  }

  // The directory starts as the apps baked into js/apps-data.js (so the
  // page renders instantly with no network wait), then loadFirebaseApps()
  // merges in anything from Firestore once Firebase is ready — that's how
  // new apps can be added without redeploying the site. A Firestore doc
  // whose id matches a static entry overrides it; anything else is added.
  let appsList = APPS.slice();

  /* ---------------- Theme ---------------- */
  const root = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");
  const sunIcon = document.getElementById("themeIconSun");
  const moonIcon = document.getElementById("themeIconMoon");

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
  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    applyTheme(window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  }

  themeToggle.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    applyTheme(next);
    localStorage.setItem("listenit-theme", next);
  });

  /* ---------------- Favorites ---------------- */
  const FAV_KEY = "listenit-favorites";
  function getFavorites() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch { return []; }
  }
  function setFavorites(list) {
    localStorage.setItem(FAV_KEY, JSON.stringify(list));
  }
  function isFavorite(id) { return getFavorites().includes(id); }
  function toggleFavorite(id) {
    const favs = getFavorites();
    const idx = favs.indexOf(id);
    if (idx === -1) favs.push(id); else favs.splice(idx, 1);
    setFavorites(favs);
    return favs.includes(id);
  }

  /* ---------------- Helpers ---------------- */
  function initialsAvatar(name, size = 40) {
    const initial = (name || "?").trim().charAt(0).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#ec4899"/>
      </linearGradient></defs>
      <rect width="${size}" height="${size}" rx="${size * 0.28}" fill="url(#g)"/>
      <text x="50%" y="54%" font-family="Arial, sans-serif" font-weight="700" font-size="${size * 0.5}" fill="#fff" text-anchor="middle" dominant-baseline="middle">${initial}</text>
    </svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.remove("hidden");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.add("hidden"), 2400);
  }

  function getApp(id) { return appsList.find((a) => a.id === id); }

  /* ---------------- Status (up/down) ----------------
   * status.json is written every ~30 min by a GitHub Action that curls each
   * app server-side (js/apps-data.js -> scripts/healthcheck.mjs). We can't
   * reliably do this from the browser: most of these sites don't send CORS
   * headers, so a client-side fetch can't tell "reachable but broken" (e.g. a
   * Vercel deployment returning 402) from "actually fine".
   */
  let STATUS = {};
  function isAppUp(id) {
    const s = STATUS[id];
    return !s || s.up !== false; // unknown/never-checked apps are assumed up
  }
  function loadStatus() {
    fetch("status.json", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.apps) {
          STATUS = data.apps;
          renderGrid();
        }
      })
      .catch(() => { /* no status.json yet (e.g. first deploy) — treat all as up */ });
  }

  /* ---------------- Trending (Firebase-backed play counts) ---------------- */
  let TRENDING = {};
  function loadTrending() {
    LI.getTrendingCounts()
      .then((counts) => {
        if (counts && Object.keys(counts).length) {
          TRENDING = counts;
          invalidateMix();
          renderGrid();
        }
      })
      .catch(() => {});
  }

  function pickRandomApp(excludeId) {
    const upPool = appsList.filter((a) => isAppUp(a.id) && a.id !== excludeId);
    if (upPool.length > 0) return upPool[Math.floor(Math.random() * upPool.length)];
    const anyPool = appsList.filter((a) => a.id !== excludeId);
    const pool = anyPool.length > 0 ? anyPool : appsList;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Merges Firestore-sourced apps into appsList — see js/firebase-app.mjs
  // getApps() and firestore.rules (public read, client writes disallowed;
  // add entries via the Firebase Console or scripts/add-app.mjs instead).
  function loadFirebaseApps() {
    LI.getApps()
      .then((fetched) => {
        if (!fetched || !fetched.length) return;
        const byId = new Map(appsList.map((a) => [a.id, a]));
        fetched.forEach((a) => { if (a && a.id) byId.set(a.id, a); });
        appsList = [...byId.values()];
        invalidateMix();
        renderChips();
        renderGrid();
      })
      .catch(() => {});
  }

  /* ---------------- Chips / categories ---------------- */
  const chipsEl = document.getElementById("chips");
  let activeCategory = "All";
  let searchTerm = "";

  function renderChips() {
    // Recomputed each time, not cached — Firebase-sourced apps (see
    // loadFirebaseApps) can introduce categories the static list didn't have.
    const categories = ["All", ...new Set(appsList.map((a) => a.category)), "★ Favorites"];
    if (!categories.includes(activeCategory)) activeCategory = "All";
    chipsEl.innerHTML = "";
    categories.forEach((cat) => {
      const btn = document.createElement("button");
      btn.className = "chip" + (cat === activeCategory ? " active" : "");
      btn.type = "button";
      btn.textContent = cat;
      btn.addEventListener("click", () => {
        activeCategory = cat;
        renderChips();
        renderGrid();
        LI.trackEvent("filter_category", { category: cat });
      });
      chipsEl.appendChild(btn);
    });
  }

  /* ---------------- Grid ---------------- */
  const gridEl = document.getElementById("grid");
  const emptyState = document.getElementById("emptyState");

  // Live screenshot via thum.io — free, no API key, no backend. Renders
  // straight from the app's own URL, so it's always current with no
  // per-app image to maintain. Falls back to the generated card in
  // thumbnails/ (set as the <img>'s initial src, see cardTemplate) if the
  // screenshot service is slow/unavailable, or for apps we already know
  // are down — a live shot of an error page isn't a useful thumbnail.
  function liveThumbUrl(app) {
    return `https://image.thum.io/get/width/640/crop/400/noanimate/${app.url}`;
  }

  // thum.io occasionally rate-limits with a *valid* ~1KB image saying
  // "Image not authorized, please sign-up for a paid account" instead of an
  // HTTP error — a plain <img onerror> never catches that, the request
  // "succeeds", it just isn't a screenshot. Every real screenshot observed
  // has been well over 10KB, so fetching the bytes and checking size is a
  // simple, content-agnostic way to tell them apart (thum.io sends
  // Access-Control-Allow-Origin: *, so this fetch is allowed cross-origin).
  const MIN_LIVE_THUMB_BYTES = 8000;
  function loadLiveThumb(imgEl, app, fallback) {
    fetch(liveThumbUrl(app))
      .then((res) => {
        if (!res.ok) throw new Error("bad status " + res.status);
        return res.blob();
      })
      .then((blob) => {
        if (blob.size < MIN_LIVE_THUMB_BYTES) throw new Error("too small (" + blob.size + "b), likely a placeholder/error image");
        imgEl.src = URL.createObjectURL(blob);
      })
      .catch(() => { imgEl.src = fallback; });
  }

  // Only fetch a live screenshot once a card actually scrolls near the
  // viewport, instead of firing one thum.io request per card the moment the
  // grid renders. With a handful of apps that burst was harmless; with 18+
  // it was enough simultaneous requests to trip thum.io's rate limit on
  // every single page load (a valid-but-tiny "pay for an account" image —
  // see MIN_LIVE_THUMB_BYTES above — for cards that lost the race).
  const thumbObserver = "IntersectionObserver" in window
    ? new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const data = entry.target._thumbLoad;
          obs.unobserve(entry.target);
          if (data) loadLiveThumb(data.imgEl, data.app, data.fallback);
        });
      }, { rootMargin: "400px 0px" })
    : null;

  function cardTemplate(app) {
    const fav = isFavorite(app.id);
    const down = !isAppUp(app.id);
    const plays = TRENDING[app.id] || 0;
    const rCount = ratingCount(app.id);
    // Apps added via Firestore (see loadFirebaseApps) don't need a thumbnail
    // file shipped with the site — fall back to the generic placeholder.
    const fallbackThumb = app.thumbnail || "thumbnails/placeholder.jpg";
    const card = document.createElement("article");
    card.className = "card" + (down ? " is-down" : "");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", "Open " + app.name + (down ? " (currently down)" : ""));

    card.innerHTML = `
      <div class="card-thumb-wrap">
        <img class="card-thumb" src="${fallbackThumb}" alt="${app.name}" loading="lazy" />
        <button class="card-fav ${fav ? "active" : ""}" type="button" aria-label="${fav ? "Remove from" : "Add to"} favorites" data-id="${app.id}">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 21s-6.7-4.35-9.3-8.1C1 10.1 1.6 6.6 4.6 5.2c2.2-1 4.6-.2 5.9 1.6l1.5 2 1.5-2c1.3-1.8 3.7-2.6 5.9-1.6 3 1.4 3.6 4.9 1.9 7.7C18.7 16.65 12 21 12 21z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
        </button>
        ${down ? `<span class="card-down-badge">Down</span>` : `<span class="card-cat">${app.category}</span>`}
      </div>
      <div class="card-body">
        <h3 class="card-title">${app.name}</h3>
        <p class="card-tagline">${down ? "Looks unreachable right now — tap to check anyway." : app.tagline}</p>
        <div class="card-footer">
          <span class="card-domain">${app.domain}${rCount > 0 ? ` · ⭐ ${avgRating(app.id).toFixed(1)} (${rCount})` : ""}${plays > 0 ? ` · 🔥 ${plays}` : ""}</span>
          <span class="card-open">${down ? "Check ▸" : "Play ▸"}</span>
        </div>
      </div>
    `;

    card.addEventListener("click", (e) => {
      if (e.target.closest(".card-fav")) return;
      openViewer(app.id);
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openViewer(app.id); }
    });
    card.querySelector(".card-fav").addEventListener("click", (e) => {
      e.stopPropagation();
      const nowFav = toggleFavorite(app.id);
      e.currentTarget.classList.toggle("active", nowFav);
      e.currentTarget.setAttribute("aria-label", (nowFav ? "Remove from" : "Add to") + " favorites");
      if (activeCategory === "★ Favorites") renderGrid();
      showToast(nowFav ? "Added to favorites" : "Removed from favorites");
      LI.trackEvent("toggle_favorite", { app_id: app.id, favorited: nowFav });
    });

    // Card paints immediately with the local fallback image, then upgrades
    // to a live screenshot once it's actually near the viewport (see
    // thumbObserver above). Skipped entirely for down apps.
    if (!down) {
      const imgEl = card.querySelector(".card-thumb");
      if (thumbObserver) {
        card._thumbLoad = { imgEl, app, fallback: fallbackThumb };
        thumbObserver.observe(card);
      } else {
        loadLiveThumb(imgEl, app, fallbackThumb);
      }
    }

    return card;
  }

  function filteredApps() {
    return appsList.filter((app) => {
      if (activeCategory === "★ Favorites" && !isFavorite(app.id)) return false;
      if (activeCategory !== "All" && activeCategory !== "★ Favorites" && app.category !== activeCategory) return false;
      if (searchTerm) {
        const hay = (app.name + " " + app.tagline + " " + app.category + " " + app.domain).toLowerCase();
        if (!hay.includes(searchTerm.toLowerCase())) return false;
      }
      return true;
    }).sort((a, b) => {
      const downDiff = Number(isAppUp(a.id) === false) - Number(isAppUp(b.id) === false);
      if (downDiff !== 0) return downDiff; // down apps sink to the end
      const ratingDiff = appWeightedScore(b.id) - appWeightedScore(a.id); // IMDb-weighted; unrated apps all tie at the site mean
      if (ratingDiff !== 0) return ratingDiff;
      return (TRENDING[b.id] || 0) - (TRENDING[a.id] || 0); // tiebreak: most-played first; stable (0-0 ties keep original order)
    });
  }

  // Icon per category section when browsing "All" — similar apps
  // (auto/bus/truck etc.) land in the same section instead of one
  // undifferentiated wall of cards. Section (and Mix) ORDER is dynamic —
  // see categoryWeightedScore below, not a fixed list here. An
  // unrecognized category (e.g. a new one introduced via Firestore, see
  // loadFirebaseApps) just gets a generic icon, nothing breaks.
  const CATEGORY_ICONS = {
    "Transit & Travel": "🚌",
    "Shops & Street Corners": "💈",
    "Work & Trade": "🧵",
    "Festival & Occasions": "🪔",
    "Regional & Folk": "🪕",
    "Ambient Radio": "🎧",
    "Beyond India": "🌍"
  };

  // "Mix" — one app per category, shown as its own section above the rest
  // when browsing "All". Weighted toward each category's top-rated app,
  // but not purely a popularity contest: MIX_DISCOVERY_CHANCE of the time
  // it surfaces a different app from that category instead, so things
  // without ratings yet still get seen. A category with no ratings at all
  // just shuffles. Never surfaces a known-down app.
  const MIX_DISCOVERY_CHANCE = 0.3;
  let mixCache = null;
  function invalidateMix() { mixCache = null; }

  function pickMixApps() {
    const byCategory = new Map();
    appsList.forEach((app) => {
      if (!isAppUp(app.id)) return;
      if (!byCategory.has(app.category)) byCategory.set(app.category, []);
      byCategory.get(app.category).push(app);
    });

    // Categories ranked by their pooled weighted score too — the best
    // corners of the site lead Mix, not just an arbitrary fixed order.
    const orderedCats = [...byCategory.keys()].sort(
      (a, b) => categoryWeightedScore(b) - categoryWeightedScore(a)
    );

    return orderedCats.map((cat) => {
      const pool = byCategory.get(cat);

      // Top-ranked app(s) in the category by weighted score. A tie —
      // most commonly because nobody here has been rated yet, so every
      // app sits at the same site-wide mean — resolves to a random pick
      // among the tied leaders. That's the "shuffle when there's no
      // winner" case; it falls straight out of the formula instead of
      // needing its own branch.
      let best = -Infinity;
      let leaders = [];
      pool.forEach((a) => {
        const score = appWeightedScore(a.id);
        if (score > best) { best = score; leaders = [a]; }
        else if (score === best) leaders.push(a);
      });
      const winner = leaders[Math.floor(Math.random() * leaders.length)];

      // Discovery: only meaningful when there IS a clear winner to deviate
      // from (if everyone's tied, this is already a full shuffle).
      if (pool.length > leaders.length && Math.random() < MIX_DISCOVERY_CHANCE) {
        const alternates = pool.filter((a) => !leaders.includes(a));
        return alternates[Math.floor(Math.random() * alternates.length)];
      }
      return winner;
    }).filter(Boolean);
  }

  function getMixApps() {
    if (!mixCache) mixCache = pickMixApps();
    return mixCache;
  }

  function renderGrid() {
    const apps = filteredApps();
    gridEl.innerHTML = "";
    emptyState.classList.toggle("hidden", apps.length > 0);
    if (apps.length === 0) return;

    // Only group into sections (Mix included) for the unfiltered "All"
    // browse view — a specific category chip, Favorites, or a search are
    // already a single focused list, sections would just add noise there.
    if (activeCategory !== "All" || searchTerm) {
      const flat = document.createElement("div");
      flat.className = "grid";
      apps.forEach((app) => flat.appendChild(cardTemplate(app)));
      gridEl.appendChild(flat);
      return;
    }

    const mixApps = getMixApps();
    if (mixApps.length > 0) {
      const mixSection = document.createElement("section");
      mixSection.className = "category-section mix-section";
      mixSection.innerHTML = `<h2 class="category-heading"><span aria-hidden="true">✨</span>Mix — one from every corner</h2>`;
      const mixGrid = document.createElement("div");
      mixGrid.className = "grid";
      mixApps.forEach((app) => mixGrid.appendChild(cardTemplate(app)));
      mixSection.appendChild(mixGrid);
      gridEl.appendChild(mixSection);
    }

    const byCategory = new Map();
    apps.forEach((app) => {
      if (!byCategory.has(app.category)) byCategory.set(app.category, []);
      byCategory.get(app.category).push(app);
    });
    // Sections ordered by each category's pooled weighted rating — every
    // app in it counted together — so the best-rated corners of the site
    // lead, not a fixed hand-picked order. (Chips keep a stable order —
    // see renderChips — since those are a navigation aid people build
    // muscle memory for; reshuffling them by rating would just be
    // confusing.)
    const orderedCats = [...byCategory.keys()].sort(
      (a, b) => categoryWeightedScore(b) - categoryWeightedScore(a)
    );
    orderedCats.forEach((cat) => {
      const section = document.createElement("section");
      section.className = "category-section";
      section.innerHTML = `<h2 class="category-heading"><span aria-hidden="true">${CATEGORY_ICONS[cat] || "📻"}</span>${cat}</h2>`;
      const grid = document.createElement("div");
      grid.className = "grid";
      byCategory.get(cat).forEach((app) => grid.appendChild(cardTemplate(app)));
      section.appendChild(grid);
      gridEl.appendChild(section);
    });
  }

  const searchInputEl = document.getElementById("searchInput");
  searchInputEl.addEventListener("input", (e) => {
    searchTerm = e.target.value;
    renderGrid();
  });
  searchInputEl.addEventListener("blur", () => {
    if (searchTerm.trim()) LI.trackEvent("search", { term: searchTerm.trim(), results: filteredApps().length });
  });

  document.getElementById("surpriseBtn").addEventListener("click", () => {
    LI.trackEvent("surprise_me");
    openViewer(pickRandomApp().id);
  });

  /* ---------------- Viewer ---------------- */
  const viewer = document.getElementById("viewer");
  const viewerFrame = document.getElementById("viewerFrame");
  const viewerName = document.getElementById("viewerName");
  const viewerFavicon = document.getElementById("viewerFavicon");
  const viewerLoading = document.getElementById("viewerLoading");
  const viewerSlow = document.getElementById("viewerSlow");
  const viewerSlowLink = document.getElementById("viewerSlowLink");
  const viewerSlowRetry = document.getElementById("viewerSlowRetry");
  const viewerBlocked = document.getElementById("viewerBlocked");
  const viewerBlockedLink = document.getElementById("viewerBlockedLink");
  const viewerBlockedName = document.getElementById("viewerBlockedName");
  const viewerDown = document.getElementById("viewerDown");
  const viewerDownName = document.getElementById("viewerDownName");
  const viewerDownLink = document.getElementById("viewerDownLink");
  const viewerDownRetry = document.getElementById("viewerDownRetry");
  const viewerOpenTab = document.getElementById("viewerOpenTab");
  const viewerFav = document.getElementById("viewerFav");
  const viewerShare = document.getElementById("viewerShare");
  const viewerPip = document.getElementById("viewerPip");
  const viewerWakeLock = document.getElementById("viewerWakeLock");
  const viewerBody = document.querySelector(".viewer-body");
  let slowTimer = null;
  let currentApp = null;
  let pipWindow = null;
  const pipSupported = "documentPictureInPicture" in window;

  /* ---------------- Keep screen awake (Wake Lock) ----------------
   * The audio plays inside a cross-origin iframe — the embedded app's own
   * page — which this page has zero DOM access to. That means we can't
   * register the Media Session API on its behalf, so mobile browsers
   * suspend it like any backgrounded iframe once the phone auto-locks;
   * there's no API for a parent page to grant a cross-origin iframe
   * "survive device lock" powers (for good reason — think what a random
   * ad iframe could do with that).
   *
   * The real mitigation: hold a Wake Lock while the viewer's open so the
   * phone never auto-locks from inactivity in the first place — the page
   * simply never backgrounds. Tradeoff is real (screen stays lit, more
   * battery), so it's an opt-in toggle, not a forced default — and
   * whatever the visitor last chose sticks for next time.
   */
  const wakeLockSupported = "wakeLock" in navigator;
  let wakeLockSentinel = null;
  let wakeLockWanted = wakeLockSupported && localStorage.getItem("listenit_wake_lock") === "1";
  async function acquireWakeLock() {
    if (!wakeLockSupported || !wakeLockWanted || wakeLockSentinel) return;
    try {
      wakeLockSentinel = await navigator.wakeLock.request("screen");
      wakeLockSentinel.addEventListener("release", () => { wakeLockSentinel = null; });
    } catch (e) {
      // Denied, unsupported in this context (e.g. backgrounded tab), etc. — no-op.
    }
  }
  function releaseWakeLock() {
    if (wakeLockSentinel) { wakeLockSentinel.release().catch(() => {}); wakeLockSentinel = null; }
  }
  if (wakeLockSupported) {
    viewerWakeLock.classList.remove("hidden");
    viewerWakeLock.classList.toggle("active", wakeLockWanted);
    viewerWakeLock.addEventListener("click", () => {
      wakeLockWanted = !wakeLockWanted;
      localStorage.setItem("listenit_wake_lock", wakeLockWanted ? "1" : "0");
      viewerWakeLock.classList.toggle("active", wakeLockWanted);
      if (wakeLockWanted) { acquireWakeLock(); LI.trackEvent("wake_lock_on", {}); }
      else { releaseWakeLock(); LI.trackEvent("wake_lock_off", {}); }
    });
    // A wake lock is auto-released whenever the tab is hidden (spec
    // behavior) — re-request it once the visitor comes back if they still
    // want it, otherwise it'd silently stop working after any app-switch.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && !viewer.classList.contains("hidden")) acquireWakeLock();
    });
  }

  /* ---------------- Sleep / focus timer ----------------
   * Pure client-side, no backend, works everywhere — unlike Wake Lock or
   * PiP this needs no feature detection. Two modes, only one can run at a
   * time: "sleep" closes the viewer when it elapses (which stops the
   * embedded app the same way the back button does — we own our own
   * iframe's src, no cross-origin issue there); "focus" is a Pomodoro
   * cycle (25 min work / 5 min break, repeating) that just chimes and
   * toasts at each transition without touching playback. Survives
   * switching to a different app in the viewer (the underlying intent —
   * "wind down" or "stay focused" — doesn't change just because the app
   * did), but is cleared whenever the viewer actually closes, same as
   * Wake Lock, since closing always stops playback anyway.
   */
  const viewerTimer = document.getElementById("viewerTimer");
  const timerPanel = document.getElementById("timerPanel");
  const timerPanelClose = document.getElementById("timerPanelClose");
  const timerIdle = document.getElementById("timerIdle");
  const timerActive = document.getElementById("timerActive");
  const timerActiveLabel = document.getElementById("timerActiveLabel");
  const timerActiveCountdown = document.getElementById("timerActiveCountdown");
  const FOCUS_MINUTES = 25;
  const BREAK_MINUTES = 5;
  let timerMode = null; // null | "sleep" | "focus-work" | "focus-break"
  let timerPhaseEndAt = 0;
  let timerTickInterval = null;

  function formatCountdown(ms) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, "0")}`;
  }

  function renderTimerPanel() {
    if (!timerMode) {
      timerIdle.classList.remove("hidden");
      timerActive.classList.add("hidden");
      return;
    }
    timerIdle.classList.add("hidden");
    timerActive.classList.remove("hidden");
    timerActiveLabel.textContent =
      timerMode === "sleep" ? "😴 Stopping playback in"
      : timerMode === "focus-work" ? "🎯 Focus — break in"
      : "☕ Break — back to focus in";
    timerActiveCountdown.textContent = formatCountdown(timerPhaseEndAt - Date.now());
  }

  function stopTimer() {
    timerMode = null;
    clearInterval(timerTickInterval);
    timerTickInterval = null;
    viewerTimer.classList.remove("active");
    renderTimerPanel();
  }

  function onTimerPhaseEnd() {
    if (timerMode === "sleep") {
      playTone([{ freq: 660, start: 0, dur: 0.2 }, { freq: 440, start: 0.16, dur: 0.3 }]);
      showToast("😴 Sleep timer ended — playback stopped");
      stopTimer();
      closeViewer();
    } else if (timerMode === "focus-work") {
      playTone([{ freq: 784, start: 0, dur: 0.15 }, { freq: 988, start: 0.12, dur: 0.2 }]);
      showToast(`🎯 Focus session done — take a ${BREAK_MINUTES} min break`);
      timerMode = "focus-break";
      timerPhaseEndAt = Date.now() + BREAK_MINUTES * 60000;
      renderTimerPanel();
    } else {
      playTone([{ freq: 523, start: 0, dur: 0.15 }, { freq: 659, start: 0.12, dur: 0.2 }]);
      showToast("☕ Break's over — back to focus");
      timerMode = "focus-work";
      timerPhaseEndAt = Date.now() + FOCUS_MINUTES * 60000;
      renderTimerPanel();
    }
  }

  function startTimerTicking() {
    clearInterval(timerTickInterval);
    timerTickInterval = setInterval(() => {
      if (timerPhaseEndAt - Date.now() <= 0) onTimerPhaseEnd();
      else renderTimerPanel();
    }, 1000);
  }

  function startSleepTimer(minutes) {
    timerMode = "sleep";
    timerPhaseEndAt = Date.now() + minutes * 60000;
    viewerTimer.classList.add("active");
    startTimerTicking();
    renderTimerPanel();
    showToast(`😴 Playback will stop in ${minutes} min`);
    LI.trackEvent("sleep_timer_start", { minutes });
  }
  function startFocusTimer() {
    timerMode = "focus-work";
    timerPhaseEndAt = Date.now() + FOCUS_MINUTES * 60000;
    viewerTimer.classList.add("active");
    startTimerTicking();
    renderTimerPanel();
    showToast(`🎯 Focus session started — ${FOCUS_MINUTES} min`);
    LI.trackEvent("focus_timer_start", {});
  }

  function openTimerPanel() {
    closeViewerChat(); // avoid two popovers stacked awkwardly
    renderTimerPanel();
    timerPanel.classList.add("open");
  }
  function closeTimerPanel() {
    timerPanel.classList.remove("open");
  }
  viewerTimer.addEventListener("click", () => {
    if (timerPanel.classList.contains("open")) closeTimerPanel();
    else openTimerPanel();
  });
  timerPanelClose.addEventListener("click", closeTimerPanel);
  document.querySelectorAll(".timer-preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => startSleepTimer(Number(btn.dataset.sleep)));
  });
  document.getElementById("timerStartFocus").addEventListener("click", startFocusTimer);
  document.getElementById("timerCancel").addEventListener("click", () => {
    stopTimer();
    showToast("Timer cancelled");
  });

  function hideAllViewerPanels() {
    viewerLoading.classList.add("hidden");
    viewerBlocked.classList.add("hidden");
    viewerDown.classList.add("hidden");
    viewerSlow.classList.add("hidden");
    clearTimeout(slowTimer);
  }

  /* ---------------- Picture-in-Picture ----------------
   * Document Picture-in-Picture (Chrome/Edge 116+ only — the button stays
   * hidden everywhere else via pipSupported) pops the live iframe out into
   * a small always-on-top window so an app can keep playing while you
   * browse the rest of the site. There's only one iframe element to go
   * around, so opening any app while a PiP window is open closes it first
   * (moves the iframe back) rather than trying to juggle two.
   */
  function exitPip() {
    if (!pipWindow) return;
    const win = pipWindow;
    pipWindow = null;
    viewerFrame.style.width = "";
    viewerFrame.style.height = "";
    viewerBody.appendChild(viewerFrame);
    viewerPip.classList.remove("active");
    if (!win.closed) win.close();
  }

  if (pipSupported) {
    viewerPip.addEventListener("click", async () => {
      if (!currentApp) return;
      if (pipWindow) { exitPip(); return; } // acts as a toggle
      try {
        const win = await documentPictureInPicture.requestWindow({ width: 420, height: 320 });
        pipWindow = win;
        const style = win.document.createElement("style");
        style.textContent = "html,body{margin:0;height:100%;background:#000;overflow:hidden;}";
        win.document.head.appendChild(style);
        viewerFrame.style.width = "100%";
        viewerFrame.style.height = "100%";
        win.document.body.appendChild(viewerFrame);
        viewerPip.classList.add("active");
        win.addEventListener("pagehide", () => exitPip(), { once: true });
        LI.trackEvent("pip_open", { app_id: currentApp.id });
        // The content now lives in the PiP window — the main overlay has
        // nothing left to show, so close it without touching viewerFrame.
        closeViewer(true, { keepPip: true });
      } catch (e) {
        console.warn("[ListenIt] Picture-in-Picture failed", e);
      }
    });
  }

  function openViewer(id, pushState = true) {
    const app = getApp(id);
    if (!app) return;
    exitPip(); // only one iframe — opening any app reclaims it from PiP first
    currentApp = app;

    LI.trackEvent("open_app", { app_id: app.id, app_name: app.name });
    LI.recordPlay(app.id);
    loadReactions(app.id);
    loadRating(app.id);

    viewerName.textContent = app.name;
    viewerFavicon.src = initialsAvatar(app.name, 40);
    viewerOpenTab.href = app.url;
    viewerFav.classList.toggle("active", isFavorite(app.id));

    viewer.classList.remove("hidden");
    lockBodyScroll();
    acquireWakeLock(); // no-op unless the visitor previously opted in

    if (pushState) {
      history.pushState({ listenitApp: app.id }, "", "?app=" + app.id);
    }

    hideAllViewerPanels();
    viewerFrame.src = "about:blank";
    viewerFrame.classList.add("hidden");
    // Nothing to pop out until an iframe actually starts loading below.
    if (pipSupported) viewerPip.classList.add("hidden");

    // Known-down (per the last health check) — don't even try to load it,
    // just offer another pick straight away instead of a stuck spinner.
    if (!isAppUp(app.id)) {
      viewerDownName.textContent = app.name;
      viewerDownLink.href = app.url;
      viewerDown.classList.remove("hidden");
      return;
    }

    if (app.embeddable === false) {
      viewerBlocked.classList.remove("hidden");
      viewerBlockedLink.href = app.url;
      viewerBlockedName.textContent = app.name;
      window.open(app.url, "_blank", "noopener");
      return;
    }

    viewerFrame.classList.remove("hidden");
    viewerLoading.classList.remove("hidden");
    viewerSlowLink.href = app.url;
    if (pipSupported) viewerPip.classList.remove("hidden");

    viewerFrame.src = app.url;
    clearTimeout(slowTimer);
    slowTimer = setTimeout(() => {
      if (!viewerLoading.classList.contains("hidden")) {
        viewerSlow.classList.remove("hidden");
      }
    }, 4500);
  }

  viewerFrame.addEventListener("load", () => {
    viewerLoading.classList.add("hidden");
    clearTimeout(slowTimer);
  });

  function switchToAnother() {
    if (!currentApp) return;
    LI.trackEvent("try_another", { from_app_id: currentApp.id });
    openViewer(pickRandomApp(currentApp.id).id);
  }
  viewerSlowRetry.addEventListener("click", switchToAnother);
  viewerDownRetry.addEventListener("click", switchToAnother);
  viewerOpenTab.addEventListener("click", () => {
    if (currentApp) LI.trackEvent("open_in_new_tab", { app_id: currentApp.id });
  });

  function closeViewer(pushState = true, opts = {}) {
    viewer.classList.add("hidden");
    unlockBodyScroll();
    releaseWakeLock(); // nothing left in the main viewer to protect from auto-lock
    stopTimer(); // closing always stops playback too, so any sleep/focus timer has nothing left to track
    closeTimerPanel();
    // When handing off to a PiP window, viewerFrame has just been moved
    // there — leave its src alone so the popped-out app keeps playing.
    if (!opts.keepPip) viewerFrame.src = "about:blank";
    clearTimeout(slowTimer);
    document.getElementById("viewerReactions").classList.add("hidden");
    document.getElementById("viewerRating").classList.add("hidden");
    currentApp = null;
    closeViewerChat(); // safety net — cloud sky must return home even if chat was left open
    if (pushState && location.search.includes("app=")) {
      history.pushState({}, "", location.pathname);
    }
  }

  document.getElementById("viewerBack").addEventListener("click", () => closeViewer());

  viewerFav.addEventListener("click", () => {
    if (!currentApp) return;
    const nowFav = toggleFavorite(currentApp.id);
    viewerFav.classList.toggle("active", nowFav);
    showToast(nowFav ? "Added to favorites" : "Removed from favorites");
    if (activeCategory === "★ Favorites") renderGrid();
    LI.trackEvent("toggle_favorite", { app_id: currentApp.id, favorited: nowFav });
  });

  viewerShare.addEventListener("click", async () => {
    if (!currentApp) return;
    LI.trackEvent("share_app", { app_id: currentApp.id });
    const shareData = { title: currentApp.name, text: currentApp.tagline, url: currentApp.url };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (e) { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(currentApp.url);
        showToast("Link copied to clipboard");
      } catch {
        showToast(currentApp.url);
      }
    }
  });

  /* ---------------- Reactions ---------------- */
  const REACTIONS_KEY = "listenit-reactions"; // { [appId]: [key, ...] } — which reactions this browser has already sent
  const viewerReactions = document.getElementById("viewerReactions");
  const reactionBtns = [...viewerReactions.querySelectorAll(".reaction-btn")];

  function getMyReactions(appId) {
    try {
      const all = JSON.parse(localStorage.getItem(REACTIONS_KEY)) || {};
      return all[appId] || [];
    } catch { return []; }
  }
  function addMyReaction(appId, key) {
    let all = {};
    try { all = JSON.parse(localStorage.getItem(REACTIONS_KEY)) || {}; } catch { /* ignore */ }
    all[appId] = [...(all[appId] || []), key];
    localStorage.setItem(REACTIONS_KEY, JSON.stringify(all));
  }

  function loadReactions(appId) {
    viewerReactions.classList.remove("hidden");
    const mine = getMyReactions(appId);
    reactionBtns.forEach((btn) => {
      btn.classList.toggle("reacted", mine.includes(btn.dataset.key));
      btn.querySelector(".reaction-count").textContent = "0";
    });
    LI.getReactionCounts(appId).then((counts) => {
      if (!currentApp || currentApp.id !== appId) return; // viewer moved on already
      reactionBtns.forEach((btn) => {
        btn.querySelector(".reaction-count").textContent = String(counts[btn.dataset.key] || 0);
      });
    });
  }

  reactionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!currentApp || btn.classList.contains("reacted")) return;
      const key = btn.dataset.key;
      const countEl = btn.querySelector(".reaction-count");
      countEl.textContent = String(Number(countEl.textContent || 0) + 1); // optimistic
      btn.classList.add("reacted");
      addMyReaction(currentApp.id, key);
      LI.react(currentApp.id, key);
      LI.trackEvent("react", { app_id: currentApp.id, reaction: key });
    });
  });

  /* ---------------- Ratings ----------------
   * One 5-star rating per app per browser (not per-emoji like reactions —
   * a single running sum+count in Firestore, see firebase-app.mjs). Once
   * cast it's locked (matches the increment-only Firestore rules, which
   * don't allow changing a submitted rating). Before rating, the stars
   * preview the current community average instead of sitting empty.
   */
  let RATINGS = {}; // { [appId]: { sum, count } }, populated by loadRatings()
  function avgRating(id) {
    const r = RATINGS[id];
    return r && r.count > 0 ? r.sum / r.count : 0;
  }
  function ratingCount(id) {
    return (RATINGS[id] && RATINGS[id].count) || 0;
  }

  /* ---------------- IMDb-style weighted ranking ----------------
   * Plain averages let a single 5-star rating outrank an app with 50
   * ratings averaging 4.5 — not what "prioritize by rating" should mean.
   * IMDb's classic fix (a Bayesian average against the site-wide mean):
   *   WR = (v / (v+m)) * R + (m / (v+m)) * C
   * R = the item's own average, v = its vote count, C = the mean rating
   * across the WHOLE site (the "prior" a low-vote item gets pulled toward),
   * m = how many votes it takes before an item's own average starts to
   * dominate C. IMDb uses a huge m (~25,000) at their scale; this is a
   * small hobby directory where ratings will be sparse, so a small m makes
   * an app's own rating matter fast while still damping single-vote flukes.
   *
   * Used at three levels, per the brief:
   *  - appWeightedScore(id): that app's own sum/count only — ranks apps
   *    within a category, and picks a category's Mix winner.
   *  - categoryWeightedScore(cat): every app in the category pooled into
   *    one sum/count — ranks which category SECTION shows first in "All".
   * Both share the same GLOBAL_RATING_MEAN (C) and IMDB_M — C is just "the
   * site's overall baseline", the same prior regardless of what's being
   * scored.
   */
  const IMDB_M = 5;
  let GLOBAL_RATING_MEAN = 0; // C — recomputed whenever RATINGS changes
  function computeGlobalRatingMean() {
    let totalSum = 0, totalCount = 0;
    Object.values(RATINGS).forEach((r) => {
      totalSum += r.sum || 0;
      totalCount += r.count || 0;
    });
    return totalCount > 0 ? totalSum / totalCount : 0;
  }
  function weightedRating(sum, count) {
    if (count === 0) return GLOBAL_RATING_MEAN;
    const R = sum / count;
    return (count / (count + IMDB_M)) * R + (IMDB_M / (count + IMDB_M)) * GLOBAL_RATING_MEAN;
  }
  function appWeightedScore(id) {
    const r = RATINGS[id];
    return weightedRating(r ? r.sum || 0 : 0, r ? r.count || 0 : 0);
  }
  function categoryWeightedScore(category) {
    let sum = 0, count = 0;
    appsList.forEach((a) => {
      if (a.category !== category) return;
      const r = RATINGS[a.id];
      if (r) { sum += r.sum || 0; count += r.count || 0; }
    });
    return weightedRating(sum, count);
  }

  function loadRatings() {
    LI.getAllRatings()
      .then((data) => {
        if (data && Object.keys(data).length) {
          RATINGS = data;
          GLOBAL_RATING_MEAN = computeGlobalRatingMean();
          invalidateMix();
          renderGrid();
        }
      })
      .catch(() => {});
  }

  const MY_RATING_KEY = "listenit-ratings"; // { [appId]: stars } — this browser's own submitted ratings
  function getMyRating(appId) {
    try {
      const all = JSON.parse(localStorage.getItem(MY_RATING_KEY)) || {};
      return all[appId] || 0;
    } catch { return 0; }
  }
  function setMyRating(appId, stars) {
    let all = {};
    try { all = JSON.parse(localStorage.getItem(MY_RATING_KEY)) || {}; } catch { /* ignore */ }
    all[appId] = stars;
    localStorage.setItem(MY_RATING_KEY, JSON.stringify(all));
  }

  const viewerRating = document.getElementById("viewerRating");
  const ratingStars = [...viewerRating.querySelectorAll(".rating-star")];
  const viewerRatingAvg = document.getElementById("viewerRatingAvg");

  function fillStars(value) {
    ratingStars.forEach((btn) => btn.classList.toggle("filled", Number(btn.dataset.star) <= value));
  }

  function loadRating(appId) {
    viewerRating.classList.remove("hidden");
    const mine = getMyRating(appId);
    if (mine > 0) {
      viewerRating.classList.add("rated");
      fillStars(mine);
      viewerRatingAvg.textContent = "You: " + mine + "★";
    } else {
      viewerRating.classList.remove("rated");
      const avg = avgRating(appId);
      const count = ratingCount(appId);
      fillStars(Math.round(avg));
      viewerRatingAvg.textContent = count > 0 ? avg.toFixed(1) + " (" + count + ")" : "Rate it";
    }
  }

  ratingStars.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!currentApp || viewerRating.classList.contains("rated")) return;
      const stars = Number(btn.dataset.star);
      viewerRating.classList.add("rated");
      fillStars(stars);
      viewerRatingAvg.textContent = "You: " + stars + "★";
      setMyRating(currentApp.id, stars);
      // Optimistic local update so sort/Mix/card badges reflect it immediately
      // rather than waiting on a full refetch of the ratings collection.
      const prev = RATINGS[currentApp.id] || { sum: 0, count: 0 };
      RATINGS[currentApp.id] = { sum: prev.sum + stars, count: prev.count + 1 };
      GLOBAL_RATING_MEAN = computeGlobalRatingMean();
      LI.rate(currentApp.id, stars);
      LI.trackEvent("rate", { app_id: currentApp.id, stars });
    });
  });

  /* ---------------- Live user count ---------------- */
  const liveUsersEl = document.getElementById("liveUsers");
  const liveUsersCountEl = document.getElementById("liveUsersCount");
  let latestLiveUserCount = 0;
  function startLiveUserCount() {
    LI.subscribeLiveUsers((count) => {
      latestLiveUserCount = count || 0;
      if (!count || count < 1) { liveUsersEl.classList.add("hidden"); return; }
      liveUsersCountEl.textContent = count === 1 ? "1 person listening right now" : `${count} people listening right now`;
      liveUsersEl.classList.remove("hidden");
    });
  }

  /* ---------------- Feedback & feature-request board ----------------
   * A public board (Firestore `featureRequests` + a singleton `siteRating/
   * overall` doc) — anyone can rate the site, post an idea, or upvote/
   * downvote one someone else posted. Loaded lazily when the modal opens
   * rather than on every page load, since — unlike ratings/reactions —
   * nothing on the homepage depends on this data. Same "no take-backs"
   * philosophy as app ratings: once you vote up or down on a request, or
   * rate the site, that choice is locked in (see firestore.rules) — the
   * localStorage checks below are what surface that in the UI, not what
   * enforces it.
   */
  const feedbackModal = document.getElementById("feedbackModal");
  const feedbackBackdrop = document.getElementById("feedbackBackdrop");
  const feedbackClose = document.getElementById("feedbackClose");
  const feedbackForm = document.getElementById("feedbackForm");
  const ffTitle = document.getElementById("ffTitle");
  const ffDescription = document.getElementById("ffDescription");
  const ffName = document.getElementById("ffName");
  const feedbackList = document.getElementById("feedbackList");
  const siteRatingStarsEl = document.getElementById("siteRatingStars");
  const siteRatingStars = [...siteRatingStarsEl.querySelectorAll(".site-rating-star")];
  const siteRatingAvgEl = document.getElementById("siteRatingAvg");

  const FEEDBACK_POST_COOLDOWN_MS = 30000;
  const STATUS_LABELS = { planned: "🚧 Planned", shipped: "✅ Shipped", declined: "Declined" };

  function myFeedbackVotes() {
    try { return JSON.parse(localStorage.getItem("listenit_fr_votes")) || {}; } catch { return {}; }
  }
  function setMyFeedbackVote(id, direction) {
    const all = myFeedbackVotes();
    all[id] = direction;
    localStorage.setItem("listenit_fr_votes", JSON.stringify(all));
  }

  function fillSiteRatingStars(value) {
    siteRatingStars.forEach((btn) => btn.classList.toggle("filled", Number(btn.dataset.star) <= value));
  }

  async function loadSiteRating() {
    const mine = Number(localStorage.getItem("listenit_site_rating") || 0);
    if (mine > 0) {
      siteRatingStarsEl.classList.add("rated");
      fillSiteRatingStars(mine);
      siteRatingAvgEl.textContent = "You: " + mine + "★";
      return;
    }
    siteRatingStarsEl.classList.remove("rated");
    const { sum = 0, count = 0 } = await LI.getSiteRating();
    fillSiteRatingStars(count > 0 ? Math.round(sum / count) : 0);
    siteRatingAvgEl.textContent = count > 0 ? (sum / count).toFixed(1) + " (" + count + ")" : "Rate it";
  }

  siteRatingStars.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (siteRatingStarsEl.classList.contains("rated")) return;
      const stars = Number(btn.dataset.star);
      siteRatingStarsEl.classList.add("rated");
      fillSiteRatingStars(stars);
      siteRatingAvgEl.textContent = "You: " + stars + "★";
      localStorage.setItem("listenit_site_rating", String(stars));
      LI.rateSite(stars);
      LI.trackEvent("rate_site", { stars });
    });
  });

  function timeAgo(ms) {
    const diff = Date.now() - ms;
    const min = Math.floor(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return min + "m ago";
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + "h ago";
    return Math.floor(hr / 24) + "d ago";
  }

  function renderFeedbackList(items) {
    feedbackList.innerHTML = "";
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "feedback-empty";
      empty.textContent = "No ideas posted yet — be the first.";
      feedbackList.appendChild(empty);
      return;
    }

    const votes = myFeedbackVotes();
    const sorted = [...items].sort((a, b) => {
      const scoreDiff = ((b.upvotes || 0) - (b.downvotes || 0)) - ((a.upvotes || 0) - (a.downvotes || 0));
      if (scoreDiff !== 0) return scoreDiff;
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });

    sorted.forEach((item) => {
      const el = document.createElement("div");
      el.className = "feedback-item";

      const votesCol = document.createElement("div");
      votesCol.className = "feedback-votes";
      const myVote = votes[item.id];

      const upBtn = document.createElement("button");
      upBtn.type = "button";
      upBtn.className = "feedback-vote-btn feedback-vote-up";
      upBtn.textContent = "▲";
      upBtn.setAttribute("aria-label", "Upvote");
      if (myVote) upBtn.disabled = true;
      if (myVote === "up") upBtn.classList.add("voted");

      const score = document.createElement("span");
      score.className = "feedback-score";
      score.textContent = String((item.upvotes || 0) - (item.downvotes || 0));

      const downBtn = document.createElement("button");
      downBtn.type = "button";
      downBtn.className = "feedback-vote-btn feedback-vote-down";
      downBtn.textContent = "▼";
      downBtn.setAttribute("aria-label", "Downvote");
      if (myVote) downBtn.disabled = true;
      if (myVote === "down") downBtn.classList.add("voted");

      [upBtn, downBtn].forEach((btn) => {
        btn.addEventListener("click", () => {
          if (myFeedbackVotes()[item.id]) return; // one vote per browser, no take-backs — see rules
          const direction = btn === upBtn ? "up" : "down";
          setMyFeedbackVote(item.id, direction);
          if (direction === "up") item.upvotes = (item.upvotes || 0) + 1;
          else item.downvotes = (item.downvotes || 0) + 1;
          LI.voteFeedback(item.id, direction);
          LI.trackEvent("vote_feedback", { id: item.id, direction });
          renderFeedbackList(items); // re-render from the same in-memory list, optimistically updated
        });
      });

      votesCol.append(upBtn, score, downBtn);

      const body = document.createElement("div");
      body.className = "feedback-body";

      const title = document.createElement("p");
      title.className = "feedback-item-title";
      title.textContent = item.title || "";
      body.appendChild(title);

      if (item.description) {
        const desc = document.createElement("p");
        desc.className = "feedback-item-desc";
        desc.textContent = item.description;
        body.appendChild(desc);
      }

      const meta = document.createElement("p");
      meta.className = "feedback-item-meta";
      const authorSpan = document.createElement("span");
      authorSpan.textContent = "— " + (item.authorName || "Anon") +
        (item.createdAt?.seconds ? " · " + timeAgo(item.createdAt.seconds * 1000) : "");
      meta.appendChild(authorSpan);
      if (item.status && item.status !== "open") {
        const badge = document.createElement("span");
        badge.className = "feedback-status-badge status-" + item.status;
        badge.textContent = STATUS_LABELS[item.status] || item.status;
        meta.appendChild(badge);
      }
      body.appendChild(meta);

      el.append(votesCol, body);
      feedbackList.appendChild(el);
    });
  }

  async function loadFeedbackList() {
    feedbackList.innerHTML = '<p class="feedback-empty">Loading…</p>';
    const items = await LI.getFeedback();
    renderFeedbackList(items);
  }

  function openFeedbackModal() {
    feedbackModal.classList.remove("hidden");
    lockBodyScroll();
    loadSiteRating();
    loadFeedbackList();
    feedbackHeaderBtn.classList.remove("has-unread");
    localStorage.setItem("listenit_feedback_seen", "1");
    LI.trackEvent("feedback_modal_open", {});
  }
  function closeFeedbackModal() {
    feedbackModal.classList.add("hidden");
    unlockBodyScroll();
  }
  // Footer link is the low-key entry point; the header button (sticky —
  // visible at any scroll position, unlike the footer) is the one meant to
  // actually get noticed, so it carries a one-time attention dot until
  // someone opens the modal for the first time from either place.
  const feedbackHeaderBtn = document.getElementById("feedbackHeaderBtn");
  if (!localStorage.getItem("listenit_feedback_seen")) feedbackHeaderBtn.classList.add("has-unread");
  feedbackHeaderBtn.addEventListener("click", openFeedbackModal);
  document.getElementById("footerFeedbackBtn").addEventListener("click", openFeedbackModal);
  feedbackClose.addEventListener("click", closeFeedbackModal);
  feedbackBackdrop.addEventListener("click", closeFeedbackModal);

  feedbackForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = ffTitle.value.trim();
    if (!title) return;
    const last = Number(localStorage.getItem("listenit_last_feedback_post") || 0);
    const left = FEEDBACK_POST_COOLDOWN_MS - (Date.now() - last);
    if (left > 0) { showToast(`Give it ${Math.ceil(left / 1000)}s before posting another idea`); return; }
    localStorage.setItem("listenit_last_feedback_post", String(Date.now()));
    const description = ffDescription.value.trim();
    const name = ffName.value.trim();
    const id = await LI.submitFeedback(title, description, name);
    if (!id) { showToast("Couldn't post that — try again in a bit"); return; }
    ffTitle.value = "";
    ffDescription.value = "";
    LI.trackEvent("submit_feedback", {});
    showToast("💡 Idea posted — thanks!");
    loadFeedbackList();
  });

  /* ---------------- Message clouds ----------------
   * Floating, self-expiring public messages (Realtime Database — see
   * js/firebase-app.mjs and database.rules.json). The whole feature stays
   * hidden until a real subscribeClouds callback actually fires; on the
   * no-op stub (Firebase unconfigured, or the RTDB block failed to wire
   * up) that never happens, so there's simply nothing to show.
   *
   * The band is a normal in-flow section, not an overlay — clouds can
   * only ever cover their own bounded box, never the header, grid, or
   * viewer, and every user string is written via textContent, never
   * innerHTML, so a message can't inject markup.
   */
  const cloudSkySection = document.getElementById("cloudSkySection");
  const cloudSky = document.getElementById("cloudSky");
  const cloudForm = document.getElementById("cloudForm");
  const cloudNameInput = document.getElementById("cloudName");
  const cloudTextInput = document.getElementById("cloudText");
  const cloudModal = document.getElementById("cloudModal");
  const cloudBackdrop = document.getElementById("cloudBackdrop");
  const cloudModalClose = document.getElementById("cloudModalClose");
  const cloudModalOriginal = document.getElementById("cloudModalOriginal");
  const cloudModalReplies = document.getElementById("cloudModalReplies");
  const cloudReplyForm = document.getElementById("cloudReplyForm");
  const cloudReplyText = document.getElementById("cloudReplyText");
  const cloudSoundToggle = document.getElementById("cloudSoundToggle");
  const cloudSkyToggle = document.getElementById("cloudSkyToggle");
  const viewerChat = document.getElementById("viewerChat");
  const viewerChatPanel = document.getElementById("viewerChatPanel");
  const viewerChatClose = document.getElementById("viewerChatClose");
  const viewerChatSlot = document.getElementById("viewerChatSlot");

  /* ---------------- Collapsible cloud sky ----------------
   * On phones, title + search + chips + the cloud band left the actual
   * app grid scrolled below the fold. The band now starts collapsed to
   * just its header on narrow screens (full desktop behavior unchanged),
   * expandable with one tap, and remembers whatever a visitor last chose.
   * Always forced fully open while docked in the viewer drawer — being in
   * the drawer at all already IS the "expand" gesture, and the chevron
   * hides there too (see the docked CSS overrides).
   */
  let cloudSkyCollapsed = false;
  let cloudSkyDefaultDecided = false;
  function applyCloudSkyCollapsedState() {
    const dockedInViewer = cloudSkySection.parentNode === viewerChatSlot;
    const effectivelyCollapsed = cloudSkyCollapsed && !dockedInViewer;
    cloudSkySection.classList.toggle("collapsed", effectivelyCollapsed);
    cloudSkyToggle.setAttribute("aria-expanded", String(!effectivelyCollapsed));
  }
  cloudSkyToggle.addEventListener("click", () => {
    cloudSkyCollapsed = !cloudSkyCollapsed;
    localStorage.setItem("listenit_cloud_sky_collapsed", cloudSkyCollapsed ? "1" : "0");
    applyCloudSkyCollapsedState();
  });

  /* ---------------- Live chat from inside the viewer ----------------
   * The cloud sky lives on the homepage, but once someone's inside the
   * full-screen viewer (playing an embedded app) it's covered up like
   * everything else there. Rather than a second, parallel chat UI, the
   * exact same #cloudSkySection node gets physically moved into a
   * slide-in drawer docked to the viewer (and moved back on close) — same
   * elements, same event listeners, nothing to keep in sync. Closed by
   * default (translated off-screen, not just visually hidden) so it can
   * never sit on top of the embedded app's own controls unless someone
   * deliberately opens it — the reaction-strip-over-play-button bug from
   * earlier in this project is exactly what this is built to avoid.
   */
  const cloudSkyHomeParent = cloudSkySection.parentNode;
  const cloudSkyHomeNextSibling = cloudSkySection.nextSibling;
  function openViewerChat() {
    closeTimerPanel(); // avoid two popovers stacked awkwardly
    viewerChatSlot.appendChild(cloudSkySection);
    applyCloudSkyCollapsedState(); // always fully expanded once docked
    viewerChatPanel.classList.add("open");
    viewerChat.classList.add("active");
    viewerChat.classList.remove("has-unread");
    LI.trackEvent("open_viewer_chat", {});
  }
  function closeViewerChat() {
    if (cloudSkySection.parentNode !== viewerChatSlot) return; // already home, nothing to do
    viewerChatPanel.classList.remove("open");
    viewerChat.classList.remove("active");
    if (cloudSkyHomeNextSibling) cloudSkyHomeParent.insertBefore(cloudSkySection, cloudSkyHomeNextSibling);
    else cloudSkyHomeParent.appendChild(cloudSkySection);
    applyCloudSkyCollapsedState(); // restore whatever the homepage preference was
  }
  viewerChat.addEventListener("click", () => {
    if (cloudSkySection.parentNode === viewerChatSlot) closeViewerChat();
    else openViewerChat();
  });
  viewerChatClose.addEventListener("click", closeViewerChat);

  const CLOUD_MAX_RENDERED = 24;
  const CLOUD_POST_COOLDOWN_MS = 15000;
  const CLOUD_REPLY_COOLDOWN_MS = 8000;
  let clouds = {};
  let cloudRenderTimer = null;
  let activeCloudId = null;
  let cloudSkyFirstLoad = true;
  let lastLocalCloudActionAt = 0;

  cloudNameInput.value = localStorage.getItem("listenit_cloud_name") || "";

  /* ---------------- Notification chime ----------------
   * A tiny synthesized bell (Web Audio, no audio file) plays when a new
   * cloud or reply arrives — not on the initial snapshot (that would fire
   * once per pre-existing cloud on every page load) and not for your own
   * just-sent message (see lastLocalCloudActionAt below). Browsers block
   * audio before any user gesture, so the context is created/resumed
   * lazily on first interaction and again right before each chime; if it's
   * still suspended (no interaction yet) the chime just silently no-ops.
   */
  let cloudSoundEnabled = localStorage.getItem("listenit_cloud_sound") !== "off";
  let audioCtx = null;
  function ensureAudioCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  }
  // Try to unlock/resume on any early interaction — resume() on an
  // already-running context is a harmless no-op, so it's cheap to keep
  // trying on every gesture rather than betting everything on exactly one.
  ["click", "touchend", "keydown"].forEach((evt) => document.addEventListener(evt, ensureAudioCtx));

  function playTone(notes) {
    const ctx = ensureAudioCtx();
    if (!ctx || ctx.state !== "running") return;
    const t0 = ctx.currentTime;
    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t0 + start);
      gain.gain.linearRampToValueAtTime(0.15, t0 + start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + start);
      osc.stop(t0 + start + dur + 0.03);
    });
  }
  function playCloudChime() {
    if (cloudSoundEnabled) playTone([{ freq: 880, start: 0, dur: 0.14 }, { freq: 1318.5, start: 0.09, dur: 0.2 }]);
  }
  function playReplyChime() {
    if (cloudSoundEnabled) playTone([{ freq: 1046.5, start: 0, dur: 0.13 }]);
  }
  function setCloudSoundEnabled(on) {
    cloudSoundEnabled = on;
    localStorage.setItem("listenit_cloud_sound", on ? "on" : "off");
    cloudSoundToggle.textContent = on ? "🔔" : "🔕";
    cloudSoundToggle.setAttribute("aria-label", on ? "Mute cloud sounds" : "Unmute cloud sounds");
  }
  setCloudSoundEnabled(cloudSoundEnabled);
  cloudSoundToggle.addEventListener("click", () => setCloudSoundEnabled(!cloudSoundEnabled));

  function myCloudName() {
    const name = cloudNameInput.value.trim().slice(0, 24) || "Anon";
    localStorage.setItem("listenit_cloud_name", name);
    return name;
  }

  function cloudCooldownLeft(key, ms) {
    const last = Number(localStorage.getItem(key) || 0);
    return Math.max(0, ms - (Date.now() - last));
  }

  function cloudScaleFor(replyCount) {
    return Math.min(1 + (replyCount || 0) * 0.05, 1.8);
  }

  // Small stable per-cloud stagger so bobbing bubbles don't move in lockstep.
  function cloudDelayFor(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000;
    return (h / 1000) * -4.5 + "s";
  }

  function renderCloudSky() {
    const now = Date.now();
    const active = Object.values(clouds)
      .filter((c) => c.expiresAt > now)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, CLOUD_MAX_RENDERED);

    cloudSky.innerHTML = "";
    if (!active.length) {
      const empty = document.createElement("p");
      empty.className = "cloud-sky-empty";
      empty.textContent = "No messages floating right now — say something below.";
      cloudSky.appendChild(empty);
      return;
    }

    active.forEach((c) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "cloud";
      if (c.expiresAt - now < 20000) el.classList.add("fading");
      el.style.setProperty("--cloud-scale", cloudScaleFor(c.replyCount));
      el.style.setProperty("--cloud-delay", cloudDelayFor(c.id));

      const nameSpan = document.createElement("span");
      nameSpan.className = "cloud-name";
      nameSpan.textContent = (c.name || "Anon") + ":";
      el.appendChild(nameSpan);

      const textSpan = document.createElement("span");
      textSpan.className = "cloud-text";
      textSpan.textContent = c.text || "";
      el.appendChild(textSpan);

      if (c.replyCount > 0) {
        const repliesSpan = document.createElement("span");
        repliesSpan.className = "cloud-replies";
        repliesSpan.textContent = `· ${c.replyCount} ${c.replyCount === 1 ? "reply" : "replies"}`;
        el.appendChild(repliesSpan);
      }

      el.addEventListener("click", () => openCloudModal(c.id));
      cloudSky.appendChild(el);
    });
  }

  function renderCloudReplies(c) {
    cloudModalReplies.innerHTML = "";
    const replies = Object.values(c.replies || {}).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    replies.forEach((r) => {
      const item = document.createElement("div");
      item.className = "cloud-reply-item";
      const nameSpan = document.createElement("strong");
      nameSpan.textContent = (r.name || "Anon") + ": ";
      item.appendChild(nameSpan);
      item.appendChild(document.createTextNode(r.text || ""));
      cloudModalReplies.appendChild(item);
    });
  }

  function openCloudModal(id) {
    const c = clouds[id];
    if (!c) return;
    activeCloudId = id;

    cloudModalOriginal.innerHTML = "";
    const nameSpan = document.createElement("strong");
    nameSpan.textContent = (c.name || "Anon") + ": ";
    cloudModalOriginal.appendChild(nameSpan);
    cloudModalOriginal.appendChild(document.createTextNode(c.text || ""));
    renderCloudReplies(c);

    cloudModal.classList.remove("hidden");
    lockBodyScroll();
    cloudReplyText.value = "";
    cloudReplyText.focus();
  }

  function closeCloudModal() {
    cloudModal.classList.add("hidden");
    unlockBodyScroll();
    activeCloudId = null;
  }
  cloudModalClose.addEventListener("click", closeCloudModal);
  cloudBackdrop.addEventListener("click", closeCloudModal);

  cloudForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = cloudTextInput.value.trim();
    if (!text) return;
    const left = cloudCooldownLeft("listenit_last_cloud_post", CLOUD_POST_COOLDOWN_MS);
    if (left > 0) { showToast(`Give it ${Math.ceil(left / 1000)}s before floating another one`); return; }
    localStorage.setItem("listenit_last_cloud_post", String(Date.now()));
    cloudTextInput.value = "";
    lastLocalCloudActionAt = Date.now();
    const id = await LI.postCloud(myCloudName(), text);
    if (!id) showToast("Couldn't send that — try again in a bit");
    else LI.trackEvent("post_cloud", {});
  });

  cloudReplyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeCloudId) return;
    const text = cloudReplyText.value.trim();
    if (!text) return;
    const left = cloudCooldownLeft("listenit_last_cloud_reply", CLOUD_REPLY_COOLDOWN_MS);
    if (left > 0) { showToast(`Give it ${Math.ceil(left / 1000)}s before replying again`); return; }
    localStorage.setItem("listenit_last_cloud_reply", String(Date.now()));
    cloudReplyText.value = "";
    lastLocalCloudActionAt = Date.now();
    const ok = await LI.replyToCloud(activeCloudId, myCloudName(), text);
    if (!ok) showToast("Couldn't send that reply — try again in a bit");
    else LI.trackEvent("reply_cloud", {});
  });

  /* ---------------- Chat nudge ----------------
   * A one-time, purely client-side onboarding hint — text composed
   * locally, never written to Firebase, doesn't count as a real cloud,
   * nothing about it is visible to anyone else. Only triggered once, from
   * the very first subscribeClouds snapshot (see startCloudSky below),
   * and only when that snapshot is genuinely empty — real activity always
   * wins over a canned tip, and it's re-checked again right before each
   * message actually shows in case someone else posted in the meantime.
   */
  const chatNudge = document.getElementById("chatNudge");
  const chatNudgeText = document.getElementById("chatNudgeText");
  const chatNudgeClose = document.getElementById("chatNudgeClose");
  const NUDGE_SHOW_DELAY_MS = 2500;
  const NUDGE_VISIBLE_MS = 6000;
  const NUDGE_GAP_MS = 3000;
  let nudgeEngaged = false; // true once the visitor clicks through — skip the follow-up tip, they already found it

  function playNudgeChime() {
    if (cloudSoundEnabled) playTone([{ freq: 740, start: 0, dur: 0.16 }, { freq: 988, start: 0.1, dur: 0.22 }]);
  }

  // "Quiet" means no cloud anyone would actually see right now — RTDB has
  // no TTL of its own (see the message-clouds notes elsewhere in this
  // file), so raw snapshots routinely contain long-expired rows nobody's
  // pruned yet. Must filter by expiresAt, same as renderCloudSky does,
  // or a database full of stale rows looks "busy" and the nudge never
  // fires for a genuinely empty-looking chat.
  function hasActiveClouds(list) {
    const now = Date.now();
    return list.some((c) => c.expiresAt > now);
  }
  function chatIsStillQuiet() {
    return !hasActiveClouds(Object.values(clouds)) && viewer.classList.contains("hidden");
  }

  function showChatNudge(text, onDismissShowNext) {
    chatNudgeText.textContent = text;
    chatNudge.classList.remove("hidden"); // only needed once — mirrors cloudSkySection's own reveal-once pattern
    chatNudge.classList.add("show");
    playNudgeChime();
    const hideTimer = setTimeout(hide, NUDGE_VISIBLE_MS);
    function hide() {
      clearTimeout(hideTimer);
      chatNudge.classList.remove("show");
      chatNudge.onclick = null;
      if (onDismissShowNext && !nudgeEngaged) setTimeout(onDismissShowNext, NUDGE_GAP_MS);
    }
    chatNudgeClose.onclick = (e) => { e.stopPropagation(); hide(); };
    chatNudge.onclick = () => {
      nudgeEngaged = true;
      hide();
      if (cloudSkySection.parentNode === viewerChatSlot) return; // already docked in the viewer drawer
      if (cloudSkySection.classList.contains("collapsed")) {
        cloudSkyCollapsed = false;
        localStorage.setItem("listenit_cloud_sky_collapsed", "0");
        applyCloudSkyCollapsedState();
      }
      cloudSkySection.scrollIntoView({ behavior: "smooth", block: "center" });
      cloudTextInput.focus();
    };
  }

  function maybeStartChatNudgeSequence(wasEmptyOnFirstLoad) {
    if (!wasEmptyOnFirstLoad) return;
    setTimeout(() => {
      if (!chatIsStillQuiet()) return;
      const n = latestLiveUserCount;
      const text = n > 1
        ? `🎧 ${n} people are listening right now — say hi in the chat!`
        : "🎧 Be the first to say something — start a chat below!";
      showChatNudge(text, () => {
        if (!chatIsStillQuiet()) return;
        showChatNudge("💬 The more replies a message gets, the longer — and bigger — it floats!");
      });
    }, NUDGE_SHOW_DELAY_MS);
  }

  function startCloudSky() {
    LI.subscribeClouds((list) => {
      cloudSkySection.classList.remove("hidden");
      viewerChat.classList.remove("hidden");
      if (!cloudSkyDefaultDecided) {
        cloudSkyDefaultDecided = true;
        const stored = localStorage.getItem("listenit_cloud_sky_collapsed");
        cloudSkyCollapsed = stored !== null ? stored === "1" : window.matchMedia("(max-width: 640px)").matches;
        applyCloudSkyCollapsedState();
        maybeStartChatNudgeSequence(!hasActiveClouds(list));
      }

      // Diff against the previous snapshot to decide whether to chime —
      // skip on the very first snapshot (that's every pre-existing cloud
      // at once, not "new" arrivals) and skip right after our own
      // post/reply (we already got instant UI feedback for that one).
      const isFirstLoad = cloudSkyFirstLoad;
      cloudSkyFirstLoad = false;
      const echoingOwnAction = Date.now() - lastLocalCloudActionAt < 4000;
      let heardNewCloud = false;
      let heardNewReply = false;
      if (!isFirstLoad && !echoingOwnAction) {
        list.forEach((c) => {
          const prev = clouds[c.id];
          if (!prev) heardNewCloud = true;
          else if ((c.replyCount || 0) > (prev.replyCount || 0)) heardNewReply = true;
        });
      }

      clouds = {};
      list.forEach((c) => { clouds[c.id] = c; });
      renderCloudSky();
      if (activeCloudId && clouds[activeCloudId]) renderCloudReplies(clouds[activeCloudId]);
      else if (activeCloudId && !clouds[activeCloudId]) closeCloudModal(); // vanished (expired/pruned) while open
      if (!cloudRenderTimer) cloudRenderTimer = setInterval(renderCloudSky, 5000);

      if (heardNewCloud) playCloudChime();
      else if (heardNewReply) playReplyChime();

      // Badge the in-viewer chat button when there's something new and the
      // visitor can't already see it (viewer open, drawer not the one
      // currently showing the cloud sky).
      if ((heardNewCloud || heardNewReply) && !viewer.classList.contains("hidden") && cloudSkySection.parentNode !== viewerChatSlot) {
        viewerChat.classList.add("has-unread");
      }
    });
  }

  window.addEventListener("listenit-firebase-ready", (e) => {
    if (!e.detail || !e.detail.ok) return;
    loadFirebaseApps();
    loadTrending();
    loadRatings();
    startLiveUserCount();
    startCloudSky();
  });

  window.addEventListener("popstate", () => {
    const params = new URLSearchParams(location.search);
    const appId = params.get("app");
    if (appId && getApp(appId)) {
      openViewer(appId, false);
    } else {
      closeViewer(false);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      // Closes just the drawer first, not the whole viewer underneath it —
      // pressing Escape once shouldn't also kill whatever's playing.
      if (cloudSkySection.parentNode === viewerChatSlot) { closeViewerChat(); return; }
      if (!viewer.classList.contains("hidden")) closeViewer();
      if (!submitModal.classList.contains("hidden")) closeSubmitModal();
      if (!cloudModal.classList.contains("hidden")) closeCloudModal();
      if (!feedbackModal.classList.contains("hidden")) closeFeedbackModal();
    }
  });

  /* ---------------- Submit modal ---------------- */
  const submitModal = document.getElementById("submitModal");
  function openSubmitModal() {
    submitModal.classList.remove("hidden");
    lockBodyScroll();
    document.getElementById("fName").focus();
    LI.trackEvent("submit_form_open");
  }
  function closeSubmitModal() {
    submitModal.classList.add("hidden");
    unlockBodyScroll();
  }
  document.getElementById("submitBtn").addEventListener("click", openSubmitModal);
  document.getElementById("footerSubmitBtn").addEventListener("click", openSubmitModal);
  document.getElementById("emptySubmitBtn").addEventListener("click", openSubmitModal);
  document.getElementById("submitClose").addEventListener("click", closeSubmitModal);
  document.getElementById("submitBackdrop").addEventListener("click", closeSubmitModal);

  document.getElementById("submitForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("fName").value.trim();
    const url = document.getElementById("fUrl").value.trim();
    const desc = document.getElementById("fDesc").value.trim();
    const author = document.getElementById("fAuthor").value.trim();

    let lines = [
      "Hey! I'd like to add my app to ListenIt 🎧",
      "",
      "App name: " + name,
      "URL: " + url,
      "Description: " + desc,
    ];
    if (author) lines.push("From: " + author);

    const message = encodeURIComponent(lines.join("\n"));
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
    LI.trackEvent("submit_app_whatsapp", { app_name: name, app_url: url });
    window.open(waUrl, "_blank", "noopener");
    closeSubmitModal();
    e.target.reset();
    showToast("Opening WhatsApp…");
  });

  /* ---------------- Install prompt ---------------- */
  const installBtn = document.getElementById("installBtn"); // small header button
  const installBanner = document.getElementById("installBanner"); // prominent bottom banner
  const installBannerSub = document.getElementById("installBannerSub");
  const installBannerAction = document.getElementById("installBannerAction");
  const BANNER_DISMISSED_KEY = "listenit-install-banner-dismissed";
  let deferredPrompt = null;

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function hideInstallUI() {
    installBtn.classList.add("hidden");
    installBanner.classList.add("hidden");
  }

  function dismissBanner() {
    installBanner.classList.add("hidden");
    localStorage.setItem(BANNER_DISMISSED_KEY, "1");
  }

  async function triggerInstall() {
    if (!deferredPrompt) return;
    LI.trackEvent("install_prompt_click");
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    hideInstallUI();
  }

  installBtn.addEventListener("click", triggerInstall);
  installBannerAction.addEventListener("click", triggerInstall);
  document.getElementById("installBannerClose").addEventListener("click", dismissBanner);

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.classList.remove("hidden");
    if (isStandalone() || localStorage.getItem(BANNER_DISMISSED_KEY)) return;
    installBannerSub.textContent = "Add it to your home screen for one-tap access, even offline.";
    installBannerAction.classList.remove("hidden");
    setTimeout(() => installBanner.classList.remove("hidden"), 1500);
  });

  window.addEventListener("appinstalled", () => {
    hideInstallUI();
    showToast("ListenIt installed 🎉");
    LI.trackEvent("app_installed");
  });

  // iOS has no beforeinstallprompt API — show the same banner with
  // instructions instead of an Install button.
  if (isIOS() && !isStandalone() && !localStorage.getItem(BANNER_DISMISSED_KEY)) {
    installBannerSub.innerHTML = 'Tap <strong>Share</strong> <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style="vertical-align:-2px"><path d="M12 16V4M8 8l4-4 4 4M5 13v6a1 1 0 001 1h12a1 1 0 001-1v-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> then <strong>Add to Home Screen</strong>.';
    setTimeout(() => installBanner.classList.remove("hidden"), 1500);
  }

  /* ---------------- Service worker ---------------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    });
  }

  /* ---------------- Init ---------------- */
  renderChips();
  renderGrid();
  loadStatus();

  const initialParams = new URLSearchParams(location.search);
  const initialApp = initialParams.get("app");
  if (initialApp && getApp(initialApp)) {
    openViewer(initialApp, false);
  }
})();
