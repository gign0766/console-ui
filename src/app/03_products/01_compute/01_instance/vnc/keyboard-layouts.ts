import arabic from 'simple-keyboard-layouts/build/layouts/arabic';
import armenianEastern from 'simple-keyboard-layouts/build/layouts/armenianEastern';
import armenianWestern from 'simple-keyboard-layouts/build/layouts/armenianWestern';
import bengali from 'simple-keyboard-layouts/build/layouts/bengali';
import brazilian from 'simple-keyboard-layouts/build/layouts/brazilian';
import burmese from 'simple-keyboard-layouts/build/layouts/burmese';
import chinese from 'simple-keyboard-layouts/build/layouts/chinese';
import english from 'simple-keyboard-layouts/build/layouts/english';
import french from 'simple-keyboard-layouts/build/layouts/french';
import german from 'simple-keyboard-layouts/build/layouts/german';
import gilaki from 'simple-keyboard-layouts/build/layouts/gilaki';
import greek from 'simple-keyboard-layouts/build/layouts/greek';
import hungarian from 'simple-keyboard-layouts/build/layouts/hungarian';
import italian from 'simple-keyboard-layouts/build/layouts/italian';
import japanese from 'simple-keyboard-layouts/build/layouts/japanese';
import korean from 'simple-keyboard-layouts/build/layouts/korean';
import macedonian from 'simple-keyboard-layouts/build/layouts/macedonian';
import norwegian from 'simple-keyboard-layouts/build/layouts/norwegian';
import polish from 'simple-keyboard-layouts/build/layouts/polish';
import russian from 'simple-keyboard-layouts/build/layouts/russian';
import spanish from 'simple-keyboard-layouts/build/layouts/spanish';
import swedish from 'simple-keyboard-layouts/build/layouts/swedish';
import thai from 'simple-keyboard-layouts/build/layouts/thai';

// The guest OS turns key positions (scancodes) into characters with its own keyboard layout, and
// VNC does not expose which one. The user tells us, and the virtual keyboard and the paste action
// press the key positions that produce the wanted characters on that layout. The physical
// keyboard is left to noVNC: it only types as printed when the guest layout matches it.

export interface KeyDef {
  label: string;
  shiftLabel?: string;
  keysym: number;
  shiftKeysym?: number;
  code?: string; // DOM KeyboardEvent.code, i.e. the physical position sent as a scancode
  width?: number; // relative width multiplier (default 1)
}

export interface KeyStroke {
  code: string;
  shift: boolean;
}

interface PackageLayout {
  layout: Record<string, string[]>;
}

// Only layouts whose rows fit the standard ANSI/ISO key positions (see `positionCodes`).
const PACKAGE_LAYOUTS: Record<string, PackageLayout> = {
  arabic,
  armenianEastern,
  armenianWestern,
  bengali,
  brazilian,
  burmese,
  chinese,
  english,
  french,
  german,
  gilaki,
  greek,
  hungarian,
  italian,
  japanese,
  korean,
  macedonian,
  norwegian,
  polish,
  russian,
  spanish,
  swedish,
  thai,
};

// Rows whose default and shift levels are swapped in the package data.
const SWAPPED_LEVEL_ROWS: Record<string, number[]> = {
  french: [0],
};

const LABEL_OVERRIDES: Record<string, string> = {
  english: 'English (US)',
};

export const DEFAULT_GUEST_LAYOUT = 'english';

// Ids stored by the previous layout picker.
const LEGACY_LAYOUT_IDS: Record<string, string> = { us: 'english', fr: 'french' };

const DIGITS_ROW = ['Backquote', ...Array.from('1234567890', d => `Digit${d}`), 'Minus', 'Equal'];
const TOP_ROW = [...Array.from('QWERTYUIOP', c => `Key${c}`), 'BracketLeft', 'BracketRight'];
const HOME_ROW = [...Array.from('ASDFGHJKL', c => `Key${c}`), 'Semicolon', 'Quote'];
const BOTTOM_ROW = [...Array.from('ZXCVBNM', c => `Key${c}`), 'Comma', 'Period', 'Slash'];

// Physical positions of the printable keys of a row, from its number of keys. The Backslash key
// ends the top row on ANSI keyboards and the home row on ISO ones; the bottom row may start with
// the ISO IntlBackslash key and end with the ABNT2 IntlRo key.
function positionCodes(row: number, count: number): string[] | null {
  let codes: string[];
  switch (row) {
    case 0:
      codes = DIGITS_ROW;
      break;
    case 1:
      codes = count === TOP_ROW.length ? TOP_ROW : [...TOP_ROW, 'Backslash'];
      break;
    case 2:
      codes = count === HOME_ROW.length ? HOME_ROW : [...HOME_ROW, 'Backslash'];
      break;
    default:
      codes = BOTTOM_ROW;
      if (count > BOTTOM_ROW.length) codes = ['IntlBackslash', ...codes];
      if (count > BOTTOM_ROW.length + 1) codes = [...codes, 'IntlRo'];
  }
  return codes.length === count ? codes : null;
}

