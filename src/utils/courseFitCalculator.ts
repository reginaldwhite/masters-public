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
 * Calculate Augusta course-fit scores for all players in the field.
 *
 * Players with SG data get a score from -1 (worst fit) to +1 (best fit)
 * based on their weighted Augusta score relative to the field.
 * Players missing ALL SG data receive a neutral 0 score.
 *
 * Normalization: raw scores are linearly mapped so that
 *   max raw score → +1
 *   min raw score → -1
 */
export function calculateCourseFits(players: Player[]): CourseFit[] {
  const raw = players.map((p) => {
    const hasSgData = p.sgOtt != null || p.sgApp != null || p.sgAtg != null || p.sgPutt != null;
    const rawScore = hasSgData
      ? calculateCourseFitScore(p.sgOtt, p.sgApp, p.sgAtg, p.sgPutt)
      : null; // null = no data
    return { playerName: p.name, rawScore };
  });

  // Only consider players with actual SG data
  const dataScores = raw.filter((s) => s.rawScore != null).map((s) => s.rawScore as number);
  const maxRaw = dataScores.length > 0 ? Math.max(...dataScores) : 0;
  const minRaw = dataScores.length > 0 ? Math.min(...dataScores) : 0;
  const range = maxRaw - minRaw;

  return raw.map(({ playerName, rawScore }) => ({
    playerName,
    score: rawScore != null && range > 0
      ? ((rawScore - minRaw) / range) * 2 - 1  // maps min→-1, max→+1
      : 0,
  }));
}
