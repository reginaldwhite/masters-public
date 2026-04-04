import { describe, it, expect } from 'vitest';
import type { Player, PositionProbabilities } from '../../types';
import {
  calculateCourseFitScore,
  calculateCourseFits,
  AUGUSTA_WEIGHTS,
} from '../courseFitCalculator';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeProbs(overrides: Partial<PositionProbabilities> = {}): PositionProbabilities {
  return {
    win: 0, top2: 0, top3: 0, top4: 0, top5: 0,
    top6: 0, top7: 0, top8: 0, top9: 0, top10: 0,
    makeCut: 0,
    ...overrides,
  };
}

function makePlayer(
  name: string,
  sg?: { sgOtt?: number; sgApp?: number; sgAtg?: number; sgPutt?: number },
): Player {
  return {
    name,
    probabilities: makeProbs(),
    isSenior: false,
    isAmateur: false,
    payout2025: 0,
    finish2025: '',
    ...sg,
  };
}

// ── AUGUSTA_WEIGHTS sanity check ─────────────────────────────────────────────

describe('AUGUSTA_WEIGHTS', () => {
  it('weights sum to 1.00', () => {
    const sum = AUGUSTA_WEIGHTS.ott + AUGUSTA_WEIGHTS.app + AUGUSTA_WEIGHTS.atg + AUGUSTA_WEIGHTS.putt;
    expect(sum).toBeCloseTo(1.0);
  });
});

// ── calculateCourseFitScore ───────────────────────────────────────────────────

describe('calculateCourseFitScore', () => {
  it("produces correct weighted sum for Scheffler's real SG values", () => {
    // sgOtt=0.708, sgApp=0.899, sgAtg=0.396, sgPutt=0.568
    // 0.708*0.15 + 0.899*0.35 + 0.396*0.35 + 0.568*0.15
    // = 0.1062 + 0.31465 + 0.1386 + 0.0852
    // = 0.64465
    const result = calculateCourseFitScore(0.708, 0.899, 0.396, 0.568);
    expect(result).toBeCloseTo(0.64465, 5);
  });

  it('returns 0 when all values are undefined', () => {
    expect(calculateCourseFitScore(undefined, undefined, undefined, undefined)).toBe(0);
  });

  it('returns 0 when all values are 0', () => {
    expect(calculateCourseFitScore(0, 0, 0, 0)).toBe(0);
  });

  it('handles partial undefined values (only sgApp defined)', () => {
    // only app: 1.0 * 0.35 = 0.35
    expect(calculateCourseFitScore(undefined, 1.0, undefined, undefined)).toBeCloseTo(0.35);
  });

  it('handles negative SG values (below tour average)', () => {
    // negative contributions are valid
    const result = calculateCourseFitScore(-1.0, -1.0, -1.0, -1.0);
    expect(result).toBeCloseTo(-1.0);
  });
});

// ── calculateCourseFits ───────────────────────────────────────────────────────

describe('calculateCourseFits', () => {
  it('returns an empty array for an empty player list', () => {
    expect(calculateCourseFits([])).toEqual([]);
  });

  it('player with no SG data gets exactly 1.00', () => {
    const players = [
      makePlayer('Scottie Scheffler', { sgOtt: 0.708, sgApp: 0.899, sgAtg: 0.396, sgPutt: 0.568 }),
      makePlayer('No Data Player'), // no SG fields
    ];
    const fits = calculateCourseFits(players);
    const noData = fits.find((f) => f.playerName === 'No Data Player')!;
    expect(noData.multiplier).toBe(1.0);
  });

  it('best player (highest weighted score) gets exactly 1.30', () => {
    const players = [
      makePlayer('Scottie Scheffler', { sgOtt: 0.708, sgApp: 0.899, sgAtg: 0.396, sgPutt: 0.568 }),
      makePlayer('Rory McIlroy',       { sgOtt: 0.5,   sgApp: 0.6,   sgAtg: 0.2,   sgPutt: 0.3 }),
      makePlayer('Ludvig Åberg',       { sgOtt: 0.3,   sgApp: 0.4,   sgAtg: 0.1,   sgPutt: 0.1 }),
    ];
    const fits = calculateCourseFits(players);
    const best = fits.find((f) => f.playerName === 'Scottie Scheffler')!;
    expect(best.multiplier).toBeCloseTo(1.30);
  });

  it('all multipliers are in the range [1.00, 1.30]', () => {
    const players = [
      makePlayer('Scottie Scheffler', { sgOtt: 0.708, sgApp: 0.899, sgAtg: 0.396, sgPutt: 0.568 }),
      makePlayer('Rory McIlroy',       { sgOtt: 0.5,   sgApp: 0.6,   sgAtg: 0.2,   sgPutt: 0.3 }),
      makePlayer('No Data Player'),
    ];
    const fits = calculateCourseFits(players);
    for (const fit of fits) {
      expect(fit.multiplier).toBeGreaterThanOrEqual(1.0);
      expect(fit.multiplier).toBeLessThanOrEqual(1.30 + 1e-9); // small epsilon for float
    }
  });

  it('second-best player gets a multiplier strictly less than 1.30', () => {
    const players = [
      makePlayer('Player A', { sgOtt: 1.0, sgApp: 1.0, sgAtg: 1.0, sgPutt: 1.0 }),
      makePlayer('Player B', { sgOtt: 0.5, sgApp: 0.5, sgAtg: 0.5, sgPutt: 0.5 }),
    ];
    const fits = calculateCourseFits(players);
    const second = fits.find((f) => f.playerName === 'Player B')!;
    expect(second.multiplier).toBeLessThan(1.30);
    expect(second.multiplier).toBeGreaterThan(1.0);
  });

  it('field with only one player with SG data: that player gets 1.30', () => {
    const players = [
      makePlayer('Solo Data', { sgOtt: 0.5, sgApp: 0.8, sgAtg: 0.6, sgPutt: 0.4 }),
      makePlayer('Ghost A'),
      makePlayer('Ghost B'),
    ];
    const fits = calculateCourseFits(players);
    const solo = fits.find((f) => f.playerName === 'Solo Data')!;
    expect(solo.multiplier).toBeCloseTo(1.30);
  });

  it('result contains an entry for every input player', () => {
    const players = [
      makePlayer('Alpha', { sgOtt: 0.3, sgApp: 0.5, sgAtg: 0.4, sgPutt: 0.2 }),
      makePlayer('Beta'),
      makePlayer('Gamma', { sgOtt: 0.1, sgApp: 0.2, sgAtg: 0.1, sgPutt: 0.1 }),
    ];
    const fits = calculateCourseFits(players);
    expect(fits).toHaveLength(3);
    expect(fits.map((f) => f.playerName)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('normalization: multiplier matches formula 1 + (score/maxScore)*0.3', () => {
    const players = [
      makePlayer('High', { sgOtt: 1.0, sgApp: 1.0, sgAtg: 1.0, sgPutt: 1.0 }),
      makePlayer('Low',  { sgOtt: 0.5, sgApp: 0.5, sgAtg: 0.5, sgPutt: 0.5 }),
    ];
    const fits = calculateCourseFits(players);
    // High score = 1.0 (max), multiplier = 1.30
    // Low score = 0.5, maxScore = 1.0 → multiplier = 1 + (0.5/1.0)*0.3 = 1.15
    const low = fits.find((f) => f.playerName === 'Low')!;
    expect(low.multiplier).toBeCloseTo(1.15);
  });
});
