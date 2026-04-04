import type { Player, FamePremium } from '../types';
import { careerWinsData } from '../data/careerWins';

/**
 * Calculate raw fame score: 3× major wins + all pro wins
 */
export function calculateFameScore(majorWins: number, proWins: number): number {
  return 3 * majorWins + proWins;
}

/**
 * Calculate fame premiums for all players in the field.
 * Normalized: 1 + (score / maxScore) × 0.30
 * Range: 1.00 to 1.30
 */
export function calculateFamePremiums(players: Player[]): FamePremium[] {
  // Look up career wins for each player
  const scores: { playerName: string; score: number }[] = players.map((p) => {
    const entry = careerWinsData.find(
      (cw) => cw.playerName.toLowerCase() === p.name.toLowerCase(),
    );
    const score = entry ? calculateFameScore(entry.majorWins, entry.proWins) : 0;
    return { playerName: p.name, score };
  });

  const maxScore = Math.max(...scores.map((s) => s.score), 1); // avoid div by 0

  return scores.map(({ playerName, score }) => ({
    playerName,
    multiplier: score > 0 ? 1 + (score / maxScore) * 0.3 : 1.0,
  }));
}
