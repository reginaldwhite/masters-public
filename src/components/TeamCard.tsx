import type { Team, AuctionEntry, FamePremium, CourseFit, Player, PayoutConfig } from '../types';
import { formatDollars, formatPercent } from '../utils/format';
import ValueBadge from './ValueBadge';
import { getTeamFamePremium } from '../utils/priceCalculator';
import {
  calculatePlayerEV,
  calculateLowSeniorEV,
  calculateLowAmEV,
  calculateHighScoreEV,
  deriveMarginalProbabilities,
  type MarginalProbabilities,
} from '../utils/evCalculator';

interface TeamCardProps {
  team: Team;
  auctionEntry?: AuctionEntry;
  isOnTheBlock: boolean;
  estimatedPot: number;
  famePremiums: FamePremium[];
  courseFits: CourseFit[];
  baselineStats?: { evDollars: number; top9: number };
  allPlayers: Player[];
  payoutConfig: PayoutConfig;
  baselineMarginalMap: Map<string, MarginalProbabilities>;
  baselineEVMap: Map<string, number>;
  fitRankMap: Map<string, number>;
  onSelect: (groupId: number) => void;
}

const PLACE_GROUPS = [
  { label: '1–3', keys: ['p1', 'p2', 'p3'] as const },
  { label: '4–6', keys: ['p4', 'p5', 'p6'] as const },
  { label: '7–9', keys: ['p7', 'p8', 'p9'] as const },
] as const;

function pct(p: number): string {
  const v = p * 100;
  return v < 0.05 ? '—' : v.toFixed(1);
}

function probColor(cur: number, base: number | undefined): string {
  if (base === undefined) return 'text-gray-500';
  if (cur - base > 0.03) return 'text-emerald-600';
  if (cur - base < -0.03) return 'text-red-400';
  return 'text-gray-700';
}

