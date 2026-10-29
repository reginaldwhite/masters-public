import type { VercelRequest, VercelResponse } from '@vercel/node';

// The DataGolf key lives only here (Vercel env DATAGOLF_API_KEY); the browser never sees it.
// Only the endpoints the app calls are forwarded, so the proxy can't spend the key on others.
const ALLOWED_PATHS = new Set([
  '/preds/pre-tournament',
  '/preds/in-play',
  '/preds/skill-ratings',
  '/preds/get-dg-rankings',
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Strip /api/datagolf prefix to get the DataGolf path + query
  const url = new URL(req.url ?? '/', `http://localhost`);
  const dgPath = url.pathname.replace(/^\/api\/datagolf/, '');

  if (req.method !== 'GET' || !ALLOWED_PATHS.has(dgPath)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const apiKey = process.env.DATAGOLF_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'DATAGOLF_API_KEY is not configured' });
    return;
  }

  url.searchParams.set('key', apiKey);
  const upstream = `https://feeds.datagolf.com${dgPath}${url.search}`;

  try {
    const response = await fetch(upstream, {
      headers: { 'User-Agent': 'Masters-Calcutta/1.0' },
    });

    const data = await response.json();

    res.setHeader('Content-Type', 'application/json');
    res.status(response.status).json(data);
  } catch {
    // No error detail: it could echo the upstream URL, which carries the key.
    res.status(502).json({ error: 'DataGolf upstream error' });
  }
}
