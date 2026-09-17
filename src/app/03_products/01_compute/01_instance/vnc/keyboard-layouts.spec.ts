import { FR_CHAR_MAP, KeyStroke, usKeysym } from './keyboard-layouts';

describe('keyboard layouts', () => {
  it('should map French characters to their physical key', () => {
    const cases: { char: string; expected: KeyStroke }[] = [
      { char: 'a', expected: { code: 'KeyQ' } },
      { char: 'Q', expected: { code: 'KeyA', shift: true } },
      { char: 'm', expected: { code: 'Semicolon' } },
      { char: 'M', expected: { code: 'Semicolon', shift: true } },
      { char: '1', expected: { code: 'Digit1', shift: true } },
      { char: 'é', expected: { code: 'Digit2' } },
      { char: '@', expected: { code: 'Digit0', altGr: true } },
      { char: '€', expected: { code: 'KeyE', altGr: true } },
      { char: '<', expected: { code: 'IntlBackslash' } },
      { char: '.', expected: { code: 'Comma', shift: true } },
      { char: '^', expected: { code: 'Digit9', altGr: true } },
      { char: '`', expected: { code: 'Digit7', altGr: true, then: { code: 'Space' } } },
      { char: 'ê', expected: { code: 'BracketLeft', then: { code: 'KeyE' } } },
      { char: 'Ï', expected: { code: 'BracketLeft', shift: true, then: { code: 'KeyI', shift: true } } },
      { char: 'ñ', expected: { code: 'Digit2', altGr: true, then: { code: 'KeyN' } } },
      { char: '\n', expected: { code: 'Enter' } },
    ];
    for (const { char, expected } of cases) {
      expect(FR_CHAR_MAP[char]).withContext(char).toEqual(expected);
    }
  });

  it('should give every stroke a US keysym fallback', () => {
    const check = (stroke?: KeyStroke) => {
      if (!stroke) return;
      expect(usKeysym(stroke.code, !!stroke.shift)).withContext(stroke.code).toBeGreaterThan(0);
      check(stroke.then);
    };
    Object.values(FR_CHAR_MAP).forEach(check);
  });
});
