import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import {
  teamsWithEVAtom,
  teamPlayersAtom,
  payoutConfigAtom,
  auctionAtom,
  estimatedPotAtom,
  courseFitsAtom,
  baselinePlayersAtom,
} from '../atoms';
import {
  calculatePlayerEV,
  calculateLowSeniorEV,
  calculateLowAmEV,
  calculateHighScoreEV,
  deriveMarginalProbabilities,
  type MarginalProbabilities,
} from '../utils/evCalculator';
import { formatDollars } from '../utils/format';

type SortKey = 'group' | 'name' | 'score' | 'fit' | 'top9' | 'b13' | 'b46' | 'b79' | 'ev' | 'baselineEv';
type SortDir = 'asc' | 'desc';

interface PlayerRow {
  groupId: number;
  name: string;
  isSenior: boolean;
  isAmateur: boolean;
  score: number | null;
  position: string | null;
  thru: number | null;
  today: number | null;
  fitScore: number | null;
  fitRank: number | null;
  top9: number;
  b13: number;
  b46: number;
  b79: number;
  top9Base: number | null;
  b13Base: number | null;
  b46Base: number | null;
  b79Base: number | null;
  evDollars: number;
  evDelta: number | null;
  baselineEvDollars: number | null;
  isOwned: boolean;
}

// Color class for a probability band vs its baseline (threshold: 3pp)
function probColor(cur: number, base: number | null): string {
  if (base === null) return 'text-gray-500';
  if (cur - base > 0.03) return 'text-emerald-600';
  if (cur - base < -0.03) return 'text-red-400';
  return 'text-gray-700';
}

