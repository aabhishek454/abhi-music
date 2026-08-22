# ABHI MUSIC 🎧

> **Your Personal Music Universe** — a premium, liquid-glass music streaming experience built from zero.

![status](https://img.shields.io/badge/status-live-brightgreen) ![tech](https://img.shields.io/badge/stack-vanilla%20JS%20%7C%20PWA-blue)

## ✨ Features

- **Liquid Glass design system** — layered translucent surfaces, ambient artwork-driven lighting, depth-based glass hierarchy
- **Full music player** — play/pause, next/prev, seek, volume/mute, shuffle, repeat (off/all/one), queue management
- **Persistent glass player** (desktop) + **mini player & floating bottom nav** (mobile)
- **Cinematic Now Playing** — full-screen view with artwork-derived ambience, synchronized lyrics, swipe-down to close
- **Home** — dynamic greeting, cinematic hero, Continue Listening, Made For You, Trending, New Releases, Moods
- **Search** — instant categorized results (top result, songs, artists, albums, playlists) + genre chips
- **Discover** — charts, hidden gems, mood worlds
- **Library** — Songs / Albums / Artists / Playlists / Liked tabs
- **Album / Playlist / Mood / Artist pages** — immersive detail views with full track lists
- **Queue panel** — now playing, next up, remove, jump-to-track, clear
- **PWA** — installable, offline app shell via service worker
- **Accessible** — keyboard navigation, ARIA labels, focus states, `prefers-reduced-motion`
- **Responsive** — 320px → 2560px, native-app-quality mobile experience

## 🛠 Tech Stack

- Vanilla HTML / CSS / JavaScript — **zero frameworks, zero dependencies**
- CSS custom properties design-token system
- Hash router, service layer (`MusicService`) ready for real APIs
- Service Worker + Web Manifest

## 🚀 Getting Started

```bash
git clone https://github.com/aabhishek454/abhi-music.git
cd abhi-music
python -m http.server 8000   # or npx serve
```

Open http://localhost:8000

## 📦 Deploy (Vercel)

```bash
npm i -g vercel
vercel --prod
```

## 📁 Structure

```
abhi-music/
├── index.html          # App shell
├── css/
│   ├── tokens.css      # Design system (colors, glass, spacing, motion)
│   ├── layout.css      # Shell, sidebar, cards, tracklists
│   └── player.css      # Player, Now Playing, mobile, queue
├── js/
│   ├── icons.js        # SVG icon library
│   ├── data.js         # Types + mock data + MusicService API layer
│   ├── player.js       # Playback engine + state
│   ├── views.js        # Page renderers
│   └── app.js          # Router + UI controller
├── manifest.json       # PWA manifest
├── sw.js               # Service worker
└── icons/              # App icons
```

---

© 2026 ABHI MUSIC — Your Personal Music Universe 🌌