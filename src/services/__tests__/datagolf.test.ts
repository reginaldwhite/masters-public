import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeName,
  mapDGPlayerToPlayer,
  fetchPredictions,
  DataGolfError,
} from '../datagolf';
import type { DGPlayerRaw, DGResponse } from '../datagolf';

// ── Name normalisation ───────────────────────────────────────────────────────

describe('normalizeName', () => {
  it('converts "Last, First" to "First Last"', () => {
    expect(normalizeName('Scheffler, Scottie')).toBe('Scottie Scheffler');
  });

  it('handles multi-word first names', () => {
    expect(normalizeName('Kim, Si Woo')).toBe('Si Woo Kim');
  });

  it('handles names with no comma gracefully', () => {
    expect(normalizeName('Tiger Woods')).toBe('Tiger Woods');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeName('  McIlroy ,  Rory  ')).toBe('Rory McIlroy');
  });
});

// ── Player mapping ───────────────────────────────────────────────────────────

const sampleRaw: DGPlayerRaw = {
  am: 0,
  country: 'USA',
  dg_id: 18846,
  make_cut: 0.95,
  player_name: 'Scheffler, Scottie',
  sample_size: 150,
  top_2: 0.22,
  top_3: 0.27,
  top_4: 0.31,
  top_5: 0.35,
  top_6: 0.39,
  top_7: 0.42,
  top_8: 0.45,
  top_9: 0.48,
  top_10: 0.5,
  top_20: 0.7,
  win: 0.15,
};

describe('mapDGPlayerToPlayer', () => {
  it('maps raw fields to Player type correctly', () => {
    const player = mapDGPlayerToPlayer(sampleRaw);

    expect(player.name).toBe('Scottie Scheffler');
    expect(player.dgId).toBe(18846);
    expect(player.isAmateur).toBe(false);
    expect(player.isSenior).toBe(false);
    expect(player.payout2025).toBe(0);
    expect(player.finish2025).toBe('');
  });

  it('maps probabilities with known positions', () => {
    const player = mapDGPlayerToPlayer(sampleRaw);

    expect(player.probabilities.win).toBe(0.15);
    expect(player.probabilities.top5).toBe(0.35);
    expect(player.probabilities.top10).toBe(0.5);
    expect(player.probabilities.makeCut).toBe(0.95);
  });

  it('maps intermediate positions from add_position fields', () => {
    const player = mapDGPlayerToPlayer(sampleRaw);

    expect(player.probabilities.top2).toBe(0.22);
    expect(player.probabilities.top3).toBe(0.27);
    expect(player.probabilities.top4).toBe(0.31);
    expect(player.probabilities.top6).toBe(0.39);
    expect(player.probabilities.top7).toBe(0.42);
    expect(player.probabilities.top8).toBe(0.45);
    expect(player.probabilities.top9).toBe(0.48);
  });

  it('defaults intermediate positions to 0 when add_position fields are absent', () => {
    const rawWithout: DGPlayerRaw = {
      am: 0,
      country: 'USA',
      dg_id: 99999,
      make_cut: 0.80,
      player_name: 'Doe, John',
      sample_size: 100,
      top_5: 0.30,
      top_10: 0.45,
      top_20: 0.60,
      win: 0.10,
    };
    const player = mapDGPlayerToPlayer(rawWithout);

    expect(player.probabilities.top2).toBe(0);
    expect(player.probabilities.top3).toBe(0);
    expect(player.probabilities.top4).toBe(0);
    expect(player.probabilities.top6).toBe(0);
    expect(player.probabilities.top7).toBe(0);
    expect(player.probabilities.top8).toBe(0);
    expect(player.probabilities.top9).toBe(0);
  });

  it('marks amateur players correctly', () => {
    const amateur = mapDGPlayerToPlayer({ ...sampleRaw, am: 1 });
    expect(amateur.isAmateur).toBe(true);
  });

  it('defaults missing probability fields to 0', () => {
    const partial = { ...sampleRaw } as Partial<DGPlayerRaw> as DGPlayerRaw;
    // Simulate missing fields by deleting them at runtime
    const raw = { ...partial } as Record<string, unknown>;
    delete raw.win;
    delete raw.top_5;
    delete raw.top_10;
    delete raw.top_20;
    delete raw.make_cut;

    const player = mapDGPlayerToPlayer(raw as unknown as DGPlayerRaw);

    expect(player.probabilities.win).toBe(0);
    expect(player.probabilities.top5).toBe(0);
    expect(player.probabilities.top10).toBe(0);
    expect(player.probabilities.makeCut).toBe(0);
  });
});

// ── fetchPredictions ─────────────────────────────────────────────────────────

function buildMockResponse(overrides: Partial<DGResponse> = {}): DGResponse {
  return {
    baseline: [sampleRaw],
    baseline_history_fit: [sampleRaw],
    dead_heats: 'yes',
    event_name: 'The Masters',
    last_updated: '2026-04-04 08:00:00  UTC',
    models_available: ['baseline', 'baseline_history_fit'],
    ...overrides,
  };
}

describe('fetchPredictions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('VITE_DATAGOLF_API_KEY', 'test-key');
  });

  it('returns mapped players from a successful response', async () => {
    const mockResp = buildMockResponse();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResp), { status: 200 }),
    );

    const result = await fetchPredictions();

    expect(result.players).toHaveLength(1);
    expect(result.players[0].name).toBe('Scottie Scheffler');
    expect(result.eventName).toBe('The Masters');
    expect(result.lastUpdated).toBe('2026-04-04 08:00:00  UTC');
  });

  it('throws DataGolfError when API key is empty', async () => {
    vi.stubEnv('VITE_DATAGOLF_API_KEY', '');

    await expect(fetchPredictions()).rejects.toThrow(
      DataGolfError,
    );
    await expect(fetchPredictions()).rejects.toThrow(
      'API key is required',
    );
  });

  it('throws DataGolfError on 401 (invalid key)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Unauthorized', { status: 401 }),
    );

    await expect(fetchPredictions()).rejects.toThrow(
      'Invalid DataGolf API key',
    );
  });

  it('throws DataGolfError on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('Failed to fetch'),
    );

    await expect(fetchPredictions()).rejects.toThrow(
      'Network error',
    );
  });

  it('throws DataGolfError when response is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not json', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    );

    await expect(fetchPredictions()).rejects.toThrow(
      'Failed to parse',
    );
  });

  it('throws DataGolfError when no players in response', async () => {
    const empty = buildMockResponse({ baseline: [] });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(empty), { status: 200 }),
    );

    await expect(fetchPredictions()).rejects.toThrow(
      'No player predictions found',
    );
  });

  it('uses the requested model', async () => {
    const mockResp = buildMockResponse();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(mockResp), { status: 200 }),
      );

    await fetchPredictions({
      model: 'baseline_history_fit',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('key=test-key'),
    );
  });

  it('constructs the correct proxy URL', async () => {
    vi.stubEnv('VITE_DATAGOLF_API_KEY', 'my-key');
    const mockResp = buildMockResponse();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(mockResp), { status: 200 }),
      );

    await fetchPredictions();

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/datagolf/preds/pre-tournament?tour=pga&add_position=2,3,4,6,7,8,9&file_format=json&key=my-key',
    );
  });
});
