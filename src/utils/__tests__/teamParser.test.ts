import { describe, it, expect } from 'vitest';
import { parseTeamData } from '../teamParser';
import { parseAmateurs } from '../amateurParser';

// ── Basic parsing ────────────────────────────────────────────────────────────

describe('parseTeamData', () => {
  it('parses a single group with one player', () => {
    const input = `Group 1 $1,850\nScottie Scheffler`;
    const result = parseTeamData(input);
    expect(result).toHaveLength(1);
    expect(result[0].groupId).toBe(1);
    expect(result[0].playerNames).toEqual(['Scottie Scheffler']);
    expect(result[0].seniorFlags).toEqual([false]);
    expect(result[0].priorYearPrice).toBe(1850);
  });

  it('parses multiple groups', () => {
    const input = `
Group 1 $1,850
Scottie Scheffler

Group 2 $1,500
Rory Mcilroy
Jose Maria Olazabal*
    `.trim();

    const result = parseTeamData(input);
    expect(result).toHaveLength(2);
    expect(result[0].groupId).toBe(1);
    expect(result[0].playerNames).toEqual(['Scottie Scheffler']);
    expect(result[1].groupId).toBe(2);
    expect(result[1].playerNames).toEqual(['Rory Mcilroy', 'Jose Maria Olazabal']);
  });

  it('detects senior flag (*)', () => {
    const input = `Group 5 $1,200\nLudvig Aberg\nFred Couples*`;
    const result = parseTeamData(input);
    expect(result[0].playerNames).toEqual(['Ludvig Aberg', 'Fred Couples']);
    expect(result[0].seniorFlags).toEqual([false, true]);
  });

  it('skips owner lines (Name - Number pattern)', () => {
    const input = `
Group 1 $1,850
Scottie Scheffler
S. Miles - 2255
    `.trim();

    const result = parseTeamData(input);
    expect(result[0].playerNames).toEqual(['Scottie Scheffler']);
    expect(result[0].playerNames).not.toContain('S. Miles - 2255');
  });

  it('skips multiple owner lines', () => {
    const input = `
Group 21 $925
Tom Kim
Denny McCarthy
J. Martinez - 2191
Nick Taylor
Joaquin Niemann
    `.trim();

    const result = parseTeamData(input);
    expect(result[0].playerNames).toEqual([
      'Tom Kim',
      'Denny McCarthy',
      'Nick Taylor',
      'Joaquin Niemann',
    ]);
  });

  it('extracts dollar amount correctly', () => {
    const input = `Group 3 $850\nJon Rahm`;
    const result = parseTeamData(input);
    expect(result[0].priorYearPrice).toBe(850);
  });

  it('handles missing dollar amount', () => {
    const input = `Group 3\nJon Rahm`;
    const result = parseTeamData(input);
    expect(result[0].priorYearPrice).toBeUndefined();
  });

  it('handles empty lines between groups', () => {
    const input = `
Group 1 $1,850
Scottie Scheffler


Group 2 $1,500
Rory Mcilroy
    `.trim();

    const result = parseTeamData(input);
    expect(result).toHaveLength(2);
  });

  it('handles group header case-insensitively', () => {
    const input = `group 1 $500\nPlayer One\nGROUP 2 $300\nPlayer Two`;
    const result = parseTeamData(input);
    expect(result).toHaveLength(2);
    expect(result[0].groupId).toBe(1);
    expect(result[1].groupId).toBe(2);
  });

  it('skips standalone dollar amount lines', () => {
    const input = `Group 1\n$500\nPlayer One`;
    const result = parseTeamData(input);
    expect(result[0].playerNames).toEqual(['Player One']);
  });

  it('handles multi-column paste (duplicate group headers)', () => {
    // Simulates a paste from a spreadsheet where two columns produce
    // interleaved group data
    const input = `
Group 1 $1,850
Scottie Scheffler
Group 2 $1,500
Rory Mcilroy
Group 1
Another Player
    `.trim();

    const result = parseTeamData(input);
    expect(result).toHaveLength(2);
    // Group 1 should have both players merged
    const g1 = result.find((t) => t.groupId === 1)!;
    expect(g1.playerNames).toEqual(['Scottie Scheffler', 'Another Player']);
    // Price should still be preserved from the first encounter
    expect(g1.priorYearPrice).toBe(1850);
  });
});

// ── Full 2025 data integration test ─────────────────────────────────────────

