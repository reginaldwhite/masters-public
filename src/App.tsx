import { useAtom } from 'jotai';
import { viewAtom } from './atoms';
import DashboardHeader from './components/DashboardHeader';
import TeamList from './components/TeamList';
import SetupWizard from './components/SetupWizard';

function App() {
  const [view, setView] = useAtom(viewAtom);

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
        <SetupWizard />
      )}
    </div>
  );
}

export default App
