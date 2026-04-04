import { atom } from 'jotai';
import type { Player, Team, AuctionEntry, PayoutConfig, FamePremium } from '../types';
import { calculateAllTeamEVs } from '../utils/evCalculator';

// Current view
export type View = 'dashboard' | 'setup';
export const viewAtom = atom<View>('setup');

// Player data fetched from API
export const playersAtom = atom<Player[]>([]);

// Team groupings
export const teamsAtom = atom<Team[]>([]);

// Auction tracking: groupId -> AuctionEntry
export const auctionAtom = atom<Map<number, AuctionEntry>>(new Map());

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
export const famePremiumsAtom = atom<FamePremium[]>([]);

// List of amateur player names
export const amateursAtom = atom<string[]>([]);

// ── Dashboard-specific atoms ─────────────────────────────────────────────────

// The groupId currently "on the block" (being auctioned)
export const onTheBlockAtom = atom<number | null>(null);

// Derived: teams with recalculated EVs based on current pool & payout config
export const teamsWithEVAtom = atom<Team[]>((get) => {
  const teams = get(teamsAtom);
  const players = get(playersAtom);
  const payoutConfig = get(payoutConfigAtom);
  const pool = get(poolAtom);

  if (teams.length === 0) return [];

  return calculateAllTeamEVs(teams, players, payoutConfig, pool > 0 ? pool : undefined);
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
