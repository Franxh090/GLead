/**
 * The microphone as an input adapter: FretFree's `PitchSource` (pitchy in an
 * AudioWorklet, stable notes after an 80 ms hold) turned into `InputEvent`s
 * with a confidence the session can gate on (PRD §7: tap-to-confirm below a
 * threshold).
 *
 * Times: a stable note's `startedAt` is on the AudioContext clock, so the
 * event's `at` is `performance.now()` at the moment the note became stable,
 * minus the hold; close enough for response-time grading (the detector's
 * latency is taken off separately, `ENGINE_CONFIG.playNote.micLatencyMs`).
 */
import type { PitchSource, StableNote } from '../../vendor/fretfree/mic/types';
import type { InputAdapter, InputEvent, InputState } from '../types';
import { confidenceFromCents } from './confidence';

export interface MicInputOptions {
  now?: () => number;
  /** Notes above this MIDI number are ignored (a guitar's highest fret is about E6). */
  maxMidi?: number;
  minMidi?: number;
}

export function createMicInput(source: PitchSource, opts: MicInputOptions = {}): InputAdapter {
  const now = opts.now ?? (() => performance.now());
  const minMidi = opts.minMidi ?? 36; // C2, below drop-D
  const maxMidi = opts.maxMidi ?? 88; // E6
  const listeners = new Set<(e: InputEvent) => void>();
  const stateListeners = new Set<(s: InputState) => void>();

  const toEvent = (note: StableNote): InputEvent => ({
    kind: 'play',
    midi: note.midi,
    cents: note.cents,
    confidence: confidenceFromCents(note.cents),
    at: now() - (note.stableAt - note.startedAt),
  });

  source.onNote((note) => {
    if (note.midi < minMidi || note.midi > maxMidi) return;
    const e = toEvent(note);
    listeners.forEach((l) => l(e));
  });
  source.onStateChange((s) => stateListeners.forEach((l) => l(s)));

  return {
    id: 'mic',
    get state() {
      return source.state;
    },
    get error() {
      return source.error;
    },
    start: () => source.start(),
    stop: () => source.stop(),
    onEvent(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onStateChange(listener) {
      stateListeners.add(listener);
      return () => stateListeners.delete(listener);
    },
  };
}
