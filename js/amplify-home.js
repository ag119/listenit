/**
 * The homepage's compact Amplify teaser — Spotlight carousel + top-8
 * ranked apps, with a link out to the full amplify.html for everything
 * else (pagination, activity, "Your requests"). Deliberately small and
 * self-contained rather than reusing js/amplify.js's render functions,
 * which are written for the full page (pagination, "Your requests",
 * etc.) this teaser doesn't need.
 */
(function () {
  "use strict";

  const AS = window.AmplifyShared;
  const { LI, tsMillis, formatDb, appById, allApps, goToSubmitWithPrefill } = AS;
  const TOP_N = 8;
  const PLACEHOLDER_THUMB = "thumbnails/placeholder.jpg";

  function thumbFor(app) {
    return app.thumbnail || PLACEHOLDER_THUMB;
  }

  function renderSpotlight(featured) {
    const el = document.getElementById("homeSpotlightCarousel");
    const now = Date.now();
    const active = featured.filter((f) => tsMillis(f.featuredUntil) > now).sort((a, b) => a.rank - b.rank);
    el.innerHTML = "";
    if (!active.length) return; // no empty-state clutter on the homepage teaser
    active.forEach((f) => {
      const app = appById(f.appId);
      if (!app) return;
      const card = document.createElement("a");
      card.className = "spotlight-card";
      card.href = app.url;
      card.target = "_blank";
      card.rel = "noopener";
      card.innerHTML = `
        <span class="spotlight-rank">#${f.rank}</span>
        <img src="${thumbFor(app)}" alt="" loading="lazy" onerror="this.src='${PLACEHOLDER_THUMB}'" />
        <span class="spotlight-name">${app.name}</span>
        <span class="spotlight-category">${app.category}</span>
      `;
      el.appendChild(card);
    });
  }

  function renderTopRankings(points) {
    const el = document.getElementById("homeRankingsList");
    const ranked = allApps()
      .map((a) => ({ app: a, points: points[a.id] || 0 }))
      .sort((a, b) => b.points - a.points || a.app.name.localeCompare(b.app.name))
      .slice(0, TOP_N);

    el.innerHTML = "";
    ranked.forEach((entry, i) => {
      const rank = i + 1;
      const app = entry.app;
      const row = document.createElement("div");
      row.className = "rank-row" + (rank <= 3 ? " rank-" + rank : "");
      row.innerHTML = `
        <div class="rank-num">${rank}</div>
        <img class="rank-thumb" src="${thumbFor(app)}" alt="" loading="lazy" onerror="this.src='${PLACEHOLDER_THUMB}'" />
        <div class="rank-body">
          <a class="rank-name" href="${app.url}" target="_blank" rel="noopener">${app.name}</a>
          <span class="rank-category">${app.category}</span>
        </div>
        <div class="rank-db">${formatDb(entry.points)}</div>
        <div class="rank-actions">
          <button type="button" class="rank-btn rank-btn-up" title="Turn it up">🔊</button>
          <button type="button" class="rank-btn rank-btn-down" title="Turn it down">🔉</button>
        </div>
      `;
      row.querySelector(".rank-btn-up").addEventListener("click", () => goToSubmitWithPrefill({ mode: "points", appId: app.id, direction: "up" }));
      row.querySelector(".rank-btn-down").addEventListener("click", () => goToSubmitWithPrefill({ mode: "points", appId: app.id, direction: "down" }));
      el.appendChild(row);
    });
  }

  async function load() {
    const [points, featured] = await Promise.all([LI.getAppPoints(), LI.getFeaturedApps()]);
    renderSpotlight(featured);
    renderTopRankings(points);
    document.getElementById("amplifyHomeSection").classList.remove("hidden");
  }

  window.addEventListener("listenit-firebase-ready", (e) => {
    if (!e.detail || !e.detail.ok) return;
    load();
  });
})();
