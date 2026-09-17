export type GuestLayoutId = 'us' | 'fr';

export const GUEST_LAYOUTS: { id: GuestLayoutId; short: string; label: string }[] = [
  { id: 'us', short: 'US', label: 'US (QWERTY)' },
  { id: 'fr', short: 'FR', label: 'FR (AZERTY)' },
];

export interface KeyDef {
  label: string;
  shiftLabel?: string;
  altGrLabel?: string;
  keysym: number;
  shiftKeysym?: number;
  code?: string; // DOM KeyboardEvent.code for scancode-based keys
  width?: number; // relative width multiplier (default 1)
}

// One physical key press with its modifiers. `then` chains a second press for dead keys
// (e.g. `~` is AltGr+2 followed by Space on a French Windows guest).
export interface KeyStroke {
  code: string;
  shift?: boolean;
  altGr?: boolean;
  then?: KeyStroke;
}

// US keysyms [unshifted, shifted] of each physical position.
const US_POSITIONS: Record<string, [number, number]> = {
  Backquote: [0x60, 0x7e],
  Digit1: [0x31, 0x21],
  Digit2: [0x32, 0x40],
  Digit3: [0x33, 0x23],
  Digit4: [0x34, 0x24],
  Digit5: [0x35, 0x25],
  Digit6: [0x36, 0x5e],
  Digit7: [0x37, 0x26],
  Digit8: [0x38, 0x2a],
  Digit9: [0x39, 0x28],
  Digit0: [0x30, 0x29],
  Minus: [0x2d, 0x5f],
  Equal: [0x3d, 0x2b],
  BracketLeft: [0x5b, 0x7b],
  BracketRight: [0x5d, 0x7d],
  Backslash: [0x5c, 0x7c],
  Semicolon: [0x3b, 0x3a],
  Quote: [0x27, 0x22],
  Comma: [0x2c, 0x3c],
  Period: [0x2e, 0x3e],
  Slash: [0x2f, 0x3f],
  // A US keyboard has no such key, so a US keysym cannot reach it: it needs its scancode.
  IntlBackslash: [0x3c, 0x3e],
  Space: [0x20, 0x20],
  Enter: [0xff0d, 0xff0d],
  Tab: [0xff09, 0xff09],
  ...Object.fromEntries(
    Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ', (c): [string, [number, number]] => [
      `Key${c}`,
      [c.charCodeAt(0) + 0x20, c.charCodeAt(0)],
    ])
  ),
};

export function usKeysym(code: string, shift: boolean): number {
  const position = US_POSITIONS[code];
  return position ? position[shift ? 1 : 0] : 0;
}

