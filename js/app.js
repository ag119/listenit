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

  function cardTemplate(app) {
    const fav = isFavorite(app.id);
    const down = !isAppUp(app.id);
    const plays = TRENDING[app.id] || 0;
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
          <span class="card-domain">${app.domain}${plays > 0 ? ` · 🔥 ${plays}` : ""}</span>
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
    // to a live screenshot. Skipped for down apps (see liveThumbUrl above).
    if (!down) {
      loadLiveThumb(card.querySelector(".card-thumb"), app, fallbackThumb);
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
      return (TRENDING[b.id] || 0) - (TRENDING[a.id] || 0); // then most-played first; stable (0-0 ties keep original order)
    });
  }

  function renderGrid() {
    const apps = filteredApps();
    gridEl.innerHTML = "";
    apps.forEach((app) => gridEl.appendChild(cardTemplate(app)));
    emptyState.classList.toggle("hidden", apps.length > 0);
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
  let slowTimer = null;
  let currentApp = null;

  function hideAllViewerPanels() {
    viewerLoading.classList.add("hidden");
    viewerBlocked.classList.add("hidden");
    viewerDown.classList.add("hidden");
    viewerSlow.classList.add("hidden");
    clearTimeout(slowTimer);
  }

  function openViewer(id, pushState = true) {
    const app = getApp(id);
    if (!app) return;
    currentApp = app;

    LI.trackEvent("open_app", { app_id: app.id, app_name: app.name });
    LI.recordPlay(app.id);
    loadReactions(app.id);

    viewerName.textContent = app.name;
    viewerFavicon.src = initialsAvatar(app.name, 40);
    viewerOpenTab.href = app.url;
    viewerFav.classList.toggle("active", isFavorite(app.id));

    viewer.classList.remove("hidden");
    lockBodyScroll();

    if (pushState) {
      history.pushState({ listenitApp: app.id }, "", "?app=" + app.id);
    }

    hideAllViewerPanels();
    viewerFrame.src = "about:blank";
    viewerFrame.classList.add("hidden");

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

  function closeViewer(pushState = true) {
    viewer.classList.add("hidden");
    unlockBodyScroll();
    viewerFrame.src = "about:blank";
    clearTimeout(slowTimer);
    document.getElementById("viewerReactions").classList.add("hidden");
    currentApp = null;
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

  /* ---------------- Live user count ---------------- */
  const liveUsersEl = document.getElementById("liveUsers");
  const liveUsersCountEl = document.getElementById("liveUsersCount");
  function startLiveUserCount() {
    LI.subscribeLiveUsers((count) => {
      if (!count || count < 1) { liveUsersEl.classList.add("hidden"); return; }
      liveUsersCountEl.textContent = count === 1 ? "1 person listening right now" : `${count} people listening right now`;
      liveUsersEl.classList.remove("hidden");
    });
  }

  window.addEventListener("listenit-firebase-ready", (e) => {
    if (!e.detail || !e.detail.ok) return;
    loadFirebaseApps();
    loadTrending();
    startLiveUserCount();
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
      if (!viewer.classList.contains("hidden")) closeViewer();
      if (!submitModal.classList.contains("hidden")) closeSubmitModal();
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
