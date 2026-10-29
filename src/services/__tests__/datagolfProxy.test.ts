// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../../../api/datagolf/[...path]';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(url: string, method = 'GET'): VercelRequest {
  return { url, method } as VercelRequest;
}

function makeRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      res.headers[name] = value;
      return res;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
  };
  return res;
}

async function call(url: string, method = 'GET') {
  const res = makeRes();
  await handler(makeReq(url, method), res as unknown as VercelResponse);
  return res;
}

// ── Proxy ────────────────────────────────────────────────────────────────────

describe('DataGolf proxy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('DATAGOLF_API_KEY', 'server-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('adds the server-side key and forwards the query', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));

    const res = await call('/api/datagolf/preds/in-play?tour=pga&file_format=json');

    const upstream = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(upstream.origin + upstream.pathname).toBe('https://feeds.datagolf.com/preds/in-play');
    expect(upstream.searchParams.get('tour')).toBe('pga');
    expect(upstream.searchParams.get('key')).toBe('server-key');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: 1 });
  });

  it('replaces a key sent by the client', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    await call('/api/datagolf/preds/skill-ratings?key=client-key&display=value');

    const upstream = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(upstream.searchParams.getAll('key')).toEqual(['server-key']);
  });

  it('refuses endpoints the app does not use', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const res = await call('/api/datagolf/historical-raw-data/rounds?tour=pga');

    expect(res.statusCode).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refuses non-GET requests', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const res = await call('/api/datagolf/preds/in-play', 'POST');

    expect(res.statusCode).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails clearly when the key is not configured', async () => {
    vi.stubEnv('DATAGOLF_API_KEY', '');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const res = await call('/api/datagolf/preds/in-play');

    expect(res.statusCode).toBe(500);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not echo upstream errors, which could contain the key', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('fetch failed: https://feeds.datagolf.com/preds/in-play?key=server-key'),
    );

    const res = await call('/api/datagolf/preds/in-play');

    expect(res.statusCode).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain('server-key');
  });
});
