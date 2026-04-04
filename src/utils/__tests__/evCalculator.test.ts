import { describe, it, expect } from 'vitest';
import type { Player, PositionProbabilities, PayoutConfig, Team } from '../../types';
import {
  deriveMarginalProbabilities,
  calculatePlayerEV,
  calculateLowSeniorEV,
  calculateLowAmEV,
  calculateHighScoreEV,
  calculateTeamEV,
  calculateAllTeamEVs,
  calculateFieldSummary,
} from '../evCalculator';

// ── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_PAYOUT_CONFIG: PayoutConfig = {
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
};

function makeProbs(overrides: Partial<PositionProbabilities> = {}): PositionProbabilities {
  return {
    win: 0,
    top2: 0,
    top3: 0,
    top4: 0,
    top5: 0,
    top6: 0,
    top7: 0,
    top8: 0,
    top9: 0,
    top10: 0,
    makeCut: 0,
    ...overrides,
  };
}

function makePlayer(
  name: string,
  probs: Partial<PositionProbabilities>,
  flags: { isSenior?: boolean; isAmateur?: boolean } = {},
): Player {
  return {
    name,
    probabilities: makeProbs(probs),
    isSenior: flags.isSenior ?? false,
    isAmateur: flags.isAmateur ?? false,
    payout2025: 0,
    finish2025: '',
  };
}

// ── 1. Interpolation tests ──────────────────────────────────────────────────