export default function TeamCard({
  team,
  auctionEntry,
  isOnTheBlock,
  estimatedPot,
  famePremiums,
  courseFits,
  baselineStats,
  allPlayers,
  payoutConfig,
  baselineMarginalMap,
  baselineEVMap,
  fitRankMap,
  onSelect,
}: TeamCardProps) {
  const isSold = !!auctionEntry;
  const isOwned = !!auctionEntry?.owned;
  const displayEV = baselineStats?.evDollars ?? team.ev * estimatedPot;
  const displayEVFrac = baselineStats != null
    ? baselineStats.evDollars / estimatedPot
    : team.ev;
  const hasFamePremium = getTeamFamePremium(team, famePremiums) > 1.0;
  const hasCourseFit = team.players.some((p) => {
    const cf = courseFits.find((c) => c.playerName.toLowerCase() === p.name.toLowerCase());
    return cf && cf.score > 0.3;
  });

  const liveTop9 = 1 - team.players.reduce((acc, p) => {
    const m = deriveMarginalProbabilities(p.probabilities);
    const p9 = m.p1+m.p2+m.p3+m.p4+m.p5+m.p6+m.p7+m.p8+m.p9;
    return acc * (1 - p9);
  }, 1);

  let cardBg = 'bg-white';
  let borderStyle = 'border border-gray-200';
  if (isOnTheBlock) {
    cardBg = 'bg-yellow-50';
    borderStyle = 'border-2 border-[#FFD700]';
  } else if (isOwned) {
    cardBg = 'bg-yellow-50/60';
    borderStyle = 'border-l-4 border-l-[#FFD700] border border-yellow-300';
  } else if (isSold) {
    cardBg = 'bg-[#e8f5e9]';
    borderStyle = 'border border-green-300';
  }

  return (
    <div className={`w-full rounded-xl shadow-sm ${cardBg} ${borderStyle} overflow-hidden`}>
      {/* Clickable header */}
      <div
        role={!isSold ? 'button' : undefined}
        tabIndex={!isSold ? 0 : undefined}
        className={`px-4 py-3 flex items-start justify-between gap-3 ${!isSold ? 'cursor-pointer active:bg-black/5' : ''}`}
        onClick={() => !isSold && onSelect(team.groupId)}
        onKeyDown={(e) => !isSold && e.key === 'Enter' && onSelect(team.groupId)}
      >
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#006747] mb-1">
            {isOwned && <span className="mr-1">🏆</span>}
            Group {team.groupId}
            {hasFamePremium && <span className="ml-1" title="Fame premium">🔥</span>}
            {hasCourseFit && <span className="ml-1" title="Augusta course fit">🏌️</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              liveTop9 >= 0.5 ? 'bg-emerald-100 text-emerald-700' :
              liveTop9 >= 0.25 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}>
              ↗ Top-9: {(liveTop9 * 100).toFixed(0)}%
            </span>
            {!isSold && (
              <span className="text-[10px] text-gray-400">tap to bid</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-base font-bold text-[#006747]">
            {formatDollars(displayEV)}
          </div>
          <div className="text-xs text-gray-500">
            {formatPercent(displayEVFrac)}
          </div>
          {isSold && auctionEntry && (
            <div className="mt-1 space-y-0.5">
              <div className="text-sm font-semibold text-[#006747]">
                {formatDollars(auctionEntry.price)}
              </div>
              <ValueBadge evDollars={displayEV} price={auctionEntry.price} />
            </div>
          )}
        </div>
      </div>

      {/* Player detail table */}
      <div className="overflow-x-auto border-t border-gray-100">
        <table className="w-full text-[11px]" style={{ minWidth: '360px' }}>
          <colgroup>
            <col style={{ width: 'auto' }} />
            <col style={{ width: '48px' }} />
            {PLACE_GROUPS.map((g) => (
              <col key={g.label} style={{ width: '36px' }} />
            ))}
            <col style={{ width: '58px' }} />
          </colgroup>
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
              <th className="text-left px-3 py-1 font-medium">Player</th>
              <th className="text-right px-1 py-1 font-medium">Fit</th>
              {PLACE_GROUPS.map((g) => (
                <th key={g.label} className="text-right px-1 py-1 font-medium">{g.label}</th>
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
              const bm = baselineMarginalMap.get(player.name.toLowerCase());
              const baseEVFrac = baselineEVMap.get(player.name.toLowerCase());
              const evDelta = baseEVFrac != null ? totalEV - baseEVFrac : null;
              return (
                <tr key={player.name} className={i % 2 === 1 ? 'bg-black/[0.02]' : ''}>
                  <td className="px-3 py-1.5 font-medium text-gray-800">
                    <div className="truncate max-w-[110px]">
                      {player.isSenior && <span className="mr-0.5 text-amber-600">★</span>}
                      {player.isAmateur && <span className="mr-0.5 text-blue-600">(a)</span>}
                      {player.name}
                    </div>
                    {player.currentScore !== undefined && (
                      <div className="text-[10px]">
                        <span className={player.currentScore < 0 ? 'text-red-500 font-semibold' : player.currentScore === 0 ? 'text-gray-500' : 'text-gray-600'}>
                          {player.currentScore < 0 ? player.currentScore : player.currentScore === 0 ? 'E' : `+${player.currentScore}`}
                        </span>
                        {player.currentPos && <span className="ml-0.5 text-gray-400">({player.currentPos})</span>}
                      </div>
                    )}
                    {player.payout2025 > 0 && (
                      <div className="text-[10px] text-gray-400">'25 {formatDollars(player.payout2025)}</div>
                    )}
                  </td>
                  <td className="text-right px-1 py-1.5 tabular-nums">
                    {augustaScore !== null ? (
                      <span className={augustaScore >= 0 ? 'text-emerald-600 font-medium' : 'text-red-400'}>
                        {augustaScore > 0 ? '+' : ''}{augustaScore.toFixed(2)}
                        {fitRankMap.get(player.name.toLowerCase()) !== undefined && (
                          <span className="text-gray-400 font-normal"> ({fitRankMap.get(player.name.toLowerCase())})</span>
                        )}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  {PLACE_GROUPS.map((g) => {
                    const cur = g.keys.reduce((sum, k) => sum + m[k], 0);
                    const base = bm ? g.keys.reduce((sum, k) => sum + bm[k], 0) : undefined;
                    return (
                      <td key={g.label} className={`text-right px-1 py-1.5 tabular-nums ${probColor(cur, base)}`}>
                        {pct(cur)}
                        {base !== undefined && (
                          <div className="text-[9px] font-normal text-gray-400">{pct(base)}</div>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-right px-3 py-1.5 font-bold text-[#006747] tabular-nums">
                    {formatDollars(totalEV * estimatedPot)}
                    {evDelta != null && Math.abs(evDelta * estimatedPot) >= 1 && (
                      <div className={`text-[9px] font-normal ${evDelta >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                        {evDelta >= 0 ? '▲' : '▼'}{formatDollars(Math.abs(evDelta * estimatedPot))}
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
}
