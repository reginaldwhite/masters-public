import type { Player, PositionProbabilities } from '../types';

// ── DataGolf API response types ──────────────────────────────────────────────

export interface DGPlayerRaw {
  am: number; // 1 = amateur, 0 = professional
  country: string;
  dg_id: number;
  make_cut: number;
  player_name: string; // "Last, First"
  sample_size: number;
  top_5: number;
  top_10: number;
  top_20: number;
  win: number;
}

export interface DGResponse {
  baseline: DGPlayerRaw[];
  baseline_history_fit: DGPlayerRaw[];
  dead_heats: string;
  event_name: string;
  last_updated: string;
  models_available: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert DataGolf "Last, First" name format to "First Last".
 * Handles edge-cases like "Kim, Si Woo" → "Si Woo Kim".
 */
export function normalizeName(dgName: string): string {
  const commaIdx = dgName.indexOf(',');
  if (commaIdx === -1) return dgName.trim();
  const last = dgName.slice(0, commaIdx).trim();
  const first = dgName.slice(commaIdx + 1).trim();
  return `${first} ${last}`;
}

/**
 * Map a raw DataGolf player object to the app's Player type.
 * Intermediate positions (top2–top4, top6–top9) are set to 0;
 * interpolation is handled by the EV calculator.
 */
export function mapDGPlayerToPlayer(raw: DGPlayerRaw): Player {
  const probabilities: PositionProbabilities = {
    win: raw.win ?? 0,
    top2: 0,
    top3: 0,
    top4: 0,
    top5: raw.top_5 ?? 0,
    top6: 0,
    top7: 0,
    top8: 0,
    top9: 0,
    top10: raw.top_10 ?? 0,
    makeCut: raw.make_cut ?? 0,
  };

  return {
    name: normalizeName(raw.player_name),
    dgId: raw.dg_id,
    probabilities,
    isSenior: false, // determined externally
    isAmateur: raw.am === 1,
    payout2025: 0, // enriched later from historical data
    finish2025: '',
  };
}

// ── API errors ───────────────────────────────────────────────────────────────

export class DataGolfError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'DataGolfError';
  }
}

// ── Service ──────────────────────────────────────────────────────────────────

const PROXY_BASE = '/api/datagolf';

export interface FetchPredictionsOptions {
  apiKey: string;
  /** Which model to use – defaults to "baseline" */
  model?: 'baseline' | 'baseline_history_fit';
}

/**
 * Fetch pre-tournament predictions from DataGolf via the Vite dev proxy.
 *
 * Uses the proxy path `/api/datagolf/...` which Vite rewrites to
 * `https://feeds.datagolf.com/...` during development.
 */
export async function fetchPredictions({
  apiKey,
  model = 'baseline',
}: FetchPredictionsOptions): Promise<{
  players: Player[];
  eventName: string;
  lastUpdated: string;
}> {
  if (!apiKey) {
    throw new DataGolfError('API key is required');
  }

  const url = `${PROXY_BASE}/preds/pre-tournament?tour=pga&file_format=json&key=${encodeURIComponent(apiKey)}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new DataGolfError(
      `Network error fetching DataGolf predictions: ${(err as Error).message}`,
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new DataGolfError('Invalid DataGolf API key', response.status);
  }

  if (!response.ok) {
    throw new DataGolfError(
      `DataGolf API returned status ${response.status}`,
      response.status,
    );
  }

  let data: DGResponse;
  try {
    data = await response.json();
  } catch {
    throw new DataGolfError('Failed to parse DataGolf API response as JSON');
  }

  const rawPlayers = data[model] ?? data.baseline ?? [];

  if (!Array.isArray(rawPlayers) || rawPlayers.length === 0) {
    throw new DataGolfError('No player predictions found in API response');
  }

  const players = rawPlayers.map(mapDGPlayerToPlayer);

  return {
    players,
    eventName: data.event_name ?? '',
    lastUpdated: data.last_updated ?? '',
  };
}
