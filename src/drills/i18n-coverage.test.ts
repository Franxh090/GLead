import { describe, expect, it } from 'vitest';
import { LOOP_FEELS, LOOP_PROGRESSIONS } from '../audio/loops';
import { translate } from '../core/i18n';
import { RUNGS } from '../core/scoring/changes';
import { WHY_CARDS } from '../core/whycards';
import { DRILLS, SKILLS } from './registry';

/** Data the screens show through `t()` by id: every id needs an English entry (Spanish follows by the i18n test). */
describe('interface text for ids', () => {
  it('has English text for every skill, drill, why card, rung, loop and feel', () => {
    const keys = [
      ...SKILLS.map((s) => `skill.${s.id}`),
      ...DRILLS.map((d) => `rationale.${d.id}`),
      'rationale.c1-changes',
      'rationale.c4-response',
      ...WHY_CARDS.flatMap((c) => [`why.${c.id}.title`, `why.${c.id}.body`]),
      ...RUNGS.flatMap((r) => [`rung.${r.id}.title`, `rung.${r.id}.hint`]),
      ...LOOP_PROGRESSIONS.map((p) => `loop.${p.id}.desc`),
      ...LOOP_FEELS.map((f) => `feel.${f}`),
    ];
    expect(keys.filter((k) => translate('en', k) === k)).toEqual([]);
  });

  it('keeps the English skill titles and rationales in step with the registry', () => {
    for (const s of SKILLS) expect(translate('en', `skill.${s.id}`)).toBe(s.title);
    for (const d of DRILLS) expect(translate('en', `rationale.${d.id}`)).toBe(d.rationale);
    for (const r of RUNGS) expect(translate('en', `rung.${r.id}.title`)).toBe(r.title);
  });
});