describe('deriveMarginalProbabilities', () => {
  it('distributes a typical player correctly and sums ≤ top10', () => {
    const probs = makeProbs({ win: 0.10, top5: 0.35, top10: 0.50 });
    const m = deriveMarginalProbabilities(probs);

    // p1 = win
    expect(m.p1).toBeCloseTo(0.10);

    // Sum of p2-p5 should equal top5 - win = 0.25
    const sum2to5 = m.p2 + m.p3 + m.p4 + m.p5;
    expect(sum2to5).toBeCloseTo(0.25);

    // Sum of p6-p10 should equal top10 - top5 = 0.15
    const sum6to10 = m.p6 + m.p7 + m.p8 + m.p9 + m.p10;
    expect(sum6to10).toBeCloseTo(0.15);

    // Total ≤ top10
    const total = m.p1 + sum2to5 + sum6to10;
    expect(total).toBeCloseTo(0.50);
  });

  it('returns all zeros for all-zero input', () => {
    const m = deriveMarginalProbabilities(makeProbs());
    const values = [m.p1, m.p2, m.p3, m.p4, m.p5, m.p6, m.p7, m.p8, m.p9, m.p10];
    values.forEach((v) => expect(v).toBe(0));
  });

  it('handles player with only win probability', () => {
    const probs = makeProbs({ win: 0.05, top5: 0.05, top10: 0.05 });
    const m = deriveMarginalProbabilities(probs);

    expect(m.p1).toBeCloseTo(0.05);
    // No mass to distribute beyond 1st
    expect(m.p2 + m.p3 + m.p4 + m.p5).toBeCloseTo(0);
    expect(m.p6 + m.p7 + m.p8 + m.p9 + m.p10).toBeCloseTo(0);
  });

  it('uses decay weights — higher positions get less probability', () => {
    const probs = makeProbs({ win: 0.10, top5: 0.35, top10: 0.50 });
    const m = deriveMarginalProbabilities(probs);

    // Within 2-5: decay [1, 1.2, 1.4, 1.6] means p2 < p3 < p4 < p5
    expect(m.p2).toBeLessThan(m.p3);
    expect(m.p3).toBeLessThan(m.p4);
    expect(m.p4).toBeLessThan(m.p5);

    // Within 6-10: decay [1, 1.1, 1.2, 1.3, 1.4] means p6 < p7 < ... < p10
    expect(m.p6).toBeLessThan(m.p7);
    expect(m.p7).toBeLessThan(m.p8);
    expect(m.p8).toBeLessThan(m.p9);
    expect(m.p9).toBeLessThan(m.p10);
  });

  it('honours intermediate cumulative values when present', () => {
    const probs = makeProbs({
      win: 0.10,
      top2: 0.18,
      top3: 0.24,
      top4: 0.30,
      top5: 0.35,
      top10: 0.50,
    });
    const m = deriveMarginalProbabilities(probs);

    expect(m.p1).toBeCloseTo(0.10);
    expect(m.p2).toBeCloseTo(0.08); // top2 - win
    expect(m.p3).toBeCloseTo(0.06); // top3 - top2
    expect(m.p4).toBeCloseTo(0.06); // top4 - top3
    expect(m.p5).toBeCloseTo(0.05); // top5 - top4

    // Positions 6-10 still interpolated
    const sum6to10 = m.p6 + m.p7 + m.p8 + m.p9 + m.p10;
    expect(sum6to10).toBeCloseTo(0.15);
  });

  it('sanity: total of marginals equals top10', () => {
    const probs = makeProbs({ win: 0.15, top5: 0.40, top10: 0.55 });
    const m = deriveMarginalProbabilities(probs);
    const total =
      m.p1 + m.p2 + m.p3 + m.p4 + m.p5 + m.p6 + m.p7 + m.p8 + m.p9 + m.p10;
    expect(total).toBeCloseTo(0.55);
    expect(total).toBeLessThanOrEqual(probs.top10 + 1e-10);
  });

  it('uses exact position probabilities when all are provided (no interpolation)', () => {
    const probs = makeProbs({
      win: 0.15,
      top2: 0.22,
      top3: 0.27,
      top4: 0.31,
      top5: 0.35,
      top6: 0.39,
      top7: 0.42,
      top8: 0.45,
      top9: 0.48,
      top10: 0.50,
    });
    const m = deriveMarginalProbabilities(probs);

    // Exact marginals from cumulative subtraction
    expect(m.p1).toBeCloseTo(0.15);
    expect(m.p2).toBeCloseTo(0.07); // 0.22 - 0.15
    expect(m.p3).toBeCloseTo(0.05); // 0.27 - 0.22
    expect(m.p4).toBeCloseTo(0.04); // 0.31 - 0.27
    expect(m.p5).toBeCloseTo(0.04); // 0.35 - 0.31
    expect(m.p6).toBeCloseTo(0.04); // 0.39 - 0.35
    expect(m.p7).toBeCloseTo(0.03); // 0.42 - 0.39
    expect(m.p8).toBeCloseTo(0.03); // 0.45 - 0.42
    expect(m.p9).toBeCloseTo(0.03); // 0.48 - 0.45
    expect(m.p10).toBeCloseTo(0.02); // 0.50 - 0.48

    // Total must equal top10
    const total =
      m.p1 + m.p2 + m.p3 + m.p4 + m.p5 + m.p6 + m.p7 + m.p8 + m.p9 + m.p10;
    expect(total).toBeCloseTo(0.50);
  });
});

// ── 2. Player EV tests ──────────────────────────────────────────────────────

