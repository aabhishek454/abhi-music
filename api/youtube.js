function isoToMs(value = 'PT0S') {
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return ((Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0)) * 1000;
}

module.exports = async (req, res) => {
  try {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) return res.status(503).json({ error: 'YouTube is not configured yet', code: 'YOUTUBE_KEY_MISSING' });
    const q = String(req.query.q || 'latest Indian music official audio').slice(0, 100);
    const maxResults = Math.min(Number(req.query.limit) || 25, 40);
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.search = new URLSearchParams({ key, part: 'snippet', type: 'video', videoCategoryId: '10', maxResults: String(maxResults), q, safeSearch: 'moderate' });
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    if (!searchResponse.ok) throw new Error(searchData.error?.message || 'YouTube search failed');
    const ids = searchData.items.map(item => item.id.videoId).filter(Boolean);
    if (!ids.length) return res.status(200).json([]);
    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.search = new URLSearchParams({ key, part: 'contentDetails,status,snippet', id: ids.join(',') });
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();
    if (!detailsResponse.ok) throw new Error(detailsData.error?.message || 'YouTube details failed');
    const byId = new Map(detailsData.items.map(item => [item.id, item]));
    const tracks = searchData.items.map(result => {
      const video = byId.get(result.id.videoId);
      if (!video || video.status?.embeddable === false) return null;
      const snippet = video.snippet || result.snippet;
      return {
        id: `yt-${video.id}`, youtubeId: video.id, source: 'youtube',
        title: snippet.title.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
        artist: snippet.channelTitle, album: 'YouTube Music',
        artwork: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        genre: 'Music', duration: isoToMs(video.contentDetails?.duration), release: snippet.publishedAt
      };
    }).filter(Boolean);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json(tracks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
