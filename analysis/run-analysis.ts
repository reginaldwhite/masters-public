/**
 * 2026 Masters Calcutta — Post-Tournament Analysis
 * 
 * 1. Auction order impact (top-9 last vs random)
 * 2. EV model regression (predicted vs actual payout)
 * 
 * Run: npx tsx analysis/run-analysis.ts
 */

import { BASELINE_PLAYERS_2026 } from '../src/data/baseline2026';
import { TEAMS_2026 } from '../src/data/teams2026';
import type { Player, PayoutConfig, Team } from '../src/types';
import {
  calculatePlayerEV,
  calculateLowSeniorEV,
  calculateLowAmEV,
  calculateHighScoreEV,
  calculateTeamEV,
  calculateAllTeamEVs,
} from '../src/utils/evCalculator';

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_POT = 28760;

const PAYOUT_CONFIG: PayoutConfig = {
  positions: [
    { place: 1, percentage: 25, label: '1st' },
    { place: 2, percentage: 14, label: '2nd' },
    { place: 3, percentage: 12, label: '3rd' },
    { place: 4, percentage: 10, label: '4th' },
    { place: 5, percentage: 9, label: '5th' },
    { place: 6, percentage: 8, label: '6th' },
    { place: 7, percentage: 7, label: '7th' },
    { place: 8, percentage: 5, label: '8th' },
    { place: 9, percentage: 4, label: '9th' },
  ],
  bonuses: [
    { type: 'Low Senior', percentage: 2 },
    { type: 'High Score', percentage: 2 },
    { type: 'Low Am', percentage: 2 },
  ],
};

// ── Actual Results from the 2026 Sodfather Calcutta Results Sheet ─────────────

// Position payouts (T3 gets avg of 3-6, T7 gets avg of 7-8, T9 gets 9th split)
// From the image: 
//   1st=$7,190  2nd=$4,026  T3(4 players)=$2,804ea  T7(2 players)=$1,726ea
//   T9(2 players)=$575ea
// Bonuses: Low Senior=$575 (Johnson), High Score=$575 (Riley), Low Am=$288ea (Fang & Herrington tie)

interface ActualResult {
  playerName: string;
  finishPos: string;    // "1", "2", "T3", "T7", "T9", "MC", etc
  score: number;        // total strokes
  payout: number;       // actual $ won from Calcutta
}

const ACTUAL_RESULTS: ActualResult[] = [
  // Position payouts
  { playerName: 'Rory McIlroy',       finishPos: '1',  score: 276, payout: 7190 },
  { playerName: 'Scottie Scheffler',   finishPos: '2',  score: 277, payout: 4026 },
  { playerName: 'Tyrrell Hatton',      finishPos: 'T3', score: 278, payout: 2804 },
  { playerName: 'Russell Henley',      finishPos: 'T3', score: 278, payout: 2804 },
  { playerName: 'Justin Rose',         finishPos: 'T3', score: 278, payout: 2804 },
  { playerName: 'Cameron Young',       finishPos: 'T3', score: 278, payout: 2804 },
  { playerName: 'Collin Morikawa',     finishPos: 'T7', score: 279, payout: 1726 },
  { playerName: 'Sam Burns',           finishPos: 'T7', score: 279, payout: 1726 },
  { playerName: 'Max Homa',            finishPos: 'T9', score: 280, payout: 575  },
  { playerName: 'Xander Schauffele',   finishPos: 'T9', score: 280, payout: 575  },
];

// Bonus payouts
const BONUS_RESULTS = [
  { type: 'Low Senior',  playerName: 'Zach Johnson',        payout: 575 },
  { type: 'High Score',  playerName: 'Davis Riley',         payout: 575 },
  { type: 'Low Am',      playerName: 'Ethan Fang',          payout: 288 },
  { type: 'Low Am',      playerName: 'Jackson Herrington',  payout: 288 },
];

