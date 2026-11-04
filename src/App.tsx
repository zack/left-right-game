import GameScreen from './GameScreen.tsx';
import HelpScreen from './HelpScreen.tsx';
import HistoryScreen from './HistoryScreen.tsx';
import StartScreen from './StartScreen.tsx';
import SummaryScreen from './SummaryScreen.tsx';
import {
  type SessionRecord,
  addToHistory,
  getBest,
  getSessionSettings,
  loadHistory,
} from './history.ts';
import { type Settings, loadSettings, saveSettings } from './settings.ts';
import { canSpeak, unlockAudio } from './sound.ts';
import { useEffect, useState } from 'react';

type View = 'game' | 'help' | 'history' | 'start' | 'summary';

const TITLES: Record<View, string> = {
  game: 'Playing – Left Right',
  help: 'Help – Left Right',
  history: 'History – Left Right',
  start: 'Left Right',
  summary: 'Results – Left Right',
};

// Marks the one history entry the app pushes when it leaves the start
// screen, so the browser's Back button (and Android's back gesture) returns
// to Start instead of leaving the app.
const HISTORY_STATE = { leftRight: true };

interface Summary {
  previousBest: number | null;
  record: SessionRecord;
}

export default function App() {
  const [view, setView] = useState<View>('start');
  const [settings, setSettings] = useState(loadSettings);
  const [history, setHistory] = useState(loadHistory);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [gameNumber, setGameNumber] = useState(0);
  const [leftMidGame, setLeftMidGame] = useState(false);
  const speechAvailable = canSpeak();

  useEffect(() => {
    document.title = TITLES[view];
  }, [view]);

  // Back from any screen goes to Start. In a game that's the same as Quit:
  // the game is thrown away.
  useEffect(() => {
    function handlePopState() {
      setView('start');
    }
    globalThis.addEventListener('popstate', handlePopState);
    return () => globalThis.removeEventListener('popstate', handlePopState);
  }, []);

  function goTo(next: Exclude<View, 'start'>) {
    if (view === 'start') {
      globalThis.history.pushState(HISTORY_STATE, '');
    }
    setLeftMidGame(false);
    setView(next);
  }

  // Going back to Start in the app also uses up the history entry, so the
  // browser's Back button never has a stack of app screens to step through.
  function goToStart() {
    if (isAppHistoryState(globalThis.history.state)) {
      globalThis.history.back();
    } else {
      setView('start');
    }
  }

  function handleChange(change: Partial<Settings>) {
    setSettings({ ...settings, ...change });
    saveSettings(change);
  }

  function handleStart() {
    unlockAudio();
    setGameNumber(gameNumber + 1);
    goTo('game');
  }

  function handleFinish(record: SessionRecord) {
    setSummary({ previousBest: getBest(history, record), record });
    addToHistory(record);
    setHistory(loadHistory());
    setView('summary');
  }

  if (view === 'game') {
    return (
      <GameScreen
        key={gameNumber}
        onAbandon={(reason) => {
          setLeftMidGame(reason === 'left');
          goToStart();
        }}
        onFinish={handleFinish}
        settings={settings}
        writtenFallback={!speechAvailable}
      />
    );
  } else if (view === 'summary' && summary) {
    return (
      <SummaryScreen
        onPlayAgain={handleStart}
        onStartScreen={goToStart}
        previousBest={summary.previousBest}
        record={summary.record}
      />
    );
  } else if (view === 'history') {
    return (
      <HistoryScreen
        history={history}
        initialMode={history.at(-1)?.mode ?? settings.mode}
        onBack={goToStart}
        onCleared={() => setHistory([])}
      />
    );
  } else if (view === 'help') {
    return <HelpScreen onBack={goToStart} />;
  } else {
    return (
      <StartScreen
        best={getBest(history, getSessionSettings(settings))}
        canSpeak={speechAvailable}
        leftMidGame={leftMidGame}
        onChange={handleChange}
        onHelp={() => goTo('help')}
        onHistory={() => goTo('history')}
        onStart={handleStart}
        settings={settings}
      />
    );
  }
}

function isAppHistoryState(state: unknown): boolean {
  return (
    typeof state === 'object'
    && state !== null
    && 'leftRight' in state
    && state.leftRight === true
  );
}
