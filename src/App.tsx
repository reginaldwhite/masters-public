import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { teamsAtom } from './atoms';
import DashboardHeader from './components/DashboardHeader';
import TeamList from './components/TeamList';

type View = 'dashboard' | 'setup';

function App() {
  const teams = useAtomValue(teamsAtom);
  const [view, setView] = useState<View>(teams.length > 0 ? 'dashboard' : 'dashboard');

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a]">
      {/* View Toggle */}
      <div className="bg-[#005238] flex">
        <button
          type="button"
          onClick={() => setView('dashboard')}
          className={`flex-1 py-3.5 text-base font-semibold text-center transition-colors ${
            view === 'dashboard'
              ? 'bg-[#006747] text-white'
              : 'text-green-300 active:bg-[#006747]/50'
          }`}
        >
          Dashboard
        </button>
        <button
          type="button"
          onClick={() => setView('setup')}
          className={`flex-1 py-3.5 text-base font-semibold text-center transition-colors ${
            view === 'setup'
              ? 'bg-[#006747] text-white'
              : 'text-green-300 active:bg-[#006747]/50'
          }`}
        >
          Setup
        </button>
      </div>

      {view === 'dashboard' ? (
        <>
          <DashboardHeader />
          <TeamList />
        </>
      ) : (
        <SetupPlaceholder />
      )}
    </div>
  );
}

function SetupPlaceholder() {
  return (
    <div className="flex-1 flex items-center justify-center p-8 min-h-[60vh]">
      <div className="text-center text-gray-400">
        <div className="text-5xl mb-4">⚙️</div>
        <h2 className="text-xl font-bold text-gray-600 mb-2">Setup</h2>
        <p className="text-sm">
          Import teams, player data, and configure payout structure.
        </p>
        <p className="text-xs mt-2 text-gray-300">Coming in Task-007</p>
      </div>
    </div>
  );
}

export default App
