# Feature: Masters Calcutta Auction Value Analyzer

## Overview

A mobile-first React web app for the "8th Annual Sodfather Masters Calcutta" (now 9th in 2026). The app calculates expected value (EV) for each auction team by fetching exact position probabilities from the DataGolf API, applying them against the calcutta payout structure, and providing real-time value analysis during the live auction.

Players in the Masters Tournament are grouped into teams of 1-4 players and auctioned off to bidders. The total auction proceeds form the prize pool, distributed to owners of teams whose players finish in paying positions (1st-9th) plus three bonus pools (Low Senior, High Score, Low Am).

## Success Criteria

- [ ] All tasks complete
- [ ] App runs on mobile browser during live auction
- [ ] DataGolf API fetches player probabilities successfully
- [ ] Team parser handles multi-column paste format
- [ ] EV calculations match expected values for known scenarios
- [ ] Auction flow allows selecting next team, entering price, and updating pool
- [ ] Build succeeds and static files serveable via nginx

## Technical Constraints

- **Language**: TypeScript
- **Framework**: React 18+ with Vite
- **State Management**: Jotai
- **Styling**: Tailwind CSS (mobile-first)
- **API**: DataGolf REST API (key: stored in app settings input)
- **Persistence**: Session-only (no localStorage/database needed)
- **Deployment**: Static build (`npm run build`) served via nginx on Ubuntu server
- **Testing**: Vitest

## Architecture Notes

### Data Flow

```
DataGolf API → Player Probabilities (win, top_2..top_9, make_cut)
     ↓
Team Parser (paste input) → Team groupings with player names, senior flags
     ↓
Name Matcher (fuzzy) → Links API players to team players (0% for unmatched)
     ↓
EV Calculator → Per-player EV (main pool + bonus pools) → Team EV (sum)
     ↓
Auction Dashboard → Sorted teams, value indicators, live bid tracking
     ↓
Pool Tracker → Running total updates all $ EVs in real-time
```

### Jotai Atom Structure

- `apiKeyAtom` — DataGolf API key string
- `playersAtom` — Array of player objects with probabilities from API
- `teamsAtom` — Array of team objects (group number, players, senior/amateur flags)
- `auctionAtom` — Map of groupId → { price, sold, auctionOrder }
- `poolAtom` — Derived: sum of all entered bids
- `payoutConfigAtom` — Payout percentages (editable for future years)
- `famePremiumsAtom` — Map of playerName → multiplier (default 1.0)
- `amateursAtom` — Array of amateur player names

### Payout Structure (% of total pool)

| Place | Payout % |
|-------|----------|
| 1st   | 25%      |
| 2nd   | 14%      |
| 3rd   | 12%      |
| 4th   | 10%      |
| 5th   | 9%       |
| 6th   | 8%       |
| 7th   | 7%       |
| 8th   | 5%       |
| 9th   | 4%       |
| Low Senior | 2%  |
| High Score | 2%  |
| Low Am | 2%      |
| **Total** | **100%** |

### EV Calculation Formula

**Main pool (per player):**
```
P(1st) = win_prob
P(2nd) = top_2_prob - win_prob
P(3rd) = top_3_prob - top_2_prob
...
P(9th) = top_9_prob - top_8_prob
P(10th) = top_10_prob - top_9_prob  (valued at 90% of 9th = 3.6%)

Player_EV = P(1st)×25% + P(2nd)×14% + P(3rd)×12% + P(4th)×10%
          + P(5th)×9% + P(6th)×8% + P(7th)×7% + P(8th)×5%
          + P(9th)×4% + P(10th)×3.6%
```

**Low Senior bonus (per senior):**
```
P(Low Senior) = P(make_cut) / num_seniors_in_field
Senior_Bonus_EV = P(Low Senior) × 2%
```

**Low Am bonus (per amateur):**
```
P(Low Am) = P(make_cut) / num_amateurs_in_field
Am_Bonus_EV = P(Low Am) × 2%
```

**High Score bonus (per player):**
```
P(High Score) = P(make_cut) × weakness_weight
  where weakness_weight is inverse of make_cut rank among field
High_Score_EV = P(High Score) × 2%
```

**Team EV:**
```
Team_EV = Σ(Player_EV + bonus EVs) for all players in team
```

