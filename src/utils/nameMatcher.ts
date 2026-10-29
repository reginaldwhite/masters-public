/**
 * Fuzzy-match parsed team player names to DataGolf API Player objects.
 *
 * Uses fuse.js for fuzzy string matching so that case differences,
 * accent variations, and minor name discrepancies are handled.
 */

import Fuse from 'fuse.js';
import type { Player, Team } from '../types';
import type { ParsedTeam } from './teamParser';
import { payouts2025 } from '../data/historical2025';
import { payouts2024 } from '../data/historical2024';
import { payouts2023 } from '../data/historical2023';

/** Default Fuse.js score threshold — lower is stricter. */
const DEFAULT_MATCH_THRESHOLD = 0.4;

/** Build a zero-probability Player stub for unmatched names. */
function emptyPlayer(name: string): Player {
  return {
    name,
    probabilities: {
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
    },
    isSenior: false,
    isAmateur: false,
    payout2025: 0,
    finish2025: '',
  };
}

/**
 * Match a single name against a Fuse index, returning the best match
 * if its score is below the threshold.
 */
function fuzzyFind<T>(fuse: Fuse<T>, name: string, threshold: number): T | null {
  const results = fuse.search(name);
  if (results.length === 0) return null;
  const best = results[0];
  if (best.score !== undefined && best.score > threshold) return null;
  return best.item;
}

/**
 * Enrich a Player with 2025 historical payout data using fuzzy matching.
 */
function applyHistoricalPayout(player: Player, payoutFuse: Fuse<{ name: string; payout: number; finish: string }>, payout2024Fuse: Fuse<{ name: string; payout: number; finish: string }>, payout2023Fuse: Fuse<{ name: string; payout: number; finish: string }>, threshold: number): void {
  const match2025 = fuzzyFind(payoutFuse, player.name, threshold);
  if (match2025) {
    player.payout2025 = match2025.payout;
    player.finish2025 = match2025.finish;
  }
  const match2024 = fuzzyFind(payout2024Fuse, player.name, threshold);
  if (match2024) {
    player.payout2024 = match2024.payout;
    player.finish2024 = match2024.finish;
  }
  const match2023 = fuzzyFind(payout2023Fuse, player.name, threshold);
  if (match2023) {
    player.payout2023 = match2023.payout;
    player.finish2023 = match2023.finish;
  }
}

/**
 * Convert parsed teams + API players + amateur list into fully-populated Team[].
 */
export function matchPlayersToTeams(
  teams: ParsedTeam[],
  apiPlayers: Player[],
  amateurs: string[],
  threshold = DEFAULT_MATCH_THRESHOLD,
): Team[] {
  // Build Fuse index over API players (search by name)
  const playerFuse = new Fuse(apiPlayers, {
    keys: ['name'],
    threshold,
    includeScore: true,
  });

  // Build Fuse index over amateur names
  const amateurFuse = new Fuse(
    amateurs.map((n) => ({ name: n })),
    { keys: ['name'], threshold, includeScore: true },
  );

  // Build Fuse index over historical payout data
  const payoutEntries = Object.entries(payouts2025).map(([name, data]) => ({
    name,
    payout: data.payout,
    finish: data.finish,
  }));
  const payoutFuse = new Fuse(payoutEntries, {
    keys: ['name'],
    threshold,
    includeScore: true,
  });

  const payout2024Entries = Object.entries(payouts2024).map(([name, data]) => ({
    name,
    payout: data.payout,
    finish: data.finish,
  }));
  const payout2024Fuse = new Fuse(payout2024Entries, {
    keys: ['name'],
    threshold,
    includeScore: true,
  });

  const payout2023Entries = Object.entries(payouts2023).map(([name, data]) => ({
    name,
    payout: data.payout,
    finish: data.finish,
  }));
  const payout2023Fuse = new Fuse(payout2023Entries, {
    keys: ['name'],
    threshold,
    includeScore: true,
  });

  return teams.map((parsed) => {
    const players: Player[] = parsed.playerNames.map((rawName, idx) => {
      const isSenior = parsed.seniorFlags[idx];

      // Try to match against API players
      const apiMatch = fuzzyFind(playerFuse, rawName, threshold);
      const player: Player = apiMatch
        ? { ...apiMatch }
        : emptyPlayer(rawName);

      // Apply senior flag from the parsed data
      player.isSenior = isSenior;

      // Apply amateur flag if name fuzzy-matches the amateurs list
      if (!player.isAmateur) {
        const amMatch = fuzzyFind(amateurFuse, rawName, threshold);
        if (amMatch) {
          player.isAmateur = true;
        }
      }

      // Enrich with historical payout data
      applyHistoricalPayout(player, payoutFuse, payout2024Fuse, payout2023Fuse, threshold);

      return player;
    });

    return {
      groupId: parsed.groupId,
      players,
      ev: 0,
      evDollars: 0,
    };
  });
}
