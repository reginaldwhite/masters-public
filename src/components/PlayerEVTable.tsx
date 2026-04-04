import { useState, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { payoutConfigAtom } from '../atoms';
import { calculatePlayerEV } from '../utils/evCalculator';
import { calculateFamePremiums } from '../utils/fameCalculator';
import { calculateCourseFits } from '../utils/courseFitCalculator';
import type { Player } from '../types';

interface PlayerEVTableProps {
  players: Player[];
}

interface PlayerEVRow {
  name: string;
  winPct: number;
  ev: number;
  fame: number;
  fit: number;
}

export default function PlayerEVTable({ players }: PlayerEVTableProps) {
  const payoutConfig = useAtomValue(payoutConfigAtom);
  const [search, setSearch] = useState('');

  const rows: PlayerEVRow[] = useMemo(() => {
    const premiums = calculateFamePremiums(players);
    const premiumMap = new Map(premiums.map((fp) => [fp.playerName.toLowerCase(), fp.multiplier]));
    const fits = calculateCourseFits(players);
    const fitMap = new Map(fits.map((cf) => [cf.playerName.toLowerCase(), cf.multiplier]));
    return players
      .map((p) => ({
        name: p.name,
        winPct: p.probabilities.win,
        ev: calculatePlayerEV(p.probabilities, payoutConfig),
        fame: premiumMap.get(p.name.toLowerCase()) ?? 1.0,
        fit: fitMap.get(p.name.toLowerCase()) ?? 1.0,
      }))
      .sort((a, b) => b.ev - a.ev);
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
              <th className="text-right px-3 py-2 font-semibold">EV %</th>
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
                  {(row.winPct * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-[#006747]">
                  {(row.ev * 100).toFixed(2)}%
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                  {row.fame > 1.0 ? (
                    <span className="inline-flex items-center gap-0.5 text-orange-600 font-medium">
                      🔥{row.fame.toFixed(2)}×
                    </span>
                  ) : (
                    <span className="text-gray-300">1.00×</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                  {row.fit > 1.10 ? (
                    <span className="inline-flex items-center gap-0.5 text-blue-600 font-medium">
                      🏌️{row.fit.toFixed(2)}×
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
