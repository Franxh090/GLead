import { describe, expect, it } from 'vitest';
import { createFakePitchSource } from '../../vendor/fretfree/mic/source';
import type { InputEvent } from '../types';
import { confidenceFromCents } from './confidence';
import { createMicInput } from './mic';
import { createTapInput } from './tap';

describe('confidence', () => {
  it('falls linearly with cents off', () => {
    expect(confidenceFromCents(0)).toBe(1);
    expect(confidenceFromCents(30)).toBeCloseTo(0.5);
    expect(confidenceFromCents(-30)).toBeCloseTo(0.5);
    expect(confidenceFromCents(90)).toBe(0);
  });
});

describe('tap input', () => {
  it('stamps taps with full confidence and the clock', () => {
    const tap = createTapInput(() => 1234);
    const seen: InputEvent[] = [];
    tap.onEvent((e) => seen.push(e));
    tap.emit({ kind: 'tap', degree: 3 });
    expect(seen).toEqual([{ kind: 'tap', degree: 3, confidence: 1, at: 1234 }]);
  });
});

describe('mic input', () => {
  it('turns a stable note into a play event with confidence from its tuning', async () => {
    const fake = createFakePitchSource();
    let clock = 5000;
    const mic = createMicInput(fake, { now: () => clock });
    const seen: InputEvent[] = [];
    mic.onEvent((e) => seen.push(e));
    await mic.start();
    expect(mic.state).toBe('running');
    fake.play('A2', { cents: 12 });
    clock += 100;
    fake.silence(300);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.kind).toBe('play');
    expect(seen[0]?.midi).toBe(45);
    expect(seen[0]?.confidence).toBeCloseTo(0.8, 1);
    expect(seen[0]?.at).toBeLessThan(5000);
  });

  it('ignores pitches outside the guitar range', async () => {
    const fake = createFakePitchSource();
    const mic = createMicInput(fake);
    const seen: InputEvent[] = [];
    mic.onEvent((e) => seen.push(e));
    await mic.start();
    fake.play(30);
    fake.silence(300);
    fake.play(100);
    fake.silence(300);
    expect(seen).toHaveLength(0);
  });

  it('reports the source state and errors', async () => {
    const fake = createFakePitchSource();
    const mic = createMicInput(fake);
    const states: string[] = [];
    mic.onStateChange((s) => states.push(s));
    fake.failNextStart('denied');
    await expect(mic.start()).rejects.toMatchObject({ reason: 'denied' });
    expect(mic.state).toBe('error');
    expect(mic.error?.message).toContain('denied');
    expect(states).toEqual(['starting', 'error']);
  });
});
