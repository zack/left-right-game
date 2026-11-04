import type { SessionRecord } from './history.ts';
import type { Settings } from './settings.ts';
import { Check, Cross } from './Marks.tsx';
import { type Side, getNextSide, getRound } from './sequence.ts';
import { playClick, speak, stopSpeaking } from './sound.ts';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

// Timing, in milliseconds
const FIRST_PROMPT_DELAY = 800;
const RIGHT_FEEDBACK = 500;
const WRONG_FEEDBACK = 1000;
const CLOCK_TICK = 200;
const QUIT_CONFIRM_TIME = 3000;

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

function getStopLabel(mode: Settings['mode'], quitArmed: boolean): string {
  if (mode === 'endless') {
    return 'Stop';
  } else if (quitArmed) {
    return 'Tap again to quit';
  } else {
    return 'Quit';
  }
}

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
  onAbandon: (reason: 'left' | 'quit') => void;
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
  const [quitArmed, setQuitArmed] = useState(false);
  const gameRef = useRef<HTMLDivElement>(null);

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

  function stop() {
    stopSpeaking();
    if (settings.mode === 'endless' && stats.total > 0) {
      onFinish(getRecord(stats));
    } else {
      onAbandon('quit');
    }
  }

  // Quit throws a round away and sits right above the right tap area, so it
  // takes a second tap. Stop in Endless saves the game, so it doesn't.
  function handleStopButton() {
    if (settings.mode === 'endless' || quitArmed) {
      stop();
    } else {
      setQuitArmed(true);
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
    if (event.key === 'Escape') {
      event.preventDefault();
      stop();
    } else if (event.key === 'ArrowLeft') {
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
    onAbandon('left');
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

  useEffect(() => {
    if (!quitArmed) {
      return undefined;
    }
    const timer = setTimeout(() => setQuitArmed(false), QUIT_CONFIRM_TIME);
    return () => clearTimeout(timer);
  }, [quitArmed]);

  // Focus goes to the game area, which is marked as an application so that
  // a screen reader passes the arrow keys through to the game instead of
  // using them to read the page.
  useEffect(() => {
    gameRef.current?.focus();
  }, []);

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

  // What a screen reader hears. The word only goes here when nothing speaks
  // it. Each message gets its own key, so it goes into the live region as a
  // new element and is announced even when the text repeats ("Right",
  // "Right").
  let announcement = null;
  if (phase === 'feedback' && feedback) {
    let text;
    if (feedback.tapped === feedback.answer) {
      text = 'Right';
    } else if (feedback.tapped) {
      text = `Wrong, it was ${feedback.answer}`;
    } else {
      text = `Time’s up, it was ${feedback.answer}`;
    }
    announcement = <p key={`feedback-${index}`}>{text}</p>;
  } else if (phase === 'prompt' && (!spoken || speechFailed)) {
    announcement = <p key={`prompt-${index}`}>{side}</p>;
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
      <div
        aria-label='Left Right game. Press the left or right arrow key to answer. Escape quits.'
        className='game-area'
        ref={gameRef}
        role='application'
        tabIndex={-1}
      >
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
          <button className='quit' onClick={handleStopButton} type='button'>
            {getStopLabel(settings.mode, quitArmed)}
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
        <div
          aria-atomic='true'
          aria-live='assertive'
          className='visually-hidden'
        >
          {announcement}
        </div>
      </div>
    </main>
  );
}