### Behavioral Adjustments

**Fame Premium:** Configurable multiplier per player (e.g., `{ "Tiger Woods": 1.25 }`). Adjusts expected auction price, not EV. Default = 1.0.

**Auction Position Factor:** Progressive multiplier on expected price as supply dwindles:
```
position_factor = 1 + (teams_sold / total_teams) × 0.35
```
Up to ~35% premium by end of auction. Scales up as groups dwindle.

### 2025 Historical Reference (Player Payouts)

| Player | Payout | Finish |
|--------|--------|--------|
| McIlroy | $6,650 | 1st |
| Rose | $3,724 | 2nd |
| Reed | $3,192 | 3rd |
| Scheffler | $2,660 | 4th |
| Im | $2,261 | T5 |
| DeChambeau | $2,261 | T5 |
| Aberg | $1,862 | 7th |
| Schauffele | $599 | T8 |
| Johnson (Dustin) | $599 | T8 |
| Day | $599 | T8 |
| Connors | $599 | T8 |
| Langer | $532 | Low Senior |
| Dunlap | $532 | High Score |
| Hastings | $532 | Low Am |

All other players: $0.

## Tasks

### Task-001: Project Setup

**Priority**: High
**Estimated Iterations**: 1-2

**Acceptance Criteria**:

- [ ] Vite + React + TypeScript project initialized
- [ ] Tailwind CSS configured and working
- [ ] Jotai installed and base atoms created
- [ ] Project structure: `src/atoms/`, `src/components/`, `src/services/`, `src/utils/`, `src/types/`
- [ ] Type definitions for Player, Team, AuctionEntry, PayoutConfig
- [ ] Payout config with 2025 structure as default
- [ ] 2025 player payout data hardcoded
- [ ] Dev server runs successfully

**Verification**:

```bash
cd /Users/robbywhite/Documents/Github/masters
npm run dev
# Dev server starts without errors
```

### Task-002: DataGolf API Service

**Priority**: High
**Estimated Iterations**: 2-3

**Acceptance Criteria**:

- [ ] API service fetches `/predictions/pre-tournament` for Masters
- [ ] Fetches position probabilities: win, top_2 through top_9, top_10, make_cut
- [ ] API key input in settings UI, stored in `apiKeyAtom`
- [ ] Response mapped to `Player[]` type with all probability fields
- [ ] Error handling for failed requests (network, auth, no event)
- [ ] Loading state while fetching
- [ ] Unit tests for response mapping

**Verification**:

```bash
npm run test -- --grep "datagolf"
# Manual: enter API key, click fetch, verify player list populates
```

### Task-003: Team Data Parser

**Priority**: High
**Estimated Iterations**: 2-3

**Acceptance Criteria**:

- [ ] Textarea input accepts multi-column paste format
- [ ] Parses "Group N" headers with group number extraction
- [ ] Captures all player names per group (1-4 players)
- [ ] Strips and flags `*` suffix as `isSenior: true`
- [ ] Ignores owner/ID lines (e.g., "S. Miles - 2255")
- [ ] Ignores dollar amounts (e.g., "$1,850")
- [ ] Separate textarea for amateur player names (one per line)
- [ ] Fuzzy name matching to link parsed names to DataGolf API player data
- [ ] Unmatched players auto-assigned 0% probabilities
- [ ] Display list of unmatched players for user awareness
- [ ] Unit tests for parser with 2025 data as test input

**Verification**:

```bash
npm run test -- --grep "parser"
# Manual: paste 2025 team data, verify all 32 groups parsed with correct players
```

### Task-004: EV Calculator Engine

**Priority**: High
**Estimated Iterations**: 2-3

**Acceptance Criteria**:

- [ ] Derives marginal probabilities from cumulative (P(Nth) = P(TopN) - P(Top(N-1)))
- [ ] Calculates main pool EV for positions 1-9 using payout percentages
- [ ] Position 10 adjustment: P(10th) × 3.6% (90% of 9th place payout)
- [ ] Low Senior EV: P(make_cut) / num_seniors × 2% pool
- [ ] Low Am EV: P(make_cut) / num_amateurs × 2% pool
- [ ] High Score EV: inverse make_cut weighting × 2% pool
- [ ] Team EV = sum of all player EVs (main + bonus)
- [ ] Teams rankable by EV
- [ ] Unit tests with known probability inputs and expected outputs

