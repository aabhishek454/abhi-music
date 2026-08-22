const { getTracks } = require('./_music');
module.exports = async (_req, res) => {
  try {
    const [hero, punjabi, pop, artist] = await Promise.all([
      getTracks('bollywood hits', 12),
      getTracks('punjabi hits', 12),
      getTracks('arijit singh', 12),
      getTracks('diljit dosanjh', 12)
    ]);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json({ hero, punjabi, pop, artist });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
