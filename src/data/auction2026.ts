import type { AuctionEntry, AmateurBet } from '../types';

/**
 * 9th Annual Sodfather Masters Calcutta — 2026 Complete Auction Results
 * Total pot: $28,760
 * Owned teams: 5 (Ludvig Åberg / Vijay Singh),
 *              15 (Min Woo Lee / Aaron Rai / Nick Taylor),
 *              21 (Russell Henley / Sam Burns / Maverick McNealy)
 * Owned amateurs: Jackson Herrington (US Am 2nd)
 */
const RAW: Array<{ groupId: number; price: number; owned: boolean }> = [
  { groupId: 1,  price: 3150, owned: false },
  { groupId: 2,  price: 2200, owned: false },
  { groupId: 3,  price: 2350, owned: false },
  { groupId: 4,  price: 1550, owned: false },
  { groupId: 5,  price: 1900, owned: true  }, // Ludvig Åberg / Vijay Singh
  { groupId: 6,  price: 1150, owned: false },
  { groupId: 7,  price: 1400, owned: false },
  { groupId: 8,  price:  875, owned: false },
  { groupId: 9,  price:  950, owned: false },
  { groupId: 10, price:  250, owned: false },
  { groupId: 11, price:  950, owned: false },
  { groupId: 12, price:  580, owned: false },
  { groupId: 13, price:  760, owned: false },
  { groupId: 14, price:  480, owned: false },
  { groupId: 15, price:  460, owned: true  }, // Min Woo Lee / Aaron Rai / Nick Taylor
  { groupId: 16, price:  640, owned: false },
  { groupId: 17, price:  425, owned: false },
  { groupId: 18, price:  500, owned: false },
  { groupId: 19, price:  480, owned: false },
  { groupId: 20, price:  640, owned: false },
  { groupId: 21, price:  800, owned: true  }, // Russell Henley / Sam Burns / Maverick McNealy
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

export function buildAuction2026Map(): Map<number, AuctionEntry> {
  const map = new Map<number, AuctionEntry>();
  RAW.forEach((r, idx) => {
    map.set(r.groupId, {
      groupId: r.groupId,
      price: r.price,
      auctionOrder: idx + 1,
      sold: true,
      owned: r.owned,
    });
  });
  return map;
}

/**
 * Amateur side bets — 2026
 * Low Am payout: 2% of $28,760 = $575
 */
export const AMATEUR_BETS_2026: AmateurBet[] = [
  { id: 1, playerName: 'Mason Howell',       category: 'US Am',       price: 140, buyer: 'Ingram',   owned: false },
  { id: 2, playerName: 'Jackson Herrington', category: 'US Am 2nd',   price:  60, buyer: 'Robby',    owned: true  },
  { id: 3, playerName: 'Fifa Laopakdee',     category: 'Asian AM',    price: 120, buyer: 'H Graham', owned: false },
  { id: 4, playerName: 'Brandon Holtz',      category: 'US Mid Am',   price:  60, buyer: 'Sam M',    owned: false },
  { id: 5, playerName: 'Mateo Pulcini',      category: 'Latin AM',    price:  60, buyer: 'Frank',    owned: false },
  { id: 6, playerName: 'Ethan Fang',         category: 'British Am',  price: 100, buyer: 'Reed L',   owned: false },
];