**Verification**:

```bash
npm run test -- --grep "ev-calculator"
# Verify: player with 10% win prob has EV ≈ 2.5% of pool from 1st place alone
```

### Task-005: Auction Dashboard UI

**Priority**: High
**Estimated Iterations**: 3-5

**Acceptance Criteria**:

- [ ] Mobile-optimized layout (usable on phone during live auction)
- [ ] Header shows: running pool total, teams sold count, teams remaining
- [ ] Team list sorted by EV (highest first) showing:
  - Group number
  - Player names with senior (★) and amateur (A) indicators
  - Team EV (as % of pool and $ amount)
  - Per-player 2025 payout and finish position
- [ ] "Select Next" flow: tap a team to mark as "on the block"
- [ ] Expanded "on the block" view shows:
  - All players with individual EVs
  - 2025 payout per player
  - Fame-adjusted expected price
  - Auction position adjustment
  - Suggested max bid
- [ ] Price input field and "Sold" button to record auction price
- [ ] Sold teams move to separate "Sold" section with price and value score
- [ ] Value score: EV/Price ratio, color-coded (green >1.2, yellow 0.8-1.2, red <0.8)
- [ ] All $ EVs update live as pool total changes

**Verification**:

- Manual: simulate auction of 5 teams, verify pool updates, remaining team values adjust
- Test on mobile viewport (375px width)

### Task-006: Fame Premium & Auction Position Adjustments

**Priority**: Medium
**Estimated Iterations**: 1-2

**Acceptance Criteria**:

- [ ] Fame premium input: textarea accepting "Player Name: 1.15" format (one per line)
- [ ] Premiums stored in `famePremiumsAtom` map
- [ ] Expected auction price = EV × fame_premium × auction_position_factor
- [ ] Auction position factor: `1 + (teams_sold / total_teams) × 0.35`
- [ ] "Suggested Max Bid" shown on expanded team view = raw EV (not adjusted)
- [ ] "Expected Price" shown separately = adjusted value (what it will likely sell for)
- [ ] Unit tests for adjustment calculations

**Verification**:

```bash
npm run test -- --grep "adjustments"
# Manual: set fame premium for a player, verify expected price increases
```

### Task-007: Settings & Data Import Flow

**Priority**: Medium
**Estimated Iterations**: 1-2

**Acceptance Criteria**:

- [ ] Settings page/modal with:
  - DataGolf API key input
  - "Fetch Players" button with loading/success/error states
  - Team data paste textarea with "Parse" button
  - Amateur list paste textarea
  - Fame premium paste textarea
- [ ] Clear step-by-step flow: 1) Enter API key → 2) Fetch data → 3) Paste teams → 4) Review matches → 5) Go to dashboard
- [ ] Validation: warn if teams pasted before API data fetched
- [ ] "Reset All" button to start over

**Verification**:

- Manual: complete full setup flow from fresh load to populated dashboard

### Task-008: Production Build & Deployment

**Priority**: Medium
**Estimated Iterations**: 1

**Acceptance Criteria**:

- [ ] `npm run build` produces static files in `dist/`
- [ ] No build errors or warnings
- [ ] App works when served from static file server (no server-side requirements)
- [ ] Works on mobile Safari and Chrome
- [ ] API key not hardcoded in build output (entered at runtime)

**Verification**:

```bash
npm run build
npx serve dist
# Access from phone browser, complete full workflow
```

---

## Enhancement Tasks (Phase 2)

### Task-009: Environment Variable for API Key

**Priority**: High
**Estimated Iterations**: 1
**Dependencies**: None

Move the DataGolf API key from runtime input to a build-time `.env` file. This simplifies the setup flow and removes a manual step.

**Acceptance Criteria**:

