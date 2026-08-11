import { formatRelativeTime } from './time';

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-01-15T12:00:00Z');

  const cases: { name: string; value: string; expected: string }[] = [
    { name: 'seconds ago', value: '2026-01-15T11:59:30Z', expected: '30 seconds ago' },
    { name: 'minutes ago', value: '2026-01-15T11:55:00Z', expected: '5 minutes ago' },
    { name: 'one hour ago', value: '2026-01-15T11:00:00Z', expected: '1 hour ago' },
    { name: 'days ago', value: '2026-01-13T12:00:00Z', expected: '2 days ago' },
    { name: 'sub-second elapsed', value: '2026-01-15T11:59:59.900Z', expected: 'now' },
    { name: 'future timestamp clamped', value: '2026-01-15T12:05:00Z', expected: 'now' },
    { name: 'unparseable input returned as-is', value: 'not-a-date', expected: 'not-a-date' },
    { name: 'empty string returned as-is', value: '', expected: '' },
  ];

  cases.forEach(({ name, value, expected }) => {
    it(`should return "${expected}" for ${name}`, () => {
      expect(formatRelativeTime(value, now)).toEqual(expected);
    });
  });
});
