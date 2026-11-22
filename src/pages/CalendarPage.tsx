import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { getWillcoxFeelingLabel } from '@/data/emotionWheel';
import { BODY_SENSATIONS, EMOTION_WHEEL_NODES } from '@/data/substances';
import { STRINGS } from '@/services/i18n';
import type { DailyLogEntry } from '@/types/serosafe';
import { formatLocalDateKey } from '@/utils/date';

interface CalendarPageProps {
  lang: 'hu' | 'en';
  logs: DailyLogEntry[];
  hidePercentages: boolean;
  onToggleHidePercentages: () => void;
}

function computeCompleteness(log: DailyLogEntry): number {
  if (log.isGap) return 0;
  let score = 30;
  if (log.emotions.length > 0) score += 20;
  if (log.energyLevel !== null) score += 15;
  if (log.medsTakenPct !== null) score += Math.round(log.medsTakenPct * 0.25);
  if (log.chipIds.length > 0) score += 10;
  return Math.min(100, score);
}

export function CalendarPage({
  lang,
  logs,
  hidePercentages,
  onToggleHidePercentages,
}: CalendarPageProps) {
  const t = STRINGS[lang].calendar;
  const hu = lang === 'hu';

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0]?.date ?? formatLocalDateKey(today);
  });

  const logByDate = useMemo(
    () => new Map(logs.map((l) => [l.date, l])),
    [logs],
  );

  const monthCells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startOffset = (firstOfMonth.getDay() + 6) % 7;

    const cells: { key: string; dayNum: number | null; dateStr?: string }[] = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ key: `empty_${i}`, dayNum: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(viewMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${viewYear}-${mStr}-${dStr}`;
      cells.push({ key: dateStr, dayNum: d, dateStr });
    }
    return cells;
  }, [viewYear, viewMonth]);

  function changeMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    hu ? 'hu-HU' : 'en-US',
    { year: 'numeric', month: 'long' },
  );

  const selectedLog = logByDate.get(selectedDateKey);

  const weekdays = hu
    ? ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-3 @lg:space-y-6">
      <section className="bg-surface border-y border-border px-4 py-4 @lg:border @lg:rounded-3xl @lg:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-ink">{t.title}</h1>

          <button
            type="button"
            onClick={onToggleHidePercentages}
            className="px-3 py-1.5 rounded-xl bg-surface-subtle text-xs font-semibold text-ink-muted hover:text-ink inline-flex items-center gap-1.5"
          >
            {hidePercentages ? (
              <Eye className="w-4 h-4 text-accent" aria-hidden="true" />
            ) : (
              <EyeOff className="w-4 h-4" aria-hidden="true" />
            )}
            {hidePercentages ? t.showPct : t.hidePct}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              aria-label={hu ? 'Előző hónap' : 'Previous month'}
              className="p-2 rounded-xl bg-surface-subtle text-ink"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="text-sm font-bold text-ink px-2 capitalize">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label={hu ? 'Következő hónap' : 'Next month'}
              className="p-2 rounded-xl bg-surface-subtle text-ink"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <span className="text-xs text-ink-muted">
            {hu ? 'Üres nap = semleges szünet' : 'Empty = neutral gap'}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-ink-muted">
          {weekdays.map((wd) => (
            <span key={wd}>{wd}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5 tabular-nums">
          {monthCells.map((cell) => {
            if (!cell.dayNum || !cell.dateStr) {
              return <div key={cell.key} className="h-12" />;
            }

            const entry = logByDate.get(cell.dateStr);
            const isGap = !entry || entry.isGap;
            const pct = entry ? computeCompleteness(entry) : 0;
            const isSelected = selectedDateKey === cell.dateStr;

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelectedDateKey(cell.dateStr!)}
                aria-pressed={isSelected}
                className={`h-12 rounded-xl flex flex-col items-center justify-center text-xs transition ${
                  isSelected
                    ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface'
                    : ''
                } ${
                  isGap
                    ? 'bg-surface border border-dashed border-border text-ink-muted'
                    : pct >= 75
                      ? 'bg-accent-soft text-accent-strong font-bold'
                      : 'bg-surface-blue text-ink font-semibold'
                }`}
              >
                <span>{cell.dayNum}</span>
                <span className="text-xs font-medium">
                  {isGap ? '—' : hidePercentages ? '•' : `${pct}%`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Flat Day Detail Strip */}
      <section className="bg-surface border-y border-border px-4 py-4 @lg:border @lg:rounded-3xl @lg:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-ink">{selectedDateKey}</h2>
          {!selectedLog?.isGap && selectedLog && (
            <div className="flex flex-wrap gap-4 text-xs tabular-nums text-ink-muted">
              <span>
                {hu ? 'Energia' : 'Energy'}:{' '}
                <strong className="text-ink">
                  {selectedLog.energyLevel !== null
                    ? hidePercentages
                      ? '•'
                      : `${selectedLog.energyLevel}%`
                    : '—'}
                </strong>
              </span>
              <span>
                {hu ? 'Alvás' : 'Sleep'}:{' '}
                <strong className="text-ink">
                  {selectedLog.sleepHours !== null
                    ? hu
                      ? `${selectedLog.sleepHours} óra`
                      : `${selectedLog.sleepHours}h`
                    : '—'}
                </strong>
              </span>
              <span>
                {hu ? 'Adag' : 'Meds'}:{' '}
                <strong className="text-ink">
                  {selectedLog.medsTakenPct !== null
                    ? hidePercentages
                      ? '•'
                      : `${selectedLog.medsTakenPct}%`
                    : '—'}
                </strong>
              </span>
            </div>
          )}
        </div>

        {!selectedLog || selectedLog.isGap ? (
          <p className="text-xs text-ink-muted">{t.noEntry}</p>
        ) : (
          <div className="space-y-2 text-xs">
            {((selectedLog.emotionModelData?.willcox?.length ?? 0) > 0 ||
              selectedLog.emotions.length > 0 ||
              selectedLog.bodySensations.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {selectedLog.emotionModelData?.willcox?.length
                  ? selectedLog.emotionModelData.willcox.map((id) => (
                      <span
                        key={id}
                        className="px-2.5 py-0.5 rounded-full bg-accent-soft text-accent-strong font-medium"
                      >
                        {getWillcoxFeelingLabel(id, lang)}
                      </span>
                    ))
                  : selectedLog.emotions.map((id) => {
                      const n = EMOTION_WHEEL_NODES.find((x) => x.id === id);
                      return n ? (
                        <span
                          key={id}
                          className="px-2.5 py-0.5 rounded-full bg-accent-soft text-accent-strong font-medium"
                        >
                          {hu ? n.labelHu : n.labelEn}
                        </span>
                      ) : null;
                    })}
                {selectedLog.bodySensations.map((id) => {
                  const s = BODY_SENSATIONS.find((x) => x.id === id);
                  return s ? (
                    <span
                      key={id}
                      className="px-2.5 py-0.5 rounded-full bg-surface-blue text-ink font-medium"
                    >
                      {hu ? s.labelHu : s.labelEn}
                    </span>
                  ) : null;
                })}
              </div>
            )}

            {(selectedLog.note || selectedLog.decisionNote) && (
              <p className="text-ink-muted">
                {selectedLog.decisionNote ? `${selectedLog.decisionNote} — ` : ''}
                {selectedLog.note}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