- [ ] `.env` file created at project root with `DATAGOLF_API_KEY=your-datagolf-api-key` (server-side only: read by the Vercel proxy and the Vite dev proxy)
- [ ] `.env` is already in `.gitignore` (verify)
- [ ] `src/services/datagolf.ts`: `fetchPredictions` reads key from `import.meta.env.VITE_DATAGOLF_API_KEY` instead of taking `apiKey` parameter
- [ ] `FetchPredictionsOptions` interface updated — `apiKey` field removed
- [ ] Remove or deprecate `apiKeyAtom` from `src/atoms/index.ts`
- [ ] All callers of `fetchPredictions` updated (SetupWizard, tests)
- [ ] Tests updated: mock `import.meta.env` instead of passing apiKey
- [ ] `DataGolfError` still thrown if env var is missing/empty
- [ ] TypeScript compiles clean (`npx tsc --noEmit`)
- [ ] All tests pass (`npx vitest run`)

**Verification**:

```bash
npx tsc --noEmit
npx vitest run
```

### Task-010: Exact Position Probabilities via add_position

**Priority**: High
**Estimated Iterations**: 1-2
**Dependencies**: Task-009

Use the DataGolf API's `add_position` parameter to fetch exact probabilities for positions 2-9, eliminating the need for decay-weighted interpolation.

**API Change**:
```
GET /preds/pre-tournament?tour=pga&add_position=2,3,4,6,7,8,9&file_format=json&key=...
```

This returns `top_2`, `top_3`, `top_4`, `top_6`, `top_7`, `top_8`, `top_9` fields alongside the default `win`, `top_5`, `top_10`, `top_20`, `make_cut`.

**Acceptance Criteria**:

- [ ] `fetchPredictions` URL includes `&add_position=2,3,4,6,7,8,9`
- [ ] `DGPlayerRaw` interface updated with optional `top_2`, `top_3`, `top_4`, `top_6`, `top_7`, `top_8`, `top_9` fields
- [ ] `mapDGPlayerToPlayer` maps these new fields to `PositionProbabilities` (falling back to 0 if absent)
- [ ] EV calculator's `deriveMarginalProbabilities` still works correctly — when exact cumulative values are provided, interpolation is effectively bypassed (exact values used directly)
- [ ] Existing tests updated for new data shape
- [ ] New test: verify that when exact positions are provided, marginal probs = topN - top(N-1) without interpolation artifacts
- [ ] TypeScript compiles clean
- [ ] All tests pass

**Verification**:

```bash
npx tsc --noEmit
npx vitest run
```

### Task-011: Auto-Calculated Fame Premium from Career Wins

**Priority**: High
**Estimated Iterations**: 2
**Dependencies**: None

Replace the manual "paste fame premiums" step with an automatic system based on career wins data. Formula: `fame_score = 3 × major_wins + 1 × all_pro_wins`. Normalized to a multiplier.

**Data Source**: Static lookup table in `src/data/careerWins.ts` — manually populated with career win counts for all expected 2026 Masters field players (~87 players).

**"All pro wins"** includes: PGA Tour, DP World Tour, LIV Golf, Japan Tour, and other recognized professional tours. Majors are counted in both the 3× and 1× buckets (intentional double-counting to heavily weight major winners).

**Multiplier Formula** (normalized):
```
fame_score = 3 × major_wins + all_pro_wins
max_score = max(fame_score) across all players in field
fame_multiplier = 1 + (fame_score / max_score) × 0.30
```

Range: 1.00 (unknown/no wins) to 1.30 (highest fame score, e.g. Tiger Woods).

**Acceptance Criteria**:

- [ ] `src/data/careerWins.ts` created with `{ playerName, majorWins, proWins }` for all expected 2026 Masters field players
- [ ] `src/utils/fameCalculator.ts` created with:
  - `calculateFameScore(majorWins, proWins): number`
  - `calculateFamePremiums(players, careerWinsData): FamePremium[]`
- [ ] Fame premiums auto-calculated when players are loaded (no manual input needed)
- [ ] `famePremiumsAtom` populated automatically after fetch
- [ ] Manual fame premium textarea and parser removed from SetupWizard (Step 4 eliminated)
- [ ] Unit tests for fameCalculator with known player data
- [ ] TypeScript compiles clean
- [ ] All tests pass

**Verification**:

```bash
npx tsc --noEmit
npx vitest run
# Manual: load app, verify fame premiums auto-populated, Tiger ≈1.30, unknowns = 1.00
```

### Task-012: Restructured Setup Flow

**Priority**: High
**Estimated Iterations**: 2-3
**Dependencies**: Task-009, Task-010, Task-011

