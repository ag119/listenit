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
  {
    id: "royal-fitness",
    name: "Royal Fitness",
    url: "https://royalfitness.online",
    domain: "royalfitness.online",
    tagline: "Classic 90s Bollywood songs to lift to — old Hindi hits, gym-floor loud.",
    category: "Ambient Radio",
    thumbnail: "thumbnails/royal-fitness.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "bakwas-band-kar",
    name: "Bakwas Band Kar",
    url: "https://bakwasbandkar.vercel.app",
    domain: "bakwasbandkar.vercel.app",
    tagline: "494 Bollywood songs from 2007-2016, in a room that looks like the one you watched them in.",
    category: "Ambient Radio",
    thumbnail: "thumbnails/bakwas-band-kar.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "rs-world-90s",
    name: "R's World",
    url: "https://90s-night.vercel.app",
    domain: "90s-night.vercel.app",
    tagline: "A 90s Bollywood video-cassette shop — pick a voice, the shop plays it.",
    category: "Ambient Radio",
    thumbnail: "thumbnails/rs-world-90s.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "theka",
    name: "Talli",
    url: "https://theka.wtf",
    domain: "theka.wtf",
    tagline: "Nashe wale gaane, back to back — everything at once, the way the night actually goes.",
    category: "Ambient Radio",
    thumbnail: "thumbnails/theka.jpg",
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
  {
    id: "yaaron-ki-mehfil",
    name: "Yaaron Ki Mehfil",
    url: "https://yaaron-ki-mehfil.vercel.app",
    domain: "yaaron-ki-mehfil.vercel.app",
    tagline: "A nostalgic evening for friends — dosti anthems, chai charcha, unforgettable memories.",
    category: "Shops & Street Corners",
    thumbnail: "thumbnails/yaaron-ki-mehfil.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "tapri-fm",
    name: "Tapri FM",
    url: "https://taprichai.merakida.com",
    domain: "taprichai.merakida.com",
    tagline: "Hindi Bollywood playlists by mood — saloon, truck driver, Irani cafe, paan shop, road trip.",
    category: "Shops & Street Corners",
    thumbnail: "thumbnails/tapri-fm.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "cyber-cafe-2000s",
    name: "2000s Cyber Cafe",
    url: "https://2000s-indian-cyber-cafe.ai.studio",
    domain: "2000s-indian-cyber-cafe.ai.studio",
    tagline: "Dial-up nostalgia and adda — a 2000s Indian cyber cafe, reopened.",
    category: "Shops & Street Corners",
    thumbnail: "thumbnails/cyber-cafe-2000s.jpg",
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
  {
    id: "indian-truck-bangers",
    name: "Indian Roadways",
    url: "https://www.indiantruckbangers.fun",
    domain: "indiantruckbangers.fun",
    tagline: "Truckstop bangers, blessings, and long roads.",
    category: "Transit & Travel",
    thumbnail: "thumbnails/indian-truck-bangers.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "up-roadways",
    name: "UP Roadways",
    url: "https://uproadways.fun",
    domain: "uproadways.fun",
    tagline: "The bus driver's playlist, UP Roadways-style.",
    category: "Transit & Travel",
    thumbnail: "thumbnails/up-roadways.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "malwa-express",
    name: "Malwa Express",
    url: "https://malwa-express.vercel.app",
    domain: "malwa-express.vercel.app",
    tagline: "Board the bus — Malwa Express, straight through central Madhya Pradesh.",
    category: "Transit & Travel",
    thumbnail: "thumbnails/malwa-express.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "auto-waala",
    name: "Auto Waala",
    url: "https://auto-waala-beta.vercel.app",
    domain: "auto-waala-beta.vercel.app",
    tagline: "Meter se chalenge, gaane dil se bajenge.",
    category: "Transit & Travel",
    thumbnail: "thumbnails/auto-waala.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "rikshawalo",
    name: "Rikshawalo",
    url: "https://rikshawalo.netlify.app",
    domain: "rikshawalo.netlify.app",
    tagline: "Gujarati & Hindi songs, straight off the rickshaw stereo.",
    category: "Transit & Travel",
    thumbnail: "thumbnails/rikshawalo.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "hyd-auto",
    name: "HYD Auto",
    url: "https://hyd-auto.vercel.app",
    domain: "hyd-auto.vercel.app",
    tagline: "Gaane that only slap in a Hyderabad auto. Sit in the back seat and ride.",
    category: "Transit & Travel",
    thumbnail: "thumbnails/hyd-auto.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "autowala-lucknow",
    name: "Auto Wale Ki Playlist",
    url: "https://autowala-playlist.netlify.app",
    domain: "autowala-playlist.netlify.app",
    tagline: "Ek auto, ek Vikram, Lucknow ki poori sadak — aur bhaiya ka speaker full volume par.",
    category: "Transit & Travel",
    thumbnail: "thumbnails/autowala-lucknow.jpg",
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
  {
    id: "ekant-raag",
    name: "Ekant Raag",
    url: "https://ekant-raag-radio.onrender.com",
    domain: "ekant-raag-radio.onrender.com",
    tagline: "Solitude and raga — a quiet corner of classical Hindustani music.",
    category: "Regional & Folk",
    thumbnail: "thumbnails/ekant-raag.jpg",
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
  },

  /* ---------------- Work & Trade ---------------- */
  {
    id: "master-jiii",
    name: "Master Jiii",
    url: "https://master-jiii.vercel.app",
    domain: "master-jiii.vercel.app",
    tagline: "Naap se nazakat tak — old Hindi songs from the tailor shop.",
    category: "Work & Trade",
    thumbnail: "thumbnails/master-jiii.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "munna-mistri",
    name: "Munna Mistri",
    url: "https://munnamistri.in",
    domain: "munnamistri.in",
    tagline: "90s Bollywood playing all day, just like the songs you'd hear while Munna worked on the wall next door.",
    category: "Work & Trade",
    thumbnail: "thumbnails/munna-mistri.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "mazdoor-club",
    name: "Mazdur Club",
    url: "https://majdoorclub.pages.dev",
    domain: "majdoorclub.pages.dev",
    tagline: "Purani gaane, saara din, sab ke saath.",
    category: "Work & Trade",
    thumbnail: "thumbnails/mazdoor-club.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "dhobi-ghat",
    name: "Dhobi Ghat",
    url: "https://dhobighat.easyspin.co.in",
    domain: "dhobighat.easyspin.co.in",
    tagline: "Purane gaane aur transistor ki dhun, straight from the washing ghat.",
    category: "Work & Trade",
    thumbnail: "thumbnails/dhobi-ghat.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },

  /* ---------------- Festival & Occasions ---------------- */
  {
    id: "chhath-vibes",
    name: "Chhath Vibes",
    url: "https://chhathvibes.in",
    domain: "chhathvibes.in",
    tagline: "Classic Chhath Puja bangers on repeat — full cultural vibes.",
    category: "Festival & Occasions",
    thumbnail: "thumbnails/chhath-vibes.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "ganpati-utsav",
    name: "Ganpati Utsav",
    url: "https://bappa-morya-re.vercel.app",
    domain: "bappa-morya-re.vercel.app",
    tagline: "Ambient devotional music and rotations for Bappa's homecoming.",
    category: "Festival & Occasions",
    thumbnail: "thumbnails/ganpati-utsav.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  },
  {
    id: "azaadi",
    name: "Azaadi",
    url: "https://azaadi.xyz",
    domain: "azaadi.xyz",
    tagline: "Kuch gaane, kuch yaadein, aur ek azaad Hindustan.",
    category: "Festival & Occasions",
    thumbnail: "thumbnails/azaadi.jpg",
    embeddable: true,
    addedAt: "2026-08-14"
  }
];

// Also usable from Node (health-check script) without touching the browser global.
if (typeof module !== "undefined" && module.exports) module.exports = APPS;
