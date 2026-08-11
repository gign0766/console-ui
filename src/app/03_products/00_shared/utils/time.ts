// Relative time rendering for status timestamps (e.g. replication last sync).

const RELATIVE_UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: 'day', ms: 86_400_000 },
  { unit: 'hour', ms: 3_600_000 },
  { unit: 'minute', ms: 60_000 },
  { unit: 'second', ms: 1_000 },
];

const RELATIVE_FORMAT = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

// Formats an ISO date as "5 minutes ago" / "2 days ago"; returns the input
// unchanged when unparseable, "now" for future timestamps (clock skew).
export function formatRelativeTime(date: string, now: number = Date.now()): string {
  const timestamp = Date.parse(date);
  if (isNaN(timestamp)) {
    return date;
  }

  const elapsed = now - timestamp;
  if (elapsed < 0) {
    return 'now';
  }

  for (const { unit, ms } of RELATIVE_UNITS) {
    if (elapsed >= ms) {
      return RELATIVE_FORMAT.format(-Math.floor(elapsed / ms), unit);
    }
  }
  return 'now';
}
