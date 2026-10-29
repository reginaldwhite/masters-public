import { useState } from 'react';
import React from 'react';
import { useAtomValue } from 'jotai';
import type { Team } from '../types';
import { payoutConfigAtom, teamPlayersAtom, estimatedPotAtom, famePremiumsAtom, teamsSoldCountAtom, teamsAtom, courseFitsAtom } from '../atoms';
import { calculatePlayerEV, calculateLowSeniorEV, calculateLowAmEV, calculateHighScoreEV, deriveMarginalProbabilities } from '../utils/evCalculator';
import { formatDollars, formatPercent } from '../utils/format';
import { getTeamFamePremium, getAuctionPositionFactor, calculateExpectedPrice } from '../utils/priceCalculator';

const PLACE_GROUPS = [
  { label: '1–3', keys: ['p1', 'p2', 'p3'] as const },
  { label: '4–6', keys: ['p4', 'p5', 'p6'] as const },
  { label: '7–9', keys: ['p7', 'p8', 'p9'] as const },
] as const;

function pct(p: number): string {
  const v = p * 100;
  return v < 0.05 ? '—' : v.toFixed(1);
}

interface AuctionBlockProps {
  team: Team;
  onSold: (groupId: number, price: number, owned: boolean) => void;
  onCancel: () => void;
}

export default function AuctionBlock({ team, onSold, onCancel }: AuctionBlockProps) {
  const [priceInput, setPriceInput] = useState('');
  const [iOwned, setIOwned] = useState(false);
  const estimatedPot = useAtomValue(estimatedPotAtom);
  const payoutConfig = useAtomValue(payoutConfigAtom);
  const allPlayers = useAtomValue(teamPlayersAtom);
  const famePremiums = useAtomValue(famePremiumsAtom);
  const teamsSold = useAtomValue(teamsSoldCountAtom);
  const allTeams = useAtomValue(teamsAtom);
  const courseFits = useAtomValue(courseFitsAtom);

  const evDollars = team.ev * estimatedPot;
  const famePremium = getTeamFamePremium(team, famePremiums);
  const positionFactor = getAuctionPositionFactor(teamsSold, allTeams.length);
  const expectedPrice = calculateExpectedPrice(evDollars, famePremium, positionFactor);

  const handleSold = () => {
    const price = parseInt(priceInput.replace(/,/g, ''), 10);
    if (isNaN(price) || price <= 0) return;
    onSold(team.groupId, price, iOwned);
    setPriceInput('');
    setIOwned(false);
  };

  return (
    <div className="bg-yellow-50 border-2 border-[#FFD700] rounded-2xl shadow-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold uppercase tracking-wider text-[#006747]">
          🔨 On the Block — Group {team.groupId}
        </div>
      </div>

      {/* Player detail table */}
      <div className="bg-white rounded-xl">
        <table className="w-full text-[11px]">
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
              <th className="text-left px-2 py-1 font-medium">Player</th>
              <th className="text-right px-0.5 py-1 font-medium">Fit</th>
              {PLACE_GROUPS.map((g) => (
                <th key={g.label} className="text-right px-0.5 py-1 font-medium">{g.label}</th>
              ))}
              <th className="text-right px-2 py-1 font-medium text-[#006747]">EV</th>
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

              const hasHistory = player.payout2025 > 0 || (player.payout2024 != null && player.payout2024 > 0) || (player.payout2023 != null && player.payout2023 > 0);

              return (
                <React.Fragment key={player.name}>
                  <tr className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="px-2 pt-1 pb-0 font-medium text-gray-800">
                      <div className="truncate">
                        {player.name}
                        {player.isSenior && <span className="mr-0.5 text-amber-600">★</span>}
                        {player.isAmateur && <span className="mr-0.5 text-blue-600">🅰</span>}
                      </div>
                    </td>
                    <td className="text-right px-0.5 py-1 tabular-nums align-top">
                      {augustaScore !== null ? (
                        <span className={augustaScore >= 0 ? 'text-emerald-600 font-medium' : 'text-red-400'}>
                          {augustaScore > 0 ? '+' : ''}{augustaScore.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    {PLACE_GROUPS.map((g) => (
                      <td key={g.label} className="text-right px-0.5 py-1 text-gray-500 tabular-nums align-top">
                        {pct(g.keys.reduce((sum, k) => sum + m[k], 0))}
                      </td>
                    ))}
                    <td className="text-right px-2 py-1 font-bold text-[#006747] tabular-nums align-top">
                      {formatDollars(totalEV * estimatedPot)}
                    </td>
                  </tr>
                  {hasHistory && (
                    <tr key={`${player.name}-detail`} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                      <td colSpan={5} className="px-2 pb-1 text-[10px] text-gray-400 space-y-0.5">
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

      {/* Suggested Max Bid — what YOU should pay */}
      <div className="bg-[#006747] text-white rounded-xl px-4 py-3 text-center">
        <div className="text-xs uppercase tracking-wider text-green-200">
          Suggested Max Bid
        </div>
        <div className="text-2xl font-bold text-[#FFD700]">
          {formatDollars(evDollars)}
        </div>
        <div className="text-xs text-green-200 mt-0.5">
          {formatPercent(team.ev)} of est. {formatDollars(estimatedPot)}
        </div>
      </div>

      {/* Expected Price — what OTHERS will pay */}
      <div className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-center">
        <div className="text-xs uppercase tracking-wider text-gray-500">
          Expected Price
        </div>
        <div className="text-xl font-bold text-gray-700">
          {formatDollars(expectedPrice)}
        </div>
        <div className="flex items-center justify-center gap-3 mt-1 text-xs text-gray-500">
          {famePremium > 1.0 && (
            <span className="inline-flex items-center gap-0.5 bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
              🔥 Fame: {famePremium.toFixed(2)}×
            </span>
          )}
          {positionFactor > 1.0 && (
            <span className="inline-flex items-center gap-0.5 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
              📈 Late Auction: {positionFactor.toFixed(2)}×
            </span>
          )}
        </div>
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

      {/* I Won checkbox */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={iOwned}
          onChange={(e) => setIOwned(e.target.checked)}
          className="w-5 h-5 rounded accent-[#006747] cursor-pointer"
        />
        <span className={`text-sm font-semibold ${iOwned ? 'text-[#006747]' : 'text-gray-500'}`}>
          {iOwned ? '🏆 I won this team!' : 'I won this team'}
        </span>
      </label>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="py-3.5 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold text-base active:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSold}
          disabled={!priceInput || parseInt(priceInput.replace(/,/g, ''), 10) <= 0}
          className="py-3.5 rounded-xl bg-[#006747] text-white font-bold text-base active:bg-[#005238] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          SOLD ✓
        </button>
      </div>
    </div>
  );
}
