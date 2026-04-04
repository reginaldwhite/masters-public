import { useState } from 'react';
import { useAtomValue } from 'jotai';
import type { Team } from '../types';
import { payoutConfigAtom, playersAtom, poolAtom } from '../atoms';
import { calculatePlayerEV, calculateLowSeniorEV, calculateLowAmEV, calculateHighScoreEV } from '../utils/evCalculator';
import { formatDollars, formatPercent } from '../utils/format';

interface AuctionBlockProps {
  team: Team;
  onSold: (groupId: number, price: number) => void;
  onCancel: () => void;
}

export default function AuctionBlock({ team, onSold, onCancel }: AuctionBlockProps) {
  const [priceInput, setPriceInput] = useState('');
  const pool = useAtomValue(poolAtom);
  const payoutConfig = useAtomValue(payoutConfigAtom);
  const allPlayers = useAtomValue(playersAtom);

  const evDollars = pool > 0 ? team.ev * pool : 0;

  const handleSold = () => {
    const price = parseInt(priceInput.replace(/,/g, ''), 10);
    if (isNaN(price) || price <= 0) return;
    onSold(team.groupId, price);
    setPriceInput('');
  };

  return (
    <div className="bg-yellow-50 border-2 border-[#FFD700] rounded-2xl shadow-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold uppercase tracking-wider text-[#006747]">
          🔨 On the Block — Group {team.groupId}
        </div>
      </div>

      {/* Player breakdown */}
      <div className="space-y-2">
        {team.players.map((player) => {
          const mainEV = calculatePlayerEV(player.probabilities, payoutConfig);
          const seniorEV = calculateLowSeniorEV(player, allPlayers);
          const amEV = calculateLowAmEV(player, allPlayers);
          const highScoreEV = calculateHighScoreEV(player, allPlayers);
          const totalPlayerEV = mainEV + seniorEV + amEV + highScoreEV;
          const playerEvDollars = pool > 0 ? totalPlayerEV * pool : 0;

          return (
            <div
              key={player.name}
              className="flex items-center justify-between bg-white rounded-lg px-3 py-2"
            >
              <div>
                <div className="text-[15px] font-medium text-[#1a1a1a]">
                  {player.isSenior && <span className="mr-1">★</span>}
                  {player.isAmateur && <span className="mr-1">🅰</span>}
                  {player.name}
                </div>
                {player.payout2025 > 0 && (
                  <div className="text-[11px] text-gray-400">
                    2025: {formatDollars(player.payout2025)} ({player.finish2025})
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-[#006747]">
                  {formatPercent(totalPlayerEV)}
                </div>
                {pool > 0 && (
                  <div className="text-xs text-gray-500">
                    {formatDollars(playerEvDollars)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Team Total EV */}
      <div className="bg-[#006747] text-white rounded-xl px-4 py-3 text-center">
        <div className="text-xs uppercase tracking-wider text-green-200">
          Team Total EV
        </div>
        <div className="text-2xl font-bold text-[#FFD700]">
          {formatPercent(team.ev)}
        </div>
        {pool > 0 && (
          <div className="text-base font-semibold">
            {formatDollars(evDollars)}
          </div>
        )}
        {pool > 0 && (
          <div className="mt-1 text-xs text-green-200">
            Suggested max bid: {formatDollars(evDollars)}
          </div>
        )}
      </div>

      {/* Price Input */}
      <div className="space-y-2">
        <label
          htmlFor="bid-price"
          className="block text-sm font-medium text-gray-700"
        >
          Winning Bid
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
            $
          </span>
          <input
            id="bid-price"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={priceInput}
            onChange={(e) => {
              // Allow only digits and commas
              const val = e.target.value.replace(/[^\d,]/g, '');
              setPriceInput(val);
            }}
            className="w-full pl-8 pr-4 py-3 text-xl font-bold rounded-xl border-2 border-gray-300 focus:border-[#006747] focus:outline-none text-center"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold text-base active:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSold}
          disabled={!priceInput || parseInt(priceInput.replace(/,/g, ''), 10) <= 0}
          className="py-3 rounded-xl bg-[#006747] text-white font-bold text-base active:bg-[#005238] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          SOLD ✓
        </button>
      </div>
    </div>
  );
}
