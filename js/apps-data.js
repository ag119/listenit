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
  {
    id: "oldmonk",
    name: "Old Monk",
    url: "https://oldmonk.vercel.app",
    domain: "oldmonk.vercel.app",
    tagline: "An 80s & 90s Bollywood playlist for daaru nights with friends — old is gold, on repeat.",
    category: "Ambient Radio",
    embeddable: true,
    addedAt: "2026-08-21"
  },
  {
    id: "loha-lakkad",
    name: "Loha Lakkad",
    url: "https://lohalakkad.in",
    domain: "lohalakkad.in",
    tagline: "Mohalle ke gym se seedha speaker tak — local gym ke gaane, loha utha, volume badha.",
    category: "Ambient Radio",
    embeddable: true,
    addedAt: "2026-08-21"
  },
  {
    id: "dard-e-ishq",
    name: "Songs That Sound Like You",
    url: "https://dardeishq.online",
    domain: "dardeishq.online",
    tagline: "Dard-e-Ishq — every song here carries a little more than music.",
    category: "Ambient Radio",
    embeddable: false,
    addedAt: "2026-08-21"
  },

  {
    id: "sangeet-2am",
    name: "Sangeet",
    url: "https://sangeet.runable.site",
    domain: "sangeet.runable.site",
    tagline: "Poos ki raat wali feeling — the kind of song that only makes sense at 2 AM.",
    category: "Ambient Radio",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "aakhri-jaam",
    name: "Aakhri Jaam",
    url: "https://aakhri-jaam.vercel.app",
    domain: "aakhri-jaam.vercel.app",
    tagline: "Bollywood night, one last drink — the playlist for last call.",
    category: "Ambient Radio",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "dhun",
    name: "Dhun",
    url: "https://dhun.dploy.avichal.me",
    domain: "dhun.dploy.avichal.me",
    tagline: "Bollywood bangers with a DHH playlist thrown in — old dhun, new drop.",
    category: "Ambient Radio",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "90s-nostalgia-tv",
    name: "90s Nostalgia TV",
    url: "https://90stv.vercel.app",
    domain: "90stv.vercel.app",
    tagline: "90s cartoon theme songs — the ones that still live rent-free in your head.",
    category: "Ambient Radio",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "scenote",
    name: "Scenote",
    url: "https://scenote.pages.dev",
    domain: "scenote.pages.dev",
    tagline: "Bring your own playlist and swap the scene around it.",
    category: "Ambient Radio",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "school-ke-baad",
    name: "School Ke Baad",
    url: "https://schoolkebaad.fun",
    domain: "schoolkebaad.fun",
    tagline: "Cartoon title tracks for right after school — bag down, TV on.",
    category: "Ambient Radio",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "mastii-ki-pathshala",
    name: "Mastii Ki Pathshala",
    url: "https://wohyaadein.lovable.app",
    domain: "wohyaadein.lovable.app",
    tagline: "School classroom nostalgia — chalk dust, tiffin bell, old songs.",
    category: "Ambient Radio",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "mehfil-late-night",
    name: "Mehfil",
    url: "https://mehfil-wtf.vercel.app",
    domain: "mehfil-wtf.vercel.app",
    tagline: "Late night music for late night people — the mehfil that never really ends.",
    category: "Ambient Radio",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "desi-gym",
    name: "Desi Gym",
    url: "https://desi-gym.vercel.app",
    domain: "desi-gym.vercel.app",
    tagline: "500 rupaye wali desi gym — chatpate Bollywood songs between sets.",
    category: "Ambient Radio",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "wo-garmi-ki-chuttiyan",
    name: "Wo Garmi Ki Chuttiyan",
    url: "https://90s-hits.vercel.app",
    domain: "90s-hits.vercel.app",
    tagline: "90s hits and summer holidays — the soundtrack of doing absolutely nothing.",
    category: "Ambient Radio",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "nani-ka-ghar",
    name: "Nani Ka Ghar",
    url: "https://nani-ka-ghar.vercel.app",
    domain: "nani-ka-ghar.vercel.app",
    tagline: "Nani ka ghar, grandparents' radio — the songs that played in every summer vacation.",
    category: "Ambient Radio",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "sukoon",
    name: "Sukoon",
    url: "https://sukoon-old-songs.vercel.app",
    domain: "sukoon-old-songs.vercel.app",
    tagline: "Old songs, pura sukoon — nothing to do, nowhere to be.",
    category: "Ambient Radio",
    embeddable: true,
    addedAt: "2026-08-23"
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
  {
    id: "chai-tapri-radio",
    name: "Chai Tapri Radio",
    url: "https://chaikitapri.fun",
    domain: "chaikitapri.fun",
    tagline: "Ek chai, ek gaana, ek kahaani — a cup of chai and a little quiet, sometimes that's enough.",
    category: "Shops & Street Corners",
    embeddable: true,
    addedAt: "2026-08-21"
  },

  {
    id: "kappiyum-paattum",
    name: "Kappiyum Paattum",
    url: "https://kappiyumpaattum.vercel.app",
    domain: "kappiyumpaattum.vercel.app",
    tagline: "A Malayalam digital chaya kada — filter coffee, film songs, and adda.",
    category: "Shops & Street Corners",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "chai-route-radio",
    name: "Chai Route Radio",
    url: "https://chaiwala-ruby.vercel.app",
    domain: "chaiwala-ruby.vercel.app",
    tagline: "Chai tapri, do rupaye ki litti, radio playing in the corner.",
    category: "Shops & Street Corners",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "jnapakalu",
    name: "Jnapakalu",
    url: "https://telugu-nostalgia-jnapakalu.netlify.app",
    domain: "telugu-nostalgia-jnapakalu.netlify.app",
    tagline: "Telugu nostalgia, cutting-shop retro — half tea, full memories.",
    category: "Shops & Street Corners",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "gali",
    name: "Gali",
    url: "https://gali-roan.vercel.app",
    domain: "gali-roan.vercel.app",
    tagline: "What if a gali (street) was a website — every corner has its own sound.",
    category: "Shops & Street Corners",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "dental-waiting-room",
    name: "Dental Waiting Room",
    url: "https://calm-dental-waiting.lovable.app",
    domain: "calm-dental-waiting.lovable.app",
    tagline: "Calm music for the dental waiting room — deep breaths, you're almost in.",
    category: "Shops & Street Corners",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "purane-naghme",
    name: "Purane Naghme",
    url: "https://www.wohdin.xyz",
    domain: "wohdin.xyz",
    tagline: "90s Hindi songs, playing off the shop's speaker like they never stopped.",
    category: "Shops & Street Corners",
    embeddable: true,
    addedAt: "2026-08-23"
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
  {
    id: "auto-wala-indore",
    name: "Auto Wala Indore",
    url: "https://autowala.fun",
    domain: "autowala.fun",
    tagline: "An Indore auto stand outside Rajwada — press horn ok please, read the shayari on the back.",
    category: "Transit & Travel",
    embeddable: true,
    addedAt: "2026-08-21"
  },
  {
    id: "truck-wala",
    name: "Truck Wala",
    url: "https://hornokplease.xyz",
    domain: "hornokplease.xyz",
    tagline: "Horn OK Please — the highway shayari and songs painted on the back of an Indian truck.",
    category: "Transit & Travel",
    embeddable: false,
    addedAt: "2026-08-21"
  },
  {
    id: "kaundishamein",
    name: "Do Musafir",
    url: "https://www.kaundishamei.me",
    domain: "kaundishamei.me",
    tagline: "One boat, an ocean full of songs — lahar aane do, kashti chalao.",
    category: "Transit & Travel",
    embeddable: true,
    addedAt: "2026-08-21"
  },

  {
    id: "himachal-roadways",
    name: "Himachal Roadways",
    url: "https://roadways.wtf",
    domain: "roadways.wtf",
    tagline: "Himachal ke pahadi roadways — hairpin bends, bus horn, mountain air.",
    category: "Transit & Travel",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "safar-e-up",
    name: "NO SIGNAL — Safar-e-UP",
    url: "https://safar-e-up.vercel.app",
    domain: "safar-e-up.vercel.app",
    tagline: "UP Roadways bus, no signal on the highway, just 90s songs and the driver's seat.",
    category: "Transit & Travel",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "horn-ok-please-2",
    name: "Horn OK Please",
    url: "https://horn-ok-please-gray.vercel.app",
    domain: "horn-ok-please-gray.vercel.app",
    tagline: "Highway bangers straight off an Indian truck's dashboard speaker.",
    category: "Transit & Travel",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "safar-fm",
    name: "Safar FM",
    url: "https://safarfm.vercel.app",
    domain: "safarfm.vercel.app",
    tagline: "Songs for the road — put this on and the journey does the rest.",
    category: "Transit & Travel",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "haryana-roadways",
    name: "Haryana Roadways",
    url: "https://haryanaroadways.wtf",
    domain: "haryanaroadways.wtf",
    tagline: "Haryana Roadways, route 47 — bus stand bangers, aisle seat included.",
    category: "Transit & Travel",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "kalesh-fm",
    name: "Kalesh FM",
    url: "https://kalesh-fm.pages.dev",
    domain: "kalesh-fm.pages.dev",
    tagline: "Construction, brawls, horns — the real Indian road, no filter.",
    category: "Transit & Travel",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "rearview",
    name: "Rearview",
    url: "https://rearview-jade.vercel.app",
    domain: "rearview-jade.vercel.app",
    tagline: "Bollywood travel, school and college days — everything in the mirror looks closer.",
    category: "Transit & Travel",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "truck-playlist-2",
    name: "Truck Playlist",
    url: "https://truck-play.netlify.app",
    domain: "truck-play.netlify.app",
    tagline: "A highway truck playlist — dhaba stop, horn, repeat.",
    category: "Transit & Travel",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "caravan",
    name: "Caravan",
    url: "https://caravan.naveengumaste.me",
    domain: "caravan.naveengumaste.me",
    tagline: "Woh din bhi kya din the — regional bus uncle's playlist, window seat included.",
    category: "Transit & Travel",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "safar-fm-highway",
    name: "Safar FM — Highway",
    url: "https://safar-fm-three.vercel.app",
    domain: "safar-fm-three.vercel.app",
    tagline: "Highway bus radio, window-seat vibes, the road going on forever.",
    category: "Transit & Travel",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "up-bus-driver",
    name: "UP Bus Driver",
    url: "https://upbusdriver.wtf",
    domain: "upbusdriver.wtf",
    tagline: "UP Roadways, driver's seat — horn aur purane gaane, all night long.",
    category: "Transit & Travel",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "hrtc-playlist",
    name: "HRTC Playlist",
    url: "https://hrtcplaylist.vercel.app",
    domain: "hrtcplaylist.vercel.app",
    tagline: "Himachal ki pahadi bus yatra wale gaane — every hairpin turn has a song.",
    category: "Transit & Travel",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "town-bus-hits",
    name: "Town Bus Hits",
    url: "https://town-bus.vercel.app",
    domain: "town-bus.vercel.app",
    tagline: "Tamil Nadu town bus music — conductor's whistle, driver's playlist.",
    category: "Transit & Travel",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "digital-bus",
    name: "Digital Bus",
    url: "https://digitalbus.me",
    domain: "digitalbus.me",
    tagline: "Old Hindi songs for the long way home.",
    category: "Transit & Travel",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "musafir-2",
    name: "Musafir",
    url: "https://musafir.vercel.app",
    domain: "musafir.vercel.app",
    tagline: "Drive your own truck through the 90s — horn included.",
    category: "Transit & Travel",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "pahadi-radio-uk",
    name: "Pahadi Radio",
    url: "https://ukroadways.vercel.app",
    domain: "ukroadways.vercel.app",
    tagline: "Uttarakhand ke pahadi roadways — the hills, one bus stop at a time.",
    category: "Transit & Travel",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "midnight-express",
    name: "Midnight Express",
    url: "https://train.hereco.xyz",
    domain: "train.hereco.xyz",
    tagline: "An Indian train journey at night — rhythm of the tracks included.",
    category: "Transit & Travel",
    embeddable: false,
    addedAt: "2026-08-23"
  },
  {
    id: "conductor-fm",
    name: "Conductor FM",
    url: "https://conductor-fm.nikhilkumar007.com",
    domain: "conductor-fm.nikhilkumar007.com",
    tagline: "Last stop, best song — a bus conductor's own soundtrack.",
    category: "Transit & Travel",
    embeddable: true,
    addedAt: "2026-08-23"
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
  {
    id: "gaun-ki-khud",
    name: "Gaun Ki Khud",
    url: "https://gaun-ki-khud.vercel.app",
    domain: "gaun-ki-khud.vercel.app",
    tagline: "Built for the mountains — Garhwali and Kumaoni folk from a sunset village in the hills.",
    category: "Regional & Folk",
    embeddable: true,
    addedAt: "2026-08-21"
  },

  {
    id: "seven-sisters-fm",
    name: "Seven Sisters FM",
    url: "https://seven-sisters-fm.pages.dev",
    domain: "seven-sisters-fm.pages.dev",
    tagline: "Music from India's Northeast — a corner of the map most playlists skip.",
    category: "Regional & Folk",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "pind-radio",
    name: "Pind Radio",
    url: "https://pind-radio.vercel.app",
    domain: "pind-radio.vercel.app",
    tagline: "An interactive Punjabi dhol — tap it, and the pind starts dancing.",
    category: "Regional & Folk",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "odia-old-album",
    name: "Odia Old Album",
    url: "https://sidd.app/odia-old-album-songs",
    domain: "sidd.app",
    tagline: "140+ cassette-era Odia album bangers, all in one place.",
    category: "Regional & Folk",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "ilaiyaraaja",
    name: "Ilaiyaraaja",
    url: "https://ilaya-raja.vercel.app",
    domain: "ilaya-raja.vercel.app",
    tagline: "Ilaiyaraaja, late at night — the maestro's melodies for a quiet hour.",
    category: "Regional & Folk",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "bhojpuri-raat",
    name: "Bhojpuri Raat",
    url: "https://bhojpuri-raat.vercel.app",
    domain: "bhojpuri-raat.vercel.app",
    tagline: "Bhojpuri night songs — loud, local, and unapologetically fun.",
    category: "Regional & Folk",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "padayappa",
    name: "Padayappa",
    url: "https://padayappa.vercel.app",
    domain: "padayappa.vercel.app",
    tagline: "A family cassette from the AR Rahman era, playing all over again.",
    category: "Regional & Folk",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "mi-marathi",
    name: "Mi Marathi",
    url: "https://mi-marathi.vercel.app",
    domain: "mi-marathi.vercel.app",
    tagline: "Marathi playlists — from lavani to the latest, all in one place.",
    category: "Regional & Folk",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "bhojpuri-cult",
    name: "Bhojpuri Cult",
    url: "https://bhojpuri.cfd",
    domain: "bhojpuri.cfd",
    tagline: "Lollypop Lagelu and the whole Pawan Singh era, back to back.",
    category: "Regional & Folk",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "marwadi-heritage",
    name: "Marwadi Heritage",
    url: "https://rajasthani-heritage.vercel.app",
    domain: "rajasthani-heritage.vercel.app",
    tagline: "Rajasthani folk and songs, from a different corner of the desert.",
    category: "Regional & Folk",
    embeddable: true,
    addedAt: "2026-08-23"
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

  {
    id: "sindhu-ahamu",
    name: "Sindu Ahamu",
    url: "https://sindhuahamu.vercel.app",
    domain: "sindhuahamu.vercel.app",
    tagline: "Sri Lankan 2000s bangers — a different island, the same old-is-gold feeling.",
    category: "Beyond India",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "mero-nepal",
    name: "Mero Nepal",
    url: "https://timro.fun",
    domain: "timro.fun",
    tagline: "The deluxe saloon idea, Nepali edition — mero desh ka apna radio.",
    category: "Beyond India",
    embeddable: true,
    addedAt: "2026-08-23"
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
  {
    id: "raju-mistri",
    name: "Raju Mistri Playlist",
    url: "https://raju-mistri-playlist.pages.dev",
    domain: "raju-mistri-playlist.pages.dev",
    tagline: "Old Bollywood romance for a mason's workday, one brick and one song at a time.",
    category: "Work & Trade",
    embeddable: true,
    addedAt: "2026-08-21"
  },

  {
    id: "majdoor-adda",
    name: "Majdoor Adda",
    url: "https://majdoor-ashy.vercel.app",
    domain: "majdoor-ashy.vercel.app",
    tagline: "Dihari majdoor adda — the corner where the day's work ends and the songs start.",
    category: "Work & Trade",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "bartan-wali-playlist",
    name: "Bartan Wali Playlist",
    url: "https://bartan-wali-playlist.vercel.app",
    domain: "bartan-wali-playlist.vercel.app",
    tagline: "Har plate ka apna gaana — a playlist for washing dishes at the sink.",
    category: "Work & Trade",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "jai-jawan-jai-kisan",
    name: "Jai Jawan Jai Kisan",
    url: "https://site-final-lyart.vercel.app",
    domain: "site-final-lyart.vercel.app",
    tagline: "Haryanvi tractor and farmer songs — dust, diesel, and dhamaka beats.",
    category: "Work & Trade",
    embeddable: true,
    addedAt: "2026-08-23"
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
  },
  {
    id: "mandir-radio",
    name: "Mandir Radio",
    url: "https://mandir-radio.vercel.app",
    domain: "mandir-radio.vercel.app",
    tagline: "Bhajan, kirtan, aarti — 24×7. Touch anywhere and the bhajan begins.",
    category: "Festival & Occasions",
    embeddable: true,
    addedAt: "2026-08-21"
  },
  {
    id: "dj-rakes",
    name: "DJ Rakes",
    url: "https://djrakes.runable.site",
    domain: "djrakes.runable.site",
    tagline: "Baraat dance floor, straight to the DJ hooks — the drop everyone's waiting for.",
    category: "Festival & Occasions",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "chhath-puja-radio",
    name: "Chhath Puja Radio",
    url: "https://chhathpujaradio.vercel.app",
    domain: "chhathpujaradio.vercel.app",
    tagline: "Sharda Sinha's chhath geet, arghya by the ghat at dawn.",
    category: "Festival & Occasions",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "azaad-bharat",
    name: "Azaad Bharat",
    url: "https://azaad-bharat.vercel.app",
    domain: "azaad-bharat.vercel.app",
    tagline: "India's most patriotic songs, all in one loop — desh bhakti on repeat.",
    category: "Festival & Occasions",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "punjabi-wedding-dj",
    name: "Punjabi Wedding DJ",
    url: "https://punjabi-wedding-dj.vercel.app",
    domain: "punjabi-wedding-dj.vercel.app",
    tagline: "Dhole vajao oye — OG Punjabi wedding bangers, baraat-ready.",
    category: "Festival & Occasions",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "sharod-adda",
    name: "Sharod Adda",
    url: "https://sharod-adda.vercel.app",
    domain: "sharod-adda.vercel.app",
    tagline: "Durga Puja adda vibes — pandal hopping energy, straight into your speaker.",
    category: "Festival & Occasions",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "durga-pujo",
    name: "Durga Pujo",
    url: "https://durgapujosong.vercel.app",
    domain: "durgapujosong.vercel.app",
    tagline: "Pujo is coming — songs for the pandal, dhak and all.",
    category: "Festival & Occasions",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "mahashivratri",
    name: "Mahashivratri",
    url: "https://mahashivratri-immersive.vercel.app",
    domain: "mahashivratri-immersive.vercel.app",
    tagline: "Pure Shiva chants for a sacred night — Har Har Mahadev, on loop.",
    category: "Festival & Occasions",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "chhath-radio-2",
    name: "Chhath Radio",
    url: "https://chhatt.vercel.app",
    domain: "chhatt.vercel.app",
    tagline: "Chhath Puja, redesigned — the warmth of the ghat in a digital space.",
    category: "Festival & Occasions",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "bhakti-sagar",
    name: "Bhakti Sagar",
    url: "https://bhaktisagar.netlify.app",
    domain: "bhaktisagar.netlify.app",
    tagline: "90s Bhakti Sagar TV — devotional reruns, straight from the family television.",
    category: "Festival & Occasions",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "baraat-band",
    name: "Baraat Band",
    url: "https://baraat-band.vercel.app",
    domain: "baraat-band.vercel.app",
    tagline: "An Indian wedding baraat band — dhol, trumpet, and pure chaos.",
    category: "Festival & Occasions",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "chhath-puja-radio-2",
    name: "Chhath Puja Radio — Bihar",
    url: "https://chhathpuja-ten.vercel.app",
    domain: "chhathpuja-ten.vercel.app",
    tagline: "Chhath Puja songs straight from Bihar — geet for the ghat.",
    category: "Festival & Occasions",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "chhath-geet",
    name: "Chhath Geet",
    url: "https://chhath-geet.netlify.app",
    domain: "chhath-geet.netlify.app",
    tagline: "Chhath geet, sung the way they're meant to be — devotion set to music.",
    category: "Festival & Occasions",
    embeddable: false,
    addedAt: "2026-08-23"
  },
  {
    id: "chhath-ke-geet",
    name: "Chhath Ke Geet",
    url: "https://chhath-music.vercel.app",
    domain: "chhath-music.vercel.app",
    tagline: "Purane paramparik Chhath Puja geet, passed down the way they always were.",
    category: "Festival & Occasions",
    embeddable: true,
    addedAt: "2026-08-23"
  },
  {
    id: "deshbhakti-radio",
    name: "Deshbhakti Radio",
    url: "https://deshbhaktiradio.netlify.app",
    domain: "deshbhaktiradio.netlify.app",
    tagline: "Patriotic radio — desh bhakti geet for Independence Day and every day after.",
    category: "Festival & Occasions",
    embeddable: true,
    addedAt: "2026-08-23"
  },
];

// Also usable from Node (health-check script) without touching the browser global.
if (typeof module !== "undefined" && module.exports) module.exports = APPS;