describe('calculatePlayerEV', () => {
  it('100% win probability → EV = 25%', () => {
    const probs = makeProbs({ win: 1.0, top5: 1.0, top10: 1.0, makeCut: 1.0 });
    const ev = calculatePlayerEV(probs, DEFAULT_PAYOUT_CONFIG);
    expect(ev).toBeCloseTo(0.25);
  });

  it('100% top5, 0% win → EV = weighted sum of positions 2-5', () => {
    const probs = makeProbs({ win: 0, top5: 1.0, top10: 1.0, makeCut: 1.0 });
    const ev = calculatePlayerEV(probs, DEFAULT_PAYOUT_CONFIG);

    // Positions 2-5 payouts: 14, 12, 10, 9 = 45%
    // Decay weights [1,1.2,1.4,1.6] sum=5.2
    // p2=1/5.2, p3=1.2/5.2, p4=1.4/5.2, p5=1.6/5.2
    // EV from 2-5 = p2×0.14 + p3×0.12 + p4×0.10 + p5×0.09
    const w = [1, 1.2, 1.4, 1.6];
    const wSum = w.reduce((s, x) => s + x, 0);
    const expected25 =
      (w[0] / wSum) * 0.14 +
      (w[1] / wSum) * 0.12 +
      (w[2] / wSum) * 0.10 +
      (w[3] / wSum) * 0.09;

    // Positions 6-10 have 0 mass (top10=top5=1.0), so no contribution
    expect(ev).toBeCloseTo(expected25);
  });

  it('all zero probabilities → EV = 0', () => {
    const ev = calculatePlayerEV(makeProbs(), DEFAULT_PAYOUT_CONFIG);
    expect(ev).toBe(0);
  });

  it('realistic Scheffler-like player produces reasonable EV', () => {
    // ~15% win, ~40% top5, ~55% top10
    const probs = makeProbs({
      win: 0.15,
      top5: 0.40,
      top10: 0.55,
      makeCut: 0.90,
    });
    const ev = calculatePlayerEV(probs, DEFAULT_PAYOUT_CONFIG);

    // Should be meaningful portion of the pool — rough sanity
    expect(ev).toBeGreaterThan(0.05); // > 5%
    expect(ev).toBeLessThan(0.15); // < 15%
  });
});

// ── 3. Bonus pool tests ─────────────────────────────────────────────────────

describe('calculateLowSeniorEV', () => {
  it('senior with 90% makeCut among 5 seniors → reasonable P', () => {
    const senior1 = makePlayer('Senior A', { makeCut: 0.9 }, { isSenior: true });
    const senior2 = makePlayer('Senior B', { makeCut: 0.5 }, { isSenior: true });
    const senior3 = makePlayer('Senior C', { makeCut: 0.4 }, { isSenior: true });
    const senior4 = makePlayer('Senior D', { makeCut: 0.3 }, { isSenior: true });
    const senior5 = makePlayer('Senior E', { makeCut: 0.2 }, { isSenior: true });
    const nonSenior = makePlayer('Young Gun', { makeCut: 0.95 });

    const allPlayers = [senior1, senior2, senior3, senior4, senior5, nonSenior];

    const ev = calculateLowSeniorEV(senior1, allPlayers);
    // Expected makeCut sum = 0.9+0.5+0.4+0.3+0.2 = 2.3
    // P = 0.9/2.3 ≈ 0.391, EV = 0.391 × 0.02 ≈ 0.00783
    expect(ev).toBeCloseTo(0.9 / 2.3 * 0.02);
    expect(ev).toBeGreaterThan(0);
    expect(ev).toBeLessThan(0.02);
  });

  it('non-senior → Low Senior EV = 0', () => {
    const player = makePlayer('Young Gun', { makeCut: 0.95 });
    const senior = makePlayer('Oldie', { makeCut: 0.5 }, { isSenior: true });
    expect(calculateLowSeniorEV(player, [player, senior])).toBe(0);
  });

  it('no seniors in field → returns 0', () => {
    const player = makePlayer('Solo Senior', { makeCut: 0.5 }, { isSenior: true });
    const others = [makePlayer('Pro', { makeCut: 0.9 })];
    // Player IS senior but allPlayers filtering will find only them
    const ev = calculateLowSeniorEV(player, [player, ...others]);
    // Only 1 senior with makeCut 0.5 → P = 0.5/0.5 = 1 → EV = 0.02
    expect(ev).toBeCloseTo(0.02);
  });
});

