import { describe, it, expect } from 'vitest';
import type { Player, PositionProbabilities } from '../../types';
import {
  FAME_RANK_CUTOFF,
  calculateFameMultiplier,
  calculateFamePremiums,
} from '../fameCalculator';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeProbs(overrides: Partial<PositionProbabilities> = {}): PositionProbabilities {
  return {
    win: 0, top2: 0, top3: 0, top4: 0, top5: 0,
    top6: 0, top7: 0, top8: 0, top9: 0, top10: 0,
    makeCut: 0,
    ...overrides,
  };
}

function makePlayer(name: string, dgRank?: number): Player {
  return {
    name,
    dgRank,
    probabilities: makeProbs(),
    isSenior: false,
    isAmateur: false,
    payout2025: 0,
    finish2025: '',
  };
}

// ── calculateFameMultiplier ───────────────────────────────────────────────────

describe('calculateFameMultiplier', () => {
  it('rank 1 → 1.15 (max premium)', () => {
    expect(calculateFameMultiplier(1)).toBeCloseTo(1.15);
  });

  it(`rank ${FAME_RANK_CUTOFF} → 1.00 (no premium)`, () => {
    expect(calculateFameMultiplier(FAME_RANK_CUTOFF)).toBe(1.0);
  });

  it('rank above cutoff → 1.00', () => {
    expect(calculateFameMultiplier(FAME_RANK_CUTOFF + 1)).toBe(1.0);
    expect(calculateFameMultiplier(200)).toBe(1.0);
  });

  it('undefined rank → 1.00', () => {
    expect(calculateFameMultiplier(undefined)).toBe(1.0);
  });

  it('middle rank is proportional', () => {
    // rank 25 with cutoff 50: 1 + (50-25)/(50-1) * 0.15
    const expected = 1 + ((FAME_RANK_CUTOFF - 25) / (FAME_RANK_CUTOFF - 1)) * 0.15;
    expect(calculateFameMultiplier(25)).toBeCloseTo(expected);
  });

  it('multiplier is always in range [1.00, 1.15]', () => {
    for (const rank of [1, 5, 10, 25, 49, 50, 51, 100]) {
      const m = calculateFameMultiplier(rank);
      expect(m).toBeGreaterThanOrEqual(1.0);
      expect(m).toBeLessThanOrEqual(1.15 + 1e-9);
    }
  });
});

// ── calculateFamePremiums ────────────────────────────────────────────────────

describe('calculateFamePremiums', () => {
  it('rank-1 player gets multiplier 1.15', () => {
    const players = [makePlayer('Scottie Scheffler', 1), makePlayer('Field Player', 60)];
    const premiums = calculateFamePremiums(players);
    const scheffler = premiums.find((p) => p.playerName === 'Scottie Scheffler')!;
    expect(scheffler.multiplier).toBeCloseTo(1.15);
  });

  it('player ranked at cutoff gets 1.00', () => {
    const players = [makePlayer('Bubba Watson', FAME_RANK_CUTOFF)];
    const premiums = calculateFamePremiums(players);
    expect(premiums[0].multiplier).toBe(1.0);
  });

  it('player with no rank gets 1.00', () => {
    const players = [makePlayer('Unknown Qualifier')];
    const premiums = calculateFamePremiums(players);
    expect(premiums[0].multiplier).toBe(1.0);
  });

  it('returns correct multiplier for a mid-ranked player', () => {
    const players = [makePlayer('Rory McIlroy', 2)];
    const expected = 1 + ((FAME_RANK_CUTOFF - 2) / (FAME_RANK_CUTOFF - 1)) * 0.15;
    expect(calculateFamePremiums(players)[0].multiplier).toBeCloseTo(expected);
  });

  it('returns correct number of premiums', () => {
    const players = [
      makePlayer('Scheffler', 1),
      makePlayer('McIlroy', 2),
      makePlayer('Spieth', 15),
    ];
    expect(calculateFamePremiums(players)).toHaveLength(3);
  });

  it('handles empty player list', () => {
    expect(calculateFamePremiums([])).toEqual([]);
  });

  it('multipliers are independent — no normalization across the field', () => {
    // Unlike the old wins-based approach, each player's premium depends only
    // on their own rank, not on who else is in the field.
    const fieldA = [makePlayer('A', 5)];
    const fieldB = [makePlayer('A', 5), makePlayer('B', 1), makePlayer('C', 1)];
    const mA = calculateFamePremiums(fieldA)[0].multiplier;
    const mB = calculateFamePremiums(fieldB).find((p) => p.playerName === 'A')!.multiplier;
    expect(mA).toBeCloseTo(mB);
  });
});