// Auction data: { groupId, price, auctionOrder }
// Order: 10-32 random first, then 9, 8, 7, 6, 5, 4, 3, 2, 1
const AUCTION_DATA: { groupId: number; price: number; owned: boolean }[] = [
  { groupId: 1,  price: 3150, owned: false },
  { groupId: 2,  price: 2200, owned: false },
  { groupId: 3,  price: 2350, owned: false },
  { groupId: 4,  price: 1550, owned: false },
  { groupId: 5,  price: 1900, owned: true  },
  { groupId: 6,  price: 1150, owned: false },
  { groupId: 7,  price: 1400, owned: false },
  { groupId: 8,  price:  875, owned: false },
  { groupId: 9,  price:  950, owned: false },
  { groupId: 10, price:  250, owned: false },
  { groupId: 11, price:  950, owned: false },
  { groupId: 12, price:  580, owned: false },
  { groupId: 13, price:  760, owned: false },
  { groupId: 14, price:  480, owned: false },
  { groupId: 15, price:  460, owned: true  },
  { groupId: 16, price:  640, owned: false },
  { groupId: 17, price:  425, owned: false },
  { groupId: 18, price:  500, owned: false },
  { groupId: 19, price:  480, owned: false },
  { groupId: 20, price:  640, owned: false },
  { groupId: 21, price:  800, owned: true  },
  { groupId: 22, price:  460, owned: false },
  { groupId: 23, price:  760, owned: false },
  { groupId: 24, price:  420, owned: false },
  { groupId: 25, price:  420, owned: false },
  { groupId: 26, price:  440, owned: false },
  { groupId: 27, price:  375, owned: false },
  { groupId: 28, price:  600, owned: false },
  { groupId: 29, price:  575, owned: false },
  { groupId: 30, price:  480, owned: false },
  { groupId: 31, price:  700, owned: false },
  { groupId: 32, price:  500, owned: false },
];

// ── Parse Teams ───────────────────────────────────────────────────────────────

function parseTeams(teamsStr: string, allPlayers: Player[]): Team[] {
  const lines = teamsStr.split('\n').map(l => l.trim()).filter(Boolean);
  const teams: Team[] = [];
  let currentGroup = 0;
  let currentPlayers: Player[] = [];

  for (const line of lines) {
    const groupMatch = line.match(/^Group\s+(\d+)$/);
    if (groupMatch) {
      if (currentGroup > 0 && currentPlayers.length > 0) {
        teams.push({ groupId: currentGroup, players: currentPlayers, ev: 0, evDollars: 0 });
      }
      currentGroup = parseInt(groupMatch[1]);
      currentPlayers = [];
    } else {
      const name = line.replace(/\*$/, '');
      const isSenior = line.endsWith('*');
      const baseline = allPlayers.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (baseline) {
        currentPlayers.push({ ...baseline, isSenior: isSenior || baseline.isSenior });
      } else {
        // Player not in DataGolf data — create minimal entry
        currentPlayers.push({
          name,
          probabilities: { win: 0, top2: 0, top3: 0, top4: 0, top5: 0, top6: 0, top7: 0, top8: 0, top9: 0, top10: 0, makeCut: 0 },
          isSenior,
          isAmateur: false,
          payout2025: 0,
          finish2025: '',
        });
      }
    }
  }
  if (currentGroup > 0 && currentPlayers.length > 0) {
    teams.push({ groupId: currentGroup, players: currentPlayers, ev: 0, evDollars: 0 });
  }
  return teams;
}

// ── Compute Actual Team Payouts ───────────────────────────────────────────────

function computeActualTeamPayouts(teams: Team[]): Map<number, number> {
  const payoutMap = new Map<number, number>();

  // Build player → payout lookup
  const playerPayouts = new Map<string, number>();
  for (const r of ACTUAL_RESULTS) {
    playerPayouts.set(r.playerName.toLowerCase(), r.payout);
  }
  for (const b of BONUS_RESULTS) {
    const key = b.playerName.toLowerCase();
    playerPayouts.set(key, (playerPayouts.get(key) || 0) + b.payout);
  }

  for (const team of teams) {
    let teamPayout = 0;
    for (const player of team.players) {
      teamPayout += playerPayouts.get(player.name.toLowerCase()) || 0;
    }
    payoutMap.set(team.groupId, teamPayout);
  }

  return payoutMap;
}

