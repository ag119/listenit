(function () {
  "use strict";

  const WHATSAPP_NUMBER = "918853487447";
  const UPI_ID = "8853487447@ybl";
  const MIN_BID = 100;
  const PAGE_SIZE = 50;

  const LI = window.ListenIt || {
    trackEvent() {},
    async getSocialListings() { return []; },
    async submitSocialListingRequest() { return null; }
  };

  /* ---------------- Theme (standalone copy — this page doesn't load js/app.js) ---------------- */
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
  applyTheme(savedTheme || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
  themeToggle.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    applyTheme(next);
    localStorage.setItem("listenit-theme", next);
  });

  function showToast(msg) {
    const toast = document.getElementById("toast");
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

  /* ---------------- Leaderboard state ---------------- */
  let LISTINGS = [];
  let currentPage = 0;

  function sortedListings() {
    return [...LISTINGS].sort((a, b) => {
      if (b.bidAmount !== a.bidAmount) return b.bidAmount - a.bidAmount;
      return tsMillis(a.createdAt) - tsMillis(b.createdAt);
    });
  }

  function findExistingListing(platform, handle) {
    const h = handle.trim().toLowerCase().replace(/^@/, "");
    return LISTINGS.find((l) => l.platform === platform && l.handle.trim().toLowerCase().replace(/^@/, "") === h) || null;
  }

  // Minimum bid needed to occupy a given 1-indexed rank right now.
  function priceForRank(rank) {
    const sorted = sortedListings();
    const holder = sorted[rank - 1];
    if (!holder) return MIN_BID;
    return Math.max(MIN_BID, holder.bidAmount + 1);
  }
  // Rank a given bid amount would land at right now (ties lose to existing entries — first-come-first-served).
  function rankForPrice(amount) {
    const sorted = sortedListings();
    return sorted.filter((l) => l.bidAmount >= amount).length + 1;
  }

  const platformIcon = { Instagram: "📷", YouTube: "▶️", "X / Twitter": "𝕏", Facebook: "📘", Other: "🔗" };

  function renderLeaderboard() {
    const listEl = document.getElementById("leaderboardList");
    const countEl = document.getElementById("leaderboardCount");
    const pagerEl = document.getElementById("leaderboardPager");
    const sorted = sortedListings();

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
      const boostBtn = document.createElement("button");
      boostBtn.type = "button";
      boostBtn.className = "leaderboard-boost-btn";
      boostBtn.textContent = "⬆ Boost";
      boostBtn.addEventListener("click", () => prefillForTopUp(l));
      actions.appendChild(boostBtn);
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
    renderLeaderboard();
    renderActivity();
    updateBidPreview();
  }

  window.addEventListener("listenit-firebase-ready", (e) => {
    if (!e.detail || !e.detail.ok) return;
    loadLeaderboard();
  });

  /* ---------------- Submission form ---------------- */
  const lfName = document.getElementById("lfName");
  const lfPlatform = document.getElementById("lfPlatform");
  const lfHandle = document.getElementById("lfHandle");
  const lfUrl = document.getElementById("lfUrl");
  const lfTagline = document.getElementById("lfTagline");
  const lfBidAmount = document.getElementById("lfBidAmount");
  const lfTargetRank = document.getElementById("lfTargetRank");
  const topUpNotice = document.getElementById("topUpNotice");
  const bidModeAmountBtn = document.getElementById("bidModeAmount");
  const bidModeRankBtn = document.getElementById("bidModeRank");
  const bidByAmount = document.getElementById("bidByAmount");
  const bidByRank = document.getElementById("bidByRank");

  let bidMode = "amount"; // "amount" | "rank"
  let matchedListing = null;

  function checkTopUp() {
    matchedListing = findExistingListing(lfPlatform.value, lfHandle.value);
    if (matchedListing) {
      topUpNotice.classList.remove("hidden");
      topUpNotice.textContent = `You're already listed at ${formatRupees(matchedListing.bidAmount)} — this will update that listing instead of creating a new one. Your new bid needs to be higher than ${formatRupees(matchedListing.bidAmount)}.`;
      if (bidMode === "amount" && Number(lfBidAmount.value) <= matchedListing.bidAmount) {
        lfBidAmount.value = matchedListing.bidAmount + 1;
      }
    } else {
      topUpNotice.classList.add("hidden");
    }
    updateBidPreview();
  }
  lfHandle.addEventListener("input", checkTopUp);
  lfPlatform.addEventListener("change", checkTopUp);

  function setBidMode(mode) {
    bidMode = mode;
    bidModeAmountBtn.classList.toggle("active", mode === "amount");
    bidModeRankBtn.classList.toggle("active", mode === "rank");
    bidByAmount.classList.toggle("hidden", mode !== "amount");
    bidByRank.classList.toggle("hidden", mode !== "rank");
    updateBidPreview();
  }
  bidModeAmountBtn.addEventListener("click", () => setBidMode("amount"));
  bidModeRankBtn.addEventListener("click", () => setBidMode("rank"));

  function currentBidAmount() {
    if (bidMode === "amount") {
      return Math.max(MIN_BID, Math.round(Number(lfBidAmount.value) || MIN_BID));
    }
    const rank = Math.max(1, Math.round(Number(lfTargetRank.value) || 1));
    return priceForRank(rank);
  }

  function updateBidPreview() {
    if (bidMode === "amount") {
      const amount = Math.max(MIN_BID, Math.round(Number(lfBidAmount.value) || MIN_BID));
      const rank = rankForPrice(amount);
      document.getElementById("bidAmountPreview").innerHTML =
        `That would currently rank you <strong>#${rank}</strong>.`;
    } else {
      const rank = Math.max(1, Math.round(Number(lfTargetRank.value) || 1));
      const price = priceForRank(rank);
      document.getElementById("bidRankPreview").innerHTML =
        `Rank #${rank} needs a bid of <strong>${formatRupees(price)}</strong> right now.`;
    }
  }
  lfBidAmount.addEventListener("input", updateBidPreview);
  lfTargetRank.addEventListener("input", updateBidPreview);

  function prefillForTopUp(listing) {
    lfName.value = listing.displayName;
    lfPlatform.value = listing.platform;
    lfHandle.value = listing.handle;
    lfUrl.value = listing.url;
    lfTagline.value = listing.tagline || "";
    checkTopUp();
    setBidMode("amount");
    lfBidAmount.value = listing.bidAmount + 1;
    updateBidPreview();
    document.getElementById("promoteForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const listingForm = document.getElementById("listingForm");
  const paymentPanel = document.getElementById("paymentPanel");

  listingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const bidAmount = currentBidAmount();

    if (matchedListing && bidAmount <= matchedListing.bidAmount) {
      showToast(`Your bid needs to be higher than your current ${formatRupees(matchedListing.bidAmount)}`);
      return;
    }
    if (!lfUrl.value.trim().startsWith("https://")) {
      showToast("Profile URL needs to start with https://");
      return;
    }

    const submitBtn = listingForm.querySelector("button[type=submit]");
    submitBtn.disabled = true;

    const data = {
      displayName: lfName.value,
      platform: lfPlatform.value,
      handle: lfHandle.value,
      url: lfUrl.value,
      tagline: lfTagline.value,
      bidAmount,
      isTopUp: !!matchedListing,
      targetListingId: matchedListing ? matchedListing.id : null,
      contactNote: ""
    };

    const id = await LI.submitSocialListingRequest(data);
    submitBtn.disabled = false;

    if (!id) {
      showToast("Couldn't submit that — check your connection and try again");
      return;
    }

    LI.trackEvent("submit_social_listing", { platform: data.platform, bid_amount: bidAmount, is_topup: data.isTopUp });

    document.getElementById("paymentAmount").textContent = formatRupees(bidAmount);
    const waText = encodeURIComponent(
      `Hi! I just submitted a ListenIt leaderboard listing.\n\nName: ${data.displayName}\nPlatform: ${data.platform}\nHandle: ${data.handle}\nBid: ${formatRupees(bidAmount)}${data.isTopUp ? " (update to existing listing)" : ""}\n\nSending the payment screenshot now.`
    );
    document.getElementById("paymentWhatsAppBtn").href = `https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`;
    paymentPanel.classList.remove("hidden");
    paymentPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("copyUpiBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(UPI_ID).then(() => showToast("UPI ID copied")).catch(() => showToast(UPI_ID));
  });

  updateBidPreview();
})();
