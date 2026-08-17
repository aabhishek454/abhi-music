const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 4173;
const PUBLIC = path.join(__dirname, 'public');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.json':'application/json'};

async function getTracks(term, limit = 30, country = 'IN') {
  const endpoint = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=${Math.min(limit,50)}&country=${country}&explicit=No`;
  const r = await fetch(endpoint, { headers: { 'User-Agent': 'AbhiMusic/1.0' }});
  if (!r.ok) throw new Error('Music service unavailable');
  const data = await r.json();
  return data.results.filter(x => x.previewUrl).map(x => ({
    id: String(x.trackId), title: x.trackName, artist: x.artistName,
    album: x.collectionName, artwork: (x.artworkUrl100 || '').replace('100x100bb','600x600bb'),
    preview: x.previewUrl, url: x.trackViewUrl, genre: x.primaryGenreName,
    duration: x.trackTimeMillis, release: x.releaseDate
  }));
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://${req.headers.host}`);
    if (u.pathname === '/api/search') {
      const q = (u.searchParams.get('q') || 'Bollywood hits').slice(0,80);
      const tracks = await getTracks(q, 40);
      res.writeHead(200, {'Content-Type':'application/json','Cache-Control':'public, max-age=300'});
      return res.end(JSON.stringify(tracks));
    }
    if (u.pathname === '/api/youtube') {
      const key = process.env.YOUTUBE_API_KEY;
      if (!key) { res.writeHead(503, {'Content-Type':'application/json'}); return res.end(JSON.stringify({error:'YouTube is not configured yet',code:'YOUTUBE_KEY_MISSING'})); }
      const q = (u.searchParams.get('q') || 'latest Indian music official audio').slice(0,100);
      const sr = await fetch(`https://www.googleapis.com/youtube/v3/search?${new URLSearchParams({key,part:'snippet',type:'video',videoCategoryId:'10',maxResults:'30',q,safeSearch:'moderate'})}`);
      const sd = await sr.json(); if(!sr.ok) throw new Error(sd.error?.message || 'YouTube search failed');
      const ids = sd.items.map(x=>x.id.videoId).filter(Boolean);
      const dr = await fetch(`https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({key,part:'contentDetails,status,snippet',id:ids.join(',')})}`);
      const dd = await dr.json(); const map = new Map(dd.items.map(x=>[x.id,x]));
      const isoMs = v=>{const m=(v||'').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);return m?((+m[1]||0)*3600+(+m[2]||0)*60+(+m[3]||0))*1000:0};
      const out=sd.items.map(r=>{const v=map.get(r.id.videoId);if(!v||v.status?.embeddable===false)return null;const s=v.snippet;return{id:`yt-${v.id}`,youtubeId:v.id,source:'youtube',title:s.title,artist:s.channelTitle,album:'YouTube Music',artwork:s.thumbnails?.maxres?.url||s.thumbnails?.high?.url,url:`https://www.youtube.com/watch?v=${v.id}`,genre:'Music',duration:isoMs(v.contentDetails?.duration),release:s.publishedAt}}).filter(Boolean);
      res.writeHead(200, {'Content-Type':'application/json'}); return res.end(JSON.stringify(out));
    }
    if (u.pathname === '/api/discover') {
      const terms = ['latest Bollywood hits','Punjabi hits','Indian pop','Arijit Singh'];
      const groups = await Promise.all(terms.map(t => getTracks(t, 18)));
      res.writeHead(200, {'Content-Type':'application/json','Cache-Control':'public, max-age=600'});
      return res.end(JSON.stringify({hero:groups[0], punjabi:groups[1], pop:groups[2], artist:groups[3]}));
    }
    let file = u.pathname === '/' ? '/index.html' : u.pathname;
    const safe = path.normalize(file).replace(/^(\.\.[/\\])+/, '');
    const full = path.join(PUBLIC, safe);
    if (!full.startsWith(PUBLIC) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
      res.writeHead(404); return res.end('Not found');
    }
    res.writeHead(200, {'Content-Type':types[path.extname(full)] || 'application/octet-stream','Cache-Control': path.extname(full)==='.html'?'no-cache':'public, max-age=3600'});
    fs.createReadStream(full).pipe(res);
  } catch (e) {
    res.writeHead(500, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:e.message}));
  }
});
server.listen(PORT, '0.0.0.0', () => console.log(`Abhi Music listening on http://0.0.0.0:${PORT}`));