export const US_ROWS: KeyDef[][] = [
  // Row 1: number row
  [
    { label: '`', shiftLabel: '~', keysym: 0x60, shiftKeysym: 0x7e },
    { label: '1', shiftLabel: '!', keysym: 0x31, shiftKeysym: 0x21 },
    { label: '2', shiftLabel: '@', keysym: 0x32, shiftKeysym: 0x40 },
    { label: '3', shiftLabel: '#', keysym: 0x33, shiftKeysym: 0x23 },
    { label: '4', shiftLabel: '$', keysym: 0x34, shiftKeysym: 0x24 },
    { label: '5', shiftLabel: '%', keysym: 0x35, shiftKeysym: 0x25 },
    { label: '6', shiftLabel: '^', keysym: 0x36, shiftKeysym: 0x5e },
    { label: '7', shiftLabel: '&', keysym: 0x37, shiftKeysym: 0x26 },
    { label: '8', shiftLabel: '*', keysym: 0x38, shiftKeysym: 0x2a },
    { label: '9', shiftLabel: '(', keysym: 0x39, shiftKeysym: 0x28 },
    { label: '0', shiftLabel: ')', keysym: 0x30, shiftKeysym: 0x29 },
    { label: '-', shiftLabel: '_', keysym: 0x2d, shiftKeysym: 0x5f },
    { label: '=', shiftLabel: '+', keysym: 0x3d, shiftKeysym: 0x2b },
    { label: 'Backspace', keysym: 0xff08, code: 'Backspace', width: 2 },
  ],
  // Row 2: QWERTY row
  [
    { label: 'Tab', keysym: 0xff09, code: 'Tab', width: 1.5 },
    { label: 'q', keysym: 0x71 },
    { label: 'w', keysym: 0x77 },
    { label: 'e', keysym: 0x65 },
    { label: 'r', keysym: 0x72 },
    { label: 't', keysym: 0x74 },
    { label: 'y', keysym: 0x79 },
    { label: 'u', keysym: 0x75 },
    { label: 'i', keysym: 0x69 },
    { label: 'o', keysym: 0x6f },
    { label: 'p', keysym: 0x70 },
    { label: '[', shiftLabel: '{', keysym: 0x5b, shiftKeysym: 0x7b },
    { label: ']', shiftLabel: '}', keysym: 0x5d, shiftKeysym: 0x7d },
    { label: '\\', shiftLabel: '|', keysym: 0x5c, shiftKeysym: 0x7c },
  ],
  // Row 3: home row
  [
    { label: 'Caps', keysym: 0xffe5, width: 1.8 },
    { label: 'a', keysym: 0x61 },
    { label: 's', keysym: 0x73 },
    { label: 'd', keysym: 0x64 },
    { label: 'f', keysym: 0x66 },
    { label: 'g', keysym: 0x67 },
    { label: 'h', keysym: 0x68 },
    { label: 'j', keysym: 0x6a },
    { label: 'k', keysym: 0x6b },
    { label: 'l', keysym: 0x6c },
    { label: ';', shiftLabel: ':', keysym: 0x3b, shiftKeysym: 0x3a },
    { label: "'", shiftLabel: '"', keysym: 0x27, shiftKeysym: 0x22 },
    { label: 'Enter', keysym: 0xff0d, code: 'Enter', width: 2.2 },
  ],
  // Row 4: shift row
  [
    { label: 'Shift', keysym: 0xffe1, width: 2.5 },
    { label: 'z', keysym: 0x7a },
    { label: 'x', keysym: 0x78 },
    { label: 'c', keysym: 0x63 },
    { label: 'v', keysym: 0x76 },
    { label: 'b', keysym: 0x62 },
    { label: 'n', keysym: 0x6e },
    { label: 'm', keysym: 0x6d },
    { label: ',', shiftLabel: '<', keysym: 0x2c, shiftKeysym: 0x3c },
    { label: '.', shiftLabel: '>', keysym: 0x2e, shiftKeysym: 0x3e },
    { label: '/', shiftLabel: '?', keysym: 0x2f, shiftKeysym: 0x3f },
    { label: 'Shift', keysym: 0xffe1, width: 2.5 },
  ],
  // Row 5: bottom row
  [
    { label: 'Ctrl', keysym: 0xffe3, width: 1.5 },
    { label: 'Alt', keysym: 0xffe9, width: 1.5 },
    { label: 'Space', keysym: 0x20, width: 5 },
    { label: 'Win', keysym: 0xffeb, code: 'MetaLeft', width: 1.5 },
    { label: 'Alt', keysym: 0xffea, width: 1.5 },
  ],
];

// A printable key of a non-US layout. Labels show what the guest types, keysyms are the US ones
// of that physical position (see the header comment).
function positional(code: string, label: string, shiftLabel?: string, altGrLabel?: string): KeyDef {
  return {
    label,
    shiftLabel: shiftLabel ?? (/^[a-z]$/.test(label) ? label.toUpperCase() : undefined),
    altGrLabel,
    keysym: usKeysym(code, false),
    shiftKeysym: usKeysym(code, true),
    code,
  };
}