export function charToKeysym(char: string): number {
  const codePoint = char.codePointAt(0) ?? 0;
  if ((codePoint >= 0x20 && codePoint <= 0x7e) || (codePoint >= 0xa0 && codePoint <= 0xff)) {
    return codePoint;
  }
  // Unicode keysym
  return codePoint >= 0x100 ? 0x01000000 | codePoint : 0;
}

function printableTokens(row: string): string[] {
  return row.split(' ').filter(token => token && !/^\{.*\}$/.test(token));
}

// The printable keys of the four main rows, or null when the layout does not fit the standard
// key positions.
function printableRows(id: string): KeyDef[][] | null {
  const layout = PACKAGE_LAYOUTS[id]?.layout;
  if (!layout?.['default'] || !layout['shift']) return null;

  const rows: KeyDef[][] = [];
  for (let row = 0; row < 4; row++) {
    const swapped = SWAPPED_LEVEL_ROWS[id]?.includes(row);
    const labels = printableTokens(layout[swapped ? 'shift' : 'default'][row] ?? '');
    const shiftLabels = printableTokens(layout[swapped ? 'default' : 'shift'][row] ?? '');
    const codes = positionCodes(row, labels.length);
    if (!codes || shiftLabels.length !== labels.length) return null;

    rows.push(
      labels.map((label, i) => ({
        label,
        shiftLabel: shiftLabels[i],
        keysym: charToKeysym(label),
        shiftKeysym: charToKeysym(shiftLabels[i]),
        code: codes[i],
      }))
    );
  }
  // The Backslash key sits on exactly one of the two rows.
  const backslashes = rows.flat().filter(key => key.code === 'Backslash').length;
  return backslashes === 1 ? rows : null;
}

function humanize(id: string): string {
  const spaced = id.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export const GUEST_LAYOUTS: { id: string; label: string }[] = Object.keys(PACKAGE_LAYOUTS)
  .filter(id => printableRows(id) !== null)
  .map(id => ({ id, label: LABEL_OVERRIDES[id] ?? humanize(id) }))
  .sort((a, b) => a.label.localeCompare(b.label));

export function resolveGuestLayout(id: string | null): string {
  const resolved = LEGACY_LAYOUT_IDS[id ?? ''] ?? id;
  return GUEST_LAYOUTS.find(l => l.id === resolved)?.id ?? DEFAULT_GUEST_LAYOUT;
}

// Rows of the virtual keyboard: the printable keys of the layout inside our own frame of
// function and modifier keys.
export function buildRows(id: string): KeyDef[][] {
  const [digits, top, home, bottom] = printableRows(resolveGuestLayout(id))!;
  const isoShift = bottom[0].code === 'IntlBackslash';

  return [
    [...digits, { label: 'Backspace', keysym: 0xff08, code: 'Backspace', width: 2 }],
    [{ label: 'Tab', keysym: 0xff09, code: 'Tab', width: 1.5 }, ...top],
    [
      { label: 'Caps', keysym: 0xffe5, width: 1.8 },
      ...home,
      { label: 'Enter', keysym: 0xff0d, code: 'Enter', width: 2.2 },
    ],
    [
      { label: 'Shift', keysym: 0xffe1, width: isoShift ? 2 : 2.5 },
      ...bottom,
      { label: 'Shift', keysym: 0xffe1, width: isoShift ? 2 : 2.5 },
    ],
    [
      { label: 'Ctrl', keysym: 0xffe3, width: 1.5 },
      { label: 'Alt', keysym: 0xffe9, width: 1.5 },
      { label: 'Space', keysym: 0x20, code: 'Space', width: 5 },
      { label: 'Win', keysym: 0xffeb, code: 'MetaLeft', width: 1.5 },
      { label: 'AltGr', keysym: 0xffea, width: 1.5 },
    ],
  ];
}

// Key press typing each character on the layout. Characters of the AltGr level and those
// composed with dead keys are not covered.
export function buildCharMap(id: string): Map<string, KeyStroke> {
  const map = new Map<string, KeyStroke>();
  const keys = printableRows(resolveGuestLayout(id))!.flat();
  // Shift level first so that the unshifted key wins when a character is on both.
  for (const key of keys) {
    if (key.shiftLabel) map.set(key.shiftLabel, { code: key.code!, shift: true });
  }
  for (const key of keys) {
    map.set(key.label, { code: key.code!, shift: false });
  }
  map.set(' ', { code: 'Space', shift: false });
  map.set('\n', { code: 'Enter', shift: false });
  map.set('\t', { code: 'Tab', shift: false });
  return map;
}
