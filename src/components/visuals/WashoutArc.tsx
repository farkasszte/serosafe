interface WashoutArcProps {
  lang: 'hu' | 'en';
  name: string;
  doseText: string;
  totalDays: number;
  daysElapsed: number;
  daysRemaining: number;
  sourceRef: string;
  notes: string;
}

export function WashoutArc({
  lang,
  name,
  doseText,
  totalDays,
  daysElapsed,
  daysRemaining,
  sourceRef,
  notes,
}: WashoutArcProps) {
  const hu = lang === 'hu';
  const r = 34;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(1, Math.max(0, daysElapsed / Math.max(1, totalDays)));
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="p-3.5 rounded-2xl bg-warning-soft border border-warning-border flex items-center gap-4">
      <div className="shrink-0">
        <svg
          viewBox="0 0 88 88"
          className="w-20 h-20 select-none"
          role="img"
          aria-label={
            hu
              ? `${name} kiürülési ablak: ${daysRemaining} nap van hátra a ${totalDays} napból`
              : `${name} washout window: ${daysRemaining} of ${totalDays} days remaining`
          }
        >
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke="color-mix(in oklch, var(--color-warning) 24%, transparent)"
            strokeWidth="8"
          />
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke="var(--color-warning)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 44 44)"
          />
          <text
            x="44"
            y="42"
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill="var(--color-warning-ink)"
          >
            {hu ? `${daysRemaining} nap` : `${daysRemaining}d`}
          </text>
          <text
            x="44"
            y="57"
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill="var(--color-warning-ink)"
          >
            {hu ? `/ ${totalDays} nap` : `/ ${totalDays}d`}
          </text>
        </svg>
      </div>

      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-warning-ink">
            {name} ({doseText})
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface border border-warning-border text-warning-ink">
            {hu
              ? `Még ${daysRemaining} napig aktív`
              : `${daysRemaining} days active`}
          </span>
        </div>
        <p className="text-xs text-warning-ink leading-relaxed">{notes}</p>
        <p className="text-xs text-ink-muted">{sourceRef}</p>
      </div>
    </div>
  );
}
