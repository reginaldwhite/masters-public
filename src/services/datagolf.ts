import type { Player, PositionProbabilities } from '../types';

// ── DataGolf API response types ──────────────────────────────────────────────

export interface DGPlayerRaw {
  am: number; // 1 = amateur, 0 = professional
  country: string;
  dg_id: number;
  make_cut: number;
  player_name: string; // "Last, First"
  sample_size: number;
  top_2?: number;  // from add_position
  top_3?: number;  // from add_position
  top_4?: number;  // from add_position
  top_5: number;
  top_6?: number;  // from add_position
  top_7?: number;  // from add_position
  top_8?: number;  // from add_position
  top_9?: number;  // from add_position
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
 * When add_position data is available the intermediate cumulative
 * probabilities (top2–top4, top6–top9) are populated directly.
 * Otherwise they stay 0 and the EV calculator falls back to interpolation.
 */
export function mapDGPlayerToPlayer(raw: DGPlayerRaw): Player {
  const probabilities: PositionProbabilities = {
    win: raw.win ?? 0,
    top2: raw.top_2 ?? 0,
    top3: raw.top_3 ?? 0,
    top4: raw.top_4 ?? 0,
    top5: raw.top_5 ?? 0,
    top6: raw.top_6 ?? 0,
    top7: raw.top_7 ?? 0,
    top8: raw.top_8 ?? 0,
    top9: raw.top_9 ?? 0,
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

export interface DGSkillRating {
  dg_id: number;
  player_name: string; // "Last, First"
  sg_ott: number;
  sg_app: number;
  sg_arg: number;
  sg_putt: number;
  sg_total: number;
  driving_dist: number;
  driving_acc: number;
}

export interface DGSkillRatingsResponse {
  last_updated: string;
  players: DGSkillRating[];
}

/**
 * Fetch player skill ratings (SG splits) from DataGolf.
 * Returns a Map from dg_id to DGSkillRating for fast lookup.
 */
export async function fetchSkillRatings(): Promise<Map<number, DGSkillRating>> {
  const apiKey = import.meta.env.VITE_DATAGOLF_API_KEY ?? '';
  if (!apiKey) throw new DataGolfError('API key is required');

  const url = `${PROXY_BASE}/preds/skill-ratings?display=value&file_format=json&key=${encodeURIComponent(apiKey)}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new DataGolfError(`Network error fetching skill ratings: ${(err as Error).message}`);
  }

  if (!response.ok) {
    throw new DataGolfError(`Skill ratings API returned status ${response.status}`, response.status);
  }

  let data: DGSkillRatingsResponse;
  try {
    data = await response.json();
  } catch {
    throw new DataGolfError('Failed to parse skill ratings response as JSON');
  }

  const map = new Map<number, DGSkillRating>();
  for (const p of data.players ?? []) {
    map.set(p.dg_id, p);
  }
  return map;
}

export interface DGRankingRaw {
  dg_id: number;
  player_name: string; // "Last, First"
  datagolf_rank: number;
  owgr_rank: number;
  am: number;
  country: string;
  primary_tour: string;
}

export interface DGRankingsResponse {
  last_updated: string;
  rankings: DGRankingRaw[];
}

/**
 * Fetch DataGolf rankings.
 * Returns a Map from dg_id → dg_rank for fast lookup.
 */
export async function fetchDGRankings(): Promise<Map<number, number>> {
  const apiKey = import.meta.env.VITE_DATAGOLF_API_KEY ?? '';
  if (!apiKey) throw new DataGolfError('API key is required');

  const url = `${PROXY_BASE}/preds/get-dg-rankings?file_format=json&key=${encodeURIComponent(apiKey)}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new DataGolfError(`Network error fetching DG rankings: ${(err as Error).message}`);
  }

  if (!response.ok) {
    throw new DataGolfError(`Rankings API returned status ${response.status}`, response.status);
  }

  let data: DGRankingsResponse;
  try {
    data = await response.json();
  } catch {
    throw new DataGolfError('Failed to parse DG rankings response as JSON');
  }

  const map = new Map<number, number>();
  for (const p of data.rankings ?? []) {
    map.set(p.dg_id, p.datagolf_rank);
  }
  return map;
}

// ── Live (in-tournament) model types ─────────────────────────────────────────

/**
 * Shape of each player record returned by the /preds/in-play endpoint.
 * Intermediate positions (top_2–top_4, top_6–top_9) are absent; the EV
 * calculator will interpolate them from top_5 / top_10.
 */
export interface DGLivePlayerRaw {
  dg_id: number;
  player_name: string; // "Last, First"
  country: string;
  current_pos: string;
  current_score: number;
  today: number;
  thru: number;
  round: number;
  R1: number | null;
  R2: number | null;
  R3: number | null;
  R4: number | null;
  win: number;
  top_5: number;
  top_10: number;
  top_20: number;
  make_cut: number;
}

export interface DGLiveResponse {
  data: DGLivePlayerRaw[];
  info: {
    current_round: number;
    event_name: string;
    last_update: string;
  };
}

/**
 * Fetch live in-tournament predictions from DataGolf (/preds/in-play).
 * Only win, top_5, top_10, top_20, and make_cut probabilities are available;
 * intermediate positions are left as 0 for the EV calculator to interpolate.
 */
export async function fetchLivePredictions(): Promise<{
  players: Player[];
  eventName: string;
  lastUpdated: string;
}> {
  const apiKey = import.meta.env.VITE_DATAGOLF_API_KEY ?? '';
  if (!apiKey) throw new DataGolfError('API key is required');

  const url = `${PROXY_BASE}/preds/in-play?tour=pga&file_format=json&key=${encodeURIComponent(apiKey)}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new DataGolfError(
      `Network error fetching live predictions: ${(err as Error).message}`,
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new DataGolfError('Invalid DataGolf API key', response.status);
  }

  if (!response.ok) {
    throw new DataGolfError(
      `DataGolf live API returned status ${response.status}`,
      response.status,
    );
  }

  let data: DGLiveResponse;
  try {
    data = await response.json();
  } catch {
    throw new DataGolfError('Failed to parse DataGolf live API response as JSON');
  }

  if (!Array.isArray(data.data) || data.data.length === 0) {
    throw new DataGolfError('No live player predictions found in API response');
  }

  const players: Player[] = data.data.map((raw) => ({
    name: normalizeName(raw.player_name),
    dgId: raw.dg_id,
    probabilities: {
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
    },
    isSenior: false,
    isAmateur: false, // not provided by live endpoint; set via AMATEURS_2026 in team matching
    payout2025: 0,
    finish2025: '',
    currentScore: raw.current_score,
    currentPos: raw.current_pos,
    thru: raw.thru,
    today: raw.today,
  }));

  return {
    players,
    eventName: data.info?.event_name ?? '',
    lastUpdated: data.info?.last_update ?? '',
  };
}

export interface FetchPredictionsOptions {
  /** Which model to use – defaults to "baseline_history_fit" (baseline + course history + course fit) */
  model?: 'baseline' | 'baseline_history_fit';
}

/**
 * Fetch pre-tournament predictions from DataGolf via the Vite dev proxy.
 *
 * Uses the proxy path `/api/datagolf/...` which Vite rewrites to
 * `https://feeds.datagolf.com/...` during development.
 *
 * The API key is read from the VITE_DATAGOLF_API_KEY environment variable.
 */
export async function fetchPredictions({
  model = 'baseline_history_fit',
}: FetchPredictionsOptions = {}): Promise<{
  players: Player[];
  eventName: string;
  lastUpdated: string;
}> {
  const apiKey = import.meta.env.VITE_DATAGOLF_API_KEY ?? '';
  if (!apiKey) {
    throw new DataGolfError('API key is required');
  }

  const url = `${PROXY_BASE}/preds/pre-tournament?tour=pga&event_id=14&add_position=2,3,4,6,7,8,9&file_format=json&key=${encodeURIComponent(apiKey)}`;

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