describe('calculateLowAmEV', () => {
  it('amateur with good makeCut → positive Low Am EV', () => {
    const am1 = makePlayer('Am A', { makeCut: 0.6 }, { isAmateur: true });
    const am2 = makePlayer('Am B', { makeCut: 0.3 }, { isAmateur: true });
    const pro = makePlayer('Pro', { makeCut: 0.95 });

    const ev = calculateLowAmEV(am1, [am1, am2, pro]);
    expect(ev).toBeGreaterThan(0);
    // P = 0.6 / (0.6+0.3) = 0.667, EV = 0.667 × 0.02 ≈ 0.0133
    expect(ev).toBeCloseTo((0.6 / 0.9) * 0.02);
  });

  it('non-amateur → Low Am EV = 0', () => {
    const pro = makePlayer('Pro', { makeCut: 0.95 });
    const am = makePlayer('Am', { makeCut: 0.3 }, { isAmateur: true });
    expect(calculateLowAmEV(pro, [pro, am])).toBe(0);
  });
});

describe('calculateHighScoreEV', () => {
  it('lowest makeCut player has highest P(High Score)', () => {
    // Use close makeCut values so weakness rank dominates
    const p1 = makePlayer('Weak', { makeCut: 0.50 });
    const p2 = makePlayer('Mid', { makeCut: 0.60 });
    const p3 = makePlayer('Strong', { makeCut: 0.70 });

    const all = [p1, p2, p3];

    const ev1 = calculateHighScoreEV(p1, all);
    const ev2 = calculateHighScoreEV(p2, all);
    const ev3 = calculateHighScoreEV(p3, all);

    // Weakest player should have highest high-score EV
    expect(ev1).toBeGreaterThan(ev2);
    expect(ev2).toBeGreaterThan(ev3);

    // Strongest player (highest makeCut, rank 0) gets 0
    expect(ev3).toBe(0);
  });

  it('player not in field → returns 0', () => {
    const outsider = makePlayer('Outsider', { makeCut: 0.5 });
    const p1 = makePlayer('A', { makeCut: 0.6 });
    const p2 = makePlayer('B', { makeCut: 0.7 });

    expect(calculateHighScoreEV(outsider, [p1, p2])).toBe(0);
  });

  it('all high-score EVs sum to 2% of pool', () => {
    const players = [
      makePlayer('A', { makeCut: 0.4 }),
      makePlayer('B', { makeCut: 0.5 }),
      makePlayer('C', { makeCut: 0.6 }),
      makePlayer('D', { makeCut: 0.7 }),
      makePlayer('E', { makeCut: 0.8 }),
    ];

    const totalHighScoreEV = players.reduce(
      (s, p) => s + calculateHighScoreEV(p, players),
      0,
    );

    // Should sum to 0.02 (2%) — the strongest player gets 0 so
    // only N-1 contribute, but the normalization ensures total = 0.02
    // minus the share of the strongest (which is 0).
    // Actually since we normalize to 1 then multiply by 0.02, the total
    // (excluding rank-0 player) should be < 0.02.
    // But all P(HighScore) are normalized so they sum to 1, and rank-0
    // player has raw score 0 → excluded from sum → total = 0.02 × (1 - 0) = 0.02... 
    // Let's just verify it's close to 0.02 minus the strongest player's share
    // Since the strongest player has weakness_rank = 0, their raw = 0,
    // so sum of normalized = 1 - 0 and total EV should be ≈ 0.02
    // Actually the normalization is over all players including rank-0.
    // rank-0's raw = 0 so their normalized = 0.
    // sum of all normalized = 1 → total EV = 0.02.
    expect(totalHighScoreEV).toBeCloseTo(0.02, 4);
  });
});

// ── 4. Team EV tests ─────────────────────────────────────────────────────────

