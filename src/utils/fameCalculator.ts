import type { Player, FamePremium } from '../types';

/**
 * DataGolf rank cutoff for fame premium.
 * Players ranked better than this (lower number) receive a premium.
 * Rank 1  → 1.15×  (max fame)
 * Rank 50 → 1.00×  (no premium)
 * Rank 50+ → 1.00× (no premium)
 */
export const FAME_RANK_CUTOFF = 50;

/**
 * Calculate a single player's fame multiplier from their DataGolf rank.
 * Linear scale: rank 1 → 1.15, rank FAME_RANK_CUTOFF → 1.00.
 * Players without a rank (undefined) receive 1.00.
 */
export function calculateFameMultiplier(dgRank: number | undefined): number {
  if (dgRank == null || dgRank >= FAME_RANK_CUTOFF) return 1.0;
  return 1 + ((FAME_RANK_CUTOFF - dgRank) / (FAME_RANK_CUTOFF - 1)) * 0.15;
}

/**
 * Calculate fame premiums using an explicit DataGolf rankings map.
 * Looks up each player's dg_id in the map — this is the authoritative path.
 * Falls back to player.dgRank if the map has no entry, then to 1.00.
 */
export function calculateFamePremiums(
  players: Player[],
  rankMap: Map<number, number> = new Map(),
): FamePremium[] {
  return players.map((p) => {
    const rank = (p.dgId != null ? rankMap.get(p.dgId) : undefined) ?? p.dgRank;
    return {
      playerName: p.name,
      multiplier: calculateFameMultiplier(rank),
    };
  });
}
