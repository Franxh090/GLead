/**
 * The backing-track generator (PRD C3): a catalogue progression in any key,
 * at a tempo and strum feel, looping on FretFree's progression player. It
 * always serves an unseen key as readily as a practised one, which the
 * transfer tests need.
 */
import { chordSymbol, progressionChords, type AccidentalPref } from '../vendor/fretfree/theory';
import { playProgression, type Playback } from '../vendor/fretfree/audio/audio';
import type { BackingLoop, BackingLoopSpec } from '../core/types';
import { loopProgression } from './loops';
import { voiceChord } from './voicing';

export const LOOP_DEFAULTS = { bpm: 80, beatsPerChord: 4 } as const;

export function createBackingLoop(
  spec: BackingLoopSpec,
  pref: AccidentalPref = 'sharp',
): BackingLoop {
  const chords = progressionChords(spec.key, loopProgression(spec.progressionId).numerals);
  let playback: Playback | null = null;
  return {
    spec,
    chords: chords.map(chordSymbol),
    async start(opts = {}) {
      playback?.stop();
      playback = await playProgression(
        chords.map((c) => ({ notes: voiceChord(c, pref) })),
        {
          bpm: spec.bpm,
          beatsPerChord: LOOP_DEFAULTS.beatsPerChord,
          pattern: spec.feel,
          loop: true,
          onChord: opts.onChord,
        },
      );
      return { started: playback.started };
    },
    stop() {
      playback?.stop();
      playback = null;
    },
  };
}