const FULL_2025_DATA = `Group 1 $1,850
Scottie Scheffler

Group 2 $1,500
Rory Mcilroy
Jose Maria Olazabal*

Group 3 $850
Jon Rahm
Angel Cabrera*
Rafael Campos

Group 4 $975
Bryson DeChambeau
Max Greyserman

Group 5 $1,200
Ludvig Aberg
Fred Couples*

Group 6 $1,100
Colin Morikawa
Bernhard Langer*

Group 7 $950
Brooks Koepka
Thriston Lawrence

Group 8 $660
Xander Schauffele
Michael Kim

Group 9 $600
Jordan Spieth
Mike Weir*
Nicolas Echavarria

Group 10 $950
Sepp Straka
Cameron Young
Rafael Campos

Group 11 $700
Patrick Cantlay
Austin Eckroat
Aaron Rai

Group 12 $1,200
Justin Thomas
Nick Dunlap
Davis Riley

Group 13 $300
Tyrrell Hatton
Stephan Jaeger
Thomas Detry

Group 14 $500
Hideki Matsuyama
Davis Thompson
Kevin Yu

Group 15 $700
Tony Finau
Phil Mickelson*
Jhonattan Vegas

Group 16 $575
Keegan Bradley
Russell Henley
Taylor Pendrith

Group 17 $950
Wyndham Clark
Billy Horschel
JT Poston

Group 18 $340
Sungjae Im
Byeong Hun An

Group 19 $950
Sam Burns
Tommy Fleetwood

Group 20 $420
Min Woo Lee
Tom Hoge
Danny Willett

Group 21 $925
Tom Kim
Denny McCarthy
Nick Taylor
Joaquin Niemann

Group 22 $950
Viktor Hovland
Matthieu Pavon
Robert MacIntyre

Group 23 $750
Adam Scott
Jason Day
Laurie Canter
Patton Kizzire

Group 24 $675
Matt Fitzpatrick
Daniel Berger
Joe Highsmith
Brian Harman

Group 25 $450
Max Homa
Akshay Bhatia
Adam Schenk
Cameron Davis

Group 26 $325
Dustin Johnson
Lucas Glover
Matt McCarty

Group 27 $850
Shane Lowry
Nicolai Hojgaard
Rasmus Hojgaard

Group 28 $280
Will Zalatoris
Harris English
JJ Spaun

Group 29 $600
Justin Rose
Sahith Theegala
Brian Campbell

Group 30 $300
Sergio Garcia
Christiaan Bezuidenhout
Charl Schwartzel
Chris Kirk

Group 31 $1,500
Cameron Smith
Patrick Reed
Zach Johnson

Group 32 $950
Corey Conners
Maverick McNealy
Bubba Watson`;

describe('parseTeamData – full 2025 data', () => {
  it('parses into exactly 32 groups', () => {
    const result = parseTeamData(FULL_2025_DATA);
    expect(result).toHaveLength(32);
  });

  it('group IDs run 1-32', () => {
    const result = parseTeamData(FULL_2025_DATA);
    const ids = result.map((t) => t.groupId);
    expect(ids).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));
  });

  it('identifies all seniors', () => {
    const result = parseTeamData(FULL_2025_DATA);
    const seniors = result.flatMap((t) =>
      t.playerNames.filter((_, i) => t.seniorFlags[i]),
    );
    expect(seniors).toContain('Jose Maria Olazabal');
    expect(seniors).toContain('Angel Cabrera');
    expect(seniors).toContain('Fred Couples');
    expect(seniors).toContain('Bernhard Langer');
    expect(seniors).toContain('Mike Weir');
    expect(seniors).toContain('Phil Mickelson');
    expect(seniors).toHaveLength(6);
  });

  it('extracts prices for all groups', () => {
    const result = parseTeamData(FULL_2025_DATA);
    // Every group in this data set has a price
    for (const team of result) {
      expect(team.priorYearPrice).toBeDefined();
      expect(team.priorYearPrice).toBeGreaterThan(0);
    }
  });

  it('Group 21 has 4 players', () => {
    const result = parseTeamData(FULL_2025_DATA);
    const g21 = result.find((t) => t.groupId === 21)!;
    expect(g21.playerNames).toHaveLength(4);
    expect(g21.playerNames).toEqual([
      'Tom Kim',
      'Denny McCarthy',
      'Nick Taylor',
      'Joaquin Niemann',
    ]);
  });

  it('handles multi-column paste variant of the same data (with owner lines)', () => {
    // Simulate what happens when the user pastes from a spreadsheet with
    // owner info interleaved.
    const multiColumnInput = `Group 1 $1,850
Scottie Scheffler
S. Miles - 2255
Group 2 $1,500
Rory Mcilroy
Jose Maria Olazabal*
J. Martinez - 2191
Group 3 $850
Jon Rahm
Angel Cabrera*
Rafael Campos
R. White - 1100`;

    const result = parseTeamData(multiColumnInput);
    expect(result).toHaveLength(3);
    expect(result[0].playerNames).toEqual(['Scottie Scheffler']);
    expect(result[1].playerNames).toEqual(['Rory Mcilroy', 'Jose Maria Olazabal']);
    expect(result[1].seniorFlags).toEqual([false, true]);
    expect(result[2].playerNames).toEqual(['Jon Rahm', 'Angel Cabrera', 'Rafael Campos']);
  });
});

// ── Amateur parser ───────────────────────────────────────────────────────────

describe('parseAmateurs', () => {
  it('parses newline-separated amateur names', () => {
    const input = `Justin Hastings\nNeal Shipley\nSam Bennett`;
    const result = parseAmateurs(input);
    expect(result).toEqual(['Justin Hastings', 'Neal Shipley', 'Sam Bennett']);
  });

  it('trims whitespace and filters blanks', () => {
    const input = `  Justin Hastings  \n\n  Neal Shipley  \n   \n`;
    const result = parseAmateurs(input);
    expect(result).toEqual(['Justin Hastings', 'Neal Shipley']);
  });

  it('returns empty array for empty input', () => {
    expect(parseAmateurs('')).toEqual([]);
  });
});
