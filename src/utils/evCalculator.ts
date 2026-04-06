import type { Player, Team, PositionProbabilities, PayoutConfig } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface MarginalProbabilities {
  p1: number;  // P(exactly 1st)
  p2: number;  // P(exactly 2nd)
  p3: number;  // P(exactly 3rd)
  p4: number;  // P(exactly 4th)
  p5: number;  // P(exactly 5th)
  p6: number;  // P(exactly 6th)
  p7: number;  // P(exactly 7th)
  p8: number;  // P(exactly 8th)
  p9: number;  // P(exactly 9th)
  p10: number; // P(exactly 10th) — for 90% credit
}

export interface FieldSummary {
  totalEVSum: number; // should be close to 1.0 (100% of pool)
  topTeam: { groupId: number; ev: number };
  bottomTeam: { groupId: number; ev: number };
  averageTeamEV: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Distribute a probability mass across N positions using decay weights.
 * Higher weights go to worse (higher-numbered) positions — it's easier
 * to finish 5th than 2nd within a range.
 */
function distributeWithDecay(totalProb: number, weights: number[]): number[] {
  if (totalProb <= 0) return weights.map(() => 0);
  const weightSum = weights.reduce((s, w) => s + w, 0);
  return weights.map((w) => totalProb * (w / weightSum));
}

// ── Contention Boost ─────────────────────────────────────────────────────────

/**
 * Contention boost alpha. Rewards players whose probability mass is
 * concentrated at higher finishing positions, penalizing longshots whose
 * slim value comes mostly from low finishes (8th-10th).
 *
 * A player with high win probability gets their 1st-place payout valued
 * at (1 + alpha) × raw. A player whose only value comes from 10th place
 * gets no boost. After normalization the total pool is preserved, so the
 * boost redistributes EV from the bottom of the board to the top.
 *
 * alpha = 0.15 → 15% premium for 1st, linearly declining to 0% for 10th.
 * Set to 0 to disable.
 */
export const CONTENTION_BOOST = 0.15;

/** Position weight: 1st gets max boost, 10th gets 1.0 (no boost). */
export function getPositionBoost(
  place: number,
  alpha: number = CONTENTION_BOOST,
): number {
  const N = 10;
  return 1 + alpha * Math.max(0, N - place) / (N - 1);
}

/**
 * Normalization factor so total EV across a complete field is preserved
 * after applying contention boosts.
 * Equals unboostedPayoutSum / boostedPayoutSum.
 */
export function getBoostNormalization(
  payoutConfig: PayoutConfig,
  alpha: number = CONTENTION_BOOST,
): number {
  if (alpha === 0) return 1;

  let unboosted = 0;
  let boosted = 0;

  for (const pos of payoutConfig.positions) {
    unboosted += pos.percentage;
    boosted += pos.percentage * getPositionBoost(pos.place, alpha);
  }

  // 10th place: 90% of 9th
  const ninth = payoutConfig.positions.find((p) => p.place === 9);
  if (ninth) {
    const tenthPct = ninth.percentage * 0.9;
    unboosted += tenthPct;
    boosted += tenthPct * getPositionBoost(10, alpha);
  }

  return boosted > 0 ? unboosted / boosted : 1;
}

// ── 1. Position Probability Interpolator ─────────────────────────────────────

/**
 * Derive marginal (individual-position) probabilities from the cumulative
 * probabilities provided by the DataGolf API.
 *
 * API only gives: win, top5, top10, makeCut.
 * Intermediate cumulative fields (top2–top4, top6–top9) are normally 0.
 * When they ARE populated, we honour them for finer granularity.
 * Otherwise we interpolate each range with a realistic decay distribution.
 */
export function deriveMarginalProbabilities(
  probs: PositionProbabilities,
): MarginalProbabilities {
  const { win, top2, top3, top4, top5, top6, top7, top8, top9, top10 } = probs;

  // ── Position 1 ─────────────────────────────────────────────────────────
  const p1 = win;

  // ── Positions 2-5 ──────────────────────────────────────────────────────
  const hasIntermediate2to4 = top2 > 0 || top3 > 0 || top4 > 0;
  let p2: number, p3: number, p4: number, p5: number;

  if (hasIntermediate2to4) {
    // Build effective cumulative ladder, filling gaps with prior value
    const eff = [win];
    for (const val of [top2, top3, top4]) {
      eff.push(val > 0 ? val : eff[eff.length - 1]);
    }
    eff.push(top5);
    p2 = Math.max(0, eff[1] - eff[0]);
    p3 = Math.max(0, eff[2] - eff[1]);
    p4 = Math.max(0, eff[3] - eff[2]);
    p5 = Math.max(0, eff[4] - eff[3]);
  } else {
    const mass = Math.max(0, top5 - win);
    [p2, p3, p4, p5] = distributeWithDecay(mass, [1, 1.2, 1.4, 1.6]);
  }

  // ── Positions 6-10 ─────────────────────────────────────────────────────
  const hasIntermediate6to9 = top6 > 0 || top7 > 0 || top8 > 0 || top9 > 0;
  let p6: number, p7: number, p8: number, p9: number, p10: number;

  if (hasIntermediate6to9) {
    const eff = [top5];
    for (const val of [top6, top7, top8, top9]) {
      eff.push(val > 0 ? val : eff[eff.length - 1]);
    }
    eff.push(top10);
    p6 = Math.max(0, eff[1] - eff[0]);
    p7 = Math.max(0, eff[2] - eff[1]);
    p8 = Math.max(0, eff[3] - eff[2]);
    p9 = Math.max(0, eff[4] - eff[3]);
    p10 = Math.max(0, eff[5] - eff[4]);
  } else {
    const mass = Math.max(0, top10 - top5);
    [p6, p7, p8, p9, p10] = distributeWithDecay(mass, [1, 1.1, 1.2, 1.3, 1.4]);
  }

  return { p1, p2, p3, p4, p5, p6, p7, p8, p9, p10 };
}

// ── 2. Main Pool EV Calculator ───────────────────────────────────────────────

/**
 * Calculate a single player's expected value from the main (position) pool.
 * Returns EV as a fraction of the total pool (e.g. 0.05 = 5%).
 *
 * Payout percentages are read from PayoutConfig (positions 1-9).
 * Position 10 receives 90 % of position 9's payout percentage.
 */
export function calculatePlayerEV(
  probs: PositionProbabilities,
  payoutConfig: PayoutConfig,
): number {
  const m = deriveMarginalProbabilities(probs);
  const marginals = [m.p1, m.p2, m.p3, m.p4, m.p5, m.p6, m.p7, m.p8, m.p9, m.p10];
  const norm = getBoostNormalization(payoutConfig);

  let ev = 0;

  // Positions 1-9 from config, with contention boost
  for (const pos of payoutConfig.positions) {
    const idx = pos.place - 1;
    if (idx >= 0 && idx < marginals.length) {
      ev += marginals[idx] * (pos.percentage / 100) * getPositionBoost(pos.place);
    }
  }

  // Position 10: 90% of 9th place payout, with contention boost
  const ninthPlace = payoutConfig.positions.find((p) => p.place === 9);
  if (ninthPlace) {
    ev += m.p10 * ((ninthPlace.percentage * 0.9) / 100) * getPositionBoost(10);
  }

  // Normalize to preserve total pool across the full field
  return ev * norm;
}

// ── 3. Bonus Pool Calculators ────────────────────────────────────────────────

/**
 * EV from the Low Senior bonus pool.
 * Among seniors who make the cut, each senior's share is proportional
 * to their make-cut probability.
 */
export function calculateLowSeniorEV(
  player: Player,
  allPlayers: Player[],
): number {
  if (!player.isSenior) return 0;

  const seniors = allPlayers.filter((p) => p.isSenior);
  if (seniors.length === 0) return 0;

  const expectedSeniorsMakingCut = seniors.reduce(
    (sum, p) => sum + p.probabilities.makeCut,
    0,
  );
  if (expectedSeniorsMakingCut === 0) return 0;

  const pLowSenior = player.probabilities.makeCut / expectedSeniorsMakingCut;
  return pLowSenior * 0.02; // 2% of pool
}

/**
 * EV from the Low Amateur bonus pool.
 * Same model as Low Senior but for amateurs.
 */
export function calculateLowAmEV(
  player: Player,
  allPlayers: Player[],
): number {
  if (!player.isAmateur) return 0;

  const amateurs = allPlayers.filter((p) => p.isAmateur);
  if (amateurs.length === 0) return 0;

  const expectedAmsMakingCut = amateurs.reduce(
    (sum, p) => sum + p.probabilities.makeCut,
    0,
  );
  if (expectedAmsMakingCut === 0) return 0;

  const pLowAm = player.probabilities.makeCut / expectedAmsMakingCut;
  return pLowAm * 0.02; // 2% of pool
}

/**
 * EV from the High Score bonus pool.
 *
 * Players with the lowest make-cut probability are most likely to have
 * the highest score (worst finish) among those who make the cut.
 *
 * Model: weight each player by  makeCut × weaknessRank  where
 * weaknessRank is highest for the weakest player (lowest makeCut).
 * Normalised so all probabilities sum to 1.
 */
export function calculateHighScoreEV(
  player: Player,
  allPlayers: Player[],
): number {
  const eligible = allPlayers.filter((p) => p.probabilities.makeCut > 0);
  if (eligible.length === 0) return 0;

  // Sort ascending by makeCut — weakest first
  const sorted = [...eligible].sort(
    (a, b) => a.probabilities.makeCut - b.probabilities.makeCut,
  );

  const N = sorted.length;

  // weakness_rank: weakest player (index 0 in ascending) gets highest rank
  const rawScores = sorted.map((p, i) => {
    const weaknessRank = N - 1 - i;
    return p.probabilities.makeCut * weaknessRank;
  });

  const rawSum = rawScores.reduce((s, v) => s + v, 0);
  if (rawSum === 0) return 0;

  const playerIdx = sorted.findIndex((p) => p.name === player.name);
  if (playerIdx === -1) return 0;

  const pHighScore = rawScores[playerIdx] / rawSum;
  return pHighScore * 0.02; // 2% of pool
}

// ── 4. Team EV Aggregator ────────────────────────────────────────────────────

/**
 * Total EV for a team = sum of each member's main-pool EV + bonus EVs.
 */
export function calculateTeamEV(
  team: Team,
  allPlayers: Player[],
  payoutConfig: PayoutConfig,
): number {
  return team.players.reduce((sum, player) => {
    const mainEV = calculatePlayerEV(player.probabilities, payoutConfig);
    const seniorEV = calculateLowSeniorEV(player, allPlayers);
    const amEV = calculateLowAmEV(player, allPlayers);
    const highScoreEV = calculateHighScoreEV(player, allPlayers);
    return sum + mainEV + seniorEV + amEV + highScoreEV;
  }, 0);
}

/**
 * Calculate EVs for all teams, sort descending, and return updated teams.
 * Optionally populates `evDollars` when `poolTotal` is provided.
 */
export function calculateAllTeamEVs(
  teams: Team[],
  allPlayers: Player[],
  payoutConfig: PayoutConfig,
  poolTotal?: number,
): Team[] {
  const updated = teams.map((team) => {
    const ev = calculateTeamEV(team, allPlayers, payoutConfig);
    return {
      ...team,
      ev,
      evDollars: poolTotal != null ? ev * poolTotal : team.evDollars,
    };
  });

  return updated.sort((a, b) => b.ev - a.ev);
}

// ── 5. Summary Statistics ────────────────────────────────────────────────────

export function calculateFieldSummary(
  teams: Team[],
  _payoutConfig: PayoutConfig,
): FieldSummary {
  if (teams.length === 0) {
    return {
      totalEVSum: 0,
      topTeam: { groupId: 0, ev: 0 },
      bottomTeam: { groupId: 0, ev: 0 },
      averageTeamEV: 0,
    };
  }

  const totalEVSum = teams.reduce((s, t) => s + t.ev, 0);

  const sorted = [...teams].sort((a, b) => b.ev - a.ev);
  const topTeam = { groupId: sorted[0].groupId, ev: sorted[0].ev };
  const bottomTeam = {
    groupId: sorted[sorted.length - 1].groupId,
    ev: sorted[sorted.length - 1].ev,
  };

  const averageTeamEV = totalEVSum / teams.length;

  return { totalEVSum, topTeam, bottomTeam, averageTeamEV };
}