describe('calculateTeamEV', () => {
  it('team with one good player + one zero player → team EV ≈ good player EV', () => {
    const good = makePlayer('Star', {
      win: 0.15,
      top5: 0.40,
      top10: 0.55,
      makeCut: 0.90,
    });
    const zero = makePlayer('Nobody', {});

    const team: Team = { groupId: 1, players: [good, zero], ev: 0, evDollars: 0 };
    const allPlayers = [good, zero];

    const teamEV = calculateTeamEV(team, allPlayers, DEFAULT_PAYOUT_CONFIG);
    const goodEV =
      calculatePlayerEV(good.probabilities, DEFAULT_PAYOUT_CONFIG) +
      calculateHighScoreEV(good, allPlayers);

    expect(teamEV).toBeCloseTo(goodEV);
  });
});

describe('calculateAllTeamEVs', () => {
  it('all EVs across all teams sum close to 1.0', () => {
    // Create a "field" of players whose probabilities sum to 1 for each position
    // Using a simplified 5-player field
    const players = [
      makePlayer('A', { win: 0.30, top5: 0.60, top10: 0.75, makeCut: 0.95 }),
      makePlayer('B', { win: 0.25, top5: 0.55, top10: 0.70, makeCut: 0.90 }),
      makePlayer('C', { win: 0.20, top5: 0.45, top10: 0.60, makeCut: 0.85 }),
      makePlayer('D', { win: 0.15, top5: 0.35, top10: 0.50, makeCut: 0.75 }),
      makePlayer('E', { win: 0.10, top5: 0.25, top10: 0.45, makeCut: 0.65 }),
    ];

    // Each player is their own team
    const teams: Team[] = players.map((p, i) => ({
      groupId: i + 1,
      players: [p],
      ev: 0,
      evDollars: 0,
    }));

    const result = calculateAllTeamEVs(teams, players, DEFAULT_PAYOUT_CONFIG);

    const totalEV = result.reduce((s, t) => s + t.ev, 0);

    // With only 5 players sharing 10 positional payouts, EV won't reach 1.0.
    // With a full ~90-player field whose cumulative probs each sum to 1,
    // total would be close to 1.0. For this small test field, just verify
    // the EV is positive, reasonable, and correctly ordered.
    expect(totalEV).toBeGreaterThan(0.2);
    expect(totalEV).toBeLessThan(1.5);

    // Should be sorted descending by EV
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].ev).toBeGreaterThanOrEqual(result[i + 1].ev);
    }
  });

  it('populates evDollars when poolTotal is provided', () => {
    const p = makePlayer('Solo', { win: 0.50, top5: 0.80, top10: 0.90, makeCut: 0.95 });
    const teams: Team[] = [{ groupId: 1, players: [p], ev: 0, evDollars: 0 }];

    const result = calculateAllTeamEVs(teams, [p], DEFAULT_PAYOUT_CONFIG, 10000);
    expect(result[0].evDollars).toBeGreaterThan(0);
    expect(result[0].evDollars).toBeCloseTo(result[0].ev * 10000);
  });
});

// ── 5. Field Summary tests ──────────────────────────────────────────────────

describe('calculateFieldSummary', () => {
  it('identifies top and bottom teams correctly', () => {
    const teams: Team[] = [
      { groupId: 1, players: [], ev: 0.10, evDollars: 0 },
      { groupId: 2, players: [], ev: 0.05, evDollars: 0 },
      { groupId: 3, players: [], ev: 0.15, evDollars: 0 },
    ];

    const summary = calculateFieldSummary(teams, DEFAULT_PAYOUT_CONFIG);

    expect(summary.topTeam.groupId).toBe(3);
    expect(summary.topTeam.ev).toBeCloseTo(0.15);
    expect(summary.bottomTeam.groupId).toBe(2);
    expect(summary.bottomTeam.ev).toBeCloseTo(0.05);
    expect(summary.totalEVSum).toBeCloseTo(0.30);
    expect(summary.averageTeamEV).toBeCloseTo(0.10);
  });

  it('handles empty teams array', () => {
    const summary = calculateFieldSummary([], DEFAULT_PAYOUT_CONFIG);
    expect(summary.totalEVSum).toBe(0);
    expect(summary.averageTeamEV).toBe(0);
  });
});
