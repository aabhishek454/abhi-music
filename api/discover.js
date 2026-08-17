const { getTracks } = require('./_music');
module.exports = async (_req, res) => {
  try {
    const terms = ['latest Bollywood hits', 'Punjabi hits', 'Indian pop', 'Arijit Singh'];
    const groups = await Promise.all(terms.map(term => getTracks(term, 18)));
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    res.status(200).json({ hero: groups[0], punjabi: groups[1], pop: groups[2], artist: groups[3] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
