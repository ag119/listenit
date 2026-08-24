(function () {
  "use strict";

  const AS = window.AmplifyShared;
  const { LI, showToast, tsMillis, timeAgo, daysLeft, formatDb,
    appById, allApps, getMyRequests, removeMyRequest, rejectionFor,
    goToSubmitWithPrefill } = AS;
  const PAGE_SIZE = 50;
  const PLACEHOLDER_THUMB = "thumbnails/placeholder.jpg";

  let POINTS = {};       // { appId: number }
  let FEATURED = [];     // [{ id, rank, featuredUntil, approvedAt, appName }]
  let ACTIVITY = [];
  let POINT_REJECTIONS = [];
  let FEATURED_REJECTIONS = [];
  let currentPage = 0;

  function pointsOf(appId) {
    return POINTS[appId] || 0;
  }

  function rankedApps() {
    return allApps()
      .map((a) => ({ app: a, points: pointsOf(a.id) }))
      .sort((a, b) => b.points - a.points || a.app.name.localeCompare(b.app.name));
  }

  function thumbFor(app) {
    return app.thumbnail || PLACEHOLDER_THUMB;
  }

  /* ---------------- Spotlight carousel ---------------- */
  function renderSpotlight() {
    const el = document.getElementById("spotlightCarousel");
    const now = Date.now();
    const active = FEATURED
      .filter((f) => tsMillis(f.featuredUntil) > now)
      .sort((a, b) => a.rank - b.rank);

    el.innerHTML = "";
    if (!active.length) {
      const empty = document.createElement("p");
      empty.className = "amplify-empty";
      empty.textContent = "No app is Spotlighted right now — be the first.";
      el.appendChild(empty);
      return;
    }

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

  /* ---------------- Rankings list ---------------- */
  function renderRankings() {
    const listEl = document.getElementById("rankingsList");
    const countEl = document.getElementById("rankingsCount");
    const pagerEl = document.getElementById("rankingsPager");
    const ranked = rankedApps();

    countEl.textContent = `${ranked.length} apps`;

    const totalPages = Math.ceil(ranked.length / PAGE_SIZE);
    currentPage = Math.min(currentPage, totalPages - 1);
    const start = currentPage * PAGE_SIZE;
    const pageItems = ranked.slice(start, start + PAGE_SIZE);

    listEl.innerHTML = "";
    pageItems.forEach((entry, i) => {
      const rank = start + i + 1;
      const app = entry.app;
      const row = document.createElement("div");
      row.className = "rank-row" + (rank <= 3 ? " rank-" + rank : "");

      const rankEl = document.createElement("div");
      rankEl.className = "rank-num";
      rankEl.textContent = String(rank);
      row.appendChild(rankEl);

      const thumb = document.createElement("img");
      thumb.className = "rank-thumb";
      thumb.src = thumbFor(app);
      thumb.alt = "";
      thumb.loading = "lazy";
      thumb.onerror = () => { thumb.src = PLACEHOLDER_THUMB; };
      row.appendChild(thumb);

      const body = document.createElement("div");
      body.className = "rank-body";
      const nameLink = document.createElement("a");
      nameLink.className = "rank-name";
      nameLink.href = app.url;
      nameLink.target = "_blank";
      nameLink.rel = "noopener";
      nameLink.textContent = app.name;
      body.appendChild(nameLink);
      const cat = document.createElement("span");
      cat.className = "rank-category";
      cat.textContent = app.category;
      body.appendChild(cat);
      row.appendChild(body);

      const db = document.createElement("div");
      db.className = "rank-db";
      db.textContent = formatDb(entry.points);
      row.appendChild(db);

      const actions = document.createElement("div");
      actions.className = "rank-actions";
      const upBtn = document.createElement("button");
      upBtn.type = "button";
      upBtn.className = "rank-btn rank-btn-up";
      upBtn.title = "Turn it up";
      upBtn.textContent = "🔊";
      upBtn.addEventListener("click", () => goToSubmitWithPrefill({ mode: "points", appId: app.id, direction: "up" }));
      actions.appendChild(upBtn);
      const downBtn = document.createElement("button");
      downBtn.type = "button";
      downBtn.className = "rank-btn rank-btn-down";
      downBtn.title = "Turn it down";
      downBtn.textContent = "🔉";
      downBtn.addEventListener("click", () => goToSubmitWithPrefill({ mode: "points", appId: app.id, direction: "down" }));
      actions.appendChild(downBtn);
      row.appendChild(actions);

      listEl.appendChild(row);
    });

    if (totalPages > 1) {
      pagerEl.classList.remove("hidden");
      document.getElementById("pagerLabel").textContent = `Page ${currentPage + 1} of ${totalPages}`;
      document.getElementById("pagerPrev").disabled = currentPage === 0;
      document.getElementById("pagerNext").disabled = currentPage >= totalPages - 1;
    } else {
      pagerEl.classList.add("hidden");
    }
  }
  document.getElementById("pagerPrev").addEventListener("click", () => { currentPage--; renderRankings(); window.scrollTo({ top: document.getElementById("rankingsList").offsetTop - 80, behavior: "smooth" }); });
  document.getElementById("pagerNext").addEventListener("click", () => { currentPage++; renderRankings(); window.scrollTo({ top: document.getElementById("rankingsList").offsetTop - 80, behavior: "smooth" }); });

  /* ---------------- Recent activity ---------------- */
  function renderActivity() {
    const el = document.getElementById("activityList");
    const sorted = [...ACTIVITY].sort((a, b) => tsMillis(b.approvedAt) - tsMillis(a.approvedAt)).slice(0, 20);
    el.innerHTML = "";
    if (!sorted.length) {
      const empty = document.createElement("p");
      empty.className = "amplify-empty";
      empty.textContent = "No activity yet.";
      el.appendChild(empty);
      return;
    }
    sorted.forEach((act) => {
      const item = document.createElement("div");
      item.className = "activity-item";
      const up = act.direction === "up";
      const text = document.createElement("span");
      text.className = "activity-item-text";
      const strong1 = document.createElement("strong");
      strong1.textContent = act.appName || act.appId;
      text.appendChild(strong1);
      text.appendChild(document.createTextNode(up ? " turned up " : " turned down "));
      const strong2 = document.createElement("strong");
      strong2.textContent = `${up ? "+" : "−"}${act.amount} dB`;
      text.appendChild(strong2);
      item.appendChild(text);
      const time = document.createElement("span");
      time.className = "activity-item-time";
      time.textContent = timeAgo(tsMillis(act.approvedAt));
      item.appendChild(time);
      el.appendChild(item);
    });
  }

  /* ---------------- Your requests ---------------- */
  function renderMyRequests() {
    const section = document.getElementById("myAmplifySection");
    const list = document.getElementById("myAmplifyList");
    const mine = getMyRequests();
    if (!mine.length) { section.classList.add("hidden"); return; }
    section.classList.remove("hidden");
    list.innerHTML = "";

    mine.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "my-amplify-row";
      const app = appById(entry.appId);

      const info = document.createElement("div");
      info.className = "my-amplify-info";
      const nameSpan = document.createElement("strong");
      nameSpan.textContent = (entry.kind === "spotlight" ? "🔦 " : entry.direction === "up" ? "🔊 " : "🔉 ") + (app ? app.name : entry.appName);
      info.appendChild(nameSpan);

      const statusSpan = document.createElement("span");
      if (entry.kind === "spotlight") {
        const live = FEATURED.find((f) => f.id === entry.id && tsMillis(f.featuredUntil) > Date.now());
        const rejection = live ? null : rejectionFor(entry, FEATURED_REJECTIONS);
        if (live) {
          statusSpan.className = "my-amplify-status status-live";
          statusSpan.textContent = `✅ Live — Rank #${live.rank}, ${daysLeft(tsMillis(live.featuredUntil))} left`;
        } else if (rejection) {
          statusSpan.className = "my-amplify-status status-rejected";
          statusSpan.textContent = "❌ Rejected";
          if (rejection.reason) {
            const reasonDiv = document.createElement("div");
            reasonDiv.className = "my-amplify-reason";
            reasonDiv.textContent = "Reason: " + rejection.reason;
            row.appendChild(reasonDiv);
          }
        } else {
          statusSpan.className = "my-amplify-status status-pending";
          statusSpan.textContent = "⏳ Pending review";
        }
      } else {
        const applied = ACTIVITY.find((a) => a.requestId === entry.id);
        const rejection = applied ? null : rejectionFor(entry, POINT_REJECTIONS);
        if (applied) {
          statusSpan.className = "my-amplify-status status-live";
          statusSpan.textContent = `✅ Applied — now ${formatDb(applied.newTotal)}`;
        } else if (rejection) {
          statusSpan.className = "my-amplify-status status-rejected";
          statusSpan.textContent = "❌ Rejected";
          if (rejection.reason) {
            const reasonDiv = document.createElement("div");
            reasonDiv.className = "my-amplify-reason";
            reasonDiv.textContent = "Reason: " + rejection.reason;
            row.appendChild(reasonDiv);
          }
        } else {
          statusSpan.className = "my-amplify-status status-pending";
          statusSpan.textContent = "⏳ Pending review";
        }
      }
      info.appendChild(statusSpan);
      row.appendChild(info);

      const actions = document.createElement("div");
      actions.className = "my-amplify-actions";
      const isPending = statusSpan.textContent.includes("Pending");
      if (isPending) {
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "btn btn-secondary btn-danger-outline";
        removeBtn.textContent = "🗑 Remove";
        removeBtn.addEventListener("click", () => removeRequest(entry));
        actions.appendChild(removeBtn);
      }
      row.appendChild(actions);

      list.appendChild(row);
    });
  }

  async function removeRequest(entry) {
    if (!confirm("Remove this still-pending request? You'll need to resubmit if you change your mind.")) return;
    const ok = entry.kind === "spotlight"
      ? await LI.deleteFeaturedAppRequest(entry.id)
      : await LI.deleteAppPointRequest(entry.id);
    if (!ok) { showToast("Couldn't remove that — check your connection and try again"); return; }
    removeMyRequest(entry.id);
    showToast("Request removed");
    renderMyRequests();
  }

  async function loadAll() {
    const [points, featured, activity, pointRej, featuredRej] = await Promise.all([
      LI.getAppPoints(),
      LI.getFeaturedApps(),
      LI.getAppPointActivity(),
      LI.getAppPointRejections(),
      LI.getFeaturedAppRejections()
    ]);
    POINTS = points;
    FEATURED = featured;
    ACTIVITY = activity;
    POINT_REJECTIONS = pointRej;
    FEATURED_REJECTIONS = featuredRej;
    renderSpotlight();
    renderRankings();
    renderActivity();
    renderMyRequests();
  }

  window.addEventListener("listenit-firebase-ready", (e) => {
    if (!e.detail || !e.detail.ok) return;
    loadAll();
  });

  renderMyRequests(); // shows immediately from localStorage; loadAll() refines status once data arrives
})();
