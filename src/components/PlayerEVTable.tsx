import { useState, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { payoutConfigAtom } from '../atoms';
import { calculatePlayerEV } from '../utils/evCalculator';
import { calculateFamePremiums } from '../utils/fameCalculator';
import { calculateCourseFits } from '../utils/courseFitCalculator';
import { careerWinsData } from '../data/careerWins';
import type { Player } from '../types';

interface PlayerEVTableProps {
  players: Player[];
}

interface PlayerEVRow {
  name: string;
  winPct: number | null;   // null = predictions not yet available
  ev: number | null;
  fame: number;
  fit: number;
  hasPrediction: boolean;
}

export default function PlayerEVTable({ players }: PlayerEVTableProps) {
  const payoutConfig = useAtomValue(payoutConfigAtom);
  const [search, setSearch] = useState('');

  const rows: PlayerEVRow[] = useMemo(() => {
    // Build a lookup from the API predictions (may be a different event right now)
    const apiMap = new Map(players.map((p) => [p.name.toLowerCase(), p]));

    // Use careerWins as the canonical expected Masters field
    const fieldNames = careerWinsData.map((cw) => cw.playerName);

    // Also include any API players not in our expected list (e.g. late additions)
    const extraApiNames = players
      .filter((p) => !careerWinsData.some(
        (cw) => cw.playerName.toLowerCase() === p.name.toLowerCase()
      ))
      .map((p) => p.name);

    const allNames = [...fieldNames, ...extraApiNames];

    // Build a synthetic Player[] for fame/fit calculations using API data where
    // available, falling back to a stub for expected-but-not-yet-predicted players
    const mergedPlayers: Player[] = allNames.map((name) => {
      const api = apiMap.get(name.toLowerCase());
      if (api) return api;
      return {
        name,
        probabilities: { win: 0, top2: 0, top3: 0, top4: 0, top5: 0, top6: 0, top7: 0, top8: 0, top9: 0, top10: 0, makeCut: 0 },
        isSenior: false,
        isAmateur: false,
        payout2025: 0,
        finish2025: '',
      };
    });

    const premiums = calculateFamePremiums(mergedPlayers);
    const premiumMap = new Map(premiums.map((fp) => [fp.playerName.toLowerCase(), fp.multiplier]));
    const fits = calculateCourseFits(mergedPlayers);
    const fitMap = new Map(fits.map((cf) => [cf.playerName.toLowerCase(), cf.multiplier]));

    return allNames
      .map((name) => {
        const api = apiMap.get(name.toLowerCase());
        const hasPrediction = !!api;
        return {
          name,
          winPct: hasPrediction ? api!.probabilities.win : null,
          ev: hasPrediction ? calculatePlayerEV(api!.probabilities, payoutConfig) : null,
          fame: premiumMap.get(name.toLowerCase()) ?? 1.0,
          fit: fitMap.get(name.toLowerCase()) ?? 1.0,
          hasPrediction,
        };
      })
      // Players with predictions sort by EV desc; unpredicted players go to bottom alpha
      .sort((a, b) => {
        if (a.hasPrediction && b.hasPrediction) return (b.ev ?? 0) - (a.ev ?? 0);
        if (a.hasPrediction) return -1;
        if (b.hasPrediction) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [players, payoutConfig]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <div>
      <input
        type="text"
        placeholder="Search players..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm
                   focus:outline-none focus:ring-2 focus:ring-[#006747]/40 focus:border-[#006747]
                   min-h-[48px] mb-3"
      />

      <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#006747] text-white">
            <tr>
              <th className="text-left px-3 py-2 font-semibold w-10">#</th>
              <th className="text-left px-3 py-2 font-semibold">Player</th>
              <th className="text-right px-3 py-2 font-semibold">Win %</th>
              <th className="text-right px-3 py-2 font-semibold" title="Contention-adjusted EV: higher finishes receive a 15% premium to favor players likely to contend and pay out">EV %</th>
              <th className="text-right px-3 py-2 font-semibold">Fame</th>
              <th className="text-right px-3 py-2 font-semibold" title="Augusta course fit: ATG 35%, App 35%, OTT 15%, Putt 15%">Course Fit</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, idx) => (
              <tr
                key={row.name}
                className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                <td className="px-3 py-2 text-gray-400 tabular-nums">{idx + 1}</td>
                <td className="px-3 py-2 text-gray-800 font-medium">{row.name}</td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                  {row.winPct !== null ? `${(row.winPct * 100).toFixed(1)}%` : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-[#006747]">
                  {row.ev !== null ? `${(row.ev * 100).toFixed(2)}%` : <span className="text-gray-300 font-normal">—</span>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                  {row.fame > 1.0 ? (
                    <span className="font-medium text-orange-600">
                      {row.fame.toFixed(2)}×
                    </span>
                  ) : (
                    <span className="text-gray-300">1.00×</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                  {row.fit > 1.10 ? (
                    <span className="font-medium text-blue-600">
                      {row.fit.toFixed(2)}×
                    </span>
                  ) : (
                    <span className="text-gray-300">1.00×</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                  No players match "{search}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
