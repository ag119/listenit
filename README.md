# ListenIt

A one-stop directory PWA for quirky, always-on internet radio stations (corporate hold music, a street-corner saloon, a bus driver's playlist, and more). Apps open right inside the site in an embedded viewer. No build step — plain HTML/CSS/JS, ready to host on GitHub Pages.

## Local preview

No build tools needed. Any static file server works, e.g.:

```bash
npx serve .
```

or

```bash
python3 -m http.server 8000
```

Then open the printed local URL. (Opening `index.html` directly via `file://` will mostly work too, but the service worker won't register — always test through `http://localhost`.)

## Adding / editing listed apps

Edit [`js/apps-data.js`](js/apps-data.js) — it's a plain array, one object per app:

```js
{
  id: "unique-slug",
  name: "Display Name",
  url: "https://example.com",
  domain: "example.com",
  tagline: "One short line about it.",
  category: "Ambient Radio",       // groups apps into filter chips AND the section
                                    // headers shown when browsing "All" — reuse an
                                    // existing category string to land in that
                                    // section, ordered dynamically by rating —
                                    // see categoryWeightedScore in js/app.js
  thumbnail: "thumbnails/example.jpg",  // fallback image, see below
  embeddable: true,                // set false if the site blocks iframes
                                    // (sends X-Frame-Options / CSP frame-ancestors) —
                                    // ListenIt will send people to a new tab instead
  addedAt: "2026-08-13"
}
```

### Thumbnails

Cards show a **live screenshot** of the app, fetched at render time from [thum.io](https://thum.io) (`js/app.js` → `liveThumbUrl()` / `loadLiveThumb()`) — free, no API key, no backend. It always reflects whatever the app currently looks like.

The `thumbnail` field is the fallback: it's what shows first (so cards never look blank), and what the card falls back to if the live screenshot fails. Down apps (per `status.json`) skip the live fetch entirely and just use this fallback — a screenshot of an error page isn't a useful thumbnail. Drop a fallback image (roughly 800×500, JPG or PNG) into `thumbnails/` for every app you add.

thum.io is a free public service with no uptime guarantee. Worth knowing: when it's rate-limited, it doesn't send an HTTP error — it sends a *valid* ~1KB image saying "Image not authorized, please sign up for a paid account," which a plain `<img onerror>` can't catch (the request "succeeds"). So `loadLiveThumb()` fetches the image as a blob first and checks its size (`MIN_LIVE_THUMB_BYTES`, currently 8KB — every real screenshot observed has been well over that, the rate-limit placeholder is ~1KB) before using it, falling back to the local image otherwise. Either way — outage, rate-limit, or anything else — cards degrade gracefully to the local fallback, nothing breaks.

**How to tell if a site allows embedding:** run
```bash
curl -sI https://example.com | grep -i "x-frame-options\|content-security-policy"
```
If you see `X-Frame-Options: DENY` or `SAMEORIGIN`, or a CSP with `frame-ancestors`, set `embeddable: false`.

## Submissions via WhatsApp

The "Submit your app" form doesn't upload anywhere — it composes a WhatsApp message (name, URL, description) and opens `wa.me/918853487447` with it prefilled. No thumbnail needed from the submitter (it's captured live from their URL); when you add their entry to `js/apps-data.js`, grab a fallback image yourself, e.g.:

```bash
curl -sL "https://image.thum.io/get/width/800/crop/500/noanimate/https://their-app-url.example.com" -o thumbnails/their-app-id.jpg
```

To change the WhatsApp number, edit `WHATSAPP_NUMBER` near the top of [`js/app.js`](js/app.js) (country code + number, no `+` or spaces).

## Automatic down-app handling

Some listed sites go down (a Vercel deployment gets disabled, DNS lapses, etc.) — `hornokplease.xyz` returned HTTP 402 "deployment disabled" for a while after this was first built, which is why it was later removed from the list entirely. The browser can't reliably detect that kind of thing on its own: most of these sites don't send CORS headers, so a client-side `fetch()` can't tell "reachable but broken" from "actually fine" — it can only see network-level failures.

So a GitHub Actions workflow ([`.github/workflows/healthcheck.yml`](.github/workflows/healthcheck.yml)) curls every app server-side every 30 minutes (`scripts/healthcheck.mjs`) and commits the result to [`status.json`](status.json). This covers both the static list in `js/apps-data.js` and anything added via Firestore (see "Adding an app without redeploying") — the latter needs one optional extra step, see "Covering Firebase-added apps in the health check" below. The site fetches `status.json` at load and:

- Skips down apps when picking for **Surprise me** (and when the viewer's "Try another radio" button is used) — it won't land on a dead one anymore.
- Shows a red **Down** badge on the app's card (still clickable, in case the check is stale).
- If you open a known-down app directly, the viewer skips the spinner and immediately offers **Try another radio** / **Open it anyway**.
- As a safety net for outages the 30-minute check hasn't caught yet, an app that *looks* up but hangs while loading in the iframe for ~4.5s also gets a **Try another radio** button.

Run it manually any time:

```bash
node scripts/healthcheck.mjs
```

For the workflow's auto-commit step to work on GitHub, enable write access once: **Settings → Actions → General → Workflow permissions → Read and write permissions**. You can also trigger it on demand from the **Actions** tab (`Health check listed apps` → **Run workflow**).

## Firebase (analytics, trending, ratings, reactions, live users, remote app list, message clouds, feedback board)

These features run on Firebase, all client-only for now (no custom backend — see "Is this safe?" below):

- **App listings** — apps can be added straight to Firestore and show up on next page load, no redeploy. See "Adding an app without redeploying" below.
- **Analytics** — page views + custom events (which app got opened, Surprise Me clicks, submissions, installs, favorites, shares, reactions, ratings, category filters, searches, clouds). See every `LI.trackEvent(...)` call in `js/app.js`.
- **Trending** — a `plays` counter per app in Firestore, bumped every time someone opens it. Cards show a `🔥 N` count once `N > 0`.
- **Ratings** — a 1–5 star rating per app, shown as a floating strip in the viewer (mirrors the reactions strip, opposite edge). Each browser can rate an app once (tracked in `localStorage`); once cast, a rating can't be changed — see "Is this safe?" for why. Cards show `⭐ avg (N)` once at least one rating exists — the vote count matters here, IMDb-style, because of how ranking works below.
- **Reactions** — 🔥❤️😢 counters per app in Firestore, shown as a floating bar in the viewer. Each browser can react once per app per emoji (tracked in `localStorage`, not bulletproof, fine for a hobby site).
- **Live user count** — "N people listening right now" in the hero, via Realtime Database's standard presence pattern (anonymous auth + `onDisconnect()`).
- **Feedback & feature-request board** — reachable via the 💡 button in the sticky header (visible at any scroll position, with a one-time attention dot until first opened) and the "Feedback & ideas" link in the footer. Anyone can rate the site overall (1–5 stars, `siteRating/overall` — same running sum+count shape as per-app ratings, but its own doc so it can never leak into the `ratings` collection that drives app ranking), post a feature idea, or upvote/downvote one someone else posted. The list is sorted by score (upvotes − downvotes) with newest as the tiebreak. Same increment-only, no-take-backs philosophy as ratings/reactions throughout: a request is immutable once posted except for its two vote counters, each of which may only go up by exactly 1 per write (never both in the same write) — see `firestore.rules`. Loaded lazily when the modal opens, not on every page load, since nothing on the homepage depends on this data. An admin can mark a request `planned`/`shipped`/`declined` via the Firebase Console (shown as a small badge) — client rules don't allow this, same pattern as moving an app in/out of the directory.
- **Message clouds** — a small band below the hero (`#cloudSkySection`) where anyone can post a short message that floats as a "cloud" and fades away on its own. Built on Realtime Database:
  - A fresh cloud lives ~3 minutes. Each reply bumps its size and extends its life by up to 60s, capped at 30 minutes total — so a thread people are actually replying to sticks around longer, but nothing floats forever.
  - RTDB has no server-side TTL, so expiry is two-layered: `database.rules.json` caps how far any single write can push `expiresAt` into the future (so a client can't just set a huge TTL), and the browser only ever *renders* clouds whose `expiresAt` hasn't passed yet — an "expired" cloud simply stops being drawn, nothing has to delete it in the moment. `scripts/clean-clouds.mjs` prunes actually-expired clouds from the database later (safe to run any time, e.g. from cron) so `/clouds` doesn't grow forever; nothing on the site depends on that script ever running.
  - Deliberately an in-flow section, not an overlay — clouds can only ever cover their own bounded, scrollable box, never the header, grid, viewer, or any other clickable part of the page.
  - Names and messages are capped (24 / 100 characters, enforced by both the UI and the rules) and always rendered via `textContent`, never `innerHTML`, so a message can't inject markup. There's no auth or moderation beyond that — same trust level as reactions/ratings, fine for a hobby site's traffic, but worth knowing before pointing a large audience at it.
  - A soft two-note chime (synthesized with the Web Audio API — no audio file) plays when a new cloud or reply arrives; a single note for a reply. Muted with the 🔔/🔕 toggle in the band's header (preference saved in `localStorage`). Never plays on the initial page-load snapshot or for your own just-sent message. Browsers block audio before any user gesture, so the very first chime on a page visit may be silently skipped until the visitor's first click/tap/keypress — expected, not a bug.
  - Also reachable from inside the full-screen viewer (while an embedded app is playing) via the 💬 button in the viewer's action bar, which slides in a docked drawer. This physically *moves* the same `#cloudSkySection` node into the drawer and back on close, rather than running a second parallel chat UI — same elements, same listeners, one implementation. The drawer only ever appears when explicitly opened (translated fully off-screen otherwise, not just hidden), so it can't cover the embedded app's own controls — a deliberate echo of the earlier mobile bug where the reactions strip overlapped an app's own play/pause button. A small dot badges the button when something new arrives while the drawer's closed.
  - On phones the band starts collapsed to just its header (tap to expand) — title, search, chips, and a fully-open cloud band left the actual app grid scrolled below the fold. Desktop is unchanged (starts fully open); the choice is remembered per browser via `localStorage` either way, and it's always forced fully open while docked in the viewer drawer regardless of that preference — being in the drawer at all already is the "expand" gesture.
  - **Chat nudge** — a one-time, centered onboarding hint (with a soft chime), shown ~2.5s after arriving if the chat is genuinely empty: first "🎧 N people are listening right now — say hi in the chat!" (using the real live-user count), and if that's dismissed without engaging, a follow-up a few seconds later explaining that replies make a cloud float longer and bigger. Composed entirely client-side — this text is never written to Firebase, doesn't count as a real cloud, and nobody else ever sees it. "Empty" is checked by *active* (non-expired) clouds specifically, not raw row count — RTDB keeps no TTL of its own, so a snapshot can easily contain long-expired rows nobody would ever see rendered (this actually surfaced 19 stale rows sitting in production from earlier testing, since pruned via `scripts/clean-clouds.mjs`). Re-checked immediately before each message actually renders, so real activity arriving in the meantime cancels it. Clicking the nudge expands the band if collapsed, scrolls to it, and focuses the compose box.
- **Mix** — a featured section at the top of the "All" browse view, one app per category. Picks each category's top-ranked app most of the time, but ~30% of the time (`MIX_DISCOVERY_CHANCE` in `js/app.js`) surfaces a different app from that category instead, so things without ratings yet still get seen; a category where every app ties (most commonly because nobody's rated anything there yet) just shuffles among the tied leaders. Computed once per page load (not re-shuffled every time something unrelated re-renders the grid) and never surfaces a known-down app.
- **Picture-in-Picture** — a pop-out button in the viewer (only shown when the browser supports the [Document Picture-in-Picture API](https://developer.mozilla.org/en-US/docs/Web/API/Document_Picture-in-Picture_API) — currently Chromium-based *desktop* browsers only, no mobile browser implements it) moves the live iframe into a small always-on-top floating window, so an app can keep playing while you browse the rest of the site or switch tabs entirely. There's only one iframe to go around, so opening any other app reclaims it and closes the floating window first.
- **Keep screen awake** — an opt-in ⚡ toggle in the viewer, only shown when the browser supports the [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API). Every embedded app plays through a cross-origin iframe, which this page has no DOM access to at all — so it can't register the Media Session API on that app's behalf, and mobile browsers suspend that audio like any other backgrounded iframe once the phone auto-locks (there's no API for a parent page to grant a cross-origin iframe "survive device lock" powers). Holding a Wake Lock while the viewer's open sidesteps this by stopping the phone from auto-locking from inactivity in the first place — the page simply never backgrounds. Real tradeoff (screen stays lit, more battery), so it defaults off; whatever a visitor last chose is remembered and re-applied automatically next time they open a viewer.
- **Sleep / focus timer** — a ⏱ button in the viewer opens a small popover with two modes, only one running at a time. **Sleep** (15/30/45/60 min presets) closes the viewer when it elapses — same effect as tapping back, since resetting our own iframe's `src` is entirely our own to control regardless of the cross-origin content inside it. **Focus** is a Pomodoro cycle (25 min work / 5 min break, repeating) that just chimes and toasts at each transition without touching playback. A timer survives switching to a different app in the viewer (the underlying intent doesn't change just because the app did) but is cleared whenever the viewer actually closes, same as Wake Lock. Pure client-side `setTimeout`/`setInterval` math against real timestamps — no backend, works in every browser, no feature detection needed.

### Promote (paid social-listing leaderboard)

`promote.html` is a separate page — linked from a banner at the very top of the homepage, above the hero, plus the footer — where anyone can list a social media account on a public leaderboard, ranked purely by bid amount — highest bid at the top, ties broken by whoever got there first. Starting bid is ₹100, and someone already listed can "top up" with a higher bid later to climb, which updates their existing entry instead of creating a duplicate. Two Firestore collections:

- **`socialListings`** — the public leaderboard. Read-only from the client (`allow write: if false`); every write comes from the local admin tool below, using the Admin SDK, only after a payment has been manually verified. Same reasoning as `apps`: if this were client-writable, anyone could buy their way into injecting arbitrary content.
- **`socialListingRequests`** — the pending queue a submission lands in first. Unreadable from the client (`allow read, delete: if false`) — nobody, including the submitter, can read this collection back, so pending bid amounts and contact details can't be scraped or gamed before review. "Still present in this collection" always means "still pending"; approving or rejecting a request deletes it (approving also writes the result into `socialListings`).
- **`socialListingRejections`** — a small, publicly-readable (`allow read: if true`, `allow write: if false`) collection the admin tool writes a `{reason, rejectedAt}` doc into when rejecting a request, so the submitter's own browser can show *why* without needing to read the unreadable pending queue itself. See "Your entries" below for how the client decides whether a rejection is still current.

**Both collections are keyed by a deterministic id** — `platform_handle`, normalized (`js/promote.js`'s `listingKey()`) — instead of an auto-generated one. Resubmitting the same account overwrites its own pending request rather than creating a new one, and the admin tool derives "is this a top-up" by checking whether `socialListings/{that same id}` already exists, straight from Firestore at review time rather than trusting a client-supplied flag. This exists because of a real bug hit in production: the submit button briefly re-enabled itself after a successful submission, and a few impatient re-clicks created four identical pending requests before anyone noticed.

**Payment is entirely manual and off-platform** — this site never touches money. Submitting the form shows a confirmation with the entry's id and a WhatsApp button prefilled with it, plus a UPI ID to pay to; the site owner checks the screenshot (with the entry id in it) against their own UPI payment history and approves by hand. The **local admin tool** (`admin-tool/`, run with `npm run admin-tool`, opens `http://127.0.0.1:5057`) is how that happens — it lists pending requests (each tagged with its entry id, and showing the current listing side-by-side for top-ups) with one-click Approve/Reject. Reject prompts for a short reason (optional, shown to the submitter via "Your entries" above); Approve also clears out any old rejection notice for that same id, in case this is a resubmission after an earlier rejection. It uses the same `serviceAccountKey.json` as `scripts/*.mjs`, binds to `127.0.0.1` only, and **the whole `admin-tool/` directory is gitignored — it never gets pushed, by design.** Approving preserves the listing's original `createdAt` (so a top-up doesn't jump the first-come-first-served tiebreak) while bumping `approvedAt` (so it still surfaces correctly in "recent activity").

The submission form includes a live rank calculator both ways — enter a rupee amount and see what rank it currently lands at, or pick a target rank and see the minimum bid needed to take it — computed client-side from the current public leaderboard. It's an estimate: the real outcome depends on what else gets approved before yours, which the UI says explicitly.

**"Your entries"** — a section that only appears once `localStorage`'s `listenit_my_listings` has something in it (nothing to do with accounts — there aren't any — just "what did this browser submit"). For each one it shows a live status: `✅ Live — Rank #N, ₹X` if it's in the current `socialListings` snapshot, `❌ Rejected` (with the admin's reason, plus an "✏️ Edit & resubmit" button that reopens the form pre-filled with everything originally entered) if it's not live but a matching `socialListingRejections` doc exists, otherwise `⏳ Pending review`. A rejection only counts if it's newer than this browser's own last submission for that account — the client can't delete the old rejection doc itself (read-only), so instead it compares timestamps: resubmitting via Edit bumps the local `submittedAt` past the old `rejectedAt`, which flips the status straight back to Pending without waiting on the admin. Also what makes the platform+handle-aware duplicate warning possible even before something's approved — typing in a handle that matches a *pending* local submission (not yet a real listing) shows its own notice, distinct from the "you're already live, this is a top-up" one. A different platform for the same person never triggers either warning — the key is per-platform, so listing Instagram and YouTube separately is expected, not a duplicate.

**Boosting is ownership-gated** — the "⬆ Boost" button on a leaderboard row only renders if `isMine()` (same `listenit_my_listings` check as above) says this browser submitted that entry; everyone else just sees the Share button. Typing a handle into the form that matches someone *else's* live listing shows a red blocking notice and disables submit, and the submit handler itself re-checks the same condition as a backstop. This is enforced entirely client-side against `localStorage` — there's no login on this site to check against, so it's not cryptographic proof (clearing storage or typing a matching handle on another device gets around it), but it stops the obvious case of a random visitor clicking Boost on someone else's card, and the admin still reviews every request by hand before anything actually changes.

**Shareable cards** — a 📤 Share button next to every leaderboard entry, in "Your entries," and right after submitting a bid (before it's even approved — "I just bid ₹250" is still worth sharing, the FOMO doesn't need to wait for review). Rendered entirely client-side with `<canvas>` (`buildShareCanvas()` in `js/promote.js`) — a 1080×1080 gradient card with the rank (or bid, for a pending one), name, platform, and a CTA back to `promote.html`. No backend, no image hosting. Uses the Web Share API with a real file where that's supported (Android Chrome, iOS Safari 16.4+) so it drops straight into WhatsApp/Instagram's native share sheet; falls back to downloading the PNG plus opening a WhatsApp share with the caption text on browsers that can't share files (most desktop ones).

### Ranking (IMDb-style weighted rating)

Plain averages break with small sample sizes — one 5-star rating shouldn't outrank an app with 40 ratings averaging 4.8. Ranking instead uses IMDb's Bayesian weighted-rating formula, in `js/app.js`:

```
WR = (v ÷ (v + m)) × R  +  (m ÷ (v + m)) × C
```

where `R` is an app's own average rating, `v` its vote count, `m` a fixed minimum-votes threshold (`IMDB_M = 5`), and `C` the mean rating across every rated app on the site. An app with few votes gets pulled toward the site-wide average `C` instead of swinging on one or two ratings; as `v` grows past `m`, the score converges on the app's real average. Apps with zero ratings all tie exactly at `C`.

This same formula, applied at different levels, drives every ranking decision on the site:

- **Within a category** — each app's own weighted score (`appWeightedScore`) sorts cards inside that category's section.
- **Across categories** — every rating from every app in a category is pooled into one `R`/`v` before applying the formula (`categoryWeightedScore`), so a category's section order reflects the category as a whole, not just its single best app.
- **In Mix** — each category's top app by `appWeightedScore` represents it, and categories themselves are ordered by `categoryWeightedScore`, with the discovery chance described above layered on top.

**The site works identically with none of this set up.** `js/firebase-config.js` ships with placeholder values and a full no-op stub (`window.ListenIt`) — every call site in `app.js` calls it unconditionally, so until you configure a real project (or if Firebase ever fails to load), those calls just do nothing and the site runs entirely off `js/apps-data.js` as before.

### Is this safe?

Yes, with one thing to get right. The config in `js/firebase-config.js` is **not a secret** — Firebase's client config is meant to be public, it's in every Firebase web app's page source. The actual security boundary is the **rules** (`firestore.rules`, `database.rules.json`), enforced server-side:

- The `apps` collection (what gets listed and loaded into the iframe viewer) is **read-only from the client** — `allow write: if false`, full stop. This matters more than the increment-only counters below: if visitors could write here, anyone could inject an arbitrary URL into your directory and have it load inside your site's viewer. You add entries with your own admin credentials (Console or `scripts/add-app.mjs`), which bypass rules entirely — that's expected, rules only govern the client SDK.
- `appStats`, `reactions` and `ratings` are increment-only: a client can bump `plays` by exactly 1, the sum of the reaction counters by exactly 1, or (for ratings) `count` by exactly 1 with `sum` rising by 1–5 in that same write, and touch nothing else — no arbitrary values, no decrementing. This is also why a submitted rating can't be edited: there's no "subtract the old value" a client is allowed to do, only ever add a new one. See the rules files for the exact logic.
- Presence writes are locked to `presence/{your-own-anonymous-uid}`, set to `true` only — you can't write another user's key or arbitrary data.
- Message clouds (`/clouds` in the Realtime Database) are the one collection here with genuinely open-ended, free-text content rather than fixed values — the rules still enforce length caps, a create-only history (nothing can be edited or deleted once written), and bounded TTL growth per write, but there's no auth or moderation on *what* someone writes, only *how much* and *how long it stays up*. Reasonable for a hobby site's traffic; something to know before pointing a large audience at it.
- `socialListings` (the promote.html leaderboard) is **read-only from the client**, same reasoning as `apps` — a client buying their way onto the leaderboard is still a client writing arbitrary content otherwise. `socialListingRequests` is unreadable from the client (writable, keyed by a deterministic id so a resubmission overwrites rather than duplicates — see "Promote" above), so pending bid amounts and contact info can't be scraped before review. `socialListingRejections` is the one exception that's readable but still client-write-`false` — a rejection reason isn't sensitive the way a pending bid is, and the submitter needs to be able to read their own. Every write to any of these three goes through the local `admin-tool/` (Admin SDK, gitignored, never deployed) by hand, only after checking the payment yourself.
- The one genuine secret in this setup is `serviceAccountKey.json` (used by the `scripts/*.mjs` admin scripts and `admin-tool/`, run locally/by you, never shipped to the site). It's in `.gitignore` — never commit it.

### Setup steps

1. **Create a project** at [console.firebase.google.com](https://console.firebase.google.com) → Add project. Enable Google Analytics when prompted (or skip if you don't want the analytics feature).
2. **Add a Web App**: Project settings (⚙️) → General → Your apps → `</>` (Web). Copy the `firebaseConfig` object it gives you into `js/firebase-config.js`, replacing the `YOUR_...` placeholders.
3. **Enable Firestore**: Build → Firestore Database → Create database → production mode, any region.
4. **Enable Realtime Database**: Build → Realtime Database → Create database → any region, locked mode. Copy its URL into `databaseURL` in `js/firebase-config.js` (Project settings won't show this one — grab it from the Realtime Database page itself, looks like `https://<project-id>-default-rtdb.<region>.firebasedatabase.app`).
5. **Enable Anonymous auth** (needed for the live user count and message clouds): Build → Authentication → Get started → Sign-in method → Anonymous → Enable.
6. **Deploy the security rules**:
   ```bash
   npm install -g firebase-tools   # once
   firebase login
   firebase use --add              # pick your project
   firebase deploy --only firestore:rules,database
   ```
7. **Seed the per-app documents** (rules deliberately don't let the client create these, only increment them — see `firestore.rules`):
   - Firebase Console → Project settings → Service accounts → **Generate new private key** → save as `serviceAccountKey.json` at the repo root (already gitignored).
   ```bash
   npm install
   npm run seed-firebase
   ```
   Re-run this any time you add a new app to `js/apps-data.js`.
8. Reload the site — analytics/trending/reactions/live-users should now be live. Check the browser console for `[ListenIt]` warnings if something's off.

### Adding an app without redeploying

Once Firebase is set up (above), you have two ways to add a listing — pick whichever's easier, both do the same thing:

**A. Firebase Console** (no local setup needed):
1. Firestore Database → Start collection (or open the existing one) → collection ID `apps`.
2. Document ID: your app's slug, e.g. `night-auto-radio` (this becomes its `id`).
3. Add fields — same shape as `js/apps-data.js`: `name`, `url`, `domain`, `tagline`, `category` (string, required); `embeddable` (boolean, default `true` if omitted); `thumbnail` (string, **optional** — leave it out and the site uses the generic placeholder + live thum.io screenshot, same as everything else).
4. Save. Reload the site — it's there. To also seed its `appStats`/`reactions`/`ratings` docs (so trending/reactions/ratings work immediately instead of on first read), run `npm run seed-firebase` afterwards.

**B. CLI script** (does all of the above, including seeding, in one step):
```bash
npm install   # once
node scripts/add-app.mjs '{
  "id": "night-auto-radio",
  "name": "Night Auto Radio",
  "url": "https://example.com",
  "domain": "example.com",
  "tagline": "One short line about it.",
  "category": "Transit & Travel"
}'
```

Either way, `firestore.rules` keeps the `apps` collection **read-only from the client** — only you, using `serviceAccountKey.json`-backed admin access (Console or the script), can add or change what's listed. A Firestore doc's `id` matching one already in `js/apps-data.js` overrides that entry (name/tagline/category/etc.) without touching code, in case you'd rather edit an existing listing this way too.

**C. Bulk sync** — mirror the entire static list into Firestore in one shot (e.g. right after setting Firebase up for the first time, or after a big batch of additions to `js/apps-data.js`):
```bash
node scripts/sync-apps.mjs
```
Upserts every app in `js/apps-data.js` into Firestore (and seeds their `appStats`/`reactions`/`ratings` docs) — safe to re-run any time. It doesn't delete Firestore docs for apps you've since removed from the static file; do that by hand in the Console if you want an exact mirror.

### Covering Firebase-added apps in the health check

`scripts/healthcheck.mjs` (see "Automatic down-app handling" above) always checks the static `js/apps-data.js` list. To have it also check apps added via Firestore, it needs the same admin credentials as the scripts above — locally it already picks up `serviceAccountKey.json` automatically, but GitHub Actions doesn't have that file (it's gitignored on purpose, it's a real secret), so it needs one extra step:

1. Open `serviceAccountKey.json` and copy its entire contents.
2. On GitHub: **Settings → Secrets and variables → Actions → New repository secret**. Name it `FIREBASE_SERVICE_ACCOUNT`, paste the JSON as the value.
3. That's it — `.github/workflows/healthcheck.yml` already passes it to the script when present.

This is optional: without the secret, the scheduled health check simply keeps checking the static list only, exactly as before — nothing breaks either way. You can tell which mode a run used from its logs (Actions tab → the run → "Run health check" step): it prints either `Loaded N app(s) from Firestore.` or `No Firebase credentials found ... checking the static list only.`

## Deploying to GitHub Pages

1. Create a new GitHub repo (e.g. `listenit`) and push this folder's contents to its default branch:

   ```bash
   git init
   git add .
   git commit -m "Initial ListenIt site"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. On GitHub: **Settings → Pages → Build and deployment → Source** → set to **Deploy from a branch**, branch `main`, folder `/ (root)`. Save.

3. GitHub will publish at `https://YOUR_USERNAME.github.io/YOUR_REPO/`. Confirm that works first.

### Custom domain (listenit.in)

A `CNAME` file containing `listenit.in` is already included at the repo root — GitHub Pages reads it automatically once Pages is enabled, and will show the domain under **Settings → Pages → Custom domain**.

At your domain registrar, add these DNS records for `listenit.in`:

| Type  | Host | Value |
|-------|------|-------|
| A     | @    | 185.199.108.153 |
| A     | @    | 185.199.109.153 |
| A     | @    | 185.199.110.153 |
| A     | @    | 185.199.111.153 |
| CNAME | www  | YOUR_USERNAME.github.io |

Then in **Settings → Pages**, enter `listenit.in` as the custom domain and wait for DNS to propagate (can take up to a few hours). Once it's verified, tick **Enforce HTTPS**.

> If you'd rather serve from `www.listenit.in`, swap the CNAME file's content to `www.listenit.in` and point the registrar's root domain (`@`) to redirect/forward to `www` instead — check what your registrar supports.

### Re-deploying after changes

Every `git push` to `main` re-publishes automatically — GitHub Pages has no separate build step for this project.

## PWA installability

Two prompts, both in `js/app.js` "Install prompt" section:

- A small **"Install app"** button in the header — appears once the browser fires `beforeinstallprompt` (requires HTTPS — works once the custom domain + HTTPS are live; won't fire on `file://`).
- A more prominent bottom **install banner** — same trigger on Android/desktop (with a real Install button wired to the same prompt), or on iOS Safari (no `beforeinstallprompt` API there, so it shows Share → Add to Home Screen instructions instead). Appears once, ~1.5s after load; dismissing it (×) remembers that choice in `localStorage` (`listenit-install-banner-dismissed`) and it won't show again — the small header button stays available regardless, as a persistent fallback.
- Neither shows once the site is already running standalone (installed).
- Icons live in `icons/`, regenerate them if you want a different look (`icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, favicons).

## Structure

```
index.html            Main page: hero, search, filters, grid, viewer, submit modal
css/style.css          All styles (light + dark theme via CSS variables)
js/apps-data.js        The list of apps — edit this to add/remove entries
js/app.js               All behaviour: filtering, viewer, favorites, install prompt, etc.
manifest.webmanifest    PWA manifest
service-worker.js       Offline caching for the app shell (not the third-party apps)
offline.html            Shown when offline and a page isn't cached
404.html                 GitHub Pages 404 fallback
thumbnails/              Card images
icons/                   PWA / favicon icons
CNAME                    Custom domain for GitHub Pages
status.json              Up/down status per app, written by the health-check workflow
scripts/healthcheck.mjs  Node script that curls every app and writes status.json
.github/workflows/       Scheduled health-check workflow
js/firebase-config.js    Firebase web config (public) + no-op stub, always loaded
js/firebase-app.mjs      Real Firebase init — upgrades the stub if configured, no-ops otherwise
firestore.rules          Firestore security rules (increment-only counters)
database.rules.json      Realtime Database security rules (presence, message clouds)
firebase.json            Firebase CLI project config (which rules file is which)
scripts/seed-firebase.mjs  Pre-creates the Firestore docs the rules require (needs serviceAccountKey.json, gitignored)
scripts/add-app.mjs      Adds one app to Firestore (listing + stats docs) without redeploying
scripts/sync-apps.mjs    Upserts the entire js/apps-data.js list into Firestore in one shot
scripts/clean-clouds.mjs  Deletes expired message clouds from Realtime Database (optional, RTDB has no TTL of its own)
promote.html             Paid social-listing leaderboard (bid-ranked) — see "Promote" above
css/promote.css          Styles specific to promote.html
js/promote.js            Leaderboard rendering, rank calculator, submission form
admin-tool/              Local-only approval tool for promote.html submissions — gitignored, never pushed
```
