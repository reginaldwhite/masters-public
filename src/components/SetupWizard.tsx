import { useState, useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import {
  playersAtom,
  teamsAtom,
  famePremiumsAtom,
  amateursAtom,
  viewAtom,
  auctionAtom,
  onTheBlockAtom,
} from '../atoms';
import { fetchPredictions, DataGolfError } from '../services/datagolf';
import { parseTeamData, type ParsedTeam } from '../utils/teamParser';
import { parseAmateurs } from '../utils/amateurParser';
import { parseFamePremiums } from '../utils/famePremiumParser';
import { matchPlayersToTeams } from '../utils/nameMatcher';
import type { FamePremium } from '../types';
import StepIndicator from './StepIndicator';

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

export default function SetupWizard() {
  // ── Jotai state ──────────────────────────────────────────────────────────
  const [players, setPlayers] = useAtom(playersAtom);
  const setTeams = useSetAtom(teamsAtom);
  const setFamePremiums = useSetAtom(famePremiumsAtom);
  const setAmateurs = useSetAtom(amateursAtom);
  const setView = useSetAtom(viewAtom);
  const setAuction = useSetAtom(auctionAtom);
  const setOnTheBlock = useSetAtom(onTheBlockAtom);

  // ── Wizard local state ───────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Step 1
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>(
    players.length > 0 ? 'success' : 'idle',
  );
  const [fetchError, setFetchError] = useState('');
  const [playerCount, setPlayerCount] = useState(players.length);

  // Step 2
  const [teamText, setTeamText] = useState('');
  const [parsedTeams, setParsedTeams] = useState<ParsedTeam[]>([]);
  const [teamParseError, setTeamParseError] = useState('');
  const [totalTeamPlayers, setTotalTeamPlayers] = useState(0);

  // Step 3
  const [amateurText, setAmateurText] = useState('');
  const [parsedAmateurs, setParsedAmateurs] = useState<string[]>([]);

  // Step 4
  const [fameText, setFameText] = useState('');
  const [parsedFame, setParsedFame] = useState<FamePremium[]>([]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const markCompleted = useCallback(
    (step: number) => {
      setCompletedSteps((prev) => {
        const next = new Set(prev);
        next.add(step);
        return next;
      });
    },
    [],
  );

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  // ── Step 1: Fetch players ────────────────────────────────────────────────

  const handleFetchPlayers = async () => {
    setFetchStatus('loading');
    setFetchError('');

    try {
      const result = await fetchPredictions();
      setPlayers(result.players);
      setPlayerCount(result.players.length);
      setFetchStatus('success');
      markCompleted(1);
      // Auto-advance
      setTimeout(() => setCurrentStep(2), 600);
    } catch (err) {
      setFetchStatus('error');
      if (err instanceof DataGolfError) {
        if (err.status === 401 || err.status === 403) {
          setFetchError('Invalid API key. Please check and try again.');
        } else {
          setFetchError(err.message);
        }
      } else {
        setFetchError('Network error. Please check your connection.');
      }
    }
  };

  // ── Step 2: Parse teams ──────────────────────────────────────────────────

  const handleParseTeams = () => {
    setTeamParseError('');
    const parsed = parseTeamData(teamText);
    if (parsed.length === 0) {
      setTeamParseError(
        'No teams found. Make sure each group starts with "Group N".',
      );
      return;
    }
    const playerTotal = parsed.reduce((s, t) => s + t.playerNames.length, 0);
    setParsedTeams(parsed);
    setTotalTeamPlayers(playerTotal);
    markCompleted(2);
  };

  const handleContinueFromTeams = () => {
    setCurrentStep(3);
  };

  // ── Step 3: Amateurs ─────────────────────────────────────────────────────

  const handleSaveAmateurs = () => {
    const names = parseAmateurs(amateurText);
    setParsedAmateurs(names);
    setAmateurs(names);
    markCompleted(3);
    setCurrentStep(4);
  };

  const handleSkipAmateurs = () => {
    setParsedAmateurs([]);
    setAmateurs([]);
    markCompleted(3);
    setCurrentStep(4);
  };

  // ── Step 4: Fame Premiums ────────────────────────────────────────────────

  const handleSaveFame = () => {
    const premiums = parseFamePremiums(fameText);
    setParsedFame(premiums);
    markCompleted(4);
    setCurrentStep(5);
  };

  const handleSkipFame = () => {
    setParsedFame([]);
    markCompleted(4);
    setCurrentStep(5);
  };

  // ── Step 5: Finalize ─────────────────────────────────────────────────────

  const getUnmatchedPlayers = (): string[] => {
    if (parsedTeams.length === 0 || players.length === 0) return [];
    const teams = matchPlayersToTeams(parsedTeams, players, parsedAmateurs);
    const unmatched: string[] = [];
    teams.forEach((team) => {
      team.players.forEach((p) => {
        if (p.probabilities.win === 0 && p.probabilities.makeCut === 0) {
          unmatched.push(p.name);
        }
      });
    });
    return unmatched;
  };

  const seniorCount = parsedTeams.reduce(
    (acc, t) => acc + t.seniorFlags.filter(Boolean).length,
    0,
  );

  const handleGoToDashboard = () => {
    // 1. Build teams with matched data
    const teams = matchPlayersToTeams(parsedTeams, players, parsedAmateurs);
    // 2. Store in atoms
    setTeams(teams);
    setFamePremiums(parsedFame);
    // 3. Switch to dashboard
    setView('dashboard');
  };

  const handleResetAll = () => {
    setPlayers([]);
    setTeams([]);
    setFamePremiums([]);
    setAmateurs([]);
    setAuction(new Map());
    setOnTheBlock(null);
    // Reset local state
    setFetchStatus('idle');
    setFetchError('');
    setPlayerCount(0);
    setTeamText('');
    setParsedTeams([]);
    setTeamParseError('');
    setTotalTeamPlayers(0);
    setAmateurText('');
    setParsedAmateurs([]);
    setFameText('');
    setParsedFame([]);
    setCurrentStep(1);
    setCompletedSteps(new Set());
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto pb-12">
      <StepIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={goToStep}
      />

      <div className="px-4">
        {currentStep === 1 && (
          <StepCard title="Step 1" subtitle="Fetch Players">
            <p className="text-sm text-gray-600 mb-4">
              Fetch player predictions from DataGolf.
            </p>

            <button
              type="button"
              onClick={handleFetchPlayers}
              disabled={fetchStatus === 'loading'}
              className="w-full bg-[#006747] text-white font-semibold rounded-lg
                         py-3 text-base transition-all active:scale-[0.98]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2 min-h-[48px]"
            >
              {fetchStatus === 'loading' ? (
                <>
                  <Spinner />
                  Fetching…
                </>
              ) : (
                'Fetch Players'
              )}
            </button>

            {fetchStatus === 'success' && (
              <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-4 py-3">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium">{playerCount} players loaded</span>
              </div>
            )}

            {fetchStatus === 'error' && (
              <div className="mt-3 flex items-center gap-2 text-red-700 bg-red-50 rounded-lg px-4 py-3">
                <span className="text-base">⚠️</span>
                <span className="text-sm font-medium">{fetchError}</span>
              </div>
            )}
          </StepCard>
        )}

        {currentStep === 2 && (
          <StepCard title="Step 2" subtitle="Paste Team Groupings">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Data
            </label>
            <textarea
              value={teamText}
              onChange={(e) => setTeamText(e.target.value)}
              placeholder={`Group 1\nScottie Scheffler\n\nGroup 2\nRory McIlroy\nJose Maria Olazabal*`}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm
                         font-mono leading-relaxed resize-y
                         focus:outline-none focus:ring-2 focus:ring-[#006747]/40 focus:border-[#006747]"
              style={{ minHeight: '200px' }}
            />

            <button
              type="button"
              onClick={handleParseTeams}
              disabled={!teamText.trim()}
              className="mt-4 w-full bg-[#006747] text-white font-semibold rounded-lg
                         py-3 text-base transition-all active:scale-[0.98]
                         disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
            >
              Parse Teams
            </button>

            {teamParseError && (
              <div className="mt-3 text-red-700 bg-red-50 rounded-lg px-4 py-3 text-sm">
                ⚠️ {teamParseError}
              </div>
            )}

            {parsedTeams.length > 0 && !teamParseError && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-4 py-3">
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium">
                    {parsedTeams.length} teams parsed with {totalTeamPlayers} total players
                  </span>
                </div>

                {/* Match preview */}
                {players.length > 0 && (
                  <div className="bg-gray-50 rounded-lg px-4 py-3 max-h-48 overflow-y-auto">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                      Match Preview
                    </div>
                    {parsedTeams.slice(0, 10).map((t) => {
                      const matchCount = t.playerNames.filter((name) =>
                        players.some(
                          (p) => p.name.toLowerCase() === name.toLowerCase(),
                        ),
                      ).length;
                      return (
                        <div
                          key={t.groupId}
                          className="flex justify-between text-xs py-0.5"
                        >
                          <span className="text-gray-700">
                            Group {t.groupId}
                          </span>
                          <span
                            className={
                              matchCount === t.playerNames.length
                                ? 'text-green-600'
                                : 'text-amber-600'
                            }
                          >
                            {matchCount}/{t.playerNames.length} matched
                          </span>
                        </div>
                      );
                    })}
                    {parsedTeams.length > 10 && (
                      <div className="text-xs text-gray-400 mt-1">
                        …and {parsedTeams.length - 10} more groups
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleContinueFromTeams}
                  className="w-full bg-[#006747] text-white font-semibold rounded-lg
                             py-3 text-base transition-all active:scale-[0.98] min-h-[48px]"
                >
                  Continue
                </button>
              </div>
            )}
          </StepCard>
        )}

        {currentStep === 3 && (
          <StepCard title="Step 3" subtitle="Amateur Players" optional>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amateur Names
            </label>
            <textarea
              value={amateurText}
              onChange={(e) => setAmateurText(e.target.value)}
              placeholder="One name per line"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm
                         font-mono leading-relaxed resize-y
                         focus:outline-none focus:ring-2 focus:ring-[#006747]/40 focus:border-[#006747]"
              style={{ minHeight: '120px' }}
            />

            {parsedAmateurs.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-4 py-3">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium">
                  {parsedAmateurs.length} amateurs saved
                </span>
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={handleSkipAmateurs}
                className="flex-1 border border-gray-300 text-gray-600 font-semibold rounded-lg
                           py-3 text-base transition-all active:scale-[0.98] min-h-[48px]"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleSaveAmateurs}
                disabled={!amateurText.trim()}
                className="flex-1 bg-[#006747] text-white font-semibold rounded-lg
                           py-3 text-base transition-all active:scale-[0.98]
                           disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
              >
                Save
              </button>
            </div>
          </StepCard>
        )}

        {currentStep === 4 && (
          <StepCard title="Step 4" subtitle="Fame Premiums" optional>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Premium Multipliers
            </label>
            <textarea
              value={fameText}
              onChange={(e) => setFameText(e.target.value)}
              placeholder="Player Name: 1.15"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm
                         font-mono leading-relaxed resize-y
                         focus:outline-none focus:ring-2 focus:ring-[#006747]/40 focus:border-[#006747]"
              style={{ minHeight: '120px' }}
            />

            {parsedFame.length > 0 && (
              <div className="mt-3 bg-gray-50 rounded-lg px-4 py-3 max-h-40 overflow-y-auto">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Parsed Premiums
                </div>
                {parsedFame.map((fp) => (
                  <div
                    key={fp.playerName}
                    className="flex justify-between text-xs py-0.5"
                  >
                    <span className="text-gray-700">{fp.playerName}</span>
                    <span className="font-mono text-[#006747] font-semibold">
                      {fp.multiplier.toFixed(2)}×
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={handleSkipFame}
                className="flex-1 border border-gray-300 text-gray-600 font-semibold rounded-lg
                           py-3 text-base transition-all active:scale-[0.98] min-h-[48px]"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleSaveFame}
                disabled={!fameText.trim()}
                className="flex-1 bg-[#006747] text-white font-semibold rounded-lg
                           py-3 text-base transition-all active:scale-[0.98]
                           disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
              >
                Save
              </button>
            </div>
          </StepCard>
        )}

        {currentStep === 5 && (
          <StepCard title="Step 5" subtitle="Review & Confirm">
            <div className="space-y-3">
              <SummaryRow
                label="Players loaded"
                value={`${playerCount} from DataGolf`}
                ok={playerCount > 0}
              />
              <SummaryRow
                label="Teams"
                value={`${parsedTeams.length} groups with ${totalTeamPlayers} players`}
                ok={parsedTeams.length > 0}
              />
              <SummaryRow
                label="Seniors"
                value={`${seniorCount} players`}
                ok
              />
              <SummaryRow
                label="Amateurs"
                value={`${parsedAmateurs.length} players`}
                ok
              />
              <SummaryRow
                label="Fame premiums"
                value={`${parsedFame.length} players`}
                ok
              />

              {/* Unmatched players */}
              {(() => {
                const unmatched = getUnmatchedPlayers();
                if (unmatched.length === 0) return null;
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">
                      Unmatched Players ({unmatched.length})
                    </div>
                    <div className="text-xs text-amber-800 space-y-0.5 max-h-32 overflow-y-auto">
                      {unmatched.map((name) => (
                        <div key={name}>{name}</div>
                      ))}
                    </div>
                    <div className="text-[10px] text-amber-600 mt-2">
                      These players will have 0% probabilities. They may be
                      withdrawals or name mismatches.
                    </div>
                  </div>
                );
              })()}
            </div>

            <button
              type="button"
              onClick={handleGoToDashboard}
              disabled={parsedTeams.length === 0 || playerCount === 0}
              className="mt-6 w-full bg-[#006747] text-white font-bold rounded-lg
                         py-4 text-lg transition-all active:scale-[0.98]
                         disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px]
                         shadow-md"
            >
              ⛳ Go to Dashboard
            </button>

            <button
              type="button"
              onClick={handleResetAll}
              className="mt-4 w-full text-center text-sm text-gray-400 hover:text-red-500
                         transition-colors py-2"
            >
              Reset All Data
            </button>
          </StepCard>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StepCard({
  title,
  subtitle,
  optional,
  children,
}: {
  title: string;
  subtitle: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-[#006747]">
          {title}
        </span>
        <span className="text-base font-bold text-[#1a1a1a]">{subtitle}</span>
        {optional && (
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider ml-auto">
            Optional
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[#1a1a1a]">{value}</span>
        {ok ? (
          <span className="text-green-500 text-sm">✓</span>
        ) : (
          <span className="text-red-400 text-sm">✗</span>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
