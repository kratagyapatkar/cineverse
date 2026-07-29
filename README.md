# CineVerse 🌌

> **The Universe of Cinema** — A fully autonomous, self-updating movie, web series & documentary discovery universe.

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://cineverse.vercel.app)
[![TMDB](https://img.shields.io/badge/Powered%20by-TMDB-01b4e4?logo=themoviedatabase)](https://www.themoviedb.org)
![Zero Human Interference](https://img.shields.io/badge/Human%20Interference-Zero-4ade80)

---

## ✨ What is CineVerse?

CineVerse is an immersive cinema discovery web app where every movie, web series, and documentary appears as a **tiny poster in a living universe**. Hover over any thumbnail to zoom in 2.6× with a cinematic reveal. Click to open a full detail view with cast, trailer, rating, and more.

**Zero setup. Zero manual curation. The universe updates itself.**

---

## 🚀 Features

- 🌌 **Universe Grid** — Dense mosaic of posters from 16+ TMDB endpoints
- 🔍 **Hover Zoom** — 2.6× zoom with glow, title, rating and type badge
- 🤖 **Self-Healing API** — 3-key pool with auto-rotation, exponential backoff, rate-limit handling
- 🔄 **Auto-Refresh** — New content appears every 5 minutes without reload
- ♾️ **Infinite Scroll** — Pre-loads 600px before you hit the bottom
- 🎬 **Movies** — Action, Sci-Fi, Horror, Romance, Animation, Bollywood, K-Cinema, Japanese, French...
- 📺 **Web Series** — Popular, Anime, K-Drama, Thriller, Sci-Fi, Reality, Hindi, Spanish...
- 🎥 **Documentaries** — Nature, History, Award-winning, Popular and Top-rated
- 🔎 **Live Search** — Instant results with poster thumbnails
- 🎞️ **Trailers** — YouTube inline trailer player
- 🔖 **Watchlist** — Saved locally in your browser
- 🌠 **Starfield** — 250 animated twinkling stars + nebula glows
- ✨ **Custom Cursor** — Purple radial glow that follows your mouse

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Data | [TMDB API v3](https://developers.themoviedb.org/3) (Bearer Token auth) |
| Hosting | Vercel (static) |
| Fonts | Google Fonts — Outfit + Space Grotesk |

---

## 📁 Project Structure

```
cineverse/
├── index.html       # App shell
├── style.css        # Full design system (dark space theme)
├── app.js           # TMDB engine + all logic
└── vercel.json      # Vercel deployment config
```

---

## 🔑 Self-Healing API Engine

CineVerse uses a 3-key rotating pool. On any failure:

```
Request → Key 1 (primary)
  401/403 → 1hr cooldown → rotate → Key 2
  429     → Retry-After cooldown → rotate → Key 2
  Network → exponential backoff (0.5s → 8s) → retry
  5xx     → backoff → retry same key up to 4×
  All keys down → wait for shortest cooldown → auto-resume
```

No modals. No prompts. No human intervention. Ever.

---

## 📜 License

MIT — use freely, fork, and explore the universe.

---

> This product uses the TMDB API but is not endorsed or certified by TMDB.
