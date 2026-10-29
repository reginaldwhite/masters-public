import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import {
  teamsWithEVAtom,
  teamPlayersAtom,
  payoutConfigAtom,
  auctionAtom,
  estimatedPotAtom,
  famePremiumsAtom,
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
import { getTeamFamePremium } from '../utils/priceCalculator';

// Format a marginal probability as a compact percentage, e.g. "8.4" (no % sign, to save space)
function pct(p: number): string {
  const v = p * 100;
  return v < 0.05 ? '—' : v.toFixed(1);
}

// Color class for a probability band vs its baseline (threshold: 3pp)
function probColor(cur: number, base: number | undefined): string {
  if (base === undefined) return 'text-gray-500';
  if (cur - base > 0.03) return 'text-emerald-600';
  if (cur - base < -0.03) return 'text-red-400';
  return 'text-gray-700';
}

// Grouped position columns: sum of marginal probabilities for each band
const PLACE_GROUPS = [
  { label: '1–3',  keys: ['p1', 'p2', 'p3'] as const },
  { label: '4–6',  keys: ['p4', 'p5', 'p6'] as const },
  { label: '7–9',  keys: ['p7', 'p8', 'p9'] as const },
] as const;

export default function DetailsView() {
  const teamsWithEV = useAtomValue(teamsWithEVAtom);
  const allPlayers = useAtomValue(teamPlayersAtom);
  const payoutConfig = useAtomValue(payoutConfigAtom);
  const auction = useAtomValue(auctionAtom);
  const estimatedPot = useAtomValue(estimatedPotAtom);
  const famePremiums = useAtomValue(famePremiumsAtom);
  const courseFits = useAtomValue(courseFitsAtom);
  const baselinePlayers = useAtomValue(baselinePlayersAtom);

  const displayPot = estimatedPot;

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

  // Baseline marginals lookup: player name → MarginalProbabilities
  const baselineMarginalMap = useMemo(() => {
    const map = new Map<string, MarginalProbabilities>();
    for (const p of baselinePlayers) {
      map.set(p.name.toLowerCase(), deriveMarginalProbabilities(p.probabilities));
    }
    return map;
  }, [baselinePlayers]);

  // Compute global fit ranks: rank 1 = highest fit score
  const fitRankMap = useMemo(() => {
    const sorted = [...courseFits]
      .filter((c) => c.score !== 0)
      .sort((a, b) => b.score - a.score);
    const map = new Map<string, number>();
    sorted.forEach((c, i) => map.set(c.playerName.toLowerCase(), i + 1));
    return map;
  }, [courseFits]);

  if (teamsWithEV.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3">⛳</div>
          <p className="text-lg font-medium">No teams loaded</p>
          <p className="text-sm mt-1">Switch to Setup to import teams and player data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 py-3 pb-20">
      {/* Legend */}
      <div className="flex items-center justify-between px-2 mb-3 text-[11px] text-gray-500">
        <span>★ senior &nbsp;·&nbsp; (a) amateur &nbsp;·&nbsp; finish % shown per place</span>
        <span className="italic">Est. Pot {formatDollars(estimatedPot)}</span>
      </div>

      <div className="space-y-2">
        {teamsWithEV.map((team) => {
          const auctionEntry = auction.get(team.groupId);
          const isSold = !!auctionEntry;
          const famePremium = getTeamFamePremium(team, famePremiums);

          const teamTop9 = 1 - team.players.reduce((acc, p) => {
            const m = deriveMarginalProbabilities(p.probabilities);
            const playerTop9 = m.p1 + m.p2 + m.p3 + m.p4 + m.p5 + m.p6 + m.p7 + m.p8 + m.p9;
            return acc * (1 - playerTop9);
          }, 1);

          return (
            <div
              key={team.groupId}
              className={`rounded-xl border overflow-hidden ${
                isSold ? 'bg-[#e8f5e9] border-green-300' : 'bg-white border-gray-200'
              }`}
            >
              {/* Group header */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#006747]/10 border-b border-[#006747]/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#006747]">
                    Group {team.groupId}
                  </span>
                  {famePremium > 1.0 && (
                    <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
                      🔥 {famePremium.toFixed(2)}×
                    </span>
                  )}
                  {isSold && auctionEntry && (
                    <span className="text-[10px] bg-green-700 text-white px-1.5 py-0.5 rounded-full font-medium">
                      SOLD {formatDollars(auctionEntry.price)}
                    </span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    teamTop9 >= 0.5 ? 'bg-emerald-100 text-emerald-700' :
                    teamTop9 >= 0.25 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    ↗ Top 9: {(teamTop9 * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#006747]">
                    {formatDollars(team.ev * displayPot)}
                  </span>
                  <span className="text-[10px] text-gray-500 ml-1">
                    ({(team.ev * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Scrollable player table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]" style={{ minWidth: '380px' }}>
                  <colgroup>
                    <col style={{ width: 'auto' }} />
                    <col style={{ width: '38px' }} />
                    {PLACE_GROUPS.map((g) => (
                      <col key={g.label} style={{ width: '35px' }} />
                    ))}
                    <col style={{ width: '60px' }} />
                  </colgroup>
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                      <th className="text-left px-3 py-1 font-medium">Player</th>
                      <th className="text-right px-1 py-1 font-medium">Fit</th>
                      {PLACE_GROUPS.map((g) => (
                        <th key={g.label} className="text-right px-2 py-1 font-medium">{g.label}</th>
                      ))}
                      <th className="text-right px-3 py-1 font-medium text-[#006747]">EV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.players.map((player, i) => {
                      const m = deriveMarginalProbabilities(player.probabilities);
                      const mainEV = calculatePlayerEV(player.probabilities, payoutConfig);
                      const seniorEV = calculateLowSeniorEV(player, allPlayers);
                      const amEV = calculateLowAmEV(player, allPlayers);
                      const highScoreEV = calculateHighScoreEV(player, allPlayers);
                      const totalEV = mainEV + seniorEV + amEV + highScoreEV;
                      const cf = courseFits.find((c) => c.playerName.toLowerCase() === player.name.toLowerCase());
                      const augustaScore = cf && cf.score !== 0 ? cf.score : null;
                      const baseEV = baselineEVMap.get(player.name.toLowerCase());
                      const evDelta = baseEV != null ? totalEV - baseEV : null;

                      return (
                        <tr key={player.name} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                          <td className="px-3 py-1.5 font-medium text-gray-800 truncate max-w-0">
                            {player.name}
                            {player.isSenior && <span className="ml-0.5 text-amber-600">★</span>}
                            {player.isAmateur && <span className="ml-0.5 text-blue-600">(a)</span>}
                          </td>
                          <td className="text-right px-1 py-1.5 tabular-nums text-[10px]" width="66px">
                            {augustaScore !== null ? (
                              <span className={augustaScore >= 0 ? 'text-emerald-600 font-medium' : 'text-red-400'}>
                                {augustaScore > 0 ? '+' : ''}{augustaScore.toFixed(2)}
                                {fitRankMap.get(player.name.toLowerCase()) !== undefined && (
                                  <span className="text-gray-400 font-normal"> ({fitRankMap.get(player.name.toLowerCase())})</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          {PLACE_GROUPS.map((g) => {
                            const cur = g.keys.reduce((sum, k) => sum + m[k], 0);
                            const bm = baselineMarginalMap.get(player.name.toLowerCase());
                            const base = bm ? g.keys.reduce((sum, k) => sum + bm[k], 0) : undefined;
                            return (
                              <td width="46px" key={g.label} className={`text-right px-2 py-1.5 tabular-nums ${probColor(cur, base)}`}>
                                {pct(cur)}
                              </td>
                            );
                          })}
                          <td className="text-right px-3 py-1.5 font-bold text-[#006747] tabular-nums">
                            {formatDollars(totalEV * displayPot)}
                            {evDelta != null && Math.abs(evDelta * displayPot) >= 1 && (
                              <div className={`text-[9px] font-normal ${evDelta >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                {evDelta >= 0 ? '▲' : '▼'}{formatDollars(Math.abs(evDelta * displayPot))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
