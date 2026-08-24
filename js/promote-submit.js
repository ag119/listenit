(function () {
  "use strict";

  const PS = window.PromoteShared;
  const { LI, MIN_BID, MIN_BOOST_INCREMENT, WHATSAPP_NUMBER, UPI_ID, PLATFORM_URL, buildProfileUrl, urlMatchesPlatform,
    showToast, formatRupees, listingKey, getMyListings, saveMyListing, isMine,
    priceForRank, rankForPrice, findExistingListing, consumePrefill, shareEntry } = PS;

  let LISTINGS = [];

  const lfName = document.getElementById("lfName");
  const lfPlatform = document.getElementById("lfPlatform");
  const lfHandle = document.getElementById("lfHandle");
  const lfUrl = document.getElementById("lfUrl");
  const lfUrlEditToggle = document.getElementById("lfUrlEditToggle");
  const lfUrlHint = document.getElementById("lfUrlHint");
  const lfTagline = document.getElementById("lfTagline");
  const lfBidAmount = document.getElementById("lfBidAmount");
  const lfTargetRank = document.getElementById("lfTargetRank");
  const topUpNotice = document.getElementById("topUpNotice");
  const bidModeAmountBtn = document.getElementById("bidModeAmount");
  const bidModeRankBtn = document.getElementById("bidModeRank");
  const bidByAmount = document.getElementById("bidByAmount");
  const bidByRank = document.getElementById("bidByRank");
  const listingForm = document.getElementById("listingForm");
  const paymentPanel = document.getElementById("paymentPanel");

  let bidMode = "amount"; // "amount" | "rank"
  let matchedListing = null;
  let blockedNotOwner = false;
  let urlManuallyEdited = false; // once true, the URL field stops following the handle

  /* ---------------- Handle input: strip a leading @ as they type, keep the visual @ separate ---------------- */
  lfHandle.addEventListener("input", () => {
    const stripped = lfHandle.value.replace(/^@+/, "");
    if (stripped !== lfHandle.value) lfHandle.value = stripped;
    syncAutoUrl();
    checkTopUp();
  });

  /* ---------------- Profile URL: auto-generated from handle for known platforms ---------------- */
  function syncAutoUrl() {
    const conf = PLATFORM_URL[lfPlatform.value];
    if (!conf) {
      // "Other" — no fixed domain to build from, always manual.
      lfUrl.readOnly = false;
      lfUrlEditToggle.classList.add("hidden");
      lfUrlHint.textContent = "Paste the full link to your page — needs to start with https://.";
      return;
    }
    if (!urlManuallyEdited) {
      lfUrl.value = lfHandle.value.trim() ? buildProfileUrl(lfPlatform.value, lfHandle.value.trim()) : "";
      lfUrl.readOnly = true;
      lfUrlEditToggle.textContent = "✏️ Not right? Enter a different link";
      lfUrlEditToggle.classList.remove("hidden");
      lfUrlHint.textContent = "Generated automatically from your handle above.";
    } else {
      lfUrl.readOnly = false;
      lfUrlEditToggle.textContent = "↺ Use the auto-generated link instead";
      lfUrlEditToggle.classList.remove("hidden");
      lfUrlHint.textContent = `Needs to be a ${conf.domains[0]} link.`;
    }
  }
  lfUrlEditToggle.addEventListener("click", () => {
    urlManuallyEdited = !urlManuallyEdited;
    if (!urlManuallyEdited) lfUrl.value = "";
    syncAutoUrl();
  });

  /* ---------------- Top-up / duplicate / ownership checks ---------------- */
  function checkTopUp() {
    matchedListing = findExistingListing(LISTINGS, lfPlatform.value, lfHandle.value);
    blockedNotOwner = !!(matchedListing && !isMine(matchedListing.id));
    const submitBtn = listingForm.querySelector("button[type=submit]");

    if (blockedNotOwner) {
      topUpNotice.classList.remove("hidden");
      topUpNotice.classList.add("topup-blocked");
      topUpNotice.textContent = "This account is already listed by someone else — only the browser that submitted it can update its bid. If this is your account, please submit from that device, or reach out on WhatsApp.";
      submitBtn.disabled = true;
      updateBidPreview();
      return;
    }
    topUpNotice.classList.remove("topup-blocked");
    if (!listingForm.classList.contains("hidden")) submitBtn.disabled = false; // don't fight the post-submit permanent-disable

    if (matchedListing) {
      const minNext = matchedListing.bidAmount + MIN_BOOST_INCREMENT;
      topUpNotice.classList.remove("hidden");
      topUpNotice.textContent = `You're already listed at ${formatRupees(matchedListing.bidAmount)} — this will update that listing instead of creating a new one. Your new bid needs to be at least ${formatRupees(minNext)} (₹${MIN_BOOST_INCREMENT} more than your current bid).`;
      if (bidMode === "amount" && Number(lfBidAmount.value) < minNext) {
        lfBidAmount.value = minNext;
      }
    } else if (lfHandle.value.trim()) {
      const key = listingKey(lfPlatform.value, lfHandle.value);
      const myPending = getMyListings().find((e) => e.key === key);
      if (myPending) {
        topUpNotice.classList.remove("hidden");
        topUpNotice.textContent = `You already have a pending entry for this account — submitting again updates that request instead of creating a duplicate.`;
      } else {
        topUpNotice.classList.add("hidden");
      }
    } else {
      topUpNotice.classList.add("hidden");
    }
    updateBidPreview();
  }
  lfPlatform.addEventListener("change", () => {
    urlManuallyEdited = false; // a platform switch invalidates any override — start fresh
    syncAutoUrl();
    checkTopUp();
  });

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
    return priceForRank(LISTINGS, rank);
  }

  function updateBidPreview() {
    if (bidMode === "amount") {
      const amount = Math.max(MIN_BID, Math.round(Number(lfBidAmount.value) || MIN_BID));
      const rank = rankForPrice(LISTINGS, amount);
      document.getElementById("bidAmountPreview").innerHTML =
        `That would currently rank you <strong>#${rank}</strong>.`;
    } else {
      const rank = Math.max(1, Math.round(Number(lfTargetRank.value) || 1));
      const price = priceForRank(LISTINGS, rank);
      document.getElementById("bidRankPreview").innerHTML =
        `Rank #${rank} needs a bid of <strong>${formatRupees(price)}</strong> right now.`;
    }
  }
  lfBidAmount.addEventListener("input", updateBidPreview);
  lfTargetRank.addEventListener("input", updateBidPreview);

  // Undoes the permanent post-submit disable (see the submit handler below)
  // so the form is usable again for a Boost or an Edit-and-resubmit.
  function resetFormVisibility() {
    listingForm.classList.remove("hidden");
    paymentPanel.classList.add("hidden");
    const submitBtn = listingForm.querySelector("button[type=submit]");
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit entry";
  }

  function applyPrefill(payload) {
    resetFormVisibility();
    if (payload.mode === "topup") {
      const listing = payload.listing;
      lfName.value = listing.displayName;
      lfPlatform.value = listing.platform;
      lfHandle.value = (listing.handle || "").replace(/^@+/, "");
      urlManuallyEdited = true; // preserve their existing link exactly, don't regenerate it
      lfUrl.value = listing.url;
      lfTagline.value = listing.tagline || "";
      syncAutoUrl();
      checkTopUp();
      setBidMode("amount");
      lfBidAmount.value = listing.bidAmount + MIN_BOOST_INCREMENT;
      updateBidPreview();
      showToast(`Boosting your existing listing — bid at least ₹${MIN_BOOST_INCREMENT} more and submit`);
    } else if (payload.mode === "edit") {
      // A rejected entry isn't live anywhere, so there's no "must bid
      // higher than X" floor — just bring back what they typed so they can
      // fix whatever got it rejected and resend.
      const entry = payload.entry;
      lfName.value = entry.displayName || "";
      lfPlatform.value = entry.platform;
      lfHandle.value = (entry.handle || "").replace(/^@+/, "");
      urlManuallyEdited = true;
      lfUrl.value = entry.url || "";
      lfTagline.value = entry.tagline || "";
      syncAutoUrl();
      setBidMode("amount");
      lfBidAmount.value = Math.max(MIN_BID, entry.bidAmount || MIN_BID);
      checkTopUp();
      updateBidPreview();
      showToast("Fix what needs fixing, then resubmit");
    }
  }

  listingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = listingForm.querySelector("button[type=submit]");
    if (submitBtn.disabled) return; // already submitting, already submitted, or blocked — ignore a stray extra click

    if (blockedNotOwner) {
      showToast("That account's already listed by someone else — only its own browser can update it.");
      return;
    }

    const bidAmount = currentBidAmount();

    if (matchedListing && bidAmount < matchedListing.bidAmount + MIN_BOOST_INCREMENT) {
      showToast(`Your bid needs to be at least ${formatRupees(matchedListing.bidAmount + MIN_BOOST_INCREMENT)} — ₹${MIN_BOOST_INCREMENT} more than your current bid`);
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
    if (!urlMatchesPlatform(lfPlatform.value, lfUrl.value.trim())) {
      const article = /^[aeiou]/i.test(lfPlatform.value) ? "an" : "a";
      showToast(`That link doesn't look like ${article} ${lfPlatform.value} link — check it, or switch back to the auto-generated one`);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";

    const handleRaw = lfHandle.value.trim();
    const key = listingKey(lfPlatform.value, handleRaw);
    const data = {
      displayName: lfName.value,
      platform: lfPlatform.value,
      handle: "@" + handleRaw,
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

    saveMyListing({ key, platform: data.platform, handle: data.handle, displayName: data.displayName, url: data.url, tagline: data.tagline, bidAmount, submittedAt: Date.now() });

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

  syncAutoUrl();
  updateBidPreview();
  const pendingPrefill = consumePrefill();
  if (pendingPrefill) applyPrefill(pendingPrefill);

  window.addEventListener("listenit-firebase-ready", async (e) => {
    if (!e.detail || !e.detail.ok) return;
    LISTINGS = await LI.getSocialListings();
    // Re-check now that real listing data is in — a prefill applied before
    // this point ran checkTopUp() against an empty LISTINGS array.
    checkTopUp();
  });
})();
