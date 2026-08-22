async function getTracks(term, limit = 30, country = 'IN') {
  const endpoint = new URL('https://itunes.apple.com/search');
  endpoint.search = new URLSearchParams({
    term: String(term).slice(0, 100),
    media: 'music',
    entity: 'song',
    limit: String(Math.min(limit, 50)),
    country
  });
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error('iTunes search failed');
  const data = await response.json();
  return (data.results || []).map(item => ({
    id: String(item.trackId),
    title: item.trackName,
    artist: item.artistName,
    album: item.collectionName,
    artwork: (item.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
    preview: item.previewUrl,
    url: item.trackViewUrl,
    genre: item.primaryGenreName,
    duration: item.trackTimeMillis,
    release: item.releaseDate
  })).filter(t => t.preview);
}
module.exports = { getTracks };
