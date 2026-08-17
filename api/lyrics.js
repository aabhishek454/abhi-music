function clean(value = '') {
  return value.replace(/\([^)]*(official|lyrics?|video|audio)[^)]*\)/gi, '').replace(/\[[^\]]*\]/g, '').replace(/\s*[|–—-]\s*(official|lyrics?|music video|audio).*$/i, '').trim();
}
module.exports = async (req, res) => {
  try {
    const artist = clean(String(req.query.artist || '').slice(0, 120));
    const track = clean(String(req.query.track || '').slice(0, 160));
    if (!track) return res.status(400).json({ error: 'Track name is required' });
    const q = `${track} ${artist}`.trim();
    const response = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': 'AbhiMusic/1.0 (https://abhi-music-amber.vercel.app)' } });
    if (!response.ok) throw new Error('Lyrics service unavailable');
    const results = await response.json();
    const item = results.find(x => x.syncedLyrics) || results.find(x => x.plainLyrics);
    if (!item) return res.status(404).json({ error: 'Lyrics not found for this song' });
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({ id: item.id, trackName: item.trackName, artistName: item.artistName, albumName: item.albumName, duration: item.duration, syncedLyrics: item.syncedLyrics, plainLyrics: item.plainLyrics });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
