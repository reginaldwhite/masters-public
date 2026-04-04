export interface Player {
  name: string;
  dgId?: number;
  probabilities: PositionProbabilities;
  isSenior: boolean;
  isAmateur: boolean;
  payout2025: number;
  finish2025: string;
}

export interface PositionProbabilities {
  win: number;
  top2: number;
  top3: number;
  top4: number;
  top5: number;
  top6: number;
  top7: number;
  top8: number;
  top9: number;
  top10: number;
  makeCut: number;
}

export interface Team {
  groupId: number;
  players: Player[];
  ev: number;           // calculated EV as fraction of pool
  evDollars: number;     // ev × pool total
}

export interface AuctionEntry {
  groupId: number;
  price: number;
  auctionOrder: number;
  sold: boolean;
}

export interface PayoutConfig {
  positions: { place: number; percentage: number; label: string }[];
  bonuses: { type: string; percentage: number }[];
}

export interface FamePremium {
  playerName: string;
  multiplier: number;
}