Restructure the setup wizard from 5 steps to 4 steps, with Step 1 auto-fetching data and showing an EV preview table.

**New Setup Flow**:
1. **Players & EV Preview** — Auto-fetch DataGolf data on mount (API key from `.env`). Display scrollable table of all players sorted by EV (highest first) with simple name search/filter. Show "Create Teams" button at bottom.
2. **Paste Teams** — Same as current Step 2 (paste multi-column team data, parse, match preview).
3. **Amateurs** — Same as current Step 3 (paste amateur names, optional).
4. **Review & Confirm** — Summary of all data, unmatched players warning, "Go to Dashboard" button. Fame premiums shown as auto-calculated (read-only display).

**Player EV Preview Table (Step 1)**:
- Scrollable list of all ~87 players
- Columns: Rank, Player Name, Win %, EV (% of pool)
- Sorted by EV descending
- Simple text search/filter input at top (filters by player name, instant)
- Loading spinner during fetch, error state if fetch fails
- "Create Teams →" button at bottom (enabled after successful fetch)

**Acceptance Criteria**:

- [ ] `StepIndicator` updated: 4 steps with labels ["Players", "Teams", "Amateurs", "Review"]
- [ ] Step 1 auto-fetches on mount (no API key input needed)
- [ ] Step 1 shows player EV table sorted by EV desc with search filter
- [ ] Step 1 has "Create Teams" button to advance to Step 2
- [ ] Step 4 (Review) shows auto-calculated fame premiums as read-only
- [ ] Old Step 1 (API key input) removed
- [ ] Old Step 4 (manual fame premiums) removed
- [ ] All navigation still works (step indicator, back/forward)
- [ ] Mobile-optimized (table scrolls, search input has proper tap target)
- [ ] `apiKeyAtom` references fully removed from SetupWizard
- [ ] TypeScript compiles clean
- [ ] All tests pass

**Verification**:

```bash
npx tsc --noEmit
npx vitest run
# Manual: fresh load → auto-fetches → player table visible → search works → create teams → full flow
```

### Task-013: Final Integration Test & Cleanup

**Priority**: Medium
**Estimated Iterations**: 1
**Dependencies**: Task-009, Task-010, Task-011, Task-012

Final pass to ensure everything works end-to-end.

