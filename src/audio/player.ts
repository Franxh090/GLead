/**
 * Plays an `AudioStep` script on FretFree's audio engine and resolves when it
 * has sounded, so the session knows when to start listening. Starting a new
 * script cuts off the one before (a replay, or a new prompt).
 */
import type { AudioStep } from '../core/types';
import {
  isAudioUnlocked,
  loadTone,
  playNotes,
  playProgression,
  stopAudio,
  strum,
} from '../vendor/fretfree/audio/audio';
import { AUDIO } from '../vendor/fretfree/audio/config';

let latest = 0;

/** How long a step takes to sound, in ms, not counting the last note's ring. */
export function stepMs(step: AudioStep): number {
  switch (step.type) {
    case 'rest':
      return step.ms;
    case 'notes': {
      const gap = (step.gapS ?? AUDIO.notes.gap) * 1000;
      const ring = (step.durationS ?? AUDIO.notes.duration) * 1000;
      return step.notes.length === 0 ? 0 : (step.notes.length - 1) * gap + ring;
    }
    case 'strum':
      return (step.durationS ?? AUDIO.strum.duration) * 1000;
    case 'progression':
      return (step.chords.length * step.beatsPerChord * 60_000) / step.bpm;
  }
}

export function scriptMs(steps: readonly AudioStep[]): number {
  return steps.reduce((sum, s) => sum + stepMs(s), 0);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface PlayScriptOptions {
  /** Called when the last step has been started; the script's sound may still ring. */
  onStart?(): void;
}

/**
 * Play the steps in order. Resolves when the last step has sounded (its
 * `stepMs`), or at once if audio is not unlocked yet (the first tap unlocks
 * it, so a prompt before that is silent and the learner replays it).
 */
export async function playScript(
  steps: readonly AudioStep[],
  opts: PlayScriptOptions = {},
): Promise<void> {
  const mine = ++latest;
  stopAudio();
  if (isAudioUnlocked()) await loadTone();
  else await Promise.resolve();
  if (mine !== latest) return;
  opts.onStart?.();
  for (const step of steps) {
    if (mine !== latest) return;
    switch (step.type) {
      case 'rest':
        await sleep(step.ms);
        break;
      case 'notes':
        await playNotes(step.notes, { gap: step.gapS, duration: step.durationS });
        await sleep(stepMs(step));
        break;
      case 'strum':
        await strum(step.notes, { duration: step.durationS });
        await sleep(stepMs(step));
        break;
      case 'progression': {
        const playback = await playProgression(
          step.chords.map((notes) => ({ notes })),
          { bpm: step.bpm, beatsPerChord: step.beatsPerChord, pattern: 'once' },
        );
        // A context that never advances (a headless browser, a muted tab on
        // some devices) would leave `done` pending; the step's own length is
        // the ceiling, so the session always goes on to listening.
        if (playback.started) await Promise.race([playback.done, sleep(stepMs(step) + 500)]);
        else await sleep(stepMs(step));
        break;
      }
    }
  }
}

/** Stop whatever is sounding or still queued. */
export function stopScript(): void {
  latest++;
  stopAudio();
}
