async function getTracks(term, limit = 30, country = 'IN') {
  const endpoint = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=${Math.min(limit, 50)}&country=${country}&explicit=No`;
  const response = await fetch(endpoint, { headers: { 'User-Agent': 'AbhiMusic/1.0' } });
  if (!response.ok) throw new Error('Music service unavailable');
  const data = await response.json();
  return data.results.filter(x => x.previewUrl).map(x => ({
    id: String(x.trackId),
    title: x.trackName,
    artist: x.artistName,
    album: x.collectionName,
    artwork: (x.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
    preview: x.previewUrl,
    url: x.trackViewUrl,
    genre: x.primaryGenreName,
    duration: x.trackTimeMillis,
    release: x.releaseDate
  }));
}
module.exports = { getTracks };
