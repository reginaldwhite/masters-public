import type { FamePremium } from '../types';

/**
 * Parse fame premium input text.
 * Accepts format (one per line):
 *   Tiger Woods: 1.25
 *   Phil Mickelson: 1.15
 *
 * Trims whitespace, skips empty lines and lines without a colon.
 * Default multiplier = 1.0 if a player is not in the list.
 */
export function parseFamePremiums(text: string): FamePremium[] {
  const results: FamePremium[] = [];

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const playerName = line.slice(0, colonIdx).trim();
    const multiplierStr = line.slice(colonIdx + 1).trim();
    const multiplier = parseFloat(multiplierStr);

    if (!playerName || isNaN(multiplier)) continue;

    results.push({ playerName, multiplier });
  }

  return results;
}
