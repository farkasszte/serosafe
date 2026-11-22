const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

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
