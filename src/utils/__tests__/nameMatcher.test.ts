import { describe, it, expect } from 'vitest';
import { matchPlayersToTeams } from '../nameMatcher';
import type { Player } from '../../types';
import type { ParsedTeam } from '../teamParser';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeApiPlayer(name: string, win = 0.1): Player {
  return {
    name,
    dgId: Math.floor(Math.random() * 99999),
    probabilities: {
      win,
      top2: 0,
      top3: 0,
      top4: 0,
      top5: win * 2,
      top6: 0,
      top7: 0,
      top8: 0,
      top9: 0,
      top10: win * 3,
      makeCut: 0.9,
    },
    isSenior: false,
    isAmateur: false,
    payout2025: 0,
    finish2025: '',
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('matchPlayersToTeams', () => {
  const apiPlayers: Player[] = [
    makeApiPlayer('Scottie Scheffler', 0.15),
    makeApiPlayer('Rory McIlroy', 0.12),
    makeApiPlayer('Jon Rahm', 0.10),
    makeApiPlayer('Ludvig Aberg', 0.09),
    makeApiPlayer('Nicolás Echavarría', 0.02),
  ];

  it('matches exact player names', () => {
    const teams: ParsedTeam[] = [
      { groupId: 1, playerNames: ['Scottie Scheffler'], seniorFlags: [false] },
    ];
    const result = matchPlayersToTeams(teams, apiPlayers, []);
    expect(result).toHaveLength(1);
    expect(result[0].players[0].name).toBe('Scottie Scheffler');
    expect(result[0].players[0].probabilities.win).toBe(0.15);
  });

  it('fuzzy-matches case differences (Mcilroy → McIlroy)', () => {
    const teams: ParsedTeam[] = [
      { groupId: 2, playerNames: ['Rory Mcilroy'], seniorFlags: [false] },
    ];
    const result = matchPlayersToTeams(teams, apiPlayers, []);
    expect(result[0].players[0].name).toBe('Rory McIlroy');
    expect(result[0].players[0].probabilities.win).toBe(0.12);
  });

  it('fuzzy-matches accented characters', () => {
    const teams: ParsedTeam[] = [
      { groupId: 3, playerNames: ['Nicolas Echavarria'], seniorFlags: [false] },
    ];
    const result = matchPlayersToTeams(teams, apiPlayers, []);
    expect(result[0].players[0].name).toBe('Nicolás Echavarría');
  });

  it('creates zero-probability player when no API match found', () => {
    const teams: ParsedTeam[] = [
      { groupId: 4, playerNames: ['Unknown Golfer'], seniorFlags: [false] },
    ];
    const result = matchPlayersToTeams(teams, apiPlayers, []);
    const player = result[0].players[0];
    expect(player.name).toBe('Unknown Golfer');
    expect(player.probabilities.win).toBe(0);
    expect(player.probabilities.top5).toBe(0);
    expect(player.probabilities.makeCut).toBe(0);
  });

  it('propagates senior flag from parsed data', () => {
    const teams: ParsedTeam[] = [
      { groupId: 5, playerNames: ['Ludvig Aberg', 'Jon Rahm'], seniorFlags: [false, true] },
    ];
    const result = matchPlayersToTeams(teams, apiPlayers, []);
    expect(result[0].players[0].isSenior).toBe(false);
    expect(result[0].players[1].isSenior).toBe(true);
  });

  it('propagates amateur flag from amateurs list', () => {
    const teams: ParsedTeam[] = [
      { groupId: 6, playerNames: ['Scottie Scheffler'], seniorFlags: [false] },
    ];
    const result = matchPlayersToTeams(teams, apiPlayers, ['Scottie Scheffler']);
    expect(result[0].players[0].isAmateur).toBe(true);
  });

  it('fuzzy-matches amateur names', () => {
    const teams: ParsedTeam[] = [
      { groupId: 7, playerNames: ['Rory Mcilroy'], seniorFlags: [false] },
    ];
    const result = matchPlayersToTeams(teams, apiPlayers, ['Rory McIlroy']);
    expect(result[0].players[0].isAmateur).toBe(true);
  });

  it('applies 2025 payout data via fuzzy match', () => {
    const teams: ParsedTeam[] = [
      { groupId: 8, playerNames: ['Rory Mcilroy'], seniorFlags: [false] },
    ];
    const result = matchPlayersToTeams(teams, apiPlayers, []);
    // payouts2025 has "Rory McIlroy" → { payout: 6650, finish: '1st' }
    expect(result[0].players[0].payout2025).toBe(6650);
    expect(result[0].players[0].finish2025).toBe('1st');
  });

  it('sets ev and evDollars to 0 (calculated later)', () => {
    const teams: ParsedTeam[] = [
      { groupId: 9, playerNames: ['Scottie Scheffler'], seniorFlags: [false] },
    ];
    const result = matchPlayersToTeams(teams, apiPlayers, []);
    expect(result[0].ev).toBe(0);
    expect(result[0].evDollars).toBe(0);
  });

  it('handles multiple players per team', () => {
    const teams: ParsedTeam[] = [
      {
        groupId: 10,
        playerNames: ['Scottie Scheffler', 'Rory Mcilroy', 'Unknown Player'],
        seniorFlags: [false, false, true],
      },
    ];
    const result = matchPlayersToTeams(teams, apiPlayers, []);
    expect(result[0].players).toHaveLength(3);
    expect(result[0].players[0].probabilities.win).toBe(0.15);
    expect(result[0].players[1].probabilities.win).toBe(0.12);
    expect(result[0].players[2].probabilities.win).toBe(0);
    expect(result[0].players[2].isSenior).toBe(true);
  });
});
