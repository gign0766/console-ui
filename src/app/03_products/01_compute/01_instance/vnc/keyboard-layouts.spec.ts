import { GUEST_LAYOUTS, KeyStroke, buildCharMap, buildRows, charToKeysym, resolveGuestLayout } from './keyboard-layouts';

describe('keyboard layouts', () => {
  it('should map characters to their physical key on each layout', () => {
    const cases: { layout: string; char: string; expected: KeyStroke | undefined }[] = [
      { layout: 'english', char: 'a', expected: { code: 'KeyA', shift: false } },
      { layout: 'english', char: '@', expected: { code: 'Digit2', shift: true } },
      { layout: 'english', char: '\\', expected: { code: 'Backslash', shift: false } },
      { layout: 'french', char: 'a', expected: { code: 'KeyQ', shift: false } },
      { layout: 'french', char: 'Q', expected: { code: 'KeyA', shift: true } },
      { layout: 'french', char: 'm', expected: { code: 'Semicolon', shift: false } },
      { layout: 'french', char: '1', expected: { code: 'Digit1', shift: true } },
      { layout: 'french', char: 'é', expected: { code: 'Digit2', shift: false } },
      { layout: 'french', char: '*', expected: { code: 'Backslash', shift: false } },
      { layout: 'french', char: '<', expected: { code: 'IntlBackslash', shift: false } },
      { layout: 'french', char: '.', expected: { code: 'Comma', shift: true } },
      // AltGr level is not part of the layout data
      { layout: 'french', char: '@', expected: undefined },
      { layout: 'german', char: 'z', expected: { code: 'KeyY', shift: false } },
      { layout: 'german', char: '#', expected: { code: 'Backslash', shift: false } },
      { layout: 'brazilian', char: '/', expected: { code: 'IntlRo', shift: false } },
      { layout: 'french', char: '\n', expected: { code: 'Enter', shift: false } },
    ];
    for (const { layout, char, expected } of cases) {
      expect(buildCharMap(layout).get(char)).withContext(`${layout} ${char}`).toEqual(expected);
    }
  });

  it('should offer the layouts fitting the standard key positions', () => {
    expect(GUEST_LAYOUTS.map(l => l.id).sort()).toEqual([
      'arabic',
      'armenianEastern',
      'armenianWestern',
      'bengali',
      'brazilian',
      'burmese',
      'chinese',
      'english',
      'french',
      'german',
      'gilaki',
      'greek',
      'hungarian',
      'italian',
      'japanese',
      'korean',
      'macedonian',
      'norwegian',
      'polish',
      'russian',
      'spanish',
      'swedish',
      'thai',
    ]);
  });

  it('should give every printable key a position and a keysym fallback', () => {
    for (const { id } of GUEST_LAYOUTS) {
      const printable = buildRows(id)
        .slice(0, 4)
        .flat()
        .filter(key => key.shiftLabel);
      const codes = printable.map(key => key.code);
      expect(new Set(codes).size).withContext(id).toBe(codes.length);
      for (const key of printable) {
        expect(key.keysym).withContext(`${id} ${key.label}`).toBeGreaterThan(0);
        expect(key.shiftKeysym).withContext(`${id} ${key.shiftLabel}`).toBeGreaterThan(0);
      }
    }
  });

  it('should resolve stored layout ids', () => {
    const cases: { stored: string | null; expected: string }[] = [
      { stored: 'german', expected: 'german' },
      { stored: 'us', expected: 'english' },
      { stored: 'fr', expected: 'french' },
      { stored: 'unknown', expected: 'english' },
      { stored: null, expected: 'english' },
    ];
    for (const { stored, expected } of cases) {
      expect(resolveGuestLayout(stored)).withContext(String(stored)).toBe(expected);
    }
  });

  it('should convert characters to keysyms', () => {
    const cases: { char: string; expected: number }[] = [
      { char: 'a', expected: 0x61 },
      { char: 'é', expected: 0xe9 },
      { char: '€', expected: 0x010020ac },
    ];
    for (const { char, expected } of cases) {
      expect(charToKeysym(char)).withContext(char).toBe(expected);
    }
  });
});
