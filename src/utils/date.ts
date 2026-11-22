import type { DayPart } from '@/types/serosafe';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const VALID_DAY_PARTS: readonly DayPart[] = [
  'morning',
  'forenoon',
  'midday',
  'afternoon',
  'evening',
  'night',
];

/** Automatically resolves the calendar part-of-day matching the local clock hour. */
export function getDayPartForHour(d: Date = new Date()): DayPart {
  const hour = d.getHours();
  if (hour >= 5 && hour < 9) return 'morning';
  if (hour >= 9 && hour < 12) return 'forenoon';
  if (hour >= 12 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/** Normalizes persisted/imported DayPart values (mapping legacy `'now'` to current clock hour). */
export function normalizeDayPart(value: unknown, d: Date = new Date()): DayPart {
  if (
    typeof value === 'string' &&
    (VALID_DAY_PARTS as readonly string[]).includes(value)
  ) {
    return value as DayPart;
  }
  return getDayPartForHour(d);
}

/** Formats a Date as local calendar `YYYY-MM-DD` (never UTC-shifted). */
export function formatLocalDateKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Formats a Date for `<input type="datetime-local">` values (`YYYY-MM-DDTHH:mm`). */
export function toDatetimeLocalValue(d: Date = new Date()): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${formatLocalDateKey(d)}T${hh}:${min}`;
}

function parseDateKeyUtcMs(dateKey: string): number {
  const match = DATE_KEY_RE.exec(dateKey);
  if (!match) return Number.NaN;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return Date.UTC(year, month - 1, day);
}

/** Exact calendar-day difference between two `YYYY-MM-DD` keys (`later - earlier`). */
export function daysBetweenDateKeys(earlierKey: string, laterKey: string): number {
  const a = parseDateKeyUtcMs(earlierKey);
  const b = parseDateKeyUtcMs(laterKey);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.NaN;
  return Math.round((b - a) / MS_PER_DAY);
}
