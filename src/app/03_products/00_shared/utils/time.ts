// Relative time rendering for status timestamps (e.g. replication last sync)
// and time-of-day conversion for cluster schedules (e.g. replication start time).

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

// Human label for the viewer's timezone, e.g. "Europe/Paris (UTC+02:00)".
// The offset is computed for the reference date, so DST is reflected.
export function localTimezoneLabel(
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
  referenceDate: Date = new Date(),
): string {
  const offsetPart = new Intl.DateTimeFormat('en', { timeZoneName: 'longOffset', timeZone })
    .formatToParts(referenceDate)
    .find((part) => part.type === 'timeZoneName');
  // Zero offset renders as "GMT" or "GMT+00:00" depending on the engine.
  const offset = offsetPart ? offsetPart.value.replace(/^GMT/, 'UTC') : '';
  const isZeroOffset = /^UTC([+-]00:?00)?$/.test(offset);
  return offset && !isZeroOffset ? `${timeZone} (${offset})` : timeZone;
}

export interface LocalTimeOfDay {
  local: string; // in the viewer's timezone, e.g. "5:00 PM"
  utc: string; // 24h UTC, e.g. "16:00"
}

// Cluster schedules (Ceph schedulingStartTime) are "HH:mm[:ss]" with an
// optional Z / ±hh:mm offset; a bare time is UTC. The local rendering uses
// today's date, so it reflects the viewer's current DST offset.
const TIME_OF_DAY = /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:Z|([+-])(\d{2}):?(\d{2}))?$/i;

export function formatUtcTimeOfDayToLocal(
  time: string,
  referenceDate: Date = new Date(),
  timeZone?: string,
): LocalTimeOfDay | undefined {
  const match = TIME_OF_DAY.exec(time.trim());
  if (!match) {
    return undefined;
  }

  const [, h, m, s, offsetSign, offsetHours, offsetMinutes] = match;
  const hours = Number(h);
  const minutes = Number(m);
  const seconds = Number(s ?? '0');
  if (hours > 23 || minutes > 59 || seconds > 59) {
    return undefined;
  }

  const offset = offsetSign
    ? (offsetSign === '-' ? -1 : 1) * (Number(offsetHours) * 60 + Number(offsetMinutes))
    : 0;
  const date = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate(),
      hours,
      minutes - offset,
      seconds,
    ),
  );

  const pad = (value: number) => String(value).padStart(2, '0');
  const utcSeconds = date.getUTCSeconds();
  return {
    local: date.toLocaleTimeString('en', {
      hour: 'numeric',
      minute: '2-digit',
      ...(utcSeconds ? { second: '2-digit' } : {}),
      timeZone,
    }),
    utc:
      `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}` +
      (utcSeconds ? `:${pad(utcSeconds)}` : ''),
  };
}
