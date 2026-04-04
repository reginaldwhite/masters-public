import { useAtomValue, useSetAtom } from 'jotai';
import {
  poolAtom,
  teamsWithEVAtom,
  teamsSoldCountAtom,
  teamsAtom,
  viewAtom,
  apiKeyAtom,
  playersAtom,
  famePremiumsAtom,
  amateursAtom,
  auctionAtom,
  onTheBlockAtom,
} from '../atoms';
import { formatDollars } from '../utils/format';

export default function DashboardHeader() {
  const pool = useAtomValue(poolAtom);
  const teams = useAtomValue(teamsAtom);
  const teamsWithEV = useAtomValue(teamsWithEVAtom);
  const soldCount = useAtomValue(teamsSoldCountAtom);

  const setView = useSetAtom(viewAtom);
  const setApiKey = useSetAtom(apiKeyAtom);
  const setPlayers = useSetAtom(playersAtom);
  const setTeams = useSetAtom(teamsAtom);
  const setFamePremiums = useSetAtom(famePremiumsAtom);
  const setAmateurs = useSetAtom(amateursAtom);
  const setAuction = useSetAtom(auctionAtom);
  const setOnTheBlock = useSetAtom(onTheBlockAtom);

  const totalTeams = teams.length;
  const avgEV =
    teamsWithEV.length > 0
      ? teamsWithEV.reduce((sum, t) => sum + t.ev, 0) / teamsWithEV.length
      : 0;

  const handleReset = () => {
    if (!confirm('Reset all data and return to Setup?')) return;
    setApiKey('');
    setPlayers([]);
    setTeams([]);
    setFamePremiums([]);
    setAmateurs([]);
    setAuction(new Map());
    setOnTheBlock(null);
    setView('setup');
  };

  return (
    <header className="sticky top-0 z-50 bg-[#006747] text-white shadow-lg">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-wide flex items-center gap-2">
            <span>⛳</span>
            <span>Masters Calcutta</span>
          </h1>
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
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          {/* Pool Total */}
          <div className="bg-white/10 rounded-lg px-2 py-2">
            <div className="text-[10px] uppercase tracking-wider text-green-200 font-medium">
              Pool
            </div>
            <div className="text-lg font-bold text-[#FFD700]">
              {pool > 0 ? formatDollars(pool) : '$0'}
            </div>
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
      </div>
    </header>
  );
}
