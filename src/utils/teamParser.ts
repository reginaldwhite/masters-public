/**
 * Parse pasted team/group data into structured team objects.
 *
 * Handles:
 *  - "Group N" headers (case-insensitive) with optional dollar amounts
 *  - Player names with optional `*` senior flag
 *  - Owner lines like "S. Miles - 2255" (skipped)
 *  - Blank lines between groups
 *  - Multi-column paste where groups from different columns are interleaved
 */

export interface ParsedTeam {
  groupId: number;
  playerNames: string[];   // cleaned names without *
  seniorFlags: boolean[];   // corresponding senior flags
  priorYearPrice?: number;  // dollar amount if present
}

// Matches "Group N" with an optional dollar amount, e.g. "Group 1 $1,850"
const GROUP_HEADER_RE = /^group\s+(\d+)\s*(?:\$\s*([\d,]+))?/i;

// Owner line pattern: "Name - digits"  e.g. "S. Miles - 2255"
const OWNER_LINE_RE = /\s-\s+\d+\s*$/;

// Line that is ONLY a dollar amount like "$1,850"
const DOLLAR_ONLY_RE = /^\$[\d,]+$/;

export function parseTeamData(text: string): ParsedTeam[] {
  const lines = text.split('\n');

  const teamsMap = new Map<number, ParsedTeam>();
  let currentTeam: ParsedTeam | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip empty lines
    if (line === '') continue;

    // Check for group header
    const headerMatch = line.match(GROUP_HEADER_RE);
    if (headerMatch) {
      const groupId = parseInt(headerMatch[1], 10);
      const priceStr = headerMatch[2];
      const priorYearPrice = priceStr
        ? parseInt(priceStr.replace(/,/g, ''), 10)
        : undefined;

      // If we already saw this group id (multi-column paste), reuse it
      if (teamsMap.has(groupId)) {
        currentTeam = teamsMap.get(groupId)!;
        // Update price if we didn't have one before
        if (priorYearPrice !== undefined && currentTeam.priorYearPrice === undefined) {
          currentTeam.priorYearPrice = priorYearPrice;
        }
      } else {
        currentTeam = {
          groupId,
          playerNames: [],
          seniorFlags: [],
          priorYearPrice,
        };
        teamsMap.set(groupId, currentTeam);
      }
      continue;
    }

    // If no current team context, skip the line
    if (!currentTeam) continue;

    // Skip owner lines (e.g. "S. Miles - 2255")
    if (OWNER_LINE_RE.test(line)) continue;

    // Skip standalone dollar amounts
    if (DOLLAR_ONLY_RE.test(line)) continue;

    // Otherwise, treat as a player name
    const isSenior = line.endsWith('*');
    const playerName = isSenior ? line.slice(0, -1).trim() : line;

    if (playerName.length > 0) {
      currentTeam.playerNames.push(playerName);
      currentTeam.seniorFlags.push(isSenior);
    }
  }

  // Return sorted by groupId
  return Array.from(teamsMap.values()).sort((a, b) => a.groupId - b.groupId);
}
