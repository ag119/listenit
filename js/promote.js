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

  function findExistingListing(platform, handle) {
    if (!handle.trim()) return null;
    const key = listingKey(platform, handle);
    return LISTINGS.find((l) => l.id === key) || null;
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
  // The actual current rank of an already-listed id (not a hypothetical bid).
  function rankOf(id) {
    const idx = sortedListings().findIndex((l) => l.id === id);
    return idx === -1 ? null : idx + 1;
  }

  const platformIcon = { Instagram: "📷", YouTube: "▶️", "X / Twitter": "𝕏", Facebook: "📘", Other: "🔗" };

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
    try { return JSON.parse(localStorage.getItem(MY_LISTINGS_KEY)) || []; } catch { return []; }
  }
  function saveMyListing(entry) {
    const all = getMyListings();
    const idx = all.findIndex((e) => e.key === entry.key);
    if (idx >= 0) all[idx] = entry; else all.push(entry);
    localStorage.setItem(MY_LISTINGS_KEY, JSON.stringify(all));
  }

  function renderMyEntries() {
    const section = document.getElementById("myEntriesSection");
    const list = document.getElementById("myEntriesList");
    const mine = getMyListings();
    if (!mine.length) { section.classList.add("hidden"); return; }
    section.classList.remove("hidden");
    list.innerHTML = "";

    mine.forEach((entry) => {
      const live = LISTINGS.find((l) => l.id === entry.key);
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
        statusSpan.textContent = `✅ Live — Rank #${rankOf(live.id)}, ${formatRupees(live.bidAmount)}`;
      } else {
        statusSpan.className = "my-entry-status status-pending";
        statusSpan.textContent = "⏳ Pending review";
      }
      info.appendChild(statusSpan);
      row.appendChild(info);

      const shareBtn = document.createElement("button");
      shareBtn.type = "button";
      shareBtn.className = "btn btn-secondary";
      shareBtn.textContent = "📤 Share";
      shareBtn.addEventListener("click", () => {
        if (live) shareEntry({ displayName: live.displayName, platform: live.platform, handle: live.handle, bidAmount: live.bidAmount, rank: rankOf(live.id) });
        else shareEntry({ displayName: entry.displayName, platform: entry.platform, handle: entry.handle, bidAmount: entry.bidAmount, pending: true });
      });
      row.appendChild(shareBtn);

      list.appendChild(row);
    });
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
      const links = document.createElement("div");
      links.className = "leaderboard-row-links";
      const boostBtn = document.createElement("button");
      boostBtn.type = "button";
      boostBtn.className = "leaderboard-boost-btn";
      boostBtn.textContent = "⬆ Boost";
      boostBtn.addEventListener("click", () => prefillForTopUp(l));
      links.appendChild(boostBtn);
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
    renderLeaderboard();
    renderActivity();
    renderMyEntries();
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
    } else if (lfHandle.value.trim()) {
      const key = listingKey(lfPlatform.value, lfHandle.value);
      const myPending = getMyListings().find((e) => e.key === key);
      if (myPending) {
        topUpNotice.classList.remove("hidden");
        topUpNotice.textContent = `You already have a pending entry for this account (submitted ${timeAgo(myPending.submittedAt)}) — submitting again updates that request instead of creating a duplicate.`;
      } else {
        topUpNotice.classList.add("hidden");
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
    const submitBtn = listingForm.querySelector("button[type=submit]");
    if (submitBtn.disabled) return; // already submitting or already submitted — ignore a stray extra click

    const bidAmount = currentBidAmount();

    if (matchedListing && bidAmount <= matchedListing.bidAmount) {
      showToast(`Your bid needs to be higher than your current ${formatRupees(matchedListing.bidAmount)}`);
      return;
    }
    if (!lfName.value.trim() || !lfHandle.value.trim()) {
      showToast("Fill in your name and handle first");
      return;
    }
    if (!lfUrl.value.trim().startsWith("https://")) {
      showToast("Profile URL needs to start with https://");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";

    const key = listingKey(lfPlatform.value, lfHandle.value);
    const data = {
      displayName: lfName.value,
      platform: lfPlatform.value,
      handle: lfHandle.value,
      url: lfUrl.value,
      tagline: lfTagline.value,
      bidAmount,
      contactNote: ""
    };

    const id = await LI.submitSocialListingRequest(key, data);

    if (!id) {
      showToast("Couldn't submit that — check your connection and try again");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit entry";
      return;
    }

    LI.trackEvent("submit_social_listing", { platform: data.platform, bid_amount: bidAmount, is_topup: !!matchedListing });

    saveMyListing({ key, platform: data.platform, handle: data.handle, displayName: data.displayName, bidAmount, submittedAt: Date.now() });
    renderMyEntries();

    // Success — leave the button disabled and swap the form out for the
    // confirmation, rather than re-enabling it: that's what let a few
    // impatient re-clicks pile up duplicate entries before this fix.
    listingForm.classList.add("hidden");
    document.getElementById("entryIdDisplay").textContent = id;
    document.getElementById("paymentAmount").textContent = formatRupees(bidAmount);
    const waText = encodeURIComponent(
      `Hi! I just submitted a ListenIt leaderboard entry.\n\nEntry ID: ${id}\nName: ${data.displayName}\nPlatform: ${data.platform}\nHandle: ${data.handle}\nBid: ${formatRupees(bidAmount)}\n\nSending the payment screenshot now.`
    );
    document.getElementById("paymentWhatsAppBtn").href = `https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`;
    document.getElementById("shareSubmissionBtn").onclick = () => shareEntry({ displayName: data.displayName, platform: data.platform, handle: data.handle, bidAmount, pending: true });
    paymentPanel.classList.remove("hidden");
    paymentPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("copyUpiBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(UPI_ID).then(() => showToast("UPI ID copied")).catch(() => showToast(UPI_ID));
  });
  document.getElementById("copyEntryIdBtn").addEventListener("click", () => {
    const id = document.getElementById("entryIdDisplay").textContent;
    navigator.clipboard.writeText(id).then(() => showToast("Entry ID copied")).catch(() => showToast(id));
  });

  updateBidPreview();
  renderMyEntries(); // shows immediately from localStorage; loadLeaderboard() refines live/pending status once data arrives
})();
