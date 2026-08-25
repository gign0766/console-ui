import { formatRelativeTime, formatUtcTimeOfDayToLocal, localTimezoneLabel } from './time';

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

describe('localTimezoneLabel', () => {
  // Fixed reference dates so DST-dependent offsets are deterministic.
  const winter = new Date('2026-01-15T12:00:00Z');
  const summer = new Date('2026-07-15T12:00:00Z');

  const cases: { name: string; timeZone: string; referenceDate: Date; expected: string }[] = [
    { name: 'negative offset', timeZone: 'America/New_York', referenceDate: winter, expected: 'America/New_York (UTC-05:00)' },
    { name: 'positive offset', timeZone: 'Europe/Paris', referenceDate: winter, expected: 'Europe/Paris (UTC+01:00)' },
    { name: 'DST-shifted offset', timeZone: 'Europe/Paris', referenceDate: summer, expected: 'Europe/Paris (UTC+02:00)' },
    { name: 'zero offset', timeZone: 'UTC', referenceDate: winter, expected: 'UTC' },
  ];

  cases.forEach(({ name, timeZone, referenceDate, expected }) => {
    it(`should return "${expected}" for ${name}`, () => {
      expect(localTimezoneLabel(timeZone, referenceDate)).toEqual(expected);
    });
  });

  it('should default to the browser timezone', () => {
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(localTimezoneLabel()).toContain(browserZone);
  });
});

describe('formatUtcTimeOfDayToLocal', () => {
  // Fixed reference date (no DST ambiguity in January) and timezone (UTC-5)
  // so expectations don't depend on the test machine's locale settings.
  const referenceDate = new Date('2026-01-15T12:00:00Z');
  const timeZone = 'America/New_York';

  const cases: {
    name: string;
    value: string;
    expected: { local: string; utc: string } | undefined;
  }[] = [
    { name: 'bare time treated as UTC', value: '16:00:00', expected: { local: '11:00 AM', utc: '16:00' } },
    { name: 'zulu suffix', value: '16:00:00Z', expected: { local: '11:00 AM', utc: '16:00' } },
    { name: 'without seconds', value: '9:30', expected: { local: '4:30 AM', utc: '09:30' } },
    { name: 'negative offset', value: '16:00:00-05:00', expected: { local: '4:00 PM', utc: '21:00' } },
    { name: 'positive offset', value: '16:00:00+02:00', expected: { local: '9:00 AM', utc: '14:00' } },
    { name: 'non-zero seconds kept', value: '16:00:30Z', expected: { local: '11:00:30 AM', utc: '16:00:30' } },
    { name: 'hours out of range', value: '25:00:00', expected: undefined },
    { name: 'minutes out of range', value: '12:61:00', expected: undefined },
    { name: 'full ISO datetime rejected', value: '2026-01-15T16:00:00Z', expected: undefined },
    { name: 'unparseable input', value: 'not-a-time', expected: undefined },
    { name: 'empty string', value: '', expected: undefined },
  ];

  cases.forEach(({ name, value, expected }) => {
    it(`should handle ${name}`, () => {
      expect(formatUtcTimeOfDayToLocal(value, referenceDate, timeZone)).toEqual(
        expected as ReturnType<typeof formatUtcTimeOfDayToLocal>,
      );
    });
  });
});
