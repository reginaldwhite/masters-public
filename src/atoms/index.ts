import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { Player, Team, AuctionEntry, PayoutConfig, FamePremium, CourseFit, AmateurBet } from '../types';
import { calculateAllTeamEVs } from '../utils/evCalculator';

// Current view
export type View = 'dashboard' | 'details' | 'myteams' | 'players';

// Custom storage for Map<number, AuctionEntry> — Maps can't be JSON-serialised directly
const auctionMapStorage = {
  getItem(key: string, initialValue: Map<number, AuctionEntry>): Map<number, AuctionEntry> {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return initialValue;
      const entries: [number, AuctionEntry][] = JSON.parse(raw);
      return new Map(entries);
    } catch {
      return initialValue;
    }
  },
  setItem(key: string, value: Map<number, AuctionEntry>): void {
    localStorage.setItem(key, JSON.stringify(Array.from(value.entries())));
  },
  removeItem(key: string): void {
    localStorage.removeItem(key);
  },
};

// Always start on dashboard
const getInitialView = (): View => 'dashboard';

export const viewAtom = atom<View>(getInitialView());

// Player data fetched from API — persisted so the field survives a refresh
export const playersAtom = atomWithStorage<Player[]>('calcutta_players', []);

// Baseline (pre-tournament) probability snapshot — saved on first fetch, never overwritten
export const baselinePlayersAtom = atomWithStorage<Player[]>('calcutta_baseline_players', []);
export const baselineTimestampAtom = atomWithStorage<string>('calcutta_baseline_ts', '');

// Team groupings — persisted (drives the auto-navigation logic above)
export const teamsAtom = atomWithStorage<Team[]>('calcutta_teams', []);

// Auction tracking: groupId -> AuctionEntry — persisted with custom Map serialiser
export const auctionAtom = atomWithStorage<Map<number, AuctionEntry>>(
  'calcutta_auction',
  new Map(),
  auctionMapStorage,
);

// Derived atom: total pool = sum of all auction prices
export const poolAtom = atom<number>((get) => {
  const auction = get(auctionAtom);
  let total = 0;
  auction.forEach((entry) => {
    if (entry.sold) {
      total += entry.price;
    }
  });
  return total;
});

// Payout configuration with default Masters Calcutta structure
export const payoutConfigAtom = atom<PayoutConfig>({
  positions: [
    { place: 1, percentage: 25, label: '1st' },
    { place: 2, percentage: 14, label: '2nd' },
    { place: 3, percentage: 12, label: '3rd' },
    { place: 4, percentage: 10, label: '4th' },
    { place: 5, percentage: 9, label: '5th' },
    { place: 6, percentage: 8, label: '6th' },
    { place: 7, percentage: 7, label: '7th' },
    { place: 8, percentage: 5, label: '8th' },
    { place: 9, percentage: 4, label: '9th' },
  ],
  bonuses: [
    { type: 'Low Senior', percentage: 2 },
    { type: 'High Score', percentage: 2 },
    { type: 'Low Am', percentage: 2 },
  ],
});

// Fame premiums for popular players
export const famePremiumsAtom = atomWithStorage<FamePremium[]>('calcutta_fame', []);

// DataGolf rankings map: dg_id → datagolf_rank (populated after fetch, not persisted)
export const dgRankingsAtom = atom<Map<number, number>>(new Map());

// Course fit multipliers per player
export const courseFitsAtom = atomWithStorage<CourseFit[]>('calcutta_fits', []);

// List of amateur player names
export const amateursAtom = atomWithStorage<string[]>('calcutta_amateurs', []);

// Amateur side bets (calcutta side auction for individual amateurs)
export const amateurBetsAtom = atomWithStorage<AmateurBet[]>('calcutta_amateur_bets', []);

// ── Dashboard-specific atoms ─────────────────────────────────────────────────

// The groupId currently "on the block" (being auctioned)
export const onTheBlockAtom = atom<number | null>(null);

// Derived: all players flattened from teams — these carry the correct isSenior/isAmateur
// flags set by the team parser, unlike playersAtom which is raw API data.
export const teamPlayersAtom = atom<Player[]>((get) => {
  const teams = get(teamsAtom);
  return teams.flatMap((t) => t.players);
});

// Derived: teams with recalculated EVs based on current pool & payout config
export const teamsWithEVAtom = atom<Team[]>((get) => {
  const teams = get(teamsAtom);
  const teamPlayers = get(teamPlayersAtom); // use flagged players, not raw API
  const payoutConfig = get(payoutConfigAtom);
  const pool = get(poolAtom);

  if (teams.length === 0) return [];

  return calculateAllTeamEVs(teams, teamPlayers, payoutConfig, pool > 0 ? pool : undefined);
});

// Derived: teams that have NOT been sold
export const unsoldTeamsAtom = atom<Team[]>((get) => {
  const teams = get(teamsWithEVAtom);
  const auction = get(auctionAtom);
  return teams.filter((t) => !auction.has(t.groupId));
});

// Derived: teams that HAVE been sold, with auction info
export const soldTeamsAtom = atom<Team[]>((get) => {
  const teams = get(teamsWithEVAtom);
  const auction = get(auctionAtom);
  return teams.filter((t) => auction.has(t.groupId));
});

// Derived: count of sold teams
export const teamsSoldCountAtom = atom<number>((get) => {
  const auction = get(auctionAtom);
  return auction.size;
});

// ── Estimated pot ────────────────────────────────────────────────────────────
// Starts at last year's total ($26,600).
// After each sale, scales up/down based on whether actual prices are above or
// below each team's raw EV share of the base pot.
export const BASE_POT = 26_600;

export const estimatedPotAtom = atom<number>((get) => {
  const auction = get(auctionAtom);
  const teams = get(teamsWithEVAtom);

  if (auction.size === 0) return BASE_POT;

  let actualTotal = 0;
  let expectedTotal = 0;

  auction.forEach((entry) => {
    const team = teams.find((t) => t.groupId === entry.groupId);
    if (team) {
      actualTotal += entry.price;
      expectedTotal += team.ev * BASE_POT;
    }
  });

  if (expectedTotal <= 0) return BASE_POT;

  return BASE_POT * (actualTotal / expectedTotal);
});