**Acceptance Criteria**:

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` — clean build, no warnings
- [ ] Remove dead code: `famePremiumParser.ts` (if no longer imported), old API key input references
- [ ] Verify `.env` not included in `dist/` build output
- [ ] Verify API key not visible in built JS bundles
- [ ] Git commit all changes with clear message

**Verification**:

```bash
npx tsc --noEmit
npx vitest run
npm run build
grep -r "0304522e" dist/ || echo "API key not in build output ✓"
```

---

## Phase 3: Course Fit Multiplier

### Task-014: Skill Ratings Fetch + Player SG Fields

**Priority**: High
**Estimated Iterations**: 2

Extend the DataGolf service to fetch player skill ratings (SG splits) alongside predictions, and add those fields to the `Player` type.

**Background — DataGolf Skill Ratings API:**
- Endpoint: `GET /preds/skill-ratings?display=value&file_format=json&key=...`
- Returns 434 players with: `dg_id`, `player_name` ("Last, First"), `sg_ott`, `sg_app`, `sg_arg`, `sg_putt`, `sg_total`, `driving_dist`, `driving_acc`
- Proxied via Vite at `/api/datagolf/preds/skill-ratings`

**Acceptance Criteria**:

- [ ] `DGSkillRating` interface added to `src/services/datagolf.ts`
- [ ] `fetchSkillRatings()` async function added to `datagolf.ts`; calls `/api/datagolf/preds/skill-ratings?display=value&file_format=json&key=...`
- [ ] `Player` type extended with optional SG fields: `sgOtt?: number`, `sgApp?: number`, `sgAtg?: number`, `sgPutt?: number` (default `undefined` / absent when not available)
- [ ] `SetupWizard.tsx`: after `fetchPredictions()` resolves, also call `fetchSkillRatings()` and merge by `dg_id` (primary) or fuzzy name match (fallback); players without a match keep `sg*` as `undefined`
- [ ] Existing `mapDGPlayerToPlayer` unchanged — SG merge is a separate enrichment step
- [ ] TypeScript compiles clean
- [ ] Tests: add unit tests for `fetchSkillRatings()` mocking the API response

**Verification**:

```bash
npx tsc --noEmit
npx vitest run
# Manual: load app → fetch players → console.log first player should show sgOtt/sgApp/sgAtg/sgPutt values
```

---

### Task-015: Augusta Course Fit Calculator

**Priority**: High
**Estimated Iterations**: 2

Create `src/utils/courseFitCalculator.ts` that computes a per-player Augusta course fit multiplier (1.00–1.30) from the four SG categories, weighted according to the DataGolf Masters preview newsletter analysis.

**Augusta Weighting Strategy (from DataGolf Newsletter #76, April 2 2026):**

The newsletter establishes that Augusta National has a distinct SG category profile vs. a typical PGA Tour stop:

| Category | Typical Tour | Augusta Weight | Rationale |
|---|---|---|---|
| Off the Tee (OTT) | ~15% | **15%** | Standard; accuracy > distance since 2021 |
| Approach (APP) | ~35% | **35%** | Standard share of scoring variation |
| Around the Green (ATG) | ~20% | **35%** | *Elevated* — "driven more variation than typical"; winners' best category each of last 5 years |
| Putting (PUTT) | ~30% | **15%** | *Reduced* — "driven relatively less"; winners' consistently worst category |

Normalization mirrors `fameCalculator.ts`: `1.0 + (weightedScore / maxScore) × 0.30`

**Acceptance Criteria**:

- [ ] `CourseFit` type added to `src/types/index.ts`: `{ playerName: string; multiplier: number }`
- [ ] `src/utils/courseFitCalculator.ts` created with:
  - `AUGUSTA_WEIGHTS = { ott: 0.15, app: 0.35, atg: 0.35, putt: 0.15 }` exported constant
  - `calculateCourseFitScore(sgOtt, sgApp, sgAtg, sgPutt): number` — returns weighted SG sum
  - `calculateCourseFits(players: Player[]): CourseFit[]` — normalizes to 1.00–1.30, players missing all SG data receive `1.00`
- [ ] Players with `undefined` SG fields receive multiplier `1.00` (neutral), not penalized
- [ ] Unit tests in `src/utils/__tests__/courseFitCalculator.test.ts`:
  - Weighted score calculation is correct
  - Normalization produces range [1.00, 1.30]
  - Player with all-zero or missing SG gets 1.00
  - Field with only one player gets 1.30 (only player is "best")
- [ ] TypeScript compiles clean

**Verification**:

```bash
npx tsc --noEmit
npx vitest run
```

---

### Task-016: Wire Course Fit into UI

**Priority**: High
**Estimated Iterations**: 2-3

Integrate the course fit multiplier into the app's state, preview table, and auction dashboard.

**Acceptance Criteria**:

- [ ] `courseFitsAtom` added to `src/atoms/index.ts` (`atom<CourseFit[]>([])`)
- [ ] `SetupWizard.tsx`: after players + skill ratings are fetched, compute `calculateCourseFits(players)` and store in `courseFitsAtom`
- [ ] `PlayerEVTable.tsx`:
  - Add a **"Fit"** column (after Fame) showing course fit multiplier formatted as `1.23×` with 🏌️ icon for players above 1.10, muted gray for 1.00
  - Column header should be `"Course Fit"` with a tooltip/title of the Augusta weights
- [ ] `src/components/AuctionDashboard.tsx` (or wherever team EV cards are rendered): show a combined **"Adj. Multiplier"** for each team = product of all player `(fame × courseFit)` multipliers, or show per-player breakdown in the team detail view
- [ ] `colSpan` on the empty-row fallback updated to match new column count
- [ ] TypeScript compiles clean; all 99+ tests pass; no regressions

**Verification**:

```bash
npx tsc --noEmit
npx vitest run
# Manual: load app → PlayerEVTable shows Fit column → Scheffler shows high Fit → Spieth/Thomas visible (once Masters field loads)
```

---

## Out of Scope

- Database or persistent storage (session-only)
- User authentication / multi-user support
- API fallback / paste-based probability import
- Live tournament score tracking
- Historical trend analysis across multiple years
- Push notifications
- Offline/PWA support
