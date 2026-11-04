import type { Side } from './sequence.ts';

export function canSpeak(): boolean {
  return 'speechSynthesis' in globalThis;
}

// Speech start can take a moment while the voice loads.
const SPEECH_START_TIMEOUT = 2000;

// Calls onStart when the browser says the speech has begun, which is when
// the reaction time starts in spoken-only mode. If speech fails, or never
// starts at all (some browsers have no voices), onStart gets failed = true so
// the game can show the word instead of leaving the player waiting on
// silence.
export function speak(side: Side, onStart: (failed: boolean) => void): void {
  if (!canSpeak()) {
    onStart(true);
    return;
  }
  let started = false;
  function start(failed: boolean) {
    if (!started) {
      started = true;
      clearTimeout(timer);
      onStart(failed);
    }
  }
  const timer = setTimeout(() => start(true), SPEECH_START_TIMEOUT);
  const utterance = new SpeechSynthesisUtterance(side);
  utterance.lang = 'en-US';
  utterance.addEventListener('start', () => start(false));
  utterance.addEventListener('error', () => start(true));
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (canSpeak()) {
    speechSynthesis.cancel();
  }
}

let audioContext: AudioContext | null = null;

// Browsers only let a page make sound after the player has done something,
// so this gets called from the Start button.
export function unlockAudio(): void {
  try {
    audioContext ??= new AudioContext();
    void audioContext.resume();
  } catch {
    audioContext = null;
  }
}

// A short, quiet tick for a right answer, made on the spot so there's no
// sound file to download.
export function playClick(): void {
  if (!audioContext) {
    return;
  }
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = 1200;
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.06);
}

export function vibrate(): void {
  try {
    navigator.vibrate?.(200);
  } catch {
    // Not every browser has vibration, and that's fine.
  }
}
