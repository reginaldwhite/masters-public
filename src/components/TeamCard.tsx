import type { Team, AuctionEntry, FamePremium } from '../types';
import { formatDollars, formatPercent } from '../utils/format';
import ValueBadge from './ValueBadge';
import { getTeamFamePremium } from '../utils/priceCalculator';

interface TeamCardProps {
  team: Team;
  auctionEntry?: AuctionEntry;
  isOnTheBlock: boolean;
  pool: number;
  famePremiums: FamePremium[];
  onSelect: (groupId: number) => void;
}

export default function TeamCard({
  team,
  auctionEntry,
  isOnTheBlock,
  pool,
  famePremiums,
  onSelect,
}: TeamCardProps) {
  const isSold = !!auctionEntry;
  const evDollars = pool > 0 ? team.ev * pool : 0;
  const hasFamePremium = getTeamFamePremium(team, famePremiums) > 1.0;

  let cardBg = 'bg-white';
  let borderStyle = 'border border-gray-200';
  if (isOnTheBlock) {
    cardBg = 'bg-yellow-50';
    borderStyle = 'border-2 border-[#FFD700]';
  } else if (isSold) {
    cardBg = 'bg-[#e8f5e9]';
    borderStyle = 'border border-green-300';
  }

  return (
    <button
      type="button"
      className={`w-full text-left rounded-xl shadow-sm ${cardBg} ${borderStyle} px-4 py-3 transition-all active:scale-[0.98]`}
      onClick={() => !isSold && onSelect(team.groupId)}
      disabled={isSold}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Group + Players */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#006747] mb-1">
            Group {team.groupId}
            {hasFamePremium && <span className="ml-1" title="Fame premium">🔥</span>}
          </div>
          <div className="space-y-0.5">
            {team.players.map((player) => (
              <div key={player.name} className="leading-tight">
                <span className="text-base text-[#1a1a1a]">
                  {player.isSenior && <span className="mr-1">★</span>}
                  {player.isAmateur && <span className="mr-1">🅰</span>}
                  {player.name}
                </span>
                {player.payout2025 > 0 && (
                  <span className="ml-1.5 text-[11px] text-gray-400">
                    {formatDollars(player.payout2025)}{' '}
                    ({player.finish2025})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: EV */}
        <div className="text-right shrink-0">
          <div className="text-base font-bold text-[#006747]">
            {formatPercent(team.ev)}
          </div>
          {pool > 0 && (
            <div className="text-sm text-gray-500">
              {formatDollars(evDollars)}
            </div>
          )}
          {isSold && auctionEntry && (
            <div className="mt-1 space-y-0.5">
              <div className="text-sm font-semibold text-[#006747]">
                {formatDollars(auctionEntry.price)}
              </div>
              <ValueBadge evDollars={evDollars} price={auctionEntry.price} />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
