(function () {
  "use strict";

  const PS = window.PromoteShared;
  const { LI, platformIcon, showToast, tsMillis, timeAgo, formatRupees,
    getMyListings, removeMyListing, isMine, rejectionFor, goToSubmitWithPrefill,
    sortedListings, rankOf, shareEntry } = PS;
  const PAGE_SIZE = 50;

  let LISTINGS = [];
  let REJECTIONS = [];
  let currentPage = 0;

  function renderMyEntries() {
    const section = document.getElementById("myEntriesSection");
    const list = document.getElementById("myEntriesList");
    const mine = getMyListings();
    if (!mine.length) { section.classList.add("hidden"); return; }
    section.classList.remove("hidden");
    list.innerHTML = "";

    mine.forEach((entry) => {
      const live = LISTINGS.find((l) => l.id === entry.key);
      const rejection = live ? null : rejectionFor(entry, REJECTIONS);
      const row = document.createElement("div");
      row.className = "my-entry-row";

      const info = document.createElement("div");
      info.className = "my-entry-info";
      const platformSpan = document.createElement("strong");
      platformSpan.textContent = (platformIcon[entry.platform] || "🔗") + " " + entry.platform;
      info.appendChild(platformSpan);
      const handleSpan = document.createElement("span");
      handleSpan.className = "my-entry-handle";
      handleSpan.textContent = entry.handle;
      info.appendChild(handleSpan);
      const statusSpan = document.createElement("span");
      if (live) {
        statusSpan.className = "my-entry-status status-live";
        statusSpan.textContent = `✅ Live — Rank #${rankOf(LISTINGS, live.id)}, ${formatRupees(live.bidAmount)}`;
      } else if (rejection) {
        statusSpan.className = "my-entry-status status-rejected";
        statusSpan.textContent = "❌ Rejected";
      } else {
        statusSpan.className = "my-entry-status status-pending";
        statusSpan.textContent = "⏳ Pending review";
      }
      info.appendChild(statusSpan);
      row.appendChild(info);

      if (rejection && rejection.reason) {
        const reasonDiv = document.createElement("div");
        reasonDiv.className = "my-entry-reason";
        reasonDiv.textContent = "Reason: " + rejection.reason;
        row.appendChild(reasonDiv);
      }

      const actions = document.createElement("div");
      actions.className = "my-entry-actions";

      if (rejection) {
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "btn btn-secondary";
        editBtn.textContent = "✏️ Edit & resubmit";
        editBtn.addEventListener("click", () => goToSubmitWithPrefill({ mode: "edit", entry }));
        actions.appendChild(editBtn);
      }

      // A pending request (not live, not rejected) can still be withdrawn —
      // nothing's been reviewed yet, so there's nothing to "undo" beyond
      // deleting the request itself.
      if (!live && !rejection) {
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "btn btn-secondary btn-danger-outline";
        removeBtn.textContent = "🗑 Remove";
        removeBtn.addEventListener("click", () => removeRequest(entry));
        actions.appendChild(removeBtn);
      }

      if (live) {
        const boostBtn = document.createElement("button");
        boostBtn.type = "button";
        boostBtn.className = "btn btn-secondary";
        boostBtn.textContent = "⬆ Boost";
        boostBtn.addEventListener("click", () => goToSubmitWithPrefill({ mode: "topup", listing: live }));
        actions.appendChild(boostBtn);
      }

      // Skip the "I just bid ₹X" share for a rejected entry — that framing
      // is misleading once it's been turned down and hasn't been resubmitted.
      if (live || !rejection) {
        const shareBtn = document.createElement("button");
        shareBtn.type = "button";
        shareBtn.className = "btn btn-secondary";
        shareBtn.textContent = "📤 Share";
        shareBtn.addEventListener("click", () => {
          if (live) shareEntry({ displayName: live.displayName, platform: live.platform, handle: live.handle, bidAmount: live.bidAmount, rank: rankOf(LISTINGS, live.id) });
          else shareEntry({ displayName: entry.displayName, platform: entry.platform, handle: entry.handle, bidAmount: entry.bidAmount, pending: true });
        });
        actions.appendChild(shareBtn);
      }
      row.appendChild(actions);

      list.appendChild(row);
    });
  }

  async function removeRequest(entry) {
    if (!confirm(`Remove your pending request for ${entry.handle}? You'll need to submit again if you change your mind.`)) return;
    const ok = await LI.deleteSocialListingRequest(entry.key);
    if (!ok) { showToast("Couldn't remove that — check your connection and try again"); return; }
    removeMyListing(entry.key);
    showToast("Request removed");
    renderMyEntries();
  }

  function renderLeaderboard() {
    const listEl = document.getElementById("leaderboardList");
    const countEl = document.getElementById("leaderboardCount");
    const pagerEl = document.getElementById("leaderboardPager");
    const sorted = sortedListings(LISTINGS);

    countEl.textContent = sorted.length ? `${sorted.length} listed` : "";

    if (!sorted.length) {
      listEl.innerHTML = "";
      const empty = document.createElement("p");
      empty.className = "promote-empty";
      empty.textContent = "No one's listed yet — be the first.";
      listEl.appendChild(empty);
      pagerEl.classList.add("hidden");
      return;
    }

    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    currentPage = Math.min(currentPage, totalPages - 1);
    const start = currentPage * PAGE_SIZE;
    const pageItems = sorted.slice(start, start + PAGE_SIZE);

    listEl.innerHTML = "";
    pageItems.forEach((l, i) => {
      const rank = start + i + 1;
      const row = document.createElement("div");
      row.className = "leaderboard-row" + (rank <= 3 ? " rank-" + rank : "");

      const rankEl = document.createElement("div");
      rankEl.className = "leaderboard-rank";
      rankEl.textContent = String(rank);
      row.appendChild(rankEl);

      const body = document.createElement("div");
      body.className = "leaderboard-body";

      const name = document.createElement("div");
      name.className = "leaderboard-name";
      name.textContent = l.displayName || "Someone";
      body.appendChild(name);

      const meta = document.createElement("div");
      meta.className = "leaderboard-meta";
      const badge = document.createElement("span");
      badge.className = "leaderboard-platform-badge";
      badge.textContent = (platformIcon[l.platform] || "🔗") + " " + l.platform;
      meta.appendChild(badge);
      const handleLink = document.createElement("a");
      handleLink.href = l.url;
      handleLink.target = "_blank";
      handleLink.rel = "noopener";
      handleLink.textContent = l.handle;
      meta.appendChild(handleLink);
      body.appendChild(meta);

      if (l.tagline) {
        const tag = document.createElement("div");
        tag.className = "leaderboard-tagline";
        tag.textContent = l.tagline;
        body.appendChild(tag);
      }
      row.appendChild(body);

      const actions = document.createElement("div");
      actions.className = "leaderboard-actions";
      const bid = document.createElement("div");
      bid.className = "leaderboard-bid";
      bid.textContent = formatRupees(l.bidAmount);
      actions.appendChild(bid);
      const links = document.createElement("div");
      links.className = "leaderboard-row-links";
      // Only the browser that submitted an entry can boost it — anyone
      // could see everyone's card, but Boost pre-fills a bid *for that
      // account*, and only its owner should be able to start that flow.
      if (isMine(l.id)) {
        const boostBtn = document.createElement("button");
        boostBtn.type = "button";
        boostBtn.className = "leaderboard-boost-btn";
        boostBtn.textContent = "⬆ Boost";
        boostBtn.addEventListener("click", () => goToSubmitWithPrefill({ mode: "topup", listing: l }));
        links.appendChild(boostBtn);
      }
      const shareBtn = document.createElement("button");
      shareBtn.type = "button";
      shareBtn.className = "leaderboard-share-btn";
      shareBtn.textContent = "📤 Share";
      shareBtn.addEventListener("click", () => shareEntry({ displayName: l.displayName, platform: l.platform, handle: l.handle, bidAmount: l.bidAmount, rank }));
      links.appendChild(shareBtn);
      actions.appendChild(links);
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

  document.getElementById("pagerPrev").addEventListener("click", () => { currentPage--; renderLeaderboard(); window.scrollTo({ top: document.getElementById("leaderboardList").offsetTop - 80, behavior: "smooth" }); });
  document.getElementById("pagerNext").addEventListener("click", () => { currentPage++; renderLeaderboard(); window.scrollTo({ top: document.getElementById("leaderboardList").offsetTop - 80, behavior: "smooth" }); });

  function renderActivity() {
    const el = document.getElementById("activityList");
    const sorted = [...LISTINGS].sort((a, b) => tsMillis(b.approvedAt) - tsMillis(a.approvedAt)).slice(0, 20);
    el.innerHTML = "";
    if (!sorted.length) {
      const empty = document.createElement("p");
      empty.className = "promote-empty";
      empty.textContent = "No activity yet.";
      el.appendChild(empty);
      return;
    }
    sorted.forEach((l) => {
      const item = document.createElement("div");
      item.className = "activity-item";
      const text = document.createElement("span");
      text.className = "activity-item-text";
      const strong1 = document.createElement("strong");
      strong1.textContent = l.displayName || "Someone";
      text.appendChild(strong1);
      text.appendChild(document.createTextNode(" listed at "));
      const strong2 = document.createElement("strong");
      strong2.textContent = formatRupees(l.bidAmount);
      text.appendChild(strong2);
      item.appendChild(text);
      const time = document.createElement("span");
      time.className = "activity-item-time";
      time.textContent = timeAgo(tsMillis(l.approvedAt));
      item.appendChild(time);
      el.appendChild(item);
    });
  }

  async function loadLeaderboard() {
    LISTINGS = await LI.getSocialListings();
    REJECTIONS = await LI.getSocialListingRejections();
    renderLeaderboard();
    renderActivity();
    renderMyEntries();
  }

  window.addEventListener("listenit-firebase-ready", (e) => {
    if (!e.detail || !e.detail.ok) return;
    loadLeaderboard();
  });

  renderMyEntries(); // shows immediately from localStorage; loadLeaderboard() refines live/pending/rejected status once data arrives
})();
