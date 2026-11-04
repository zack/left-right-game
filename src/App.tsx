import GameScreen from './GameScreen.tsx';
import HelpScreen from './HelpScreen.tsx';
import HistoryScreen from './HistoryScreen.tsx';
import StartScreen from './StartScreen.tsx';
import SummaryScreen from './SummaryScreen.tsx';
import { useState } from 'react';
import {
  type SessionRecord,
  addToHistory,
  getBest,
  getSessionSettings,
  loadHistory,
} from './history.ts';
import { type Settings, loadSettings, saveSettings } from './settings.ts';
import { canSpeak, unlockAudio } from './sound.ts';

type View = 'game' | 'help' | 'history' | 'start' | 'summary';

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
  const speechAvailable = canSpeak();

  function handleChange(change: Partial<Settings>) {
    setSettings({ ...settings, ...change });
    saveSettings(change);
  }

  function handleStart() {
    unlockAudio();
    setGameNumber(gameNumber + 1);
    setView('game');
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
        onAbandon={() => setView('start')}
        onFinish={handleFinish}
        settings={settings}
        writtenFallback={!speechAvailable}
      />
    );
  } else if (view === 'summary' && summary) {
    return (
      <SummaryScreen
        onPlayAgain={handleStart}
        onStartScreen={() => setView('start')}
        previousBest={summary.previousBest}
        record={summary.record}
      />
    );
  } else if (view === 'history') {
    return (
      <HistoryScreen
        history={history}
        onBack={() => setView('start')}
        onCleared={() => setHistory([])}
      />
    );
  } else if (view === 'help') {
    return <HelpScreen onBack={() => setView('start')} />;
  } else {
    return (
      <StartScreen
        best={getBest(history, getSessionSettings(settings))}
        canSpeak={speechAvailable}
        onChange={handleChange}
        onHelp={() => setView('help')}
        onHistory={() => setView('history')}
        onStart={handleStart}
        settings={settings}
      />
    );
  }
}
