import { describe, expect, it } from 'vitest';
import { detectLanguage, translate, untranslated } from './i18n';

describe('i18n', () => {
  it('translates with variables and falls back to English, then the key', () => {
    expect(translate('es', 'session.trial', { n: 2, total: 10 })).toBe('Intento 2 de 10');
    expect(translate('en', 'session.trial', { n: 2, total: 10 })).toBe('Trial 2 of 10');
    expect(translate('es', 'no.such.key')).toBe('no.such.key');
    expect(translate('es', 'today.due', {})).toBe('{n} tarjetas pendientes.');
  });

  it('keeps Spanish complete', () => {
    expect(untranslated('es')).toEqual([]);
  });

  it('detects Spanish from the browser language', () => {
    expect(detectLanguage('es-MX')).toBe('es');
    expect(detectLanguage('en-GB')).toBe('en');
    expect(detectLanguage(undefined)).toBe('en');
  });
});
