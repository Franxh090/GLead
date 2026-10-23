import { describe, expect, it } from 'vitest';
import { STANDARD_TUNING, parseKey } from '../vendor/fretfree/theory';
import { practisedKeys } from '../core/keys';
import { DRILLS, SKILLS, drillForItem, modeOfItem } from './registry';

describe('registry', () => {
  it('every skill names a registered drill that can prompt every item in every practised key', () => {
    for (const skill of SKILLS) {
      const drill = DRILLS.find((d) => d.id === skill.drillId);
      expect(drill, skill.id).toBeDefined();
      expect(drill!.skills).toContain(skill.id);
      for (const item of skill.items()) {
        expect(drillForItem(item).id).toBe(skill.drillId);
        for (const key of practisedKeys(modeOfItem(item))) {
          const prompt = drill!.makePrompt(item, {
            key,
            tuning: STANDARD_TUNING,
            accidentalPref: 'sharp',
            labelScheme: 'numbers',
            scopeLevel: 0,
            rng: () => 0.5,
          });
          expect(drill!.audio(prompt).length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('item IDs are unique across skills', () => {
    const ids = SKILLS.flatMap((s) => s.items().map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(parseKey('G').mode).toBe('major');
  });
});
