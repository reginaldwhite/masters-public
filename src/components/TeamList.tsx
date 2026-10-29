import { useState, useMemo } from 'react';
import { useAtomValue, useAtom } from 'jotai';
import {
  unsoldTeamsAtom,
  soldTeamsAtom,
  onTheBlockAtom,
  auctionAtom,
  teamsWithEVAtom,
  estimatedPotAtom,
  famePremiumsAtom,
  courseFitsAtom,
  amateurBetsAtom,
  baselinePlayersAtom,
  payoutConfigAtom,
  teamPlayersAtom,
} from '../atoms';
import type { AmateurBet } from '../types';
import { formatDollars } from '../utils/format';
import {
  calculatePlayerEV,
  calculateLowSeniorEV,
  calculateLowAmEV,
  calculateHighScoreEV,
  deriveMarginalProbabilities,
  type MarginalProbabilities,
} from '../utils/evCalculator';
import TeamCard from './TeamCard';
import AuctionBlock from './AuctionBlock';

export default function TeamList() {
  const [searchInput, setSearchInput] = useState('');
  const teamsWithEV = useAtomValue(teamsWithEVAtom);
  const unsoldTeams = useAtomValue(unsoldTeamsAtom);
  const soldTeams = useAtomValue(soldTeamsAtom);
  const estimatedPot = useAtomValue(estimatedPotAtom);
  const famePremiums = useAtomValue(famePremiumsAtom);
  const courseFits = useAtomValue(courseFitsAtom);
  const [onTheBlock, setOnTheBlock] = useAtom(onTheBlockAtom);
  const [auction, setAuction] = useAtom(auctionAtom);
  const amateurBets = useAtomValue(amateurBetsAtom);
  const baselinePlayers = useAtomValue(baselinePlayersAtom);
  const payoutConfig = useAtomValue(payoutConfigAtom);
  const allPlayers = useAtomValue(teamPlayersAtom);

  // Per-team baseline stats: groupId → { evDollars, top9 }
  const baselineTeamStats = useMemo(() => {
    const map = new Map<number, { evDollars: number; top9: number }>();
    if (baselinePlayers.length === 0) return map;
    for (const team of teamsWithEV) {
      let evSum = 0;
      let noTop9 = 1;
      for (const player of team.players) {
        const bp = baselinePlayers.find(
          (b) => b.name.toLowerCase() === player.name.toLowerCase()
        );
        if (!bp) continue;
        const mainEV = calculatePlayerEV(bp.probabilities, payoutConfig);
        const seniorEV = calculateLowSeniorEV(bp, baselinePlayers);
        const amEV = calculateLowAmEV(bp, baselinePlayers);
        const highScoreEV = calculateHighScoreEV(bp, baselinePlayers);
        evSum += mainEV + seniorEV + amEV + highScoreEV;
        const bm = deriveMarginalProbabilities(bp.probabilities);
        const p9 = bm.p1+bm.p2+bm.p3+bm.p4+bm.p5+bm.p6+bm.p7+bm.p8+bm.p9;
        noTop9 *= (1 - p9);
      }
      map.set(team.groupId, { evDollars: evSum * estimatedPot, top9: 1 - noTop9 });
    }
    return map;
  }, [baselinePlayers, teamsWithEV, estimatedPot, payoutConfig]);

  // Per-player baseline marginals (for prob color coding in table)
  const baselineMarginalMap = useMemo(() => {
    const map = new Map<string, MarginalProbabilities>();
    for (const p of baselinePlayers) {
      map.set(p.name.toLowerCase(), deriveMarginalProbabilities(p.probabilities));
    }
    return map;
  }, [baselinePlayers]);

  // Per-player baseline EV fractions (for EV delta in table)
  const baselineEVMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of baselinePlayers) {
      const ev = calculatePlayerEV(p.probabilities, payoutConfig)
        + calculateLowSeniorEV(p, baselinePlayers)
        + calculateLowAmEV(p, baselinePlayers)
        + calculateHighScoreEV(p, baselinePlayers);
      map.set(p.name.toLowerCase(), ev);
    }
    return map;
  }, [baselinePlayers, payoutConfig]);

  // Fit rank map
  const fitRankMap = useMemo(() => {
    const sorted = [...courseFits]
      .filter((c) => c.score !== 0)
      .sort((a, b) => b.score - a.score);
    const map = new Map<string, number>();
    sorted.forEach((c, i) => map.set(c.playerName.toLowerCase(), i + 1));
    return map;
  }, [courseFits]);

  // Available = all unsold (on-the-block team stays in place), excluding amateur groups 33+
  const availableTeams = unsoldTeams.filter((t) => t.groupId <= 32);

  // Filter teams based on search
  const filterTeams = (teams: typeof unsoldTeams) => {
    if (!searchInput.trim()) return teams;
    const query = searchInput.toLowerCase();
    return teams.filter((team) => {
      // Match by group ID
      if (team.groupId.toString().includes(query)) return true;
      // Match by player name
      return team.players.some((p) =>
        p.name.toLowerCase().includes(query)
      );
    });
  };

  const filteredAvailable = filterTeams(availableTeams).slice().sort((a, b) => {
    const aEV = baselineTeamStats.get(a.groupId)?.evDollars ?? a.ev;
    const bEV = baselineTeamStats.get(b.groupId)?.evDollars ?? b.ev;
    return bEV - aEV;
  });
  const filteredSold = filterTeams(soldTeams.filter((t) => t.groupId <= 32)).slice().sort((a, b) => {
    const aEV = baselineTeamStats.get(a.groupId)?.evDollars ?? a.ev;
    const bEV = baselineTeamStats.get(b.groupId)?.evDollars ?? b.ev;
    return bEV - aEV;
  });

  const handleSelect = (groupId: number) => {
    setOnTheBlock(groupId);
  };

  const handleSold = (groupId: number, price: number, owned: boolean) => {
    const newAuction = new Map(auction);
    newAuction.set(groupId, {
      groupId,
      price,
      auctionOrder: newAuction.size + 1,
      sold: true,
      owned,
    });
    setAuction(newAuction);
    setOnTheBlock(null);
  };

  const handleCancel = () => {
    setOnTheBlock(null);
  };

  if (teamsWithEV.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3">⛳</div>
          <p className="text-lg font-medium">No teams loaded</p>
          <p className="text-sm mt-1">
            Switch to Setup to import teams and player data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4 pb-20">
      {/* Search Bar */}
      <div className="sticky top-16 z-40 bg-[#f5f5f0] pt-2 pb-3">
        <input
          type="text"
          placeholder="Search by player name or team #…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006747] focus:border-transparent"
        />
      </div>

      {/* Available */}
      {filteredAvailable.length > 0 && (
        <section>
          <SectionHeader label="Available" count={filteredAvailable.length} />
          <div className="space-y-2">
            {filteredAvailable.map((team) =>
              team.groupId === onTheBlock ? (
                <AuctionBlock
                  key={team.groupId}
                  team={team}
                  onSold={handleSold}
                  onCancel={handleCancel}
                />
              ) : (
                <TeamCard
                  key={team.groupId}
                  team={team}
                  isOnTheBlock={false}
                  estimatedPot={estimatedPot}
                  famePremiums={famePremiums}
                  courseFits={courseFits}
                  baselineStats={baselineTeamStats.get(team.groupId)}
                  allPlayers={allPlayers}
                  payoutConfig={payoutConfig}
                  baselineMarginalMap={baselineMarginalMap}
                  baselineEVMap={baselineEVMap}
                  fitRankMap={fitRankMap}
                  onSelect={handleSelect}
                />
              )
            )}
          </div>
        </section>
      )}

      {/* Sold */}
      {filteredSold.length > 0 && (
        <section>
          <SectionHeader label="Sold" count={filteredSold.length} />
          <div className="space-y-2">
            {filteredSold.map((team) => {
              const entry = auction.get(team.groupId);
              return (
                <TeamCard
                  key={team.groupId}
                  team={team}
                  auctionEntry={entry}
                  isOnTheBlock={false}
                  estimatedPot={estimatedPot}
                  famePremiums={famePremiums}
                  courseFits={courseFits}
                  baselineStats={baselineTeamStats.get(team.groupId)}
                  allPlayers={allPlayers}
                  payoutConfig={payoutConfig}
                  baselineMarginalMap={baselineMarginalMap}
                  baselineEVMap={baselineEVMap}
                  fitRankMap={fitRankMap}
                  onSelect={() => {}}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Amateur Side Bets */}
      {amateurBets.length > 0 && (
        <section>
          <SectionHeader label="Amateur Side Bets" count={amateurBets.length} />
          <div className="space-y-2">
            {amateurBets.map((bet) => (
              <AmateurBetCard key={bet.id} bet={bet} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeader({
  label,
  count,
  accent,
}: {
  label: string;
  count: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <h2
        className={`text-sm font-bold uppercase tracking-wider ${
          accent ? 'text-[#FFD700]' : 'text-[#006747]'
        }`}
      >
        {label}
      </h2>
      <span className="text-xs text-gray-400 font-medium">({count})</span>
    </div>
  );
}

function AmateurBetCard({ bet }: { bet: AmateurBet }) {
  const isOwned = bet.owned;
  const cardBg = isOwned ? 'bg-yellow-50/60' : 'bg-white';
  const borderStyle = isOwned
    ? 'border-l-4 border-l-[#FFD700] border border-yellow-300'
    : 'border border-gray-200';

  return (
    <div className={`rounded-xl shadow-sm ${cardBg} ${borderStyle} px-4 py-3`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#006747] mb-0.5">
            {isOwned && <span className="mr-1">🏆</span>}
            {bet.category}
          </div>
          <div className="text-base text-[#1a1a1a]">
            <span className="mr-1">🅰</span>
            {bet.playerName}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            Buyer: {bet.buyer}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-semibold text-[#006747]">
            {formatDollars(bet.price)}
          </div>
        </div>
      </div>
    </div>
  );
}
