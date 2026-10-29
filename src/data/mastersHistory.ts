// Historical Masters Tournament top-10 results for Calcutta field players.
// Sources: Wikipedia (2021–2025), 2026 Calcutta results sheet.
// Only top-10 finishes are tracked (our Calcutta payout range).

export interface MastersYearResult {
  finish: number; // 1-10 (position they finished in; ties use the T position number)
  score: number;  // total strokes relative to par (e.g. -10)
}

export interface MastersPlayerHistory {
  y2021?: MastersYearResult;
  y2022?: MastersYearResult;
  y2023?: MastersYearResult;
  y2024?: MastersYearResult;
  y2025?: MastersYearResult;
  y2026?: MastersYearResult;
}

/**
 * Map of player name (matching baseline2026.ts) → Masters top-10 finishes.
 * Players not in this map, or years without an entry, had no top-10 finish that year.
 */
export const MASTERS_HISTORY: Record<string, MastersPlayerHistory> = {
  // ── Elite tier: multiple top-10s ──────────────────────────────────────────

  'Scottie Scheffler': {
    // 2021: played, outside top 10
    y2022: { finish: 1, score: -10 },
    y2023: { finish: 10, score: -4 },
    y2024: { finish: 1, score: -11 },
    y2025: { finish: 4, score: -8 },
    y2026: { finish: 2, score: -11 },
  },

  'Xander Schauffele': {
    y2021: { finish: 3, score: -7 },
    // 2022: MC
    y2023: { finish: 10, score: -4 },
    y2024: { finish: 8, score: -1 },
    y2025: { finish: 8, score: -5 },
    y2026: { finish: 9, score: -8 },
  },

  'Patrick Reed': {
    y2021: { finish: 8, score: -4 },
    // 2022: played, outside top 10
    y2023: { finish: 4, score: -7 },
    // 2024: played, outside top 10
    y2025: { finish: 3, score: -9 },
    // 2026: played, outside top 10
  },

  'Collin Morikawa': {
    // 2021: played, outside top 10
    y2022: { finish: 5, score: -4 },
    y2023: { finish: 10, score: -4 },
    y2024: { finish: 3, score: -4 },
    y2026: { finish: 7, score: -9 },
  },

  'Corey Conners': {
    y2021: { finish: 8, score: -4 },
    y2022: { finish: 6, score: -3 },
    // 2023: played, outside top 10
    // 2024: played, outside top 10
    y2025: { finish: 8, score: -5 },
    // 2026: played, outside top 10
  },

  'Cameron Young': {
    // 2022: played, outside top 10
    y2023: { finish: 7, score: -6 },
    y2024: { finish: 9, score: 0 },
    y2026: { finish: 3, score: -10 },
  },

  'Jordan Spieth': {
    y2021: { finish: 3, score: -7 },
    // 2022: MC
    y2023: { finish: 4, score: -7 },
  },

  // ── Strong tier: 1-2 top-10s ──────────────────────────────────────────────

  'Rory McIlroy': {
    // 2021: MC
    y2022: { finish: 2, score: -7 },
    // 2023: MC
    // 2024: played, outside top 10
    y2025: { finish: 1, score: -11 },
    y2026: { finish: 1, score: -12 },
  },

  'Jon Rahm': {
    y2021: { finish: 5, score: -6 },
    // 2022: played, outside top 10
    y2023: { finish: 1, score: -12 },
    // 2024: played, outside top 10
    // 2025: played, outside top 10
  },

  'Justin Rose': {
    y2021: { finish: 7, score: -5 },
    // 2022: played, outside top 10
    // 2023: played, outside top 10
    // 2024: played, outside top 10
    y2025: { finish: 2, score: -11 },
    y2026: { finish: 3, score: -10 },
  },

  'Bryson DeChambeau': {
    // 2021: played, outside top 10
    // 2022: MC
    // 2023: played, outside top 10
    y2024: { finish: 6, score: -2 },
    y2025: { finish: 5, score: -7 },
    // 2026: played, outside top 10
  },

  'Ludvig Aberg': {
    y2024: { finish: 2, score: -7 },
    y2025: { finish: 7, score: -6 },
  },

  'Brooks Koepka': {
    // 2021: played, outside top 10
    // 2022: MC
    y2023: { finish: 2, score: -8 },
    // 2024: played, outside top 10
    // 2025: MC
  },

  'Shane Lowry': {
    // 2021: played, outside top 10
    y2022: { finish: 3, score: -5 },
    // 2023: played, outside top 10
    // 2024: played, outside top 10
    // 2025: played, outside top 10
  },

  'Cameron Smith': {
    y2021: { finish: 10, score: -3 },
    y2022: { finish: 3, score: -5 },
    // 2023: played, outside top 10
    y2024: { finish: 6, score: -2 },
  },

  'Sungjae Im': {
    // 2021: MC
    y2022: { finish: 8, score: -1 },
    // 2023: played, outside top 10
    // 2024: played, outside top 10
    y2025: { finish: 5, score: -7 },
  },

  'Tommy Fleetwood': {
    // 2021: played, outside top 10
    // 2022: played, outside top 10
    // 2023: played, outside top 10
    y2024: { finish: 3, score: -4 },
    // 2025: played, outside top 10
  },

  'Russell Henley': {
    // 2022: played, outside top 10
    y2023: { finish: 4, score: -7 },
    // 2024: played, outside top 10
    // 2025: played, outside top 10
    y2026: { finish: 3, score: -10 },
  },

  'Viktor Hovland': {
    // 2021: played, outside top 10
    // 2022: played, outside top 10
    y2023: { finish: 7, score: -6 },
    // 2024: MC
    // 2025: played, outside top 10
  },

  'Justin Thomas': {
    // 2021: played, outside top 10
    y2022: { finish: 8, score: -1 },
    // 2023: played, outside top 10
    // 2024: MC
    // 2025: not in field
  },

  'Hideki Matsuyama': {
    y2021: { finish: 1, score: -10 },
    // 2022: played, outside top 10
    // 2023: played, outside top 10
    // 2024: played, outside top 10
    // 2025: played, outside top 10
  },

  'Tyrrell Hatton': {
    // 2021: played, outside top 10
    // 2022: played, outside top 10
    // 2023: played, outside top 10
    y2024: { finish: 9, score: 0 },
    // 2025: played, outside top 10
    y2026: { finish: 3, score: -10 },
  },

  'Matt Fitzpatrick': {
    // 2021: played, outside top 10
    // 2022: played, outside top 10
    y2023: { finish: 10, score: -4 },
    // 2024: played, outside top 10
    // 2025: not in field
  },

  'Max Homa': {
    // 2021: played, outside top 10
    // 2022: played, outside top 10
    // 2023: played, outside top 10
    y2024: { finish: 3, score: -4 },
    // 2025: played, outside top 10
    y2026: { finish: 9, score: -8 },
  },

  'Jason Day': {
    // 2021: played, outside top 10
    // 2022: played, outside top 10
    // 2023: played, outside top 10
    // 2024: played, outside top 10
    y2025: { finish: 8, score: -5 },
  },

  'Charl Schwartzel': {
    // 2021: played, outside top 10
    y2022: { finish: 10, score: 0 },
  },

  'Zach Johnson': {
    // Past champion, played in all 5 years but mostly outside top 10
    y2025: { finish: 8, score: -5 },
  },

  'Keegan Bradley': {
    // Played in 2023-2025, no top-10 finishes from my data
    // but was in the field
  },

  'Sam Burns': {
    y2026: { finish: 7, score: -9 },
  },

  'Adam Scott': {
    // Played in all 5 years, no top-10 finishes from my data
  },
};

