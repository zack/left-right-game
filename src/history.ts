import {
  type Settings,
  isClockSeconds,
  isMode,
  isPromptType,
  isRoundLength,
  isTimeLimit,
} from './settings.ts';

export interface SessionRecord {
  averageMs: number | null; // mean reaction time on correct answers
  clockSeconds: Settings['clockSeconds'] | null; // clock mode only
  correct: number;
  date: number; // when the session ended, from Date.now()
  longestRun: number;
  mode: Settings['mode'];
  prompt: Settings['prompt'];
  roundLength: Settings['roundLength'] | null; // round mode only
  timeLimit: Settings['timeLimit'];
  total: number; // prompts answered, wrong, or timed out
}

// The settings that decide which sessions a best score compares.
export type SessionSettings = Pick<
  SessionRecord,
  'clockSeconds' | 'mode' | 'prompt' | 'roundLength' | 'timeLimit'
>;

export function getSessionSettings(settings: Settings): SessionSettings {
  return {
    clockSeconds: settings.mode === 'clock' ? settings.clockSeconds : null,
    mode: settings.mode,
    prompt: settings.prompt,
    roundLength: settings.mode === 'round' ? settings.roundLength : null,
    timeLimit: settings.timeLimit,
  };
}

const STORAGE_KEY = 'left-right-history';

function isNumberOrNull(value: unknown): boolean {
  return value === null || typeof value === 'number';
}

function isSessionRecord(value: unknown): value is SessionRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record: Record<string, unknown> = { ...value };
  return (
    isNumberOrNull(record.averageMs)
    && (record.clockSeconds === null || isClockSeconds(record.clockSeconds))
    && typeof record.correct === 'number'
    && typeof record.date === 'number'
    && typeof record.longestRun === 'number'
    && isMode(record.mode)
    && isPromptType(record.prompt)
    && (record.roundLength === null || isRoundLength(record.roundLength))
    && isTimeLimit(record.timeLimit)
    && typeof record.total === 'number'
  );
}

// A record that fails the check is dropped and the rest are kept.
export function loadHistory(): SessionRecord[] {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    );
    return Array.isArray(stored) ? stored.filter(isSessionRecord) : [];
  } catch {
    return [];
  }
}

export function addToHistory(record: SessionRecord): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...loadHistory(), record]),
    );
  } catch {
    // Storage is blocked or full. The summary still shows; the session just
    // isn't kept.
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do if storage is blocked.
  }
}

// Best scores only compare sessions played with the same settings, so a run
// with a 1-second limit isn't measured against one with no limit.
function sameSettings(a: SessionSettings, b: SessionSettings): boolean {
  return (
    a.mode === b.mode
    && a.prompt === b.prompt
    && a.timeLimit === b.timeLimit
    && a.roundLength === b.roundLength
    && a.clockSeconds === b.clockSeconds
  );
}

// The number that "best" means in each mode: most right in a round or on
// the clock, longest run of right answers in endless.
export function getScore(record: SessionRecord): number {
  return record.mode === 'endless' ? record.longestRun : record.correct;
}

export function getBest(
  history: SessionRecord[],
  like: SessionSettings,
): number | null {
  const scores = history
    .filter((record) => sameSettings(record, like))
    .map(getScore);
  return scores.length > 0 ? Math.max(...scores) : null;
}
