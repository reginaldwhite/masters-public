import type { Team, FamePremium } from '../types';

/**
 * Get the fame premium for a team.
 * Returns the MAX premium among the team's players.
 * Players not in the famePremiums list default to 1.0.
 */
export function getTeamFamePremium(
  team: Team,
  famePremiums: FamePremium[],
): number {
  if (famePremiums.length === 0) return 1.0;

  let maxPremium = 1.0;

  for (const player of team.players) {
    const entry = famePremiums.find(
      (fp) => fp.playerName.toLowerCase() === player.name.toLowerCase(),
    );
    if (entry && entry.multiplier > maxPremium) {
      maxPremium = entry.multiplier;
    }
  }

  return maxPremium;
}

/**
 * Calculate auction position factor.
 * As supply dwindles, prices tend to rise ~35% over the auction.
 *
 * Formula: 1 + (teamsSold / totalTeams) × 0.35
 */
export function getAuctionPositionFactor(
  teamsSold: number,
  totalTeams: number,
): number {
  if (totalTeams <= 0) return 1.0;
  return 1 + (teamsSold / totalTeams) * 0.35;
}

/**
 * Calculate the expected auction price (what it will likely sell for).
 *
 * Formula: teamEVDollars × famePremium × positionFactor
 */
export function calculateExpectedPrice(
  teamEVDollars: number,
  famePremium: number,
  positionFactor: number,
): number {
  return teamEVDollars * famePremium * positionFactor;
}
