import type { SessionSettings } from './history.ts';

// A short line naming the settings a session was played with, for the
// history list and the chart tooltips.
export function getSettingsText(settings: SessionSettings): string {
  let length;
  if (settings.mode === 'round') {
    length = `${settings.roundLength} prompts`;
  } else if (settings.mode === 'clock') {
    length = `${settings.clockSeconds}s clock`;
  } else {
    length = 'Endless';
  }
  const limit =
    settings.timeLimit === 0
      ? 'no time limit'
      : `${settings.timeLimit / 1000}s to answer`;
  return `${length}, ${settings.prompt}, ${limit}`;
}
