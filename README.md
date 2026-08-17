# Abhi Music 🎧

A polished, responsive music discovery and preview app for Bollywood, Punjabi, Indian pop, and international music.

## Features

- Search songs, artists, and albums
- Legal 30-second audio previews from Apple's public iTunes Search API
- Play queue, shuffle, repeat, seek, and volume controls
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
