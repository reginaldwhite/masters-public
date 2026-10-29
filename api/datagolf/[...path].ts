import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Strip /api/datagolf prefix to get the DataGolf path + query
  const url = new URL(req.url ?? '/', `http://localhost`);
  const dgPath = url.pathname.replace(/^\/api\/datagolf/, '');
  const upstream = `https://feeds.datagolf.com${dgPath}${url.search}`;

  try {
    const response = await fetch(upstream, {
      method: req.method ?? 'GET',
      headers: { 'User-Agent': 'Masters-Calcutta/1.0' },
    });

    const data = await response.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'DataGolf upstream error', detail: String(err) });
  }
}
