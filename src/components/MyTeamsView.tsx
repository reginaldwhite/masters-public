import React, { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import {
  teamsWithEVAtom,
  teamPlayersAtom,
  payoutConfigAtom,
  auctionAtom,
  estimatedPotAtom,
  courseFitsAtom,
  amateurBetsAtom,
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
import ValueBadge from './ValueBadge';

const PLACE_GROUPS = [
  { label: '1–3', keys: ['p1', 'p2', 'p3'] as const },
  { label: '4–6', keys: ['p4', 'p5', 'p6'] as const },
  { label: '7–9', keys: ['p7', 'p8', 'p9'] as const },
] as const;

function pct(p: number): string {
  const v = p * 100;
  return v < 0.05 ? '—' : v.toFixed(1);
}

function pctBig(p: number): string {
  return (p * 100).toFixed(1) + '%';
}

// Color class for a probability band vs its baseline (threshold: 3pp)
function probColor(cur: number, base: number | undefined): string {
  if (base === undefined) return 'text-gray-500';
  if (cur - base > 0.03) return 'text-emerald-600';
  if (cur - base < -0.03) return 'text-red-400';
  return 'text-gray-700';
}

export default function MyTeamsView() {
  const teamsWithEV = useAtomValue(teamsWithEVAtom);
  const allPlayers = useAtomValue(teamPlayersAtom);
  const payoutConfig = useAtomValue(payoutConfigAtom);
  const auction = useAtomValue(auctionAtom);
  const estimatedPot = useAtomValue(estimatedPotAtom);
  const courseFits = useAtomValue(courseFitsAtom);
  const amateurBets = useAtomValue(amateurBetsAtom);
  const baselinePlayers = useAtomValue(baselinePlayersAtom);

  // Baseline marginals lookup: player name → MarginalProbabilities
  const baselineMarginalMap = useMemo(() => {
    const map = new Map<string, MarginalProbabilities>();
    for (const p of baselinePlayers) {
      map.set(p.name.toLowerCase(), deriveMarginalProbabilities(p.probabilities));
    }
    return map;
  }, [baselinePlayers]);

  // Global fit ranks
  const fitRankMap = useMemo(() => {
    const sorted = [...courseFits]
      .filter((c) => c.score !== 0)
      .sort((a, b) => b.score - a.score);
    const map = new Map<string, number>();
    sorted.forEach((c, i) => map.set(c.playerName.toLowerCase(), i + 1));
    return map;
  }, [courseFits]);

  // Only teams I own
  const myTeams = teamsWithEV.filter((t) => {
    const entry = auction.get(t.groupId);
    return entry?.owned === true;
  });

  const myAmateurBets = amateurBets.filter((b) => b.owned);

  if (myTeams.length === 0 && myAmateurBets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400 px-6">
        <div className="text-4xl">🏆</div>
        <p className="text-base font-medium">No owned teams yet</p>
        <p className="text-sm text-center">
          Check the "I won this team" box when recording a sale, or load the 2026 auction results.
        </p>
      </div>
    );
  }

  // Summary calculations
  const totalPaid = myTeams.reduce((sum, t) => sum + (auction.get(t.groupId)?.price ?? 0), 0)
    + myAmateurBets.reduce((sum, b) => sum + b.price, 0);

  // EV for each owned amateur side bet (Low Am bonus)
  const amBetEVMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const bet of myAmateurBets) {
      const player = allPlayers.find(
        (p) => p.name.toLowerCase() === bet.playerName.toLowerCase()
      );
      if (player) {
        map.set(bet.id, calculateLowAmEV(player, allPlayers) * estimatedPot);
      }
    }
    return map;
  }, [myAmateurBets, allPlayers, estimatedPot]);

  const totalAmBetEV = Array.from(amBetEVMap.values()).reduce((s, v) => s + v, 0);
  const totalEV   = myTeams.reduce((sum, t) => sum + t.ev * estimatedPot, 0) + totalAmBetEV;
  const netEV     = totalEV - totalPaid;

  return (
    <div className="px-3 py-4 pb-24 space-y-4">
      {/* ── Summary banner ─────────────────────────────────────────── */}
      <div className="bg-[#FFD700] rounded-2xl px-4 py-4 shadow">
        <div className="text-xs font-bold uppercase tracking-wider text-[#4a3500] mb-3">
          🏆 My Teams — {myTeams.length} team{myTeams.length !== 1 ? 's' : ''}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/50 rounded-xl py-2 px-1">
            <div className="text-[10px] uppercase tracking-wider text-[#4a3500] font-semibold">
              Total Paid
            </div>
            <div className="text-lg font-bold text-[#1a1a00]">
              {formatDollars(totalPaid)}
            </div>
          </div>
          <div className="bg-white/50 rounded-xl py-2 px-1">
            <div className="text-[10px] uppercase tracking-wider text-[#4a3500] font-semibold">
              Total EV
            </div>
            <div className={`text-lg font-bold ${totalEV >= totalPaid ? 'text-[#006747]' : 'text-red-700'}`}>
              {formatDollars(totalEV)}
            </div>
          </div>
          <div className="bg-white/50 rounded-xl py-2 px-1">
            <div className="text-[10px] uppercase tracking-wider text-[#4a3500] font-semibold">
              Net EV
            </div>
            <div className={`text-lg font-bold ${netEV >= 0 ? 'text-[#006747]' : 'text-red-700'}`}>
              {netEV >= 0 ? '+' : ''}{formatDollars(netEV)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Per-team cards ─────────────────────────────────────────── */}
      {myTeams.map((team) => {
        const entry = auction.get(team.groupId)!;
        const evDollars = team.ev * estimatedPot;

        // Team-level probability: at least one player finishes top 9 (derived from marginals)
        const teamTop9 = 1 - team.players.reduce((acc, p) => {
          const m = deriveMarginalProbabilities(p.probabilities);
          const playerTop9 = m.p1 + m.p2 + m.p3 + m.p4 + m.p5 + m.p6 + m.p7 + m.p8 + m.p9;
          return acc * (1 - playerTop9);
        }, 1);

        return (
          <div key={team.groupId} className="bg-white rounded-2xl border-2 border-[#FFD700] shadow overflow-hidden">
            {/* Card header */}
            <div className="bg-[#006747] text-white px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-green-200">
                  🏆 Group {team.groupId}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold text-[#FFD700]">
                    Paid {formatDollars(entry.price)}
                  </span>
                  <ValueBadge evDollars={evDollars} price={entry.price} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-green-200 uppercase tracking-wider">EV</div>
                <div className="text-base font-bold">{formatDollars(evDollars)}</div>
              </div>
            </div>

            {/* Team top-9 probability pill */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#006747]/8 border-b border-[#006747]/15">
              <span className="text-xs text-gray-500 font-medium">
                Probability team lands in top 9:
              </span>
              <span className={`text-sm font-bold ${
                teamTop9 >= 0.5 ? 'text-emerald-600' :
                teamTop9 >= 0.25 ? 'text-amber-600' : 'text-red-500'
              }`}>
                {pctBig(teamTop9)}
              </span>
            </div>

            {/* Player detail table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]" style={{ minWidth: '420px' }}>
                <colgroup>
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '66px' }} />
                  <col style={{ width: '46px' }} />
                  {PLACE_GROUPS.map((g) => (
                    <col key={g.label} style={{ width: '35px' }} />
                  ))}
                  <col style={{ width: '60px' }} />
                </colgroup>
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                    <th className="text-left px-3 py-1.5 font-medium">Player</th>
                    <th className="text-right px-0.5 py-1.5 font-medium">Fit</th>
                    <th className="text-right px-1 py-1.5 font-medium">Top-9</th>
                    {PLACE_GROUPS.map((g) => (
                      <th key={g.label} className="text-right px-0.5 py-1.5 font-medium">{g.label}</th>
                    ))}
                    <th className="text-right px-3 py-1.5 font-medium text-[#006747]">EV</th>
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

                    const cf = courseFits.find(
                      (c) => c.playerName.toLowerCase() === player.name.toLowerCase()
                    );
                    const augustaScore = cf && cf.score !== 0 ? cf.score : null;
                    const top9prob = m.p1 + m.p2 + m.p3 + m.p4 + m.p5 + m.p6 + m.p7 + m.p8 + m.p9;
                    const bm = baselineMarginalMap.get(player.name.toLowerCase());
                    const top9base = bm ? bm.p1+bm.p2+bm.p3+bm.p4+bm.p5+bm.p6+bm.p7+bm.p8+bm.p9 : undefined;

                    const hasHistory =
                      player.payout2025 > 0 ||
                      (player.payout2024 != null && player.payout2024 > 0) ||
                      (player.payout2023 != null && player.payout2023 > 0);

                    return (
                      <React.Fragment key={player.name}>
                        <tr className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                          <td className="px-3 py-1.5 font-medium text-gray-800 truncate max-w-0">
                            {player.isSenior && <span className="mr-0.5 text-amber-600">★</span>}
                            {player.isAmateur && <span className="mr-0.5 text-blue-600">🅰</span>}
                            {player.name}
                            {player.currentScore !== undefined && (
                                <span className={player.currentScore < 0 ? 'ml-1 text-[10px] text-red-500 font-semibold' : 'ml-1 text-[10px] text-gray-600'}>
                                  {player.currentScore < 0 ? player.currentScore : player.currentScore === 0 ? 'E' : `+${player.currentScore}`}
                                {player.currentPos && <span className="text-gray-400 font-normal text-[10px]"> ({player.currentPos})</span>}
                                </span>
                                
                            )}
                          </td>
                          {/* Fit */}
                          <td className="text-right px-0.5 py-1.5 tabular-nums">
                            {augustaScore !== null ? (
                              <span className={augustaScore >= 0 ? 'text-emerald-600 font-medium' : 'text-red-400'}>
                                {augustaScore > 0 ? '+' : ''}{augustaScore.toFixed(2)}
                                {fitRankMap.get(player.name.toLowerCase()) !== undefined && (
                                  <span className="text-gray-400 font-normal text-[10px]"> ({fitRankMap.get(player.name.toLowerCase())})</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          {/* Top-9 probability */}
                          <td className="text-right px-1 py-1.5 tabular-nums">
                            <span className={`font-semibold ${probColor(top9prob, top9base)}`}>
                              {pctBig(top9prob)}
                            </span>
                          </td>
                          {/* Position groups */}
                          {PLACE_GROUPS.map((g) => {
                            const cur = g.keys.reduce((sum, k) => sum + m[k], 0);
                            const base = bm ? g.keys.reduce((sum, k) => sum + bm[k], 0) : undefined;
                            return (
                              <td key={g.label} className={`text-right px-0.5 py-1.5 tabular-nums ${probColor(cur, base)}`}>
                                {pct(cur)}
                              </td>
                            );
                          })}
                          {/* EV */}
                          <td className="text-right px-3 py-1.5 font-bold text-[#006747] tabular-nums">
                            {formatDollars(totalEV * estimatedPot)}
                          </td>
                        </tr>
                        {hasHistory && (
                          <tr className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                            <td colSpan={6} className="px-3 pb-1.5 text-[10px] text-gray-400 space-y-0.5">
                              {player.payout2025 > 0 && (
                                <div>'25: {formatDollars(player.payout2025)} ({player.finish2025})</div>
                              )}
                              {player.payout2024 != null && player.payout2024 > 0 && (
                                <div>'24: {formatDollars(player.payout2024)} ({player.finish2024})</div>
                              )}
                              {player.payout2023 != null && player.payout2023 > 0 && (
                                <div>'23: {formatDollars(player.payout2023)} ({player.finish2023})</div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      {/* ── Amateur side bets ──────────────────────────────────────── */}
      {myAmateurBets.length > 0 && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow overflow-hidden">
          <div className="bg-blue-900 text-white px-4 py-2">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-200">🅰 Amateur Side Bets · Low Am 2% of pot</div>
          </div>
          <div className="divide-y divide-gray-100">
            {myAmateurBets.map((bet) => {
              const ev = amBetEVMap.get(bet.id);
              return (
                <div key={bet.id} className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-200">
                      🅰 {bet.playerName}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-blue-100">
                        Paid {formatDollars(bet.price)}
                      </span>
                      {ev != null && <ValueBadge evDollars={ev} price={bet.price} />}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-blue-200 uppercase tracking-wider">EV</div>
                    <div className="text-base font-bold">
                      {ev != null ? formatDollars(ev) : '—'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
