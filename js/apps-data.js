/**
 * The ListenIt directory. Add a new app by appending an object here.
 * embeddable:false = site refuses to load in an iframe (sends X-Frame-Options/CSP
 * frame-ancestors), so the viewer sends people straight to a new tab instead.
 */
const APPS = [
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
    id: "deluxesalon",
    name: "Deluxe Saloon",
    url: "https://deluxesalon.in",
    domain: "deluxesalon.in",
    tagline: "An always-on radio playing old-school favourites over an illustrated Indian street corner.",
    category: "Ambient Radio",
    thumbnail: "thumbnails/deluxesalon.jpg",
    embeddable: true,
    addedAt: "2026-08-13"
  },
  {
    id: "hornokplease",
    name: "Horn Ok Please",
    url: "https://hornokplease.xyz",
    domain: "hornokplease.xyz",
    tagline: "Nostalgic Hindi road-trip tunes for the honk-happy highways of India.",
    category: "Desi Nostalgia",
    thumbnail: "thumbnails/hornokplease.jpg",
    embeddable: true,
    addedAt: "2026-08-13"
  },
  {
    id: "busdriver",
    name: "Bus Driver Playlist",
    url: "https://busdriver.wtf",
    domain: "busdriver.wtf",
    tagline: "Nonstop 80s & 90s Hindi songs, Kumar Sanu to Alka Yagnik. Straight off NH 48 at midnight.",
    category: "Desi Nostalgia",
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
    category: "Desi Nostalgia",
    thumbnail: "thumbnails/rickshaw-wala.jpg",
    embeddable: false,
    addedAt: "2026-08-13"
  },
  {
    id: "mehfil",
    name: "MEHFIL",
    url: "https://mehfil-one.vercel.app",
    domain: "mehfil-one.vercel.app",
    tagline: "A quiet night in an old city. Jagjit Singh, Mehdi Hassan, Ghulam Ali, Pankaj Udhas & Farida Khanum.",
    category: "Desi Nostalgia",
    thumbnail: "thumbnails/mehfil.jpg",
    embeddable: true,
    addedAt: "2026-08-13"
  }
];

// Also usable from Node (health-check script) without touching the browser global.
if (typeof module !== "undefined" && module.exports) module.exports = APPS;
