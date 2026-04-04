import { describe, it, expect } from 'vitest';
import type { Team, FamePremium, Player, PositionProbabilities } from '../../types';
import {
  getTeamFamePremium,
  getAuctionPositionFactor,
  calculateExpectedPrice,
} from '../priceCalculator';

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

function makeTeam(groupId: number, playerNames: string[]): Team {
  return {
    groupId,
    players: playerNames.map(makePlayer),
    ev: 0.05,
    evDollars: 500,
  };
}

// ── Team Fame Premium ────────────────────────────────────────────────────────

describe('getTeamFamePremium', () => {
  const premiums: FamePremium[] = [
    { playerName: 'Tiger Woods', multiplier: 1.25 },
    { playerName: 'Rory McIlroy', multiplier: 1.20 },
  ];

  it('picks max premium among team players', () => {
    const team = makeTeam(1, ['Tiger Woods', 'Phil Mickelson']);
    expect(getTeamFamePremium(team, premiums)).toBe(1.25);
  });

  it('defaults to 1.0 when no players have premiums', () => {
    const team = makeTeam(2, ['Jordan Spieth', 'Justin Thomas']);
    expect(getTeamFamePremium(team, premiums)).toBe(1.0);
  });

  it('defaults to 1.0 when premiums list is empty', () => {
    const team = makeTeam(3, ['Tiger Woods']);
    expect(getTeamFamePremium(team, [])).toBe(1.0);
  });

  it('is case-insensitive', () => {
    const team = makeTeam(4, ['tiger woods']);
    expect(getTeamFamePremium(team, premiums)).toBe(1.25);
  });

  it('returns highest when multiple players have premiums', () => {
    const team = makeTeam(5, ['Tiger Woods', 'Rory McIlroy']);
    expect(getTeamFamePremium(team, premiums)).toBe(1.25);
  });
});

// ── Auction Position Factor ──────────────────────────────────────────────────

describe('getAuctionPositionFactor', () => {
  it('returns 1.0 when 0 teams sold', () => {
    expect(getAuctionPositionFactor(0, 20)).toBe(1.0);
  });

  it('returns ~1.175 when half the teams are sold', () => {
    expect(getAuctionPositionFactor(10, 20)).toBeCloseTo(1.175);
  });

  it('returns 1.35 when all teams are sold', () => {
    expect(getAuctionPositionFactor(20, 20)).toBeCloseTo(1.35);
  });

  it('returns 1.0 when totalTeams is 0', () => {
    expect(getAuctionPositionFactor(0, 0)).toBe(1.0);
  });

  it('scales linearly', () => {
    // 5 out of 20 → 1 + (5/20)*0.35 = 1.0875
    expect(getAuctionPositionFactor(5, 20)).toBeCloseTo(1.0875);
  });
});

// ── Expected Price Calculation ───────────────────────────────────────────────

describe('calculateExpectedPrice', () => {
  it('multiplies correctly with all factors', () => {
    // $1000 × 1.2 × 1.1 = $1320
    expect(calculateExpectedPrice(1000, 1.2, 1.1)).toBeCloseTo(1320);
  });

  it('returns teamEVDollars when both factors are 1.0', () => {
    expect(calculateExpectedPrice(500, 1.0, 1.0)).toBe(500);
  });

  it('returns 0 when EV is 0', () => {
    expect(calculateExpectedPrice(0, 1.25, 1.35)).toBe(0);
  });

  it('applies fame premium only', () => {
    expect(calculateExpectedPrice(1000, 1.25, 1.0)).toBeCloseTo(1250);
  });

  it('applies position factor only', () => {
    expect(calculateExpectedPrice(1000, 1.0, 1.35)).toBeCloseTo(1350);
  });
});
