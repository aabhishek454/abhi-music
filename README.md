# Abhi Music 🎧

A polished, responsive music discovery and preview app for Bollywood, Punjabi, Indian pop, and international music.

## Features

- Search songs, artists, and albums
- Full official music playback through the YouTube IFrame Player and YouTube Data API
- Licensed 30-second Apple previews as a fallback when YouTube is not configured
- Play queue, shuffle, repeat, seek, volume, and a mobile full-screen player
- Liked songs and recently played history saved in the browser
- Curated mood and genre discovery
- Responsive desktop and mobile interface
- No API keys or signup required

## Run locally

```bash
npm start
```

Open `http://localhost:4173`.

## Deploy

The project includes Vercel serverless functions and `vercel.json` configuration.

```bash
vercel --prod
```

## Music licensing

Abhi Music streams official preview URLs supplied by Apple. It does not scrape or download copyrighted audio from YouTube or other services.
