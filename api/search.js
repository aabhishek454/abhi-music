const { getTracks } = require('./_music');
module.exports = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Missing q' });
    const tracks = await getTracks(q, Number(req.query.limit) || 30);
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    res.status(200).json(tracks);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
