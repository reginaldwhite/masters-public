import { useState } from 'react';
import { useAtomValue, useAtom } from 'jotai';
import {
  soldTeamsAtom,
  auctionAtom,
  estimatedPotAtom,
} from '../atoms';
import { formatDollars, formatPercent } from '../utils/format';

export default function ResultsView() {
  const soldTeams = useAtomValue(soldTeamsAtom);
  const [auction, setAuction] = useAtom(auctionAtom);
  const estimatedPot = useAtomValue(estimatedPotAtom);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  if (soldTeams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400 px-6">
        <div className="text-4xl">🏌️</div>
        <p className="text-base font-medium">No teams sold yet</p>
        <p className="text-sm text-center">Sold teams will appear here once the auction begins.</p>
      </div>
    );
  }

  // Sort by sale price descending
  const sorted = [...soldTeams]
    .map((team) => ({ team, entry: auction.get(team.groupId)! }))
    .filter(({ entry }) => !!entry)
    .sort((a, b) => b.entry.price - a.entry.price);

  const totalCollected = sorted.reduce((sum, { entry }) => sum + entry.price, 0);

  const myTeams = sorted.filter(({ entry }) => entry.owned);
  const myTotalPaid = myTeams.reduce((sum, { entry }) => sum + entry.price, 0);
  const myTotalEV   = myTeams.reduce((sum, { team }) => sum + team.ev * estimatedPot, 0);

  const startEdit = (groupId: number, currentPrice: number) => {
    setEditingId(groupId);
    setEditValue(String(currentPrice));
  };

  const commitEdit = (groupId: number) => {
    const price = parseInt(editValue.replace(/,/g, ''), 10);
    if (!isNaN(price) && price > 0) {
      const existing = auction.get(groupId);
      if (existing) {
        const next = new Map(auction);
        next.set(groupId, { ...existing, price });
        setAuction(next);
      }
    }
    setEditingId(null);
  };

  return (
    <div className="px-4 py-4 pb-20">
      {/* Summary bar */}
      <div className="bg-[#006747] text-white rounded-xl px-4 py-3 mb-3 flex justify-between items-center">
        <div className="text-sm font-semibold">
          {sorted.length} team{sorted.length !== 1 ? 's' : ''} sold
        </div>
        <div className="text-right">
          <div className="text-xs text-green-200 uppercase tracking-wider">Collected</div>
          <div className="text-lg font-bold text-[#FFD700]">{formatDollars(totalCollected)}</div>
        </div>
      </div>

      {/* My Teams banner — shown when at least one owned team */}
      {myTeams.length > 0 && (
        <div className="bg-[#FFD700] rounded-xl px-4 py-3 mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[#4a3500] mb-2">
            🏆 My Teams
          </div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-2xl font-bold text-[#1a1a00]">
                {myTeams.length} team{myTeams.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#4a3500] uppercase tracking-wider">Total Paid</div>
              <div className="text-lg font-bold text-[#1a1a00]">{formatDollars(myTotalPaid)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#4a3500] uppercase tracking-wider">Total EV</div>
              <div className={`text-lg font-bold ${myTotalEV >= myTotalPaid ? 'text-[#006747]' : 'text-red-700'}`}>
                {formatDollars(myTotalEV)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2rem_1fr_auto_auto] gap-x-3 items-center px-3 py-2 bg-gray-50 border-b border-gray-100">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold text-center">#</div>
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Team</div>
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold text-right">EV</div>
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold text-right">Sold</div>
        </div>

        {sorted.map(({ team, entry }, idx) => {
          const evDollars = team.ev * estimatedPot;
          const ratio = evDollars > 0 ? entry.price / evDollars : null;
          const isOver  = ratio != null && ratio > 1.05;
          const isUnder = ratio != null && ratio < 0.95;

          return (
            <div
              key={team.groupId}
              className={`grid grid-cols-[2rem_1fr_auto_auto] gap-x-3 items-start px-3 py-3 border-b border-gray-50 last:border-0 ${
                entry.owned
                  ? 'bg-yellow-50 border-l-4 border-l-[#FFD700]'
                  : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
              }`}
            >
              {/* Rank */}
              <div className="text-xs font-bold text-gray-400 text-center pt-0.5">{idx + 1}</div>

              {/* Players */}
              <div>
                <div className="text-[10px] font-semibold text-gray-400 mb-0.5">
                  {entry.owned && <span className="mr-0.5">🏆</span>}Group {team.groupId}
                </div>
                {team.players.map((p) => (
                  <div key={p.name} className="text-sm font-medium text-gray-800 leading-snug">
                    {p.name}
                    {p.isSenior && <span className="text-amber-500 text-xs ml-1">★</span>}
                    {p.isAmateur && <span className="text-blue-500 text-xs ml-1">(a)</span>}
                  </div>
                ))}
              </div>

              {/* EV */}
              <div className="text-right pt-0.5">
                <div className="text-xs text-gray-400">{formatDollars(evDollars)}</div>
                <div className="text-[10px] text-gray-300">{formatPercent(team.ev)}</div>
              </div>

              {/* Sale price + value badge + edit */}
              <div className="text-right pt-0.5">
                {editingId === team.groupId ? (
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-gray-400 text-xs">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editValue}
                      autoFocus
                      onChange={(e) => setEditValue(e.target.value.replace(/[^\d]/g, ''))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit(team.groupId);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="w-16 text-right text-sm font-bold border border-[#006747] rounded px-1 py-0.5 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => commitEdit(team.groupId)}
                      className="text-[#006747] font-bold text-xs px-1"
                    >✓</button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-gray-400 text-xs px-0.5"
                    >✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 justify-end">
                    <div className="text-sm font-bold text-gray-900">{formatDollars(entry.price)}</div>
                    <button
                      type="button"
                      onClick={() => startEdit(team.groupId, entry.price)}
                      className="text-gray-300 hover:text-gray-500 active:text-[#006747] transition-colors p-0.5"
                      title="Edit price"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                      </svg>
                    </button>
                  </div>
                )}
                {editingId !== team.groupId && ratio != null && (
                  <div
                    className={`text-[10px] font-semibold ${
                      isOver ? 'text-red-500' : isUnder ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    {isOver ? '▲' : isUnder ? '▼' : '≈'} {Math.round(Math.abs(ratio - 1) * 100)}%
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-400 text-center mt-3">
        ▲ over EV · ▼ under EV · ≈ fair value (±5%)
      </p>
    </div>
  );
}