// French AZERTY as laid out by Windows (`^`, `¨`, AltGr+2 `~` and AltGr+7 `` ` `` are dead keys).
export const FR_ROWS: KeyDef[][] = [
  [
    positional('Backquote', '²'),
    positional('Digit1', '&', '1'),
    positional('Digit2', 'é', '2', '~'),
    positional('Digit3', '"', '3', '#'),
    positional('Digit4', "'", '4', '{'),
    positional('Digit5', '(', '5', '['),
    positional('Digit6', '-', '6', '|'),
    positional('Digit7', 'è', '7', '`'),
    positional('Digit8', '_', '8', '\\'),
    positional('Digit9', 'ç', '9', '^'),
    positional('Digit0', 'à', '0', '@'),
    positional('Minus', ')', '°', ']'),
    positional('Equal', '=', '+', '}'),
    { label: 'Backspace', keysym: 0xff08, code: 'Backspace', width: 2 },
  ],
  [
    { label: 'Tab', keysym: 0xff09, code: 'Tab', width: 1.5 },
    positional('KeyQ', 'a'),
    positional('KeyW', 'z'),
    positional('KeyE', 'e', undefined, '€'),
    positional('KeyR', 'r'),
    positional('KeyT', 't'),
    positional('KeyY', 'y'),
    positional('KeyU', 'u'),
    positional('KeyI', 'i'),
    positional('KeyO', 'o'),
    positional('KeyP', 'p'),
    positional('BracketLeft', '^', '¨'),
    positional('BracketRight', '$', '£', '¤'),
  ],
  [
    { label: 'Caps', keysym: 0xffe5, width: 1.8 },
    positional('KeyA', 'q'),
    positional('KeyS', 's'),
    positional('KeyD', 'd'),
    positional('KeyF', 'f'),
    positional('KeyG', 'g'),
    positional('KeyH', 'h'),
    positional('KeyJ', 'j'),
    positional('KeyK', 'k'),
    positional('KeyL', 'l'),
    positional('Semicolon', 'm'),
    positional('Quote', 'ù', '%'),
    positional('Backslash', '*', 'µ'),
    { label: 'Enter', keysym: 0xff0d, code: 'Enter', width: 2.2 },
  ],
  [
    { label: 'Shift', keysym: 0xffe1, width: 2 },
    positional('IntlBackslash', '<', '>'),
    positional('KeyZ', 'w'),
    positional('KeyX', 'x'),
    positional('KeyC', 'c'),
    positional('KeyV', 'v'),
    positional('KeyB', 'b'),
    positional('KeyN', 'n'),
    positional('KeyM', ',', '?'),
    positional('Comma', ';', '.'),
    positional('Period', ':', '/'),
    positional('Slash', '!', '§'),
    { label: 'Shift', keysym: 0xffe1, width: 2 },
  ],
  [
    { label: 'Ctrl', keysym: 0xffe3, width: 1.5 },
    { label: 'Alt', keysym: 0xffe9, width: 1.5 },
    { label: 'Space', keysym: 0x20, code: 'Space', width: 5 },
    { label: 'Win', keysym: 0xffeb, code: 'MetaLeft', width: 1.5 },
    { label: 'AltGr', keysym: 0xffea, width: 1.5 },
  ],
];

function buildCharMap(rows: KeyDef[][]): Record<string, KeyStroke> {
  const map: Record<string, KeyStroke> = {
    ' ': { code: 'Space' },
    '\n': { code: 'Enter' },
    '\t': { code: 'Tab' },
  };
  for (const key of rows.flat()) {
    if (!key.code || key.label.length !== 1) continue;
    map[key.label] = { code: key.code };
    if (key.shiftLabel) map[key.shiftLabel] = { code: key.code, shift: true };
    if (key.altGrLabel) map[key.altGrLabel] = { code: key.code, altGr: true };
  }
  return map;
}

function buildFrCharMap(): Record<string, KeyStroke> {
  const map = buildCharMap(FR_ROWS);
  const space: KeyStroke = { code: 'Space' };

  const circumflex: KeyStroke = { code: 'BracketLeft' };
  const diaeresis: KeyStroke = { code: 'BracketLeft', shift: true };
  const tilde: KeyStroke = { code: 'Digit2', altGr: true };
  const grave: KeyStroke = { code: 'Digit7', altGr: true };

  // AltGr+9 types `^` in one press. The `^` key next to `p` is a dead key.
  map['^'] = { code: 'Digit9', altGr: true };
  map['¨'] = { ...diaeresis, then: space };
  map['~'] = { ...tilde, then: space };
  map['`'] = { ...grave, then: space };

  const composed: [KeyStroke, string, string][] = [
    [circumflex, 'aeiou', 'âêîôû'],
    [diaeresis, 'aeiouy', 'äëïöüÿ'],
    [tilde, 'ano', 'ãñõ'],
    [grave, 'io', 'ìò'],
  ];
  for (const [dead, bases, results] of composed) {
    Array.from(bases).forEach((base, i) => {
      const lower = Array.from(results)[i];
      map[lower] = { ...dead, then: map[base] };
      if (lower !== 'ÿ') {
        map[lower.toUpperCase()] = { ...dead, then: map[base.toUpperCase()] };
      }
    });
  }
  for (const [base, upper] of [['a', 'À'], ['e', 'È'], ['u', 'Ù']]) {
    map[upper] = { ...grave, then: map[base.toUpperCase()] };
  }
  return map;
}

export const FR_CHAR_MAP: Record<string, KeyStroke> = buildFrCharMap();
