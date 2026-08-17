function decode(value = '') {
  return value.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}
function clean(value = '') {
  return decode(value)
    .replace(/\([^)]*(official|lyrics?|video|audio|full|hd|4k)[^)]*\)/gi, '')
    .replace(/\[[^\]]*(official|lyrics?|video|audio|full|hd|4k)[^\]]*\]/gi, '')
    .replace(/\b(official\s*)?(music\s*)?(video|audio|lyrics?|full song|hd|4k)\b/gi, '')
    .replace(/\s*[|｜].*$/g, '').replace(/\s+/g, ' ').trim();
}
function normalize(value = '') { return clean(value).toLowerCase().replace(/[^a-z0-9\u0900-\u097f\u0a00-\u0a7f]+/g, ' ').trim(); }
function titleVariants(raw = '') {
  const base = clean(raw), parts = base.split(/\s[-–—]\s/).map(x => x.trim()).filter(Boolean);
  return [...new Set([base, parts[0], parts.length > 1 ? `${parts[0]} ${parts[1]}` : '', base.replace(/\b(ft\.?|feat\.?).*$/i, '').trim()].filter(x => x && x.length > 1))];
}
async function lrclib(query) {
  const response = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, { headers: { 'User-Agent': 'AbhiMusic/1.0 (https://abhi-music-amber.vercel.app)' } });
  return response.ok ? response.json() : [];
}
module.exports = async (req, res) => {
  try {
    const rawArtist = String(req.query.artist || '').slice(0, 120);
    const rawTrack = String(req.query.track || '').slice(0, 180);
    if (!rawTrack) return res.status(400).json({ error: 'Track name is required' });
    const artist = clean(rawArtist).replace(/\b(records|music|official|vevo|channel)\b/gi, '').trim();
    const variants = titleVariants(rawTrack);
    let results = [];
    for (const query of [`${variants[0]} ${artist}`.trim(), ...variants]) {
      results = await lrclib(query);
      if (results.length) break;
    }
    const wanted = normalize(variants[0]);
    results.sort((a, b) => {
      const score = x => (normalize(x.trackName) === wanted ? 10 : 0) + (x.syncedLyrics ? 3 : 0) + (normalize(x.trackName).includes(normalize(variants[0].split(/\s[-–—]\s/)[0])) ? 2 : 0);
      return score(b) - score(a);
    });
    const item = results.find(x => x.syncedLyrics) || results.find(x => x.plainLyrics);
    if (item) {
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
      return res.status(200).json({ provider:'LRCLIB', id:item.id, trackName:item.trackName, artistName:item.artistName, albumName:item.albumName, duration:item.duration, syncedLyrics:item.syncedLyrics, plainLyrics:item.plainLyrics });
    }
    // Plain-lyrics fallback for songs not indexed by LRCLIB.
    const fallbackTitle = variants[0].split(/\s[-–—]\s/)[0].trim();
    const fallbackArtist = variants[0].split(/\s[-–—]\s/)[1] || artist;
    if (fallbackArtist && fallbackTitle) {
      const fallback = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(fallbackArtist)}/${encodeURIComponent(fallbackTitle)}`);
      if (fallback.ok) { const data=await fallback.json(); if(data.lyrics) return res.status(200).json({provider:'Lyrics.ovh',trackName:fallbackTitle,artistName:fallbackArtist,syncedLyrics:null,plainLyrics:data.lyrics}); }
    }
    res.status(404).json({ error: 'Lyrics not found for this version' });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
