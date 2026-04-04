import { useAtomValue } from 'jotai';
import {
  poolAtom,
  teamsWithEVAtom,
  teamsSoldCountAtom,
  teamsAtom,
} from '../atoms';
import { formatDollars } from '../utils/format';

export default function DashboardHeader() {
  const pool = useAtomValue(poolAtom);
  const teams = useAtomValue(teamsAtom);
  const teamsWithEV = useAtomValue(teamsWithEVAtom);
  const soldCount = useAtomValue(teamsSoldCountAtom);

  const totalTeams = teams.length;
  const avgEV =
    teamsWithEV.length > 0
      ? teamsWithEV.reduce((sum, t) => sum + t.ev, 0) / teamsWithEV.length
      : 0;

  return (
    <header className="sticky top-0 z-50 bg-[#006747] text-white shadow-lg">
      <div className="px-4 py-3">
        <h1 className="text-lg font-bold tracking-wide flex items-center gap-2">
          <span>⛳</span>
          <span>Masters Calcutta</span>
        </h1>
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
