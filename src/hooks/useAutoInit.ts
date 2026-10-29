import { useState, useEffect, useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import {
  playersAtom,
  teamsAtom,
  famePremiumsAtom,
  courseFitsAtom,
  amateursAtom,
  dgRankingsAtom,
  baselinePlayersAtom,
  baselineTimestampAtom,
  auctionAtom,
  amateurBetsAtom,
} from '../atoms';
import {
  fetchPredictions,
  fetchLivePredictions,
  fetchSkillRatings,
  fetchDGRankings,
  DataGolfError,
} from '../services/datagolf';
import { parseTeamData } from '../utils/teamParser';
import { parseAmateurs } from '../utils/amateurParser';
import { matchPlayersToTeams } from '../utils/nameMatcher';
import { calculateFamePremiums } from '../utils/fameCalculator';
import { calculateCourseFits } from '../utils/courseFitCalculator';
import { TEAMS_2026, AMATEURS_2026 } from '../data/teams2026';
import { BASELINE_PLAYERS_2026, BASELINE_TIMESTAMP_2026 } from '../data/baseline2026';
import { buildAuction2026Map, AMATEUR_BETS_2026 } from '../data/auction2026';

export type InitStatus = 'idle' | 'loading' | 'ready' | 'error';

export function useAutoInit() {
  const [players, setPlayers] = useAtom(playersAtom);
  const setBaselinePlayers = useSetAtom(baselinePlayersAtom);
  const setBaselineTs = useSetAtom(baselineTimestampAtom);
  const setTeams = useSetAtom(teamsAtom);
  const setFamePremiums = useSetAtom(famePremiumsAtom);
  const setCourseFits = useSetAtom(courseFitsAtom);
  const setAmateurs = useSetAtom(amateursAtom);
  const setDgRankings = useSetAtom(dgRankingsAtom);
  const [auction, setAuction] = useAtom(auctionAtom);
  const setAmateurBets = useSetAtom(amateurBetsAtom);

  const [status, setStatus] = useState<InitStatus>(
    players.length > 0 ? 'ready' : 'loading',
  );
  const [error, setError] = useState('');
  const [eventName, setEventName] = useState('');

  const init = useCallback(async () => {
    setStatus('loading');
    setError('');

    try {
      // Prefer the live in-tournament model; fall back to pre-tournament when
      // the live endpoint is unavailable (before / after the tournament).
      let result: Awaited<ReturnType<typeof fetchPredictions>>;
      try {
        result = await fetchLivePredictions();
      } catch {
        result = await fetchPredictions();
      }
      setEventName(result.eventName);

      const [skillResult, rankResult] = await Promise.allSettled([
        fetchSkillRatings(),
        fetchDGRankings(),
      ]);

      const skillMap =
        skillResult.status === 'fulfilled' ? skillResult.value : new Map<number, never>();
      const rankMap =
        rankResult.status === 'fulfilled' ? rankResult.value : new Map<number, number>();

      if (rankResult.status === 'fulfilled') setDgRankings(rankResult.value);

      const enriched = result.players.map((p) => {
        const sr     = p.dgId != null ? skillMap.get(p.dgId) : undefined;
        const dgRank = p.dgId != null ? rankMap.get(p.dgId)  : undefined;
        return {
          ...p,
          ...(sr ? { sgOtt: sr.sg_ott, sgApp: sr.sg_app, sgAtg: sr.sg_arg, sgPutt: sr.sg_putt } : {}),
          ...(dgRank != null ? { dgRank } : {}),
        };
      });

      setPlayers(enriched);

      // Seed baseline from static 2026 snapshot (overrides any stale localStorage value)
      setBaselinePlayers(BASELINE_PLAYERS_2026);
      setBaselineTs(BASELINE_TIMESTAMP_2026);

      const parsedTeams   = parseTeamData(TEAMS_2026);
      const parsedAmateurs = parseAmateurs(AMATEURS_2026);

      setAmateurs(parsedAmateurs);

      const teams = matchPlayersToTeams(parsedTeams, enriched, parsedAmateurs);
      setTeams(teams);
      setFamePremiums(calculateFamePremiums(enriched, rankMap));
      setCourseFits(calculateCourseFits(enriched));

      setStatus('ready');
    } catch (err) {
      setStatus('error');
      if (err instanceof DataGolfError) {
        setError(
          err.status === 401 || err.status === 403
            ? 'Invalid API key.'
            : err.message,
        );
      } else {
        setError('Network error. Please check your connection.');
      }
    }
  }, [setPlayers, setTeams, setFamePremiums, setCourseFits, setAmateurs, setDgRankings, setBaselinePlayers, setBaselineTs]);

  // Force re-fetch from DG (updates live data, keeps baseline)
  const refresh = useCallback(async () => {
    await init();
  }, [init]);

  useEffect(() => {
    // Auto-load 2026 auction data if no auction results exist yet
    if (auction.size === 0) {
      setAuction(buildAuction2026Map());
      setAmateurBets(AMATEUR_BETS_2026);
    }

    if (players.length === 0) {
      init();
    }

    // Auto-refresh live DataGolf data every 15 minutes
    const interval = setInterval(() => { void init(); }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { status, error, eventName, retry: init, refresh };
}