// ── Scoring ──────────────────────────────────────────────────────────────────

/** Points awarded for each finish position (weighted toward wins). */
const FINISH_POINTS: Record<number, number> = {
  1: 10,
  2: 8,
  3: 7,
  4: 6,
  5: 5,
  6: 4,
  7: 3,
  8: 2,
  9: 1.5,
  10: 1,
};

/** Recency weights: most recent year gets highest weight. */
const YEAR_WEIGHTS: Record<string, number> = {
  y2026: 6,
  y2025: 5,
  y2024: 4,
  y2023: 3,
  y2022: 2,
  y2021: 1,
};

/**
 * Calculate a normalized Masters history score for a player (0 to 1).
 * 0 = no notable Augusta history, 1 = perfect (all wins, recency-weighted).
 */
export function getMastersHistoryScore(playerName: string): number {
  const history = MASTERS_HISTORY[playerName];
  if (!history) return 0;

  const years = ['y2021', 'y2022', 'y2023', 'y2024', 'y2025', 'y2026'] as const;

  let weightedScore = 0;
  let totalWeight = 0;

  for (const year of years) {
    const weight = YEAR_WEIGHTS[year];
    const result = history[year];

    if (result && result.finish >= 1 && result.finish <= 10) {
      const points = FINISH_POINTS[result.finish] ?? 0;
      weightedScore += points * weight;
    }
    totalWeight += weight;
  }

  // Max possible: 10 points × every year weight = 10 × (6+5+4+3+2+1) = 210
  const maxScore = 10 * totalWeight;
  return maxScore > 0 ? weightedScore / maxScore : 0;
}
