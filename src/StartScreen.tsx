import {
  Button,
  type MantineColorScheme,
  SegmentedControl,
  useMantineColorScheme,
} from '@mantine/core';
import {
  CLOCK_SECONDS,
  MODES,
  type Mode,
  PROMPT_TYPES,
  ROUND_LENGTHS,
  type Settings,
  TIME_LIMITS,
} from './settings.ts';
import { useEffect, useRef } from 'react';

// Labels
const MODE_LABELS: Record<Mode, string> = {
  clock: 'Clock',
  endless: 'Endless',
  round: 'Round',
};

const MODE_HELP: Record<Mode, string> = {
  clock: 'As many as you can before time runs out.',
  endless: 'Keep going until you press Stop.',
  round: 'A set number of prompts.',
};

const PROMPT_LABELS: Record<Settings['prompt'], string> = {
  both: 'Both',
  spoken: 'Spoken',
  written: 'Written',
};

const THEMES: { label: string; value: MantineColorScheme }[] = [
  { label: 'Device', value: 'auto' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

function getTimeLimitLabel(limit: number): string {
  return limit === 0 ? 'Off' : `${limit / 1000}s`;
}

function getBestText(settings: Settings, best: number | null): string {
  if (best === null) {
    return 'No best yet for these settings.';
  } else if (settings.mode === 'round') {
    return `Best for these settings: ${best} of ${settings.roundLength}`;
  } else if (settings.mode === 'clock') {
    return `Best for these settings: ${best} right`;
  } else {
    return `Best for these settings: ${best} in a row`;
  }
}

// A Mantine SegmentedControl is a set of radio buttons, so the fieldset's
// legend names the group.
function Choice({
  data,
  id,
  label,
  onChange,
  value,
}: {
  data: { label: string; value: string }[];
  id: string; // the radio buttons' name
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <fieldset className='field'>
      <legend className='field-label'>{label}</legend>
      <SegmentedControl
        data={data}
        fullWidth
        name={id}
        onChange={onChange}
        value={value}
      />
    </fieldset>
  );
}

export default function StartScreen({
  best,
  canSpeak,
  leftMidGame,
  onChange,
  onHelp,
  onHistory,
  onStart,
  settings,
}: {
  best: number | null;
  canSpeak: boolean;
  leftMidGame: boolean; // the last game ended because the player left the app
  onChange: (change: Partial<Settings>) => void;
  onHelp: () => void;
  onHistory: () => void;
  onStart: () => void;
  settings: Settings;
}) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className='screen start'>
      <h1 className='title' ref={headingRef} tabIndex={-1}>
        Left Right
      </h1>
      <p className='intro'>Tap the side it says, as fast as you can.</p>
      {leftMidGame && (
        <p className='notice'>
          Your last game was stopped when you left the app.
        </p>
      )}

      <div className='fields'>
        <div>
          <Choice
            data={MODES.map((mode) => ({
              label: MODE_LABELS[mode],
              value: mode,
            }))}
            id='mode'
            label='Mode'
            onChange={(value) => {
              const mode = MODES.find((item) => item === value);
              if (mode) {
                onChange({ mode });
              }
            }}
            value={settings.mode}
          />
          <p className='field-help'>{MODE_HELP[settings.mode]}</p>
        </div>

        {settings.mode === 'round' && (
          <Choice
            data={ROUND_LENGTHS.map((length) => ({
              label: String(length),
              value: String(length),
            }))}
            id='length'
            label='Length'
            onChange={(value) => {
              const roundLength = ROUND_LENGTHS.find(
                (item) => String(item) === value,
              );
              if (roundLength) {
                onChange({ roundLength });
              }
            }}
            value={String(settings.roundLength)}
          />
        )}
        {settings.mode === 'clock' && (
          <Choice
            data={CLOCK_SECONDS.map((seconds) => ({
              label: `${seconds}s`,
              value: String(seconds),
            }))}
            id='clock'
            label='Time'
            onChange={(value) => {
              const clockSeconds = CLOCK_SECONDS.find(
                (item) => String(item) === value,
              );
              if (clockSeconds) {
                onChange({ clockSeconds });
              }
            }}
            value={String(settings.clockSeconds)}
          />
        )}

        <div>
          <Choice
            data={PROMPT_TYPES.map((prompt) => ({
              label: PROMPT_LABELS[prompt],
              value: prompt,
            }))}
            id='prompt'
            label='Prompt'
            onChange={(value) => {
              const prompt = PROMPT_TYPES.find((item) => item === value);
              if (prompt) {
                onChange({ prompt });
              }
            }}
            value={settings.prompt}
          />
          {!canSpeak && (
            <p className='field-help'>
              This browser can’t speak, so prompts are written.
            </p>
          )}
        </div>

        <Choice
          data={TIME_LIMITS.map((limit) => ({
            label: getTimeLimitLabel(limit),
            value: String(limit),
          }))}
          id='limit'
          label='Time to answer'
          onChange={(value) => {
            const timeLimit = TIME_LIMITS.find(
              (item) => String(item) === value,
            );
            if (timeLimit !== undefined) {
              onChange({ timeLimit });
            }
          }}
          value={String(settings.timeLimit)}
        />

        <Button className='start-button' fullWidth onClick={onStart} size='xl'>
          Start
        </Button>
        <p className='best'>{getBestText(settings, best)}</p>
        <div className='nav-buttons'>
          <Button onClick={onHistory} variant='default'>
            History
          </Button>
          <Button onClick={onHelp} variant='default'>
            Help
          </Button>
        </div>

        <Choice
          data={THEMES}
          id='theme'
          label='Theme'
          onChange={(value) => {
            const scheme = THEMES.find((item) => item.value === value);
            if (scheme) {
              setColorScheme(scheme.value);
            }
          }}
          value={colorScheme}
        />
      </div>
    </main>
  );
}
