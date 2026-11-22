import { useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, GitCommitHorizontal, RotateCcw } from 'lucide-react';
import {
  METRIC_CONFIGS,
  ProgressChart,
} from '@/components/visuals/ProgressChart';
import { STRINGS } from '@/services/i18n';
import type { DailyLogEntry, PatternInsight } from '@/types/serosafe';

interface InsightsPageProps {
  lang: 'hu' | 'en';
  logs: DailyLogEntry[];
  patterns: PatternInsight[];
  onSetPatternStatus: (id: string, status: PatternInsight['status']) => void;
}

export function InsightsPage({
  lang,
  logs,
  patterns,
  onSetPatternStatus,
}: InsightsPageProps) {
  const t = STRINGS[lang].insights;
  const hu = lang === 'hu';

  const [rangeDays, setRangeDays] = useState<14 | 30 | 45>(30);
  const [activeMetrics, setActiveMetrics] = useState<string[]>([
    'energy',
    'mood',
  ]);
  const [strongOnly, setStrongOnly] = useState(false);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [showHiddenPatterns, setShowHiddenPatterns] = useState(false);
  const [lastDismissed, setLastDismissed] = useState<{
    id: string;
    title: string;
    prevStatus: PatternInsight['status'];
  } | null>(null);

  function toggleMetric(id: string) {
    setActiveMetrics((prev) => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter((x) => x !== id) : prev;
      }
      return [...prev, id];
    });
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const decisionTimeline = useMemo(() => {
    return logs
      .filter((l) => Boolean(l.decisionNote))
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6);
  }, [logs]);

  const visiblePatterns = useMemo(() => {
    return patterns.filter(
      (p) =>
        p.status !== 'hidden' &&
        p.status !== 'wrong' &&
        (!strongOnly || p.strong),
    );
  }, [patterns, strongOnly]);

  const dismissedPatterns = useMemo(() => {
    return patterns.filter((p) => p.status === 'hidden' || p.status === 'wrong');
  }, [patterns]);

  function dismissPattern(p: PatternInsight, nextStatus: 'hidden' | 'wrong') {
    setLastDismissed({
      id: p.id,
      title: hu ? p.titleHu : p.titleEn,
      prevStatus: p.status,
    });
    onSetPatternStatus(p.id, nextStatus);
  }

  return (
    <div className="space-y-3 @lg:space-y-6">
      {/* Progress Graph */}
      <section className="bg-surface border-y border-border px-4 py-4 @lg:border @lg:rounded-3xl @lg:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-ink">
            {hu ? 'Haladás' : 'Progress'}
          </h1>

          <div className="inline-flex gap-1 p-1 rounded-xl bg-surface-subtle">
            {([14, 30, 45] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRangeDays(r)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition tabular-nums ${
                  rangeDays === r
                    ? 'bg-surface text-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {r === 14 ? t.range14 : r === 30 ? t.range30 : t.range45}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {METRIC_CONFIGS.map((m) => {
            const active = activeMetrics.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMetric(m.id)}
                aria-pressed={active}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition inline-flex items-center gap-2 ${
                  active
                    ? 'bg-surface-blue text-ink'
                    : 'bg-surface-subtle text-ink-muted hover:text-ink'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: m.color }}
                />
                <span>{hu ? m.hu : m.en}</span>
              </button>
            );
          })}
        </div>

        <ProgressChart
          lang={lang}
          logs={logs}
          rangeDays={rangeDays}
          activeMetrics={activeMetrics}
        />
      </section>

      {/* Explainable Patterns as a calm divided list */}
      <section className="bg-surface border-y border-border @lg:border @lg:rounded-3xl overflow-hidden">
        <div className="p-4 @lg:px-6 border-b border-border flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-ink">{t.patternsTitle}</h2>
            <p className="text-xs text-ink-muted">
              {hu
                ? 'Leíró együttjárások a saját naplódból, nem diagnózis'
                : 'Descriptive co-occurrences from your logs, not a diagnosis'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStrongOnly((v) => !v)}
            className="px-3 py-1.5 rounded-xl bg-surface-subtle text-xs font-semibold text-ink-muted hover:text-ink"
          >
            {strongOnly ? t.strongOnly : t.allPatterns}
          </button>
        </div>

        {lastDismissed && (
          <div
            role="status"
            className="px-4 @lg:px-6 py-2.5 bg-surface-subtle border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs"
          >
            <span className="text-ink-muted">
              {hu ? 'Elrejtve: ' : 'Hidden: '}
              <strong className="text-ink">{lastDismissed.title}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                onSetPatternStatus(lastDismissed.id, lastDismissed.prevStatus);
                setLastDismissed(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-surface border border-border text-xs font-bold text-accent hover:opacity-90 inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              {hu ? 'Visszavonás' : 'Undo'}
            </button>
          </div>
        )}

        {visiblePatterns.length === 0 ? (
          <p className="p-5 text-xs text-ink-muted">{t.emptyPatterns}</p>
        ) : (
          <div className="divide-y divide-border">
            {visiblePatterns.map((p) => {
              const expanded = expandedIds.includes(p.id);
              return (
                <article key={p.id} className="p-4 @lg:px-6 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-bold text-ink">
                      {hu ? p.titleHu : p.titleEn}
                    </h3>
                    <span className="shrink-0 text-xs font-semibold text-ink-muted tabular-nums">
                      n={p.nDays}
                    </span>
                  </div>

                  <p className="text-xs text-ink-muted">
                    {hu ? p.descHu : p.descEn} •{' '}
                    <span className="text-secondary">
                      {hu ? p.confoundersHu : p.confoundersEn}
                    </span>
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(p.id)}
                      className="text-secondary hover:underline inline-flex items-center gap-1"
                    >
                      <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
                      {expanded ? t.hideDays : t.daysBehind}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onSetPatternStatus(
                          p.id,
                          p.status === 'kept' ? 'shown' : 'kept',
                        )
                      }
                      aria-pressed={p.status === 'kept'}
                      className={
                        p.status === 'kept'
                          ? 'text-accent font-bold'
                          : 'text-ink-muted hover:text-ink'
                      }
                    >
                      {t.keep}
                    </button>
                    <button
                      type="button"
                      onClick={() => dismissPattern(p, 'hidden')}
                      className="text-ink-muted hover:text-ink"
                    >
                      {t.hide}
                    </button>
                    <button
                      type="button"
                      onClick={() => dismissPattern(p, 'wrong')}
                      className="text-ink-muted hover:text-emergency"
                    >
                      {t.wrong}
                    </button>
                  </div>

                  {expanded && (
                    <p className="text-xs text-ink-muted tabular-nums pt-1">
                      {hu ? 'Érintett napok: ' : 'Matching dates: '}
                      <strong className="text-ink">
                        {p.matchingDates.join(', ')}
                      </strong>
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {dismissedPatterns.length > 0 && (
          <div className="border-t border-border bg-surface-subtle/50 px-4 @lg:px-6 py-3 space-y-2">
            <button
              type="button"
              aria-expanded={showHiddenPatterns}
              onClick={() => setShowHiddenPatterns((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-semibold text-ink-muted hover:text-ink"
            >
              <span>
                {hu
                  ? `Elrejtett / elutasított minták visszaállítása (${dismissedPatterns.length})`
                  : `Restore hidden / dismissed patterns (${dismissedPatterns.length})`}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition ${
                  showHiddenPatterns ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {showHiddenPatterns && (
              <div className="divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
                {dismissedPatterns.map((p) => (
                  <div
                    key={p.id}
                    className="px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-ink">
                        {hu ? p.titleHu : p.titleEn}
                      </span>
                      <span className="ml-2 text-ink-muted">
                        (
                        {p.status === 'wrong'
                          ? hu
                            ? 'tévesként jelölve'
                            : 'marked wrong'
                          : hu
                            ? 'elrejtve'
                            : 'hidden'}
                        )
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSetPatternStatus(p.id, 'shown')}
                      className="px-2.5 py-1 rounded-lg bg-surface-subtle border border-border text-xs font-bold text-accent hover:opacity-90 inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      {hu ? 'Visszaállítás' : 'Restore'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Quiet Decision Timeline */}
      {decisionTimeline.length > 0 && (
        <section className="bg-surface border-y border-border @lg:border @lg:rounded-3xl overflow-hidden">
          <div className="p-4 @lg:px-6 border-b border-border flex items-center gap-2">
            <GitCommitHorizontal className="w-4 h-4 text-secondary" aria-hidden="true" />
            <h2 className="text-base font-bold text-ink">{t.timelineTitle}</h2>
          </div>
          <div className="divide-y divide-border">
            {decisionTimeline.map((item) => (
              <div
                key={item.date}
                className="p-4 @lg:px-6 flex flex-col @lg:flex-row @lg:items-center justify-between gap-1 text-xs"
              >
                <div>
                  <span className="font-semibold text-secondary tabular-nums mr-2">
                    {item.date}
                  </span>
                  <strong className="text-ink">{item.decisionNote}</strong>
                </div>
                <span className="text-ink-muted">
                  {item.reactionObserved ??
                    (hu
                      ? `Energia ${item.energyLevel ?? '—'}%`
                      : `Energy ${item.energyLevel ?? '—'}%`)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
