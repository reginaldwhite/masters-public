import { describe, it, expect } from 'vitest';
import type { Player, PositionProbabilities } from '../../types';
import { calculateFameScore, calculateFamePremiums } from '../fameCalculator';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeProbs(overrides: Partial<PositionProbabilities> = {}): PositionProbabilities {
  return {
    win: 0, top2: 0, top3: 0, top4: 0, top5: 0,
    top6: 0, top7: 0, top8: 0, top9: 0, top10: 0,
    makeCut: 0,
    ...overrides,
  };
}

function makePlayer(name: string): Player {
  return {
    name,
    probabilities: makeProbs(),
    isSenior: false,
    isAmateur: false,
    payout2025: 0,
    finish2025: '',
  };
}

// ── calculateFameScore ───────────────────────────────────────────────────────

describe('calculateFameScore', () => {
  it('returns 3×majorWins + proWins', () => {
    // Tiger: 3×15 + 110 = 155
    expect(calculateFameScore(15, 110)).toBe(155);
  });

  it('returns proWins when majorWins is 0', () => {
    expect(calculateFameScore(0, 7)).toBe(7);
  });

  it('returns 0 when both are 0', () => {
    expect(calculateFameScore(0, 0)).toBe(0);
  });

  it('double-counts majors (3× + included in proWins)', () => {
    // 2 majors, 10 pro wins → 3×2 + 10 = 16
    expect(calculateFameScore(2, 10)).toBe(16);
  });
});

// ── calculateFamePremiums ────────────────────────────────────────────────────

describe('calculateFamePremiums', () => {
  it('gives max-score player a multiplier of 1.30', () => {
    const players = [
      makePlayer('Jack Nicklaus'), // 3×18 + 117 = 171 → max
      makePlayer('Tiger Woods'),   // 3×15 + 110 = 155
      makePlayer('Luke Clanton'),  // 0 wins → 0
    ];

    const premiums = calculateFamePremiums(players);
    const nicklaus = premiums.find((p) => p.playerName === 'Jack Nicklaus')!;
    expect(nicklaus.multiplier).toBeCloseTo(1.30);
  });

  it('gives 0-score player a multiplier of 1.00', () => {
    const players = [
      makePlayer('Jack Nicklaus'),
      makePlayer('Luke Clanton'), // 0 wins
    ];

    const premiums = calculateFamePremiums(players);
    const clanton = premiums.find((p) => p.playerName === 'Luke Clanton')!;
    expect(clanton.multiplier).toBe(1.0);
  });

  it('gives middle player a proportional multiplier', () => {
    const players = [
      makePlayer('Jack Nicklaus'), // score = 171 → max
      makePlayer('Tiger Woods'),   // score = 155
      makePlayer('Luke Clanton'),  // score = 0
    ];

    const premiums = calculateFamePremiums(players);
    const tiger = premiums.find((p) => p.playerName === 'Tiger Woods')!;
    // 1 + (155 / 171) × 0.30 ≈ 1.2719
    expect(tiger.multiplier).toBeCloseTo(1 + (155 / 171) * 0.3);
  });

  it('gives multiplier 1.00 to players not in careerWinsData', () => {
    const players = [
      makePlayer('Jack Nicklaus'),
      makePlayer('Unknown Player'),
    ];

    const premiums = calculateFamePremiums(players);
    const unknown = premiums.find((p) => p.playerName === 'Unknown Player')!;
    expect(unknown.multiplier).toBe(1.0);
  });

  it('is case-insensitive for player name matching', () => {
    const players = [
      makePlayer('tiger woods'),
    ];

    const premiums = calculateFamePremiums(players);
    expect(premiums[0].multiplier).toBeGreaterThan(1.0);
  });

  it('returns correct number of premiums', () => {
    const players = [
      makePlayer('Rory McIlroy'),
      makePlayer('Jordan Spieth'),
      makePlayer('Scottie Scheffler'),
    ];

    const premiums = calculateFamePremiums(players);
    expect(premiums).toHaveLength(3);
  });

  it('handles empty player list', () => {
    const premiums = calculateFamePremiums([]);
    expect(premiums).toEqual([]);
  });

  it('handles single player with wins', () => {
    const players = [makePlayer('Rory McIlroy')]; // score = 3×4 + 40 = 52
    const premiums = calculateFamePremiums(players);
    // Single player is the max → 1.30
    expect(premiums[0].multiplier).toBeCloseTo(1.30);
  });
});
