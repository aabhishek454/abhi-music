const { getTracks } = require('./_music');
module.exports = async (req, res) => {
  try {
    const q = String(req.query.q || 'Bollywood hits').slice(0, 80);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json(await getTracks(q, 40));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
