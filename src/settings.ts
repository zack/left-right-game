// Choices
export const MODES = ['round', 'clock', 'endless'] as const;
export type Mode = (typeof MODES)[number];

export const ROUND_LENGTHS = [10, 20, 50] as const;
export type RoundLength = (typeof ROUND_LENGTHS)[number];

export const CLOCK_SECONDS = [30, 60, 120] as const;
export type ClockSeconds = (typeof CLOCK_SECONDS)[number];

export const PROMPT_TYPES = ['spoken', 'written', 'both'] as const;
export type PromptType = (typeof PROMPT_TYPES)[number];

// Milliseconds. 0 means no limit.
export const TIME_LIMITS = [0, 3000, 2000, 1500, 1000] as const;
export type TimeLimit = (typeof TIME_LIMITS)[number];

export interface Settings {
  clockSeconds: ClockSeconds;
  mode: Mode;
  prompt: PromptType;
  roundLength: RoundLength;
  timeLimit: TimeLimit;
}

export const DEFAULT_SETTINGS: Settings = {
  clockSeconds: 60,
  mode: 'round',
  prompt: 'both',
  roundLength: 20,
  timeLimit: 0,
};

const STORAGE_KEY = 'left-right-settings';

export function isMode(value: unknown): value is Mode {
  return MODES.some((mode) => mode === value);
}

export function isRoundLength(value: unknown): value is RoundLength {
  return ROUND_LENGTHS.some((length) => length === value);
}

export function isClockSeconds(value: unknown): value is ClockSeconds {
  return CLOCK_SECONDS.some((seconds) => seconds === value);
}

export function isPromptType(value: unknown): value is PromptType {
  return PROMPT_TYPES.some((prompt) => prompt === value);
}

export function isTimeLimit(value: unknown): value is TimeLimit {
  return TIME_LIMITS.some((limit) => limit === value);
}

// Each stored field is checked on its own, so one bad value only resets that
// one setting rather than all of them.
export function loadSettings(): Settings {
  let stored: unknown;
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (typeof stored !== 'object' || stored === null) {
    return DEFAULT_SETTINGS;
  }

  const raw: Record<string, unknown> = { ...stored };
  const settings = { ...DEFAULT_SETTINGS };
  if (isClockSeconds(raw.clockSeconds)) {
    settings.clockSeconds = raw.clockSeconds;
  }
  if (isMode(raw.mode)) {
    settings.mode = raw.mode;
  }
  if (isPromptType(raw.prompt)) {
    settings.prompt = raw.prompt;
  }
  if (isRoundLength(raw.roundLength)) {
    settings.roundLength = raw.roundLength;
  }
  if (isTimeLimit(raw.timeLimit)) {
    settings.timeLimit = raw.timeLimit;
  }
  return settings;
}

// Only the settings the player changed get written, so a first visit writes
// nothing and a later change to a default still reaches anyone who never
// picked that setting themselves.
export function saveSettings(change: Partial<Settings>): void {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '{}',
    );
    const previous =
      typeof stored === 'object' && stored !== null ? { ...stored } : {};
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...previous, ...change }),
    );
  } catch {
    // Storage is blocked or full. The game still works; it just won't
    // remember the settings next time.
  }
}
