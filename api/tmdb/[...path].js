const BEARER = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZDY2MTVkYjZiNmRmZDkzOGE3ZjU3OWU5NjhiZDhiMSIsIm5iZiI6MTc4NTM0Mjg1OS44MDgsInN1YiI6IjZhNmEyYjhiNmMxMzE1ZWNiNzhhYzRiZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.wXPHL1hmBK_t4Ux8zgGgBuM-g0RiuJ6Um40TZ2QxTwA';
const TMDB_BASE = 'https://api.themoviedb.org/3';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Extract path segments from the catch-all
  const { path } = req.query;
  if (!path) return res.status(400).json({ error: 'Missing path' });

  const tmdbPath = Array.isArray(path) ? path.join('/') : path;

  // Build the TMDB URL, forwarding all query params
  const params = new URLSearchParams();
  Object.entries(req.query).forEach(([k, v]) => {
    if (k !== 'path') params.set(k, v);
  });

  const tmdbUrl = `${TMDB_BASE}/${tmdbPath}?${params.toString()}`;

  try {
    const upstream = await fetch(tmdbUrl, {
      headers: {
        Authorization: `Bearer ${BEARER}`,
        Accept: 'application/json',
      },
    });

    const data = await upstream.json();

    if (upstream.ok) {
      // Cache at Vercel CDN edge for 5 minutes
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    }

    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[proxy] Upstream error:', err.message);
    return res.status(502).json({ error: 'Upstream fetch failed', detail: err.message });
  }
};
