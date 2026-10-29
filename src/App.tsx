import { useAtom } from 'jotai';
import { viewAtom } from './atoms';
import { useAutoInit } from './hooks/useAutoInit';
import DashboardHeader from './components/DashboardHeader';
import TeamList from './components/TeamList';
import MyTeamsView from './components/MyTeamsView';
import PlayersView from './components/PlayersView';

const TABS = [
  { id: 'dashboard', label: 'Auction' },
  { id: 'players',   label: 'Players' },
  { id: 'myteams',   label: 'My Teams' },
] as const;

function App() {
  const [view, setView] = useAtom(viewAtom);
  const { status, error, eventName, retry, refresh } = useAutoInit();

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a]">
      {/* Tab Bar */}
      <div className="bg-[#005238] flex">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            className={`flex-1 py-3.5 text-base font-semibold text-center transition-colors ${
              view === tab.id
                ? 'bg-[#006747] text-white'
                : 'text-green-300 active:bg-[#006747]/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading overlay */}
      {(status === 'loading' || status === 'idle') && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-[#006747]">
          <svg className="w-10 h-10 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-base font-medium text-gray-600">Loading Masters field…</p>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 px-6">
          <div className="text-4xl">⚠️</div>
          <p className="text-base font-semibold text-red-700 text-center">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 bg-[#006747] text-white font-semibold rounded-lg px-6 py-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main content */}
      {status === 'ready' && (
        <>
          {eventName && (
            <div className="text-center text-[11px] text-gray-400 py-1 bg-white border-b border-gray-100">
              {eventName}
            </div>
          )}
          {view === 'dashboard' && (
            <>
              <DashboardHeader onRefresh={refresh} />
              <TeamList />
            </>
          )}
          {view === 'myteams' && (
            <>
              <DashboardHeader onRefresh={refresh} />
              <MyTeamsView />
            </>
          )}
          {view === 'players' && (
            <>
              <DashboardHeader onRefresh={refresh} />
              <PlayersView />
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
