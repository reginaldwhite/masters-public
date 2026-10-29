export interface Player {
  name: string;
  dgId?: number;
  dgRank?: number;
  probabilities: PositionProbabilities;
  isSenior: boolean;
  isAmateur: boolean;
  payout2025: number;
  finish2025: string;
  payout2024?: number;
  finish2024?: string;
  payout2023?: number;
  finish2023?: string;
  sgOtt?: number;
  sgApp?: number;
  sgAtg?: number;
  sgPutt?: number;
  // Live tournament data (populated from in-play endpoint)
  currentScore?: number;
  currentPos?: string;
  thru?: number;
  today?: number;
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
  owned?: boolean;
}

export interface PayoutConfig {
  positions: { place: number; percentage: number; label: string }[];
  bonuses: { type: string; percentage: number }[];
}

export interface FamePremium {
  playerName: string;
  multiplier: number;
}

export interface CourseFit {
  playerName: string;
  score: number;  // -1 (worst fit) to +1 (best fit)
}

export interface AmateurBet {
  id: number;        // unique id
  playerName: string;
  category: string;  // e.g. "US Am", "British Am"
  price: number;
  buyer: string;
  owned: boolean;
}
