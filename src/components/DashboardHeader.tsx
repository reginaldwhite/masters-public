import { useAtomValue, useSetAtom } from 'jotai';
import { useState } from 'react';
import {
  poolAtom,
  estimatedPotAtom,
  teamsWithEVAtom,
  teamsSoldCountAtom,
  teamsAtom,
  auctionAtom,
  onTheBlockAtom,
  amateurBetsAtom,
  baselineTimestampAtom,
} from '../atoms';
import { formatDollars } from '../utils/format';
import { buildAuction2026Map, AMATEUR_BETS_2026 } from '../data/auction2026';

interface DashboardHeaderProps {
  onRefresh: () => Promise<void>;
}

export default function DashboardHeader({ onRefresh }: DashboardHeaderProps) {
  const pool = useAtomValue(poolAtom);
  const estimatedPot = useAtomValue(estimatedPotAtom);
  const teams = useAtomValue(teamsAtom);
  const teamsWithEV = useAtomValue(teamsWithEVAtom);
  const soldCount = useAtomValue(teamsSoldCountAtom);

  const setAuction = useSetAtom(auctionAtom);
  const setOnTheBlock = useSetAtom(onTheBlockAtom);
  const setAmateurBets = useSetAtom(amateurBetsAtom);
  const baselineTs = useAtomValue(baselineTimestampAtom);

  const [refreshing, setRefreshing] = useState(false);

  const totalTeams = teams.length;
  const avgEV =
    teamsWithEV.length > 0
      ? teamsWithEV.reduce((sum, t) => sum + t.ev, 0) / teamsWithEV.length
      : 0;

  const handleReset = () => {
    if (!confirm('Clear all auction results? Teams and player data will be kept.')) return;
    setAuction(new Map());
    setOnTheBlock(null);
    setAmateurBets([]);
  };

  const handleLoad2026 = () => {
    if (!confirm('Load 2026 Sodfather auction results? This will overwrite any existing auction data.')) return;
    setAuction(buildAuction2026Map());
    setAmateurBets(AMATEUR_BETS_2026);
    setOnTheBlock(null);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const baselineLabel = baselineTs
    ? `Baseline: ${new Date(baselineTs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${new Date(baselineTs).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : '';

  return (
    <header className="sticky top-0 z-50 bg-[#006747] text-white shadow-lg">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-wide flex items-center gap-2">
            <span>⛳</span>
            <span>Masters Calcutta</span>
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-[10px] font-bold text-green-200 border border-green-200/50 rounded px-2 py-1 hover:bg-white/10 transition-colors disabled:opacity-50"
              title="Re-fetch latest odds from DataGolf"
            >
              {refreshing ? '⏳' : '🔄'} REFRESH
            </button>
            <button
              type="button"
              onClick={handleLoad2026}
              className="text-[10px] font-bold text-[#FFD700] border border-[#FFD700]/50 rounded px-2 py-1 hover:bg-[#FFD700]/10 transition-colors"
              title="Load 2026 auction results"
            >
              LOAD '26
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="text-green-200 hover:text-white transition-colors p-1"
              aria-label="Reset all data"
              title="Reset All"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          {/* Estimated Pot */}
          <div className="bg-white/10 rounded-lg px-2 py-2">
            <div className="text-[10px] uppercase tracking-wider text-green-200 font-medium">
              Est. Pot
            </div>
            <div className="text-lg font-bold text-[#FFD700]">
              {formatDollars(estimatedPot)}
            </div>
            {pool > 0 && (
              <div className="text-[10px] text-green-300">
                {formatDollars(pool)} collected
              </div>
            )}
          </div>

          {/* Teams Sold */}
          <div className="bg-white/10 rounded-lg px-2 py-2">
            <div className="text-[10px] uppercase tracking-wider text-green-200 font-medium">
              Sold
            </div>
            <div className="text-lg font-bold">
              {soldCount} / {totalTeams}
            </div>
          </div>

          {/* Average EV */}
          <div className="bg-white/10 rounded-lg px-2 py-2">
            <div className="text-[10px] uppercase tracking-wider text-green-200 font-medium">
              Avg EV
            </div>
            <div className="text-lg font-bold">
              {avgEV > 0 ? (avgEV * 100).toFixed(1) + '%' : '—'}
            </div>
          </div>
        </div>
        {baselineLabel && (
          <div className="mt-1.5 text-center text-[10px] text-green-300/70">
            📸 {baselineLabel}
          </div>
        )}
      </div>
    </header>
  );
}
