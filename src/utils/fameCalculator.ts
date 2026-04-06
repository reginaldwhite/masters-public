import type { Player, FamePremium } from '../types';

/**
 * DataGolf rank cutoff for fame premium.
 * Players ranked better than this (lower number) receive a premium.
 * Rank 1  → 1.30×  (max fame)
 * Rank 50 → 1.00×  (no premium)
 * Rank 50+ → 1.00× (no premium)
 */
export const FAME_RANK_CUTOFF = 50;

/**
 * Calculate a single player's fame multiplier from their DataGolf rank.
 * Linear scale: rank 1 → 1.30, rank FAME_RANK_CUTOFF → 1.00.
 * Players without a rank (undefined) receive 1.00.
 */
export function calculateFameMultiplier(dgRank: number | undefined): number {
  if (dgRank == null || dgRank >= FAME_RANK_CUTOFF) return 1.0;
  return 1 + ((FAME_RANK_CUTOFF - dgRank) / (FAME_RANK_CUTOFF - 1)) * 0.30;
}

/**
 * Calculate fame premiums for all players in the field.
 * Uses each player's DataGolf rank (player.dgRank).
 * Players without a rank default to 1.00 (no premium).
 * Range: 1.00 to 1.30.
 */
export function calculateFamePremiums(players: Player[]): FamePremium[] {
  return players.map((p) => ({
    playerName: p.name,
    multiplier: calculateFameMultiplier(p.dgRank),
  }));
}
