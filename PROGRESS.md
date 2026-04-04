# Progress Log

## Completed (Phase 1)

- [x] Task-001: Project Setup (commit: fade5e2)
- [x] Task-002: DataGolf API Service (commit: 9886662)
- [x] Task-003: Team Data Parser (commit: 587ba42)
- [x] Task-004: EV Calculator Engine (commit: 4ac4762)
- [x] Task-005: Auction Dashboard UI (commit: 17fa7fd)
- [x] Task-006: Fame Premium & Adjustments (commit: 8741f2b)
- [x] Task-007: Settings & Import Flow (commit: 3c44c21)
- [x] Task-008: Production Build & Deploy (commit: 48f359d)

## Phase 2 — Enhancement Tasks

- [x] Task-009: Environment Variable for API Key (commit: 9d72683)
- [x] Task-010: Exact Position Probabilities via add_position (commit: ddc165a)
- [x] Task-011: Auto-Calculated Fame Premium from Career Wins (commit: 0650bbf)
- [x] Task-012: Restructured Setup Flow (commit: 7f3084a)
- [x] Task-013: Final Integration Test & Cleanup (commit: 7cb624b)

## Phase 3 — Course Fit Multiplier

- [x] Task-014: Skill Ratings Fetch + Player SG Fields (commit: 4c30917)
- [x] Task-015: Augusta Course Fit Calculator (commit: b070f68)
- [x] Task-016: Wire Course Fit into UI (commit: 1378dd0)

## Current Iteration

- Iteration: All tasks complete (Phases 1-3 + polish)
- Working on: N/A
- Started: 2026-04-04

## Blockers

- DataGolf pre-tournament API returns Valero Texas Open field until ~April 6-7.
  event_id=14 is in the URL; warning banner clears automatically when Masters field is live.

## Notes

- Phase 1 complete with all 8 tasks done
- Phase 2: .env API key, exact position probs, auto fame premium, restructured setup
- Phase 3: SG skill data fetch, Augusta course fit multiplier (OTT 15%, App 35%, ATG 35%, Putt 15%)
- Post-Phase 3 polish (commit: be4cce8): baseline_history_fit model, field-derived player list, no emojis in preview table
- Fame formula: fame_score = 3x major_wins + all_pro_wins, normalized to 1.00-1.30
- Course fit formula: weighted SG score (Augusta weights) normalized to 1.00-1.30