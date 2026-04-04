import type { Player, CourseFit } from '../types';

/**
 * Augusta National SG category weights derived from DataGolf Newsletter #76
 * (2026-04-02 Masters preview).
 *
 * Augusta differs from a typical PGA Tour stop:
 *  - Around-the-green contributes MORE to scoring variation (winners' best category)
 *  - Putting contributes LESS to scoring variation (winners' worst category)
 */
export const AUGUSTA_WEIGHTS = {
  ott: 0.15,   // off the tee
  app: 0.35,   // approach
  atg: 0.35,   // around the green (elevated vs. typical ~20%)
  putt: 0.15,  // putting (reduced vs. typical ~30%)
} as const;

/**
 * Calculate a raw course-fit score for one player using Augusta weights.
 * Any undefined SG value is treated as 0 (tour-average contribution).
 */
export function calculateCourseFitScore(
  sgOtt: number | undefined,
  sgApp: number | undefined,
  sgAtg: number | undefined,
  sgPutt: number | undefined,
): number {
  return (
    (sgOtt ?? 0) * AUGUSTA_WEIGHTS.ott +
    (sgApp ?? 0) * AUGUSTA_WEIGHTS.app +
    (sgAtg ?? 0) * AUGUSTA_WEIGHTS.atg +
    (sgPutt ?? 0) * AUGUSTA_WEIGHTS.putt
  );
}

/**
 * Calculate Augusta course-fit multipliers for all players in the field.
 *
 * Players with SG data get a multiplier from 1.00 to 1.30 based on their
 * weighted Augusta score relative to the best player in the field.
 * Players missing ALL SG data receive a neutral 1.00 multiplier.
 *
 * Normalization: 1.0 + (score / maxScore) × 0.30
 * (mirrors fameCalculator.ts)
 */
export function calculateCourseFits(players: Player[]): CourseFit[] {
  const scores = players.map((p) => {
    const hasSgData = p.sgOtt != null || p.sgApp != null || p.sgAtg != null || p.sgPutt != null;
    const score = hasSgData
      ? calculateCourseFitScore(p.sgOtt, p.sgApp, p.sgAtg, p.sgPutt)
      : null; // null = no data
    return { playerName: p.name, score };
  });

  // Only consider players with actual SG data for the max
  const dataScores = scores.filter((s) => s.score != null).map((s) => s.score as number);
  const maxScore = dataScores.length > 0 ? Math.max(...dataScores) : 1;

  return scores.map(({ playerName, score }) => ({
    playerName,
    multiplier: score != null && maxScore > 0
      ? Math.max(1.0, 1.0 + (score / maxScore) * 0.3)
      : 1.0,
  }));
}
