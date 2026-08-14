/**
 * The ListenIt directory. Add a new app by appending an object here.
 * embeddable:false = site refuses to load in an iframe (sends X-Frame-Options/CSP
 * frame-ancestors), so the viewer sends people straight to a new tab instead.
 *
 * `category` groups apps into the filter chips AND the section headers shown
 * when browsing "All" (see js/app.js renderGrid) — keep similar-themed apps
 * on the same category string so they land in the same section.
 */
const APPS = [
  /* ---------------- Ambient Radio ---------------- */
  {
    id: "corporatesucks",
    name: "Corporate Life. On Loop.",
    url: "https://corporatesucks.vercel.app",
    domain: "corporatesucks.vercel.app",
    tagline: "A radio station for people stuck in back-to-back calls. Chai optional.",
    category: "Ambient Radio",
    thumbnail: "thumbnails/corporatesucks.jpg",
    embeddable: true,
    addedAt: "2026-08-13"
  },
  {
    id: "nostalgia-cassette",
    name: "Philips Cassette Recorder",
    url: "https://nostalgiahits.in",
    domain: "nostalgiahits.in",
    tagline: "Pick a cassette, press play, rewind kaaro — bhajans, travel tunes and more on a retro deck.",
    category: "Ambient Radio",
    thumbnail: "thumbnails/nostalgia-cassette.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },

  /* ---------------- Shops & Street Corners ---------------- */
  {
    id: "deluxesalon",
    name: "Deluxe Saloon",
    url: "https://deluxesalon.in",
    domain: "deluxesalon.in",
    tagline: "An always-on radio playing old-school favourites over an illustrated Indian street corner.",
    category: "Shops & Street Corners",
    thumbnail: "thumbnails/deluxesalon.jpg",
    embeddable: true,
    addedAt: "2026-08-13"
  },
  {
    id: "chai-tapri",
    name: "Chai Tapri",
    url: "https://chaitapri.wtf",
    domain: "chaitapri.wtf",
    tagline: "One roadside chai stall, every hour of the day — same bench, different light.",
    category: "Shops & Street Corners",
    thumbnail: "thumbnails/chai-tapri.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "pan-wala",
    name: "Pan Wala",
    url: "https://pan-wala.vercel.app",
    domain: "pan-wala.vercel.app",
    tagline: "437 non-stop 90s Bollywood songs that blast from every paan shop in India.",
    category: "Shops & Street Corners",
    thumbnail: "thumbnails/pan-wala.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "thenisai-saloon",
    name: "Thenisai Saloon",
    url: "https://thenisai.website",
    domain: "thenisai.website",
    tagline: "Old Tamil melodies for a quiet Chennai evening.",
    category: "Shops & Street Corners",
    thumbnail: "thumbnails/thenisai-saloon.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },

  /* ---------------- Transit & Travel ---------------- */
  {
    id: "busdriver",
    name: "Bus Driver Playlist",
    url: "https://busdriver.wtf",
    domain: "busdriver.wtf",
    tagline: "Nonstop 80s & 90s Hindi songs, Kumar Sanu to Alka Yagnik. Straight off NH 48 at midnight.",
    category: "Transit & Travel",
    thumbnail: "thumbnails/busdriver.jpg",
    embeddable: true,
    addedAt: "2026-08-13"
  },
  {
    id: "rickshaw-wala",
    name: "Rickshaw Wala",
    url: "https://rickshaw-wala.vercel.app",
    domain: "rickshaw-wala.vercel.app",
    tagline: "Timeless 90s & classic old nostalgia Bollywood songs, autorickshaw-style.",
    category: "Transit & Travel",
    thumbnail: "thumbnails/rickshaw-wala.jpg",
    embeddable: false,
    addedAt: "2026-08-13"
  },
  {
    id: "rickshaw-radio",
    name: "Rickshaw Radio",
    url: "https://rickshawradio.in",
    domain: "rickshawradio.in",
    tagline: "Dashboard speaker rattling, meter ticking, wind in your face. No login, no algorithm.",
    category: "Transit & Travel",
    thumbnail: "thumbnails/rickshaw-radio.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "truckplaylist",
    name: "Horn OK Please",
    url: "https://www.truckplaylist.wtf",
    domain: "truckplaylist.wtf",
    tagline: "Dhaba stops, night driving, and the highway bangers Indian truckers actually play.",
    category: "Transit & Travel",
    thumbnail: "thumbnails/truckplaylist.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "safar",
    name: "Safar",
    url: "https://safaraudio.netlify.app",
    domain: "safaraudio.netlify.app",
    tagline: "An immersive one-page journey through Indian cities, one track at a time.",
    category: "Transit & Travel",
    thumbnail: "thumbnails/safar.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },

  /* ---------------- Regional & Folk ---------------- */
  {
    id: "mehfil",
    name: "MEHFIL",
    url: "https://mehfil-one.vercel.app",
    domain: "mehfil-one.vercel.app",
    tagline: "A quiet night in an old city. Jagjit Singh, Mehdi Hassan, Ghulam Ali, Pankaj Udhas & Farida Khanum.",
    category: "Regional & Folk",
    thumbnail: "thumbnails/mehfil.jpg",
    embeddable: true,
    addedAt: "2026-08-13"
  },
  {
    id: "kudimagan",
    name: "Quarter Room",
    url: "https://kudimagan.vercel.app",
    domain: "kudimagan.vercel.app",
    tagline: "Tamil drinking songs, soup songs and late-night heartbreak playlists.",
    category: "Regional & Folk",
    thumbnail: "thumbnails/kudimagan.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "garba-navratri",
    name: "Vadodara Navratri",
    url: "https://garba.jdhruv.workers.dev",
    domain: "garba.jdhruv.workers.dev",
    tagline: "Atul Purohit's non-stop Garba hits, live from Vadodara.",
    category: "Regional & Folk",
    thumbnail: "thumbnails/garba-navratri.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "rajasthani-folk",
    name: "Rajasthani Folk",
    url: "https://rajasthani-folk.vercel.app",
    domain: "rajasthani-folk.vercel.app",
    tagline: "Traditional folk songs from the deserts of Rajasthan.",
    category: "Regional & Folk",
    thumbnail: "thumbnails/rajasthani-folk.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "bangla-bangers",
    name: "Bangla Bangers",
    url: "https://bangla-banger.vercel.app",
    domain: "bangla-banger.vercel.app",
    tagline: "Stylish Bengali bangers over an illustrated Kolkata skyline.",
    category: "Regional & Folk",
    thumbnail: "thumbnails/bangla-bangers.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },

  /* ---------------- Beyond India ---------------- */
  {
    id: "places-have-sound",
    name: "SOMEWHERE",
    url: "https://places-have-sound.vercel.app",
    domain: "places-have-sound.vercel.app",
    tagline: "A tactile archive of music attached to places, moments, and memories.",
    category: "Beyond India",
    thumbnail: "thumbnails/places-have-sound.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "kassita",
    name: "Kassita",
    url: "https://kassita.xyz",
    domain: "kassita.xyz",
    tagline: "Moroccan classics from the cassette era — music that made ordinary moments feel special.",
    category: "Beyond India",
    thumbnail: "thumbnails/kassita.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  }
];

// Also usable from Node (health-check script) without touching the browser global.
if (typeof module !== "undefined" && module.exports) module.exports = APPS;
