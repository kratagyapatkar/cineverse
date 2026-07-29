export default async function handler(req, res) {
  // Allow all origins (public API proxy)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Next.js/Vercel dynamic routing matches [...path].js and puts it in req.query.path
  const { path, ...queryParams } = req.query;
  
  if (!path) {
    return res.status(400).json({ error: 'Missing path parameter' });
  }

  const tmdbPath = Array.isArray(path) ? path.join('/') : path;
  const tmdbBase = 'https://api.themoviedb.org/3';
  const url = new URL(`${tmdbBase}/${tmdbPath}`);

  Object.entries(queryParams).forEach(([k, v]) => {
    url.searchParams.set(k, v);
  });

  const BEARER = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZDY2MTVkYjZiNmRmZDkzOGE3ZjU3OWU5NjhiZDhiMSIsIm5iZiI6MTc4NTM0Mjg1OS44MDgsInN1YiI6IjZhNmEyYjhiNmMxMzE1ZWNiNzhhYzRiZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.wXPHL1hmBK_t4Ux8zgGgBuM-g0RiuJ6Um40TZ2QxTwA';

  try {
    const tmdbRes = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${BEARER}`,
        Accept: 'application/json',
      },
    });

    const data = await tmdbRes.json();

    if (tmdbRes.ok) {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    }

    return res.status(tmdbRes.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Upstream fetch failed', detail: err.message });
  }
}
