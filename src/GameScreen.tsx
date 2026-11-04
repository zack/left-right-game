import type { SessionRecord } from './history.ts';
import type { Settings } from './settings.ts';
import { Check, Cross } from './Marks.tsx';
import { type Side, getNextSide, getRound } from './sequence.ts';
import { playClick, speak, stopSpeaking, vibrate } from './sound.ts';
import { useEffect, useEffectEvent, useState } from 'react';

// Timing, in milliseconds
const FIRST_PROMPT_DELAY = 800;
const RIGHT_FEEDBACK = 500;
const WRONG_FEEDBACK = 1000;
const CLOCK_TICK = 200;

type Phase = 'feedback' | 'pause' | 'prompt';

interface Feedback {
  answer: Side;
  tapped: Side | null; // null when the time limit ran out
}

interface Stats {
  correct: number;
  longestRun: number;
  reactionCount: number;
  reactionTotal: number;
  run: number;
  total: number;
}

const EMPTY_STATS: Stats = {
  correct: 0,
  longestRun: 0,
  reactionCount: 0,
  reactionTotal: 0,
  run: 0,
  total: 0,
};

function formatClock(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function GameScreen({
  onAbandon,
  onFinish,
  settings,
  writtenFallback,
}: {
  onAbandon: () => void;
  onFinish: (record: SessionRecord) => void;
  settings: Settings;
  writtenFallback: boolean; // the browser can’t speak, so always show words
}) {
  const [sides, setSides] = useState<Side[]>(() =>
    settings.mode === 'round'
      ? getRound(settings.roundLength)
      : [getNextSide([])],
  );
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('pause');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [clockEnd, setClockEnd] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState(() => performance.now());
  const [finished, setFinished] = useState(false);
  const [speechFailed, setSpeechFailed] = useState(false);

  const side = sides[index];
  const spoken = settings.prompt !== 'written' && !writtenFallback;
  const written = settings.prompt !== 'spoken' || writtenFallback;

  function getRecord(finalStats: Stats): SessionRecord {
    return {
      averageMs:
        finalStats.reactionCount > 0
          ? Math.round(finalStats.reactionTotal / finalStats.reactionCount)
          : null,
      clockSeconds: settings.mode === 'clock' ? settings.clockSeconds : null,
      correct: finalStats.correct,
      date: Date.now(),
      longestRun: finalStats.longestRun,
      mode: settings.mode,
      prompt: settings.prompt,
      roundLength: settings.mode === 'round' ? settings.roundLength : null,
      timeLimit: settings.timeLimit,
      total: finalStats.total,
    };
  }

  function grade(tapped: Side | null, timeStamp: number) {
    if (phase !== 'prompt' || startedAt === null) {
      return;
    }
    const isRight = tapped === side;
    setStats({
      correct: stats.correct + (isRight ? 1 : 0),
      longestRun: Math.max(stats.longestRun, isRight ? stats.run + 1 : 0),
      reactionCount: stats.reactionCount + (isRight ? 1 : 0),
      reactionTotal:
        stats.reactionTotal + (isRight ? timeStamp - startedAt : 0),
      run: isRight ? stats.run + 1 : 0,
      total: stats.total + 1,
    });
    setFeedback({ answer: side, tapped });
    setPhase('feedback');
    if (isRight) {
      playClick();
    } else if (settings.vibrate) {
      vibrate();
    }
  }

  function goToNextPrompt() {
    if (settings.mode === 'round' && index + 1 >= sides.length) {
      onFinish(getRecord(stats));
      return;
    }
    if (index + 1 >= sides.length) {
      setSides([...sides, getNextSide(sides)]);
    }
    setIndex(index + 1);
    setSpeechFailed(false);
    setFeedback(null);
    setStartedAt(null);
    setPhase('prompt');
  }

  function handleStop() {
    stopSpeaking();
    if (settings.mode === 'endless' && stats.total > 0) {
      onFinish(getRecord(stats));
    } else {
      onAbandon();
    }
  }

  // The first prompt waits a moment so the player can get their hands ready.
  // The clock starts with it.
  const begin = useEffectEvent(() => {
    setClockEnd(performance.now() + settings.clockSeconds * 1000);
    setPhase('prompt');
  });
  useEffect(() => {
    const timer = setTimeout(begin, FIRST_PROMPT_DELAY);
    return () => clearTimeout(timer);
  }, []);

  // Start the reaction timer when the prompt reaches the player: when the
  // word is painted, or when speech starts if there's no word.
  const markStart = useEffectEvent((time: number) => setStartedAt(time));
  const showWordInstead = useEffectEvent(() => {
    setSpeechFailed(true);
    requestAnimationFrame(markStart);
  });
  useEffect(() => {
    if (phase !== 'prompt') {
      return undefined;
    }
    let frame = 0;
    if (written) {
      frame = requestAnimationFrame(markStart);
    }
    if (spoken) {
      speak(side, (failed) => {
        if (failed && !written) {
          showWordInstead();
        } else if (!written) {
          markStart(performance.now());
        }
      });
    }
    return () => {
      cancelAnimationFrame(frame);
      stopSpeaking();
    };
  }, [phase, side, spoken, written]);

  const timeOut = useEffectEvent(() => grade(null, performance.now()));
  useEffect(() => {
    if (phase !== 'prompt' || startedAt === null || settings.timeLimit === 0) {
      return undefined;
    }
    const timer = setTimeout(timeOut, settings.timeLimit);
    return () => clearTimeout(timer);
  }, [phase, settings.timeLimit, startedAt]);

  const next = useEffectEvent(goToNextPrompt);
  useEffect(() => {
    if (phase !== 'feedback' || !feedback) {
      return undefined;
    }
    const delay =
      feedback.tapped === feedback.answer ? RIGHT_FEEDBACK : WRONG_FEEDBACK;
    const timer = setTimeout(next, delay);
    return () => clearTimeout(timer);
  }, [feedback, phase]);

  // The clock runs from the start, through feedback and all.
  const finishClock = useEffectEvent(() => {
    // The interval can fire again before the summary replaces this screen.
    if (finished) {
      return;
    }
    setFinished(true);
    stopSpeaking();
    onFinish(getRecord(stats));
  });
  useEffect(() => {
    if (settings.mode !== 'clock' || clockEnd === null) {
      return undefined;
    }
    const timer = setInterval(() => {
      const now = performance.now();
      setClockNow(now);
      if (now >= clockEnd) {
        finishClock();
      }
    }, CLOCK_TICK);
    return () => clearInterval(timer);
  }, [clockEnd, settings.mode]);

  // Arrow keys play exactly like taps.
  const handleKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.repeat) {
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      grade('left', event.timeStamp);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      grade('right', event.timeStamp);
    }
  });
  useEffect(() => {
    globalThis.addEventListener('keydown', handleKey);
    return () => globalThis.removeEventListener('keydown', handleKey);
  }, []);

  // Leaving the app throws the session away. There's no pause.
  const leave = useEffectEvent(() => {
    stopSpeaking();
    onAbandon();
  });
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        leave();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => stopSpeaking, []);

  function getHalfState(half: Side): string {
    if (!feedback) {
      return '';
    } else if (feedback.tapped === half && half === feedback.answer) {
      return 'correct';
    } else if (feedback.tapped === half) {
      return 'wrong';
    } else if (half === feedback.answer) {
      return 'answer';
    } else {
      return '';
    }
  }

  function renderHalf(half: Side) {
    const state = getHalfState(half);
    return (
      <div
        className={`half ${state}`}
        onPointerDown={(event) => grade(half, event.timeStamp)}
      >
        {state === 'correct' && <Check />}
        {state === 'wrong' && <Cross />}
        {state === 'answer' && (
          <div className='answer'>
            <Check />
            <span>{half.toUpperCase()}</span>
          </div>
        )}
      </div>
    );
  }

  let status;
  if (settings.mode === 'round') {
    status = `${Math.min(index + 1, sides.length)} / ${sides.length}`;
  } else if (settings.mode === 'clock') {
    const remaining =
      clockEnd === null ? settings.clockSeconds * 1000 : clockEnd - clockNow;
    status = `${formatClock(remaining)} · ${stats.correct} right`;
  } else {
    const accuracy =
      stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    status = `${stats.correct} right · ${stats.total - stats.correct} wrong · ${accuracy}%`;
  }

  return (
    <main className='game'>
      <h1 className='visually-hidden'>Left Right</h1>
      <p className='visually-hidden'>
        Press the left or right arrow key to answer.
      </p>
      <div className='top-bar'>
        <span className='status'>{status}</span>
        {settings.timeLimit > 0 && (
          <span className='limit'>
            {phase === 'prompt' && startedAt !== null && (
              <span
                className='limit-fill'
                key={index}
                style={{ animationDuration: `${settings.timeLimit}ms` }}
              />
            )}
          </span>
        )}
        <button className='quit' onClick={handleStop} type='button'>
          {settings.mode === 'endless' ? 'Stop' : 'Quit'}
        </button>
      </div>
      <div aria-hidden='true' className='halves'>
        {renderHalf('left')}
        <div className='strip' />
        {renderHalf('right')}
        {phase === 'prompt' && (written || speechFailed) && (
          <div className='word'>{side.toUpperCase()}</div>
        )}
      </div>
    </main>
  );
}
