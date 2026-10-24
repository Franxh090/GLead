import { describe, expect, it } from 'vitest';
import { LATENCY, micLabPrompts, summarise, type MicLabRecord } from './miclab';

describe('mic lab', () => {
  it('lays out 24 notes and 8 wrong prompts, the wrong ones a fret above', () => {
    const prompts = micLabPrompts();
    expect(prompts.filter((p) => p.part === 'notes')).toHaveLength(24);
    const wrong = prompts.filter((p) => p.part === 'wrong');
    expect(wrong).toHaveLength(8);
    expect(wrong[0]?.play.fret).toBe(wrong[0]!.position.fret + 1);
    expect(prompts[0]).toMatchObject({ position: { string: 6, fret: 0 }, expectedMidi: 40 });
    expect(LATENCY.clicks).toBe(12);
  });

  it('summarises accept rates, confirm share, latency and a suggested threshold', () => {
    const rec = (o: Partial<MicLabRecord>): MicLabRecord => ({
      part: 'notes',
      index: 0,
      expectedMidi: 45,
      heardMidi: 45,
      cents: 0,
      confidence: 0.9,
      ms: 800,
      ...o,
    });
    const records: MicLabRecord[] = [
      ...Array.from({ length: 8 }, (_, i) => rec({ index: i, confidence: 0.5 + i * 0.06 })), // 0.5 … 0.92
      rec({ index: 8, heardMidi: 57 }), // octave: accepted, not exact
      rec({ index: 9, heardMidi: 46 }), // wrong pitch
      rec({ index: 10, heardMidi: null, confidence: null, ms: null }), // silent
      rec({ part: 'wrong', index: 0, expectedMidi: 45, heardMidi: 46 }),
      rec({ part: 'wrong', index: 1, expectedMidi: 45, heardMidi: 45 }), // false accept
      ...[150, 170, 160, 400, 140].map((ms, i) => rec({ part: 'latency', index: i, ms })),
    ];
    const s = summarise(records, 0.6);
    expect(s.correctAccepted).toBeCloseTo(9 / 10);
    expect(s.correctExact).toBeCloseTo(8 / 10);
    expect(s.confirmShare).toBeCloseTo(2 / 9); // 0.5 and 0.56 below 0.6
    expect(s.wrongAccepted).toBe(0.5);
    expect(s.silent).toBe(1);
    expect(s.medianLatencyMs).toBe(160);
    expect(s.latencySpreadMs).toBe(170 - 150);
    expect(s.suggestedConfirmBelow).toBe(0.5);
    expect(s.heardName(45)).toBe('A2');
    expect(summarise([], 0.6).correctAccepted).toBeNull();
  });
});
