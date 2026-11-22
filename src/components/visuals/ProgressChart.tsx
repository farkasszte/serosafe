import { useMemo, useState } from 'react';
import { EMOTION_WHEEL_NODES } from '@/data/substances';
import type { DailyLogEntry } from '@/types/serosafe';
import { formatLocalDateKey } from '@/utils/date';

interface ProgressChartProps {
  lang: 'hu' | 'en';
  logs: DailyLogEntry[];
  rangeDays: 14 | 30 | 45;
  activeMetrics: string[];
}

interface MetricConfig {
  id: string;
  hu: string;
  en: string;
  color: string;
  dashed: boolean;
  extract: (log: DailyLogEntry) => number | null;
}

const EMOTION_NODE_BY_ID = new Map(
  EMOTION_WHEEL_NODES.map((n) => [n.id, n]),
);

function computeMoodScore(log: DailyLogEntry): number | null {
  if (log.isGap || log.emotions.length === 0) return null;
  let score = 62;
  for (const id of log.emotions) {
    const node = EMOTION_NODE_BY_ID.get(id);
    if (node?.score.mood) score += node.score.mood;
  }
  return Math.max(10, Math.min(100, score));
}

export const METRIC_CONFIGS: MetricConfig[] = [
  {
    id: 'energy',
    hu: 'Energia',
    en: 'Energy',
    color: 'var(--color-chart-energy)',
    dashed: false,
    extract: (l) => (l.isGap ? null : l.energyLevel),
  },
  {
    id: 'mood',
    hu: 'Hangulat (érzelmi kör)',
    en: 'Mood (wheel)',
    color: 'var(--color-chart-mood)',
    dashed: false,
    extract: computeMoodScore,
  },
  {
    id: 'sensory',
    hu: 'Szenzoros akku',
    en: 'Sensory battery',
    color: 'var(--color-chart-sensory)',
    dashed: false,
    extract: (l) => (l.isGap ? null : l.sensoryBattery),
  },
  {
    id: 'doses',
    hu: 'Bevett adagok %',
    en: 'Doses taken %',
    color: 'var(--color-chart-doses)',
    dashed: true,
    extract: (l) => (l.isGap ? null : l.medsTakenPct),
  },
];

export function ProgressChart({
  lang,
  logs,
  rangeDays,
  activeMetrics,
}: ProgressChartProps) {
  const hu = lang === 'hu';
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const todayKey = formatLocalDateKey(new Date());

  const slice = useMemo(() => {
    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(-rangeDays);
  }, [logs, rangeDays]);

  const width = 640;
  const height = 240;
  const padLeft = 36;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 30;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getX = (idx: number) =>
    slice.length <= 1
      ? padLeft + plotW / 2
      : padLeft + (idx / (slice.length - 1)) * plotW;

  const getY = (val: number) => padTop + plotH - (val / 100) * plotH;

  const lastX = slice.length > 0 ? getX(slice.length - 1) : 0;

  const inspectedIdx =
    hoverIdx !== null && hoverIdx < slice.length
      ? hoverIdx
      : slice.length > 0
        ? slice.length - 1
        : null;
  const inspectedLog = inspectedIdx !== null ? slice[inspectedIdx] : null;

  return (
    <div data-no-swipe="true" className="space-y-3">
      <div className="p-0 @[520px]:p-3 @[520px]:bg-surface-subtle/50 @[520px]:border @[520px]:border-border @[520px]:rounded-2xl">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          role="img"
          aria-label={
            hu
              ? 'Haladás grafikon; a hiányzó napok megszakításként láthatók'
              : 'Progress chart; missing days appear as line breaks'
          }
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Horizontal grid lines at 0, 50, 100 */}
          {[0, 50, 100].map((v) => {
            const y = getY(v);
            return (
              <g key={v}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="var(--color-border)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="var(--color-ink-muted)"
                >
                  {v}
                </text>
              </g>
            );
          })}

          {/* Date axis ticks (skip intermediate ticks too close to the final tick) */}
          {slice.map((day, idx) => {
            const isLast = idx === slice.length - 1;
            const step = Math.max(1, Math.ceil(slice.length / 5));
            const x = getX(idx);
            if (!isLast && (idx % step !== 0 || Math.abs(lastX - x) < 48)) {
              return null;
            }
            return (
              <text
                key={day.date}
                x={x}
                y={height - 8}
                textAnchor={isLast && slice.length > 1 ? 'end' : 'middle'}
                fontSize="12"
                fill="var(--color-ink-muted)"
              >
                {day.date === todayKey ? (hu ? 'Ma' : 'Today') : day.date.slice(5)}
              </text>
            );
          })}

          {/* Inspected day vertical cursor */}
          {inspectedIdx !== null && (
            <line
              x1={getX(inspectedIdx)}
              y1={padTop}
              x2={getX(inspectedIdx)}
              y2={padTop + plotH}
              stroke="var(--color-border-strong)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Metric Paths (gaps are broken segments, never 0!) */}
          {METRIC_CONFIGS.filter((m) => activeMetrics.includes(m.id)).map(
            (metric) => {
              let dPath = '';
              let segmentOpen = false;
              const points: { x: number; y: number; val: number }[] = [];

              slice.forEach((day, idx) => {
                const val = metric.extract(day);
                if (val === null || val === undefined) {
                  segmentOpen = false;
                  return;
                }
                const x = getX(idx);
                const y = getY(val);
                points.push({ x, y, val });
                if (!segmentOpen) {
                  dPath += `M ${x.toFixed(1)} ${y.toFixed(1)} `;
                  segmentOpen = true;
                } else {
                  dPath += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
                }
              });

              return (
                <g key={metric.id}>
                  <path
                    d={dPath}
                    fill="none"
                    stroke={metric.color}
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={metric.dashed ? '7 5' : undefined}
                  />
                  {points.map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r={3.2}
                      fill={metric.color}
                    />
                  ))}
                </g>
              );
            },
          )}

          {/* Interactive hit columns for scrubbing */}
          {slice.map((day, idx) => {
            const x = getX(idx);
            const colW = Math.max(8, plotW / Math.max(1, slice.length));
            return (
              <rect
                key={day.date}
                x={x - colW / 2}
                y={padTop}
                width={colW}
                height={plotH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIdx(idx)}
                onPointerEnter={() => setHoverIdx(idx)}
                onPointerDown={() => setHoverIdx(idx)}
                onClick={() => setHoverIdx(idx)}
              />
            );
          })}
        </svg>
      </div>

      {/* Selected Day Scrubber Summary */}
      {inspectedLog && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-surface-subtle border border-border text-xs">
          <span className="font-bold text-ink tabular-nums">
            {inspectedLog.date}
            {inspectedLog.isGap
              ? hu
                ? ' — Szünet (nincs bejegyzés)'
                : ' — Gap (no entry)'
              : ''}
          </span>
          {!inspectedLog.isGap && (
            <div className="flex flex-wrap gap-3 tabular-nums">
              {METRIC_CONFIGS.filter((m) => activeMetrics.includes(m.id)).map(
                (m) => {
                  const val = m.extract(inspectedLog);
                  return (
                    <span key={m.id} className="inline-flex items-center gap-1.5 text-ink">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: m.color }}
                      />
                      {hu ? m.hu : m.en}:{' '}
                      <strong>{val !== null ? `${val}%` : '—'}</strong>
                    </span>
                  );
                },
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
