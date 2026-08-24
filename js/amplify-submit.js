(function () {
  "use strict";

  const AS = window.AmplifyShared;
  const { LI, WHATSAPP_NUMBER, UPI_ID, showToast, formatDb, formatRupees,
    tsMillis, daysLeft, appById, allApps, saveMyRequest, consumePrefill } = AS;

  let CONFIG = { featuredPricing: {}, pointsPricing: {} };
  let FEATURED = [];
  let POINTS = {};

  /* ---------------- App pickers ---------------- */
  const apAppSelect = document.getElementById("apAppSelect");
  const asAppSelect = document.getElementById("asAppSelect");
  function populateAppSelect(select) {
    const sorted = [...allApps()].sort((a, b) => a.name.localeCompare(b.name));
    select.innerHTML = "";
    sorted.forEach((app) => {
      const opt = document.createElement("option");
      opt.value = app.id;
      opt.textContent = app.name;
      select.appendChild(opt);
    });
  }
  populateAppSelect(apAppSelect);
  populateAppSelect(asAppSelect);

  /* ---------------- Mode toggle ---------------- */
  const modePointsBtn = document.getElementById("modePointsBtn");
  const modeSpotlightBtn = document.getElementById("modeSpotlightBtn");
  const pointsSection = document.getElementById("pointsSection");
  const spotlightSection = document.getElementById("spotlightSection");
  function setMode(mode) {
    const isPoints = mode !== "spotlight";
    modePointsBtn.classList.toggle("active", isPoints);
    modeSpotlightBtn.classList.toggle("active", !isPoints);
    pointsSection.classList.toggle("hidden", !isPoints);
    spotlightSection.classList.toggle("hidden", isPoints);
  }
  modePointsBtn.addEventListener("click", () => setMode("points"));
  modeSpotlightBtn.addEventListener("click", () => setMode("spotlight"));

  const urlMode = new URLSearchParams(location.search).get("mode");
  if (urlMode === "spotlight") setMode("spotlight");

  /* ---------------- Points form ---------------- */
  const dirUpBtn = document.getElementById("dirUpBtn");
  const dirDownBtn = document.getElementById("dirDownBtn");
  const apAmount = document.getElementById("apAmount");
  const apNote = document.getElementById("apNote");
  const apPricePreview = document.getElementById("apPricePreview");
  const pointsForm = document.getElementById("pointsForm");
  const apPaymentPanel = document.getElementById("apPaymentPanel");

  let direction = "up";
  function setDirection(dir) {
    direction = dir;
    dirUpBtn.classList.toggle("active", dir === "up");
    dirDownBtn.classList.toggle("active", dir === "down");
    updatePointsPreview();
  }
  dirUpBtn.addEventListener("click", () => setDirection("up"));
  dirDownBtn.addEventListener("click", () => setDirection("down"));

  function currentAppPoints(appId) {
    return POINTS[appId] || 0;
  }

  function updatePointsPreview() {
    const amount = Math.max(1, Math.round(Number(apAmount.value) || 1));
    const perPoint = direction === "up" ? (CONFIG.pointsPricing.upPerPoint || 0) : (CONFIG.pointsPricing.downPerPoint || 0);
    const price = amount * perPoint;
    const appId = apAppSelect.value;
    const current = currentAppPoints(appId);
    const after = Math.max(0, current + (direction === "up" ? amount : -amount));
    apPricePreview.innerHTML =
      `Currently <strong>${formatDb(current)}</strong> → would become <strong>${formatDb(after)}</strong>. ` +
      `Costs <strong>${formatRupees(price)}</strong> (${formatRupees(perPoint)}/dB).`;
  }
  apAmount.addEventListener("input", updatePointsPreview);
  apAppSelect.addEventListener("change", updatePointsPreview);

  pointsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = pointsForm.querySelector("button[type=submit]");
    if (submitBtn.disabled) return;

    const appId = apAppSelect.value;
    const app = appById(appId);
    const amount = Math.max(1, Math.round(Number(apAmount.value) || 1));
    const perPoint = direction === "up" ? (CONFIG.pointsPricing.upPerPoint || 0) : (CONFIG.pointsPricing.downPerPoint || 0);
    const priceRupees = amount * perPoint;

    if (!app) { showToast("Pick an app first"); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";

    const id = await LI.submitAppPointRequest({
      appId, appName: app.name, direction, amount, priceRupees, contactNote: apNote.value
    });

    if (!id) {
      showToast("Couldn't submit that — check your connection and try again");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit request";
      return;
    }

    LI.trackEvent("submit_app_point_request", { appId, direction, amount });
    saveMyRequest({ id, kind: "points", appId, appName: app.name, direction, amount, submittedAt: Date.now() });

    pointsForm.classList.add("hidden");
    document.getElementById("apEntryIdDisplay").textContent = id;
    document.getElementById("apPaymentAmount").textContent = formatRupees(priceRupees);
    const waText = encodeURIComponent(
      `Hi! I just submitted an Amplify dB request.\n\nRequest ID: ${id}\nApp: ${app.name}\nDirection: ${direction === "up" ? "Turn up" : "Turn down"}\nAmount: ${amount} dB\nAmount to pay: ${formatRupees(priceRupees)}\n\nSending the payment screenshot now.`
    );
    document.getElementById("apPaymentWhatsAppBtn").href = `https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`;
    apPaymentPanel.classList.remove("hidden");
    apPaymentPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("apCopyUpiBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(UPI_ID).then(() => showToast("UPI ID copied")).catch(() => showToast(UPI_ID));
  });
  document.getElementById("apCopyEntryIdBtn").addEventListener("click", () => {
    const id = document.getElementById("apEntryIdDisplay").textContent;
    navigator.clipboard.writeText(id).then(() => showToast("Request ID copied")).catch(() => showToast(id));
  });

  /* ---------------- Spotlight form ---------------- */
  const asRank = document.getElementById("asRank");
  const asRankHint = document.getElementById("asRankHint");
  const asDays = document.getElementById("asDays");
  const asNote = document.getElementById("asNote");
  const asPricePreview = document.getElementById("asPricePreview");
  const spotlightForm = document.getElementById("spotlightForm");
  const asPaymentPanel = document.getElementById("asPaymentPanel");

  function rankOccupant(rank) {
    const now = Date.now();
    return FEATURED.find((f) => f.rank === Number(rank) && tsMillis(f.featuredUntil) > now) || null;
  }

  function updateSpotlightPreview() {
    const rank = asRank.value;
    const occupant = rankOccupant(rank);
    if (occupant) {
      const app = appById(occupant.appId);
      asRankHint.textContent = `Currently held by ${app ? app.name : occupant.appId} — ${daysLeft(tsMillis(occupant.featuredUntil))} left.`;
    } else {
      asRankHint.textContent = "This rank is open right now.";
    }
    const days = Math.max(1, Math.round(Number(asDays.value) || 1));
    const perDay = (CONFIG.featuredPricing || {})["rank" + rank] || 0;
    const price = days * perDay;
    asPricePreview.innerHTML = `${days} day(s) at rank #${rank} costs <strong>${formatRupees(price)}</strong> (${formatRupees(perDay)}/day).`;
  }
  asRank.addEventListener("change", updateSpotlightPreview);
  asDays.addEventListener("input", updateSpotlightPreview);
  asAppSelect.addEventListener("change", updateSpotlightPreview);

  spotlightForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = spotlightForm.querySelector("button[type=submit]");
    if (submitBtn.disabled) return;

    const appId = asAppSelect.value;
    const app = appById(appId);
    const requestedRank = Math.round(Number(asRank.value));
    const days = Math.max(1, Math.round(Number(asDays.value) || 1));
    const perDay = (CONFIG.featuredPricing || {})["rank" + requestedRank] || 0;
    const priceRupees = days * perDay;

    if (!app) { showToast("Pick an app first"); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";

    const id = await LI.submitFeaturedAppRequest(appId, {
      appName: app.name, requestedRank, days, priceRupees, contactNote: asNote.value
    });

    if (!id) {
      showToast("Couldn't submit that — check your connection and try again");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit request";
      return;
    }

    LI.trackEvent("submit_featured_app_request", { appId, requestedRank, days });
    saveMyRequest({ id, kind: "spotlight", appId, appName: app.name, requestedRank, days, submittedAt: Date.now() });

    spotlightForm.classList.add("hidden");
    document.getElementById("asEntryIdDisplay").textContent = id;
    document.getElementById("asPaymentAmount").textContent = formatRupees(priceRupees);
    const waText = encodeURIComponent(
      `Hi! I just submitted an Amplify Spotlight request.\n\nRequest ID: ${id}\nApp: ${app.name}\nRank: #${requestedRank}\nDays: ${days}\nAmount to pay: ${formatRupees(priceRupees)}\n\nSending the payment screenshot now.`
    );
    document.getElementById("asPaymentWhatsAppBtn").href = `https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`;
    asPaymentPanel.classList.remove("hidden");
    asPaymentPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("asCopyUpiBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(UPI_ID).then(() => showToast("UPI ID copied")).catch(() => showToast(UPI_ID));
  });
  document.getElementById("asCopyEntryIdBtn").addEventListener("click", () => {
    const id = document.getElementById("asEntryIdDisplay").textContent;
    navigator.clipboard.writeText(id).then(() => showToast("Request ID copied")).catch(() => showToast(id));
  });

  /* ---------------- Prefill from rankings / homepage buttons ---------------- */
  function applyPrefill(payload) {
    if (payload.mode === "points") {
      apAppSelect.value = payload.appId;
      setDirection(payload.direction || "up");
      setMode("points");
    } else if (payload.mode === "spotlight") {
      asAppSelect.value = payload.appId;
      setMode("spotlight");
    }
  }

  /* ---------------- Init ---------------- */
  updatePointsPreview();
  updateSpotlightPreview();

  window.addEventListener("listenit-firebase-ready", async (e) => {
    if (!e.detail || !e.detail.ok) return;
    const [config, featured, points] = await Promise.all([
      LI.getAmplifyConfig(),
      LI.getFeaturedApps(),
      LI.getAppPoints()
    ]);
    CONFIG = config;
    FEATURED = featured;
    POINTS = points;
    updatePointsPreview();
    updateSpotlightPreview();

    const prefill = consumePrefill();
    if (prefill) applyPrefill(prefill);
  });
})();