// ── Statistical Helpers ───────────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

function pearsonR(x: number[], y: number[]): number {
  const n = x.length;
  const mx = mean(x), my = mean(y);
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  return num / Math.sqrt(dx2 * dy2);
}

function linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
  const n = x.length;
  const mx = mean(x), my = mean(y);
  let ssxy = 0, ssxx = 0;
  for (let i = 0; i < n; i++) {
    ssxy += (x[i] - mx) * (y[i] - my);
    ssxx += (x[i] - mx) ** 2;
  }
  const slope = ssxy / ssxx;
  const intercept = my - slope * mx;
  const r = pearsonR(x, y);
  return { slope, intercept, r2: r * r };
}

// ── Main Analysis ─────────────────────────────────────────────────────────────

function main() {
  // Parse teams and compute baseline EVs
  const baselinePlayers = BASELINE_PLAYERS_2026;
  const rawTeams = parseTeams(TEAMS_2026, baselinePlayers);
  // Only groups 1-32 (not amateur groups 33+)
  const teams = calculateAllTeamEVs(
    rawTeams.filter(t => t.groupId <= 32),
    baselinePlayers,
    PAYOUT_CONFIG,
    TOTAL_POT,
  );

  const actualPayouts = computeActualTeamPayouts(teams);

  // Sort teams by baseline EV descending
  const sortedByEV = [...teams].sort((a, b) => b.ev - a.ev);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: TEAM SUMMARY TABLE
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  2026 SODFATHER MASTERS CALCUTTA — POST-TOURNAMENT ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Total Pot: $${TOTAL_POT.toLocaleString()}`);
  console.log(`  Teams: ${teams.length}`);
  console.log('');

  console.log('─── Team Summary (sorted by Baseline EV) ──────────────────────');
  console.log('  Grp  Players                             EV$     Price   Actual    Net     Value');
  console.log('  ───  ──────────────────────────────────  ──────  ──────  ──────  ──────  ──────');

  for (const team of sortedByEV) {
    const price = AUCTION_DATA.find(a => a.groupId === team.groupId)?.price || 0;
    const actual = actualPayouts.get(team.groupId) || 0;
    const playerNames = team.players.map(p => p.name).join(', ');
    const truncNames = playerNames.length > 36 ? playerNames.slice(0, 33) + '...' : playerNames.padEnd(36);
    const evStr = `$${team.evDollars.toFixed(0)}`.padStart(6);
    const priceStr = `$${price}`.padStart(6);
    const actualStr = `$${actual}`.padStart(6);
    const net = actual - price;
    const netStr = `${net >= 0 ? '+' : ''}$${net}`.padStart(6);
    const valueRatio = price > 0 ? (team.evDollars / price).toFixed(2) : '—';
    console.log(`  ${String(team.groupId).padStart(3)}  ${truncNames}  ${evStr}  ${priceStr}  ${actualStr}  ${netStr}  ${String(valueRatio).padStart(5)}x`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: AUCTION ORDER IMPACT ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SECTION 2: AUCTION ORDER IMPACT ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  Format: Groups 10-32 drawn randomly, then 9→8→...→1');
  console.log('  (Top 9 by EV known in advance, auctioned last in descending order)');
  console.log('');

  // Classify teams
  const top9Teams = teams.filter(t => t.groupId <= 9);
  const randomTeams = teams.filter(t => t.groupId >= 10);

  // Price/EV ratio analysis
  const top9Ratios: { groupId: number; priceEVRatio: number; price: number; ev: number }[] = [];
  const randomRatios: { groupId: number; priceEVRatio: number; price: number; ev: number }[] = [];

  for (const team of teams) {
    const price = AUCTION_DATA.find(a => a.groupId === team.groupId)?.price || 0;
    const ratio = team.evDollars > 0 ? price / team.evDollars : 0;
    const entry = { groupId: team.groupId, priceEVRatio: ratio, price, ev: team.evDollars };
    if (team.groupId <= 9) {
      top9Ratios.push(entry);
    } else {
      randomRatios.push(entry);
    }
  }

  const avgTop9Ratio = mean(top9Ratios.map(r => r.priceEVRatio));
  const avgRandomRatio = mean(randomRatios.map(r => r.priceEVRatio));

  console.log('  Price/EV Ratio by Auction Phase:');
  console.log('  ─────────────────────────────────');
  console.log(`  Top 9 teams (known order, last):  avg Price/EV = ${avgTop9Ratio.toFixed(3)}`);
  console.log(`  Random teams (10-32, first):      avg Price/EV = ${avgRandomRatio.toFixed(3)}`);
  console.log(`  Difference:                       ${((avgTop9Ratio - avgRandomRatio) * 100).toFixed(1)}pp`);
  console.log('');

  // Fair price analysis: if prices were proportional to EV
  const totalAuctionSpend = AUCTION_DATA.reduce((s, a) => s + a.price, 0);
  const totalEV = teams.reduce((s, t) => s + t.evDollars, 0);

  console.log('  Individual Team Price/EV Ratios:');
  console.log('  ─────────────────────────────────');
  console.log('  Phase     Grp  Price    EV$    Price/EV  Fair$   Premium');
  console.log('  ────────  ───  ──────  ──────  ────────  ──────  ──────');

  const allEntries = [...top9Ratios.sort((a, b) => a.groupId - b.groupId), ...randomRatios.sort((a, b) => a.groupId - b.groupId)];
  for (const entry of [...sortedByEV].map(t => {
    const r = allEntries.find(e => e.groupId === t.groupId)!;
    return r;
  })) {
    const phase = entry.groupId <= 9 ? 'Top 9  ' : 'Random ';
    const fairPrice = (entry.ev / totalEV) * totalAuctionSpend;
    const premium = entry.price - fairPrice;
    console.log(`  ${phase}  ${String(entry.groupId).padStart(3)}  $${String(entry.price).padStart(5)}  $${entry.ev.toFixed(0).padStart(5)}  ${entry.priceEVRatio.toFixed(3).padStart(8)}  $${fairPrice.toFixed(0).padStart(5)}  ${premium >= 0 ? '+' : ''}$${premium.toFixed(0).padStart(5)}`);
  }

  // Top 9 vs Random: total spend and premium
  const top9Spend = top9Ratios.reduce((s, r) => s + r.price, 0);
  const top9EV = top9Ratios.reduce((s, r) => s + r.ev, 0);
  const randomSpend = randomRatios.reduce((s, r) => s + r.price, 0);
  const randomEV = randomRatios.reduce((s, r) => s + r.ev, 0);
  const top9FairSpend = (top9EV / totalEV) * totalAuctionSpend;
  const randomFairSpend = (randomEV / totalEV) * totalAuctionSpend;

  console.log('');
  console.log('  Aggregate Spend Analysis:');
  console.log('  ─────────────────────────');
  console.log(`  Top 9:    Spent $${top9Spend.toLocaleString()} on $${top9EV.toFixed(0)} EV (fair: $${top9FairSpend.toFixed(0)}) → premium: $${(top9Spend - top9FairSpend).toFixed(0)}`);
  console.log(`  Random:   Spent $${randomSpend.toLocaleString()} on $${randomEV.toFixed(0)} EV (fair: $${randomFairSpend.toFixed(0)}) → premium: $${(randomSpend - randomFairSpend).toFixed(0)}`);
  console.log(`  Top 9 % of pot spent: ${(top9Spend / totalAuctionSpend * 100).toFixed(1)}%  (EV share: ${(top9EV / totalEV * 100).toFixed(1)}%)`);
  console.log(`  Random % of pot spent: ${(randomSpend / totalAuctionSpend * 100).toFixed(1)}%  (EV share: ${(randomEV / totalEV * 100).toFixed(1)}%)`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: EV MODEL REGRESSION — PREDICTED VS ACTUAL
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SECTION 3: EV MODEL REGRESSION — PREDICTED VS ACTUAL');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  const predictedEVs: number[] = [];
  const actualPayoutsArr: number[] = [];
  const residuals: { groupId: number; predicted: number; actual: number; residual: number; players: string }[] = [];

  for (const team of teams) {
    const predicted = team.evDollars;
    const actual = actualPayouts.get(team.groupId) || 0;
    predictedEVs.push(predicted);
    actualPayoutsArr.push(actual);
    residuals.push({
      groupId: team.groupId,
      predicted,
      actual,
      residual: actual - predicted,
      players: team.players.map(p => p.name).join(', '),
    });
  }

  const reg = linearRegression(predictedEVs, actualPayoutsArr);
  const r = pearsonR(predictedEVs, actualPayoutsArr);
  const meanResidual = mean(residuals.map(r => r.residual));
  const stdResidual = stddev(residuals.map(r => r.residual));

  console.log('  Linear Regression: Actual = slope × Predicted + intercept');
  console.log('  ──────────────────────────────────────────────────────────');
  console.log(`  Slope:      ${reg.slope.toFixed(4)}`);
  console.log(`  Intercept:  $${reg.intercept.toFixed(0)}`);
  console.log(`  R²:         ${reg.r2.toFixed(4)}`);
  console.log(`  R:          ${r.toFixed(4)}`);
  console.log(`  Mean Resid: $${meanResidual.toFixed(0)}`);
  console.log(`  Std Resid:  $${stdResidual.toFixed(0)}`);
  console.log('');
  console.log('  Interpretation:');
  if (reg.slope > 1.1) {
    console.log('  ⚠️  Slope > 1.1 → Model underestimates top teams');
  } else if (reg.slope < 0.9) {
    console.log('  ⚠️  Slope < 0.9 → Model overestimates top teams');
  } else {
    console.log('  ✅ Slope near 1.0 → Model calibration on magnitude is reasonable');
  }
  if (Math.abs(reg.intercept) > 200) {
    console.log(`  ⚠️  Large intercept ($${reg.intercept.toFixed(0)}) → systematic bias for low-EV teams`);
  }
  if (reg.r2 < 0.3) {
    console.log('  ⚠️  Low R² → model has weak predictive power for individual outcomes');
    console.log('       (expected — golf is high-variance; 1 tournament is a tiny sample)');
  }

  // Largest residuals
  const sortedResiduals = [...residuals].sort((a, b) => Math.abs(b.residual) - Math.abs(a.residual));
  console.log('');
  console.log('  Largest Residuals (model misses):');
  console.log('  ──────────────────────────────────');
  console.log('  Grp  Predicted  Actual  Residual  Players');
  for (const r of sortedResiduals.slice(0, 10)) {
    console.log(`  ${String(r.groupId).padStart(3)}  $${r.predicted.toFixed(0).padStart(7)}  $${r.actual.toFixed(0).padStart(6)}  ${r.residual >= 0 ? '+' : ''}$${r.residual.toFixed(0).padStart(6)}  ${r.players.slice(0, 50)}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: STRUCTURAL ANALYSIS — TEAM SIZE & BONUSES
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SECTION 4: STRUCTURAL ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // By team size
  const bySize = new Map<number, { predicted: number[]; actual: number[]; prices: number[] }>();
  for (const team of teams) {
    const size = team.players.length;
    if (!bySize.has(size)) bySize.set(size, { predicted: [], actual: [], prices: [] });
    const bucket = bySize.get(size)!;
    bucket.predicted.push(team.evDollars);
    bucket.actual.push(actualPayouts.get(team.groupId) || 0);
    bucket.prices.push(AUCTION_DATA.find(a => a.groupId === team.groupId)?.price || 0);
  }

  console.log('  By Team Size:');
  console.log('  ──────────────');
  console.log('  Size  Count  Avg Predicted  Avg Actual  Avg Price  Avg Price/EV');
  for (const [size, data] of [...bySize.entries()].sort((a, b) => a[0] - b[0])) {
    const avgP = mean(data.predicted);
    const avgA = mean(data.actual);
    const avgPrice = mean(data.prices);
    const avgRatio = avgPrice / avgP;
    console.log(`  ${size}p    ${String(data.predicted.length).padStart(5)}  $${avgP.toFixed(0).padStart(11)}  $${avgA.toFixed(0).padStart(9)}  $${avgPrice.toFixed(0).padStart(8)}  ${avgRatio.toFixed(3).padStart(11)}`);
  }

  // Senior teams
  console.log('');
  console.log('  Senior Team Premium Analysis:');
  console.log('  ──────────────────────────────');
  const seniorTeams = teams.filter(t => t.players.some(p => p.isSenior));
  const nonSeniorTeams = teams.filter(t => !t.players.some(p => p.isSenior));

  const seniorPriceEV = seniorTeams.map(t => {
    const price = AUCTION_DATA.find(a => a.groupId === t.groupId)?.price || 0;
    return price / t.evDollars;
  });
  const nonSeniorPriceEV = nonSeniorTeams.map(t => {
    const price = AUCTION_DATA.find(a => a.groupId === t.groupId)?.price || 0;
    return t.evDollars > 0 ? price / t.evDollars : 0;
  });

  console.log(`  Senior teams (${seniorTeams.length}):     avg Price/EV = ${mean(seniorPriceEV).toFixed(3)}`);
  console.log(`  Non-senior teams (${nonSeniorTeams.length}): avg Price/EV = ${mean(nonSeniorPriceEV).toFixed(3)}`);

  // Did the Low Senior model work?
  const johnsonTeam = teams.find(t => t.players.some(p => p.name.toLowerCase().includes('johnson')));
  if (johnsonTeam) {
    const johnsonPlayer = johnsonTeam.players.find(p => p.name.toLowerCase().includes('johnson'));
    if (johnsonPlayer) {
      const seniorEV = calculateLowSeniorEV(johnsonPlayer, baselinePlayers) * TOTAL_POT;
      console.log(`  Low Senior winner (Zach Johnson): Model EV=$${seniorEV.toFixed(0)}, Actual=$575`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: OUR TEAMS — HOW DID WE DO?
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SECTION 5: OUR TEAMS — PERFORMANCE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  const ownedTeams = AUCTION_DATA.filter(a => a.owned);
  let totalPaid = 0;
  let totalActual = 0;
  let totalPredicted = 0;

  for (const owned of ownedTeams) {
    const team = teams.find(t => t.groupId === owned.groupId)!;
    const actual = actualPayouts.get(owned.groupId) || 0;
    const players = team.players.map(p => p.name).join(', ');
    const net = actual - owned.price;
    console.log(`  Group ${owned.groupId}: ${players}`);
    console.log(`    Paid: $${owned.price}  EV: $${team.evDollars.toFixed(0)}  Actual: $${actual}  Net: ${net >= 0 ? '+' : ''}$${net}`);
    totalPaid += owned.price;
    totalActual += actual;
    totalPredicted += team.evDollars;
  }

  // Amateur bet
  console.log('  Amateur bet: Jackson Herrington');
  console.log(`    Paid: $60  Actual: $288  Net: +$228`);
  totalPaid += 60;
  totalActual += 288;

  console.log('');
  console.log(`  TOTAL:  Paid $${totalPaid}  Predicted EV $${totalPredicted.toFixed(0)}  Actual $${totalActual}  Net: ${totalActual - totalPaid >= 0 ? '+' : ''}$${totalActual - totalPaid}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: MODEL RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SECTION 6: MODEL RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // Check if contention boost helped
  // Recalculate without boost for comparison
  const nBoostConfig = { ...PAYOUT_CONFIG };
  // We can't easily disable boost here without modifying the calculator,
  // but we can analyze qualitatively

  // Which predicted top-9 teams actually had top-9 finishers?
  const teamsWithTop9Finish = teams.filter(t => (actualPayouts.get(t.groupId) || 0) > 0);
  const top9ByEV = sortedByEV.slice(0, 9);
  const top9ByEVWithPayout = top9ByEV.filter(t => (actualPayouts.get(t.groupId) || 0) > 0);

  console.log('  Prediction Accuracy:');
  console.log('  ────────────────────');
  console.log(`  Teams that actually paid out: ${teamsWithTop9Finish.length} of 32`);
  console.log(`  Our top 9 EV teams that paid out: ${top9ByEVWithPayout.length} of 9`);
  console.log(`  Teams with payout from bottom 23: ${teamsWithTop9Finish.length - top9ByEVWithPayout.length}`);

  // Position-level analysis: did the top predicted individual players finish well?
  console.log('');
  console.log('  Top 10 Individual Players by Baseline EV:');
  console.log('  ──────────────────────────────────────────');

  const playerEVs = baselinePlayers
    .map(p => {
      const mainEV = calculatePlayerEV(p.probabilities, PAYOUT_CONFIG);
      const seniorEV = calculateLowSeniorEV(p, baselinePlayers);
      const amEV = calculateLowAmEV(p, baselinePlayers);
      const highEV = calculateHighScoreEV(p, baselinePlayers);
      return { name: p.name, ev: (mainEV + seniorEV + amEV + highEV) * TOTAL_POT };
    })
    .sort((a, b) => b.ev - a.ev);

  console.log('  Player                    Predicted EV  Actual Finish  Payout');
  for (const pe of playerEVs.slice(0, 15)) {
    const result = ACTUAL_RESULTS.find(r => r.playerName.toLowerCase() === pe.name.toLowerCase());
    const bonus = BONUS_RESULTS.find(r => r.playerName.toLowerCase() === pe.name.toLowerCase());
    const finish = result?.finishPos || 'MC/Outside top 10';
    const payout = (result?.payout || 0) + (bonus?.payout || 0);
    console.log(`  ${pe.name.padEnd(26)} $${pe.ev.toFixed(0).padStart(10)}  ${finish.padStart(14)}  $${payout.toFixed(0).padStart(6)}`);
  }

  console.log('');
  console.log('  Key Findings & Recommendations:');
  console.log('  ───────────────────────────────');
  
  // Auto-generate findings based on data
  if (avgTop9Ratio > avgRandomRatio + 0.05) {
    console.log('  1. AUCTION ORDER EFFECT: Top-9 teams paid a significant premium');
    console.log(`     (avg ${(avgTop9Ratio * 100).toFixed(0)}% of EV vs ${(avgRandomRatio * 100).toFixed(0)}% for random teams).`);
    console.log('     → Strategy: in a descending-last format, budget for random teams');
    console.log('       where price/EV is more favorable.');
  } else if (avgRandomRatio > avgTop9Ratio + 0.05) {
    console.log('  1. AUCTION ORDER EFFECT: Random-draw teams paid MORE per EV dollar');
    console.log(`     (avg ${(avgRandomRatio * 100).toFixed(0)}% of EV vs ${(avgTop9Ratio * 100).toFixed(0)}% for top-9).`);
    console.log('     → The known order may have anchored top-9 prices closer to fair value,');
    console.log('       while random draw created bidding frenzies on lucky early teams.');
  } else {
    console.log('  1. AUCTION ORDER EFFECT: Minimal difference in pricing efficiency.');
    console.log('     → The format change did not dramatically shift price/EV ratios.');
  }

  if (reg.r2 < 0.3) {
    console.log('');
    console.log('  2. MODEL PREDICTIVE POWER: R² is low (expected for 1 tournament).');
    console.log('     Golf has extreme outcome variance — a low R² does not mean the');
    console.log('     model is miscalibrated; it means one tournament is insufficient');
    console.log('     to validate. Multi-year analysis needed.');
  }

  if (Math.abs(reg.slope - 1) > 0.3) {
    console.log('');
    console.log(`  3. CALIBRATION: Slope of ${reg.slope.toFixed(2)} deviates from 1.0.`);
    if (reg.slope > 1) {
      console.log('     Top teams returned MORE than predicted — consider if contention');
      console.log('     boost (currently 0.20) should be increased.');
    } else {
      console.log('     Top teams returned LESS than predicted — contention boost may');
      console.log('     be too aggressive. Consider reducing from 0.20.');
    }
  }

  console.log('');
}

main();