function SortIcon({ dir }: { dir: SortDir | null }) {
  if (!dir) return <span className="ml-0.5 text-gray-400 opacity-40">↕</span>;
  return <span className="ml-0.5">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export default function PlayersView() {
  const teamsWithEV = useAtomValue(teamsWithEVAtom);
  const allPlayers = useAtomValue(teamPlayersAtom);
  const payoutConfig = useAtomValue(payoutConfigAtom);
  const auction = useAtomValue(auctionAtom);
  const estimatedPot = useAtomValue(estimatedPotAtom);
  const courseFits = useAtomValue(courseFitsAtom);
  const baselinePlayers = useAtomValue(baselinePlayersAtom);

  const [sortKey, setSortKey] = useState<SortKey>('ev');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [playerFilter, setPlayerFilter] = useState<'all' | 'senior' | 'amateur'>('all');

  // Global fit rank map
  const fitRankMap = useMemo(() => {
    const sorted = [...courseFits]
      .filter((c) => c.score !== 0)
      .sort((a, b) => b.score - a.score);
    const map = new Map<string, number>();
    sorted.forEach((c, i) => map.set(c.playerName.toLowerCase(), i + 1));
    return map;
  }, [courseFits]);

  // Baseline marginals lookup: player name → MarginalProbabilities
  const baselineMarginalMap = useMemo(() => {
    const map = new Map<string, MarginalProbabilities>();
    for (const p of baselinePlayers) {
      map.set(p.name.toLowerCase(), deriveMarginalProbabilities(p.probabilities));
    }
    return map;
  }, [baselinePlayers]);

  // Baseline EV lookup: player name → total EV fraction
  const baselineEVMap = useMemo(() => {
    if (baselinePlayers.length === 0) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const p of baselinePlayers) {
      const mainEV = calculatePlayerEV(p.probabilities, payoutConfig);
      const seniorEV = calculateLowSeniorEV(p, baselinePlayers);
      const amEV = calculateLowAmEV(p, baselinePlayers);
      const highScoreEV = calculateHighScoreEV(p, baselinePlayers);
      map.set(p.name.toLowerCase(), mainEV + seniorEV + amEV + highScoreEV);
    }
    return map;
  }, [baselinePlayers, payoutConfig]);

  // Build flat player rows
  const rows: PlayerRow[] = useMemo(() => {
    const result: PlayerRow[] = [];
    for (const team of teamsWithEV) {
      const isOwned = auction.get(team.groupId)?.owned === true;
      for (const player of team.players) {
        const m = deriveMarginalProbabilities(player.probabilities);
        const mainEV = calculatePlayerEV(player.probabilities, payoutConfig);
        const seniorEV = calculateLowSeniorEV(player, allPlayers);
        const amEV = calculateLowAmEV(player, allPlayers);
        const highScoreEV = calculateHighScoreEV(player, allPlayers);
        const evDollars = (mainEV + seniorEV + amEV + highScoreEV) * estimatedPot;
        const evFrac = mainEV + seniorEV + amEV + highScoreEV;
        const baseEV = baselineEVMap.get(player.name.toLowerCase());
        const evDelta = baseEV != null ? (evFrac - baseEV) * estimatedPot : null;
        const baselineEvDollars = baseEV != null ? baseEV * estimatedPot : null;

        const cf = courseFits.find(
          (c) => c.playerName.toLowerCase() === player.name.toLowerCase()
        );
        const fitScore = cf && cf.score !== 0 ? cf.score : null;
        const fitRank = fitScore !== null ? (fitRankMap.get(player.name.toLowerCase()) ?? null) : null;

        const top9 = m.p1 + m.p2 + m.p3 + m.p4 + m.p5 + m.p6 + m.p7 + m.p8 + m.p9;
        const b13 = m.p1 + m.p2 + m.p3;
        const b46 = m.p4 + m.p5 + m.p6;
        const b79 = m.p7 + m.p8 + m.p9;

        const bm = baselineMarginalMap.get(player.name.toLowerCase());
        const top9Base = bm ? bm.p1+bm.p2+bm.p3+bm.p4+bm.p5+bm.p6+bm.p7+bm.p8+bm.p9 : null;
        const b13Base = bm ? bm.p1+bm.p2+bm.p3 : null;
        const b46Base = bm ? bm.p4+bm.p5+bm.p6 : null;
        const b79Base = bm ? bm.p7+bm.p8+bm.p9 : null;

        result.push({
          groupId: team.groupId,
          name: player.name,
          isSenior: player.isSenior,
          isAmateur: player.isAmateur,
          score: player.currentScore ?? null,
          position: player.currentPos ?? null,
          thru: player.thru ?? null,
          today: player.today ?? null,
          fitScore,
          fitRank,
          top9,
          b13,
          b46,
          b79,
          top9Base,
          b13Base,
          b46Base,
          b79Base,
          evDollars,
          evDelta,
          baselineEvDollars,
          isOwned,
        });
      }
    }
    return result;
  }, [teamsWithEV, allPlayers, payoutConfig, auction, estimatedPot, courseFits, fitRankMap, baselineEVMap, baselineMarginalMap]);

  // Sorted + filtered rows
  const sorted = useMemo(() => {
    const filtered = playerFilter === 'senior'
      ? rows.filter((r) => r.isSenior)
      : playerFilter === 'amateur'
      ? rows.filter((r) => r.isAmateur)
      : rows;
    return [...filtered].sort((a, b) => {
      let av: number;
      let bv: number;
      switch (sortKey) {
        case 'group': av = a.groupId; bv = b.groupId; break;
        case 'name': av = a.name < b.name ? -1 : 1; bv = 0; break;
        case 'score':
          // lower (more negative) = better; treat null as worst
          av = a.score ?? 999; bv = b.score ?? 999; break;
        case 'fit':
          av = a.fitScore ?? -999;
          bv = b.fitScore ?? -999;
          break;
        case 'top9': av = a.top9; bv = b.top9; break;
        case 'b13': av = a.b13; bv = b.b13; break;
        case 'b46': av = a.b46; bv = b.b46; break;
        case 'b79': av = a.b79; bv = b.b79; break;
        case 'ev': av = a.evDollars; bv = b.evDollars; break;
        case 'baselineEv': av = a.baselineEvDollars ?? -1; bv = b.baselineEvDollars ?? -1; break;
        default: av = a.evDollars; bv = b.evDollars;
      }
      if (sortKey === 'name') {
        const cmp = a.name.localeCompare(b.name);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [rows, sortKey, sortDir, playerFilter]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Default direction: numbers desc, name asc
      setSortDir(key === 'name' || key === 'group' ? 'asc' : 'desc');
    }
  }

  function colDir(key: SortKey): SortDir | null {
    return sortKey === key ? sortDir : null;
  }

  function pct(p: number): string {
    const v = p * 100;
    return v < 0.05 ? '—' : v.toFixed(1);
  }

  if (teamsWithEV.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3">⛳</div>
          <p className="text-lg font-medium">No teams loaded</p>
        </div>
      </div>
    );
  }

  const thClass = 'px-2 py-2 font-medium text-[10px] uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-white transition-colors';

  return (
    <div className="pb-20">
      {/* Legend */}
      <div className="flex items-center justify-between px-3 py-2 text-[11px] text-gray-500">
        <span>★ senior · (a) amateur · 🏆 owned team · prob values: current (baseline)</span>
        <div className="flex items-center gap-2">
          {/* Filter toggles */}
          <div className="flex rounded overflow-hidden border border-gray-300 text-[10px] font-semibold">
            {(['all', 'senior', 'amateur'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setPlayerFilter(f)}
                className={`px-2 py-0.5 transition-colors ${
                  playerFilter === f
                    ? 'bg-[#006747] text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-100'
                }`}
              >
                {f === 'all' ? 'All' : f === 'senior' ? '★ Senior' : '(a) Amateur'}
              </button>
            ))}
          </div>
          <span className="italic">
            {sorted.length} players · Est. Pot {formatDollars(estimatedPot)}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]" style={{ minWidth: '520px' }}>
          <thead>
            <tr className="bg-[#006747] text-green-200 border-b border-[#005238] sticky top-0 z-10">
              <th
                className={`${thClass} text-left pl-3`}
                onClick={() => handleSort('group')}
              >
                Grp <SortIcon dir={colDir('group')} />
              </th>
              <th
                className={`${thClass} text-left`}
                onClick={() => handleSort('name')}
              >
                Player <SortIcon dir={colDir('name')} />
              </th>
              <th
                className={`${thClass} text-right pr-1`}
                onClick={() => handleSort('score')}
              >
                Score <SortIcon dir={colDir('score')} />
              </th>
              <th
                className={`${thClass} text-right`}
                onClick={() => handleSort('fit')}
              >
                Fit <SortIcon dir={colDir('fit')} />
              </th>
              <th
                className={`${thClass} text-right`}
                onClick={() => handleSort('top9')}
              >
                Top-9 <SortIcon dir={colDir('top9')} />
              </th>
              <th
                className={`${thClass} text-right`}
                onClick={() => handleSort('b13')}
              >
                1–3 <SortIcon dir={colDir('b13')} />
              </th>
              <th
                className={`${thClass} text-right`}
                onClick={() => handleSort('b46')}
              >
                4–6 <SortIcon dir={colDir('b46')} />
              </th>
              <th
                className={`${thClass} text-right`}
                onClick={() => handleSort('b79')}
              >
                7–9 <SortIcon dir={colDir('b79')} />
              </th>
              <th
                className={`${thClass} text-right pr-3 text-[#FFD700]`}
                onClick={() => handleSort('ev')}
              >
                EV <SortIcon dir={colDir('ev')} />
              </th>
              <th
                className={`${thClass} text-right pr-3 text-gray-400`}
                onClick={() => handleSort('baselineEv')}
              >
                Baseline EV <SortIcon dir={colDir('baselineEv')} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const bg = row.isOwned
                ? 'bg-yellow-50'
                : i % 2 === 1
                ? 'bg-gray-50'
                : 'bg-white';
              const leftBorder = row.isOwned ? 'border-l-2 border-l-[#FFD700]' : '';

              return (
                <tr key={`${row.groupId}-${row.name}`} className={`${bg} ${leftBorder}`}>
                  <td className="px-2 py-1.5 pl-3 tabular-nums text-gray-500 font-medium">
                    {row.isOwned ? '🏆' : ''}{row.groupId}
                  </td>
                  <td className="px-2 py-1.5 font-medium text-gray-800 truncate max-w-[140px]">
                    {row.isSenior && <span className="mr-0.5 text-amber-600">★</span>}
                    {row.isAmateur && <span className="mr-0.5 text-blue-600">(a)</span>}
                    {row.name}
                  </td>
                  <td className="px-1 py-1.5 text-right tabular-nums whitespace-nowrap">
                    {row.score !== null ? (
                      <>
                        <span className="text-[10px] text-gray-400 mr-0.5">{row.position}</span>
                        <span className={`font-bold ${
                          row.score < 0 ? 'text-red-600' :
                          row.score === 0 ? 'text-gray-500' :
                          'text-gray-700'
                        }`}>
                          {row.score < 0 ? row.score : row.score === 0 ? 'E' : `+${row.score}`}
                        </span>
                        {row.thru !== null && (
                          <div className="text-[9px] text-gray-400">
                            {row.thru >= 18 ? 'F' : `thru ${row.thru}`}
                            {row.today !== null && row.thru < 18 && (
                              <span className="ml-0.5">({row.today < 0 ? row.today : row.today === 0 ? 'E' : `+${row.today}`})</span>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {row.fitScore !== null ? (
                      <span className={row.fitScore >= 0 ? 'text-emerald-600 font-medium' : 'text-red-400'}>
                        {row.fitScore > 0 ? '+' : ''}{row.fitScore.toFixed(2)}
                        {row.fitRank !== null && (
                          <span className="text-gray-400 font-normal"> ({row.fitRank})</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    <span className={probColor(row.top9, row.top9Base)}>
                      {pct(row.top9)}%
                    </span>
                    {row.top9Base !== null && (
                      <span className="text-gray-400 font-normal text-[10px]"> ({pct(row.top9Base)}%)</span>
                    )}
                  </td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${probColor(row.b13, row.b13Base)}`}>
                    {pct(row.b13)}
                    {row.b13Base !== null && (
                      <span className="text-gray-400 font-normal text-[10px]"> ({pct(row.b13Base)})</span>
                    )}
                  </td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${probColor(row.b46, row.b46Base)}`}>
                    {pct(row.b46)}
                    {row.b46Base !== null && (
                      <span className="text-gray-400 font-normal text-[10px]"> ({pct(row.b46Base)})</span>
                    )}
                  </td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${probColor(row.b79, row.b79Base)}`}>
                    {pct(row.b79)}
                    {row.b79Base !== null && (
                      <span className="text-gray-400 font-normal text-[10px]"> ({pct(row.b79Base)})</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 pr-3 text-right tabular-nums font-bold text-[#006747]">
                    {formatDollars(row.evDollars)}
                    {row.evDelta != null && Math.abs(row.evDelta) >= 1 && (
                      <div className={`text-[9px] font-normal ${row.evDelta >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                        {row.evDelta >= 0 ? '▲' : '▼'}{formatDollars(Math.abs(row.evDelta))}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1.5 pr-3 text-right tabular-nums text-gray-400">
                    {row.baselineEvDollars != null ? formatDollars(row.baselineEvDollars) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
