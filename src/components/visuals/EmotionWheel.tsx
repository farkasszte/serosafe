import { useState } from 'react';
import { Eraser } from 'lucide-react';

interface EmotionWheelProps {
  lang: 'hu' | 'en';
  selectedIds: string[];
  onChange: (nextIds: string[], mappedEmotionIds: string[]) => void;
}

interface FeelingSubItem {
  id: string;
  hu: string;
  en: string;
}

interface FeelingCoreGroup {
  id: string;
  hu: string;
  en: string;
  color: string;
  mapped: string;
  children: FeelingSubItem[];
}

// Open Emotion Wheel (CC BY-SA 4.0) — structured after Dr. Gloria Willcox (1982)
const WILLCOX_CORES: FeelingCoreGroup[] = [
  {
    id: 'w_happy',
    hu: 'Boldog',
    en: 'Happy',
    color: 'var(--color-accent)',
    mapped: 'em_calm',
    children: [
      { id: 'w_peaceful', hu: 'Békés / nyugodt', en: 'Peaceful' },
      { id: 'w_optimistic', hu: 'Bizakodó', en: 'Optimistic' },
      { id: 'w_accepted', hu: 'Elfogadott', en: 'Accepted' },
      { id: 'w_inspired', hu: 'Lelkes / motivált', en: 'Inspired' },
    ],
  },
  {
    id: 'w_sad',
    hu: 'Szomorú',
    en: 'Sad',
    color: 'var(--color-secondary)',
    mapped: 'em_numb',
    children: [
      { id: 'w_lonely', hu: 'Magányos', en: 'Lonely' },
      { id: 'w_vulnerable', hu: 'Sebezhető', en: 'Vulnerable' },
      { id: 'w_empty', hu: 'Üres / tompa', en: 'Empty / numb' },
      { id: 'w_exhausted', hu: 'Kimerült', en: 'Exhausted' },
    ],
  },
  {
    id: 'w_fearful',
    hu: 'Félő',
    en: 'Fearful',
    color: 'var(--color-warning)',
    mapped: 'em_anxious',
    children: [
      { id: 'w_anxious', hu: 'Szorongó', en: 'Anxious' },
      { id: 'w_insecure', hu: 'Bizonytalan', en: 'Insecure' },
      { id: 'w_helpless', hu: 'Tehetetlen', en: 'Helpless' },
      { id: 'w_overwhelmed', hu: 'Túlterhelt', en: 'Overwhelmed' },
    ],
  },
  {
    id: 'w_angry',
    hu: 'Dühös',
    en: 'Angry',
    color: 'var(--color-emergency)',
    mapped: 'em_irritable',
    children: [
      { id: 'w_frustrated', hu: 'Frusztrált', en: 'Frustrated' },
      { id: 'w_irritable', hu: 'Ingerlékeny', en: 'Irritable' },
      { id: 'w_resentful', hu: 'Neheztelő', en: 'Resentful' },
      { id: 'w_critical', hu: 'Feszült', en: 'Critical / tense' },
    ],
  },
  {
    id: 'w_bad',
    hu: 'Terhelt',
    en: 'Bad / Stressed',
    color: 'var(--color-chart-sensory)',
    mapped: 'em_drained',
    children: [
      { id: 'w_bored', hu: 'Ingerszegény / unott', en: 'Bored' },
      { id: 'w_busy', hu: 'Szétszórt / hajszolt', en: 'Rushed / busy' },
      { id: 'w_stressed', hu: 'Túlterhelt / fáradt', en: 'Stressed' },
      { id: 'w_sleepy', hu: 'Álmos / lassú', en: 'Sleepy' },
    ],
  },
  {
    id: 'w_surprised',
    hu: 'Meglepett',
    en: 'Surprised',
    color: 'var(--color-info)',
    mapped: 'em_confused',
    children: [
      { id: 'w_startled', hu: 'Megriadt', en: 'Startled' },
      { id: 'w_confused', hu: 'Zavart', en: 'Confused' },
      { id: 'w_amazed', hu: 'Csodálkozó', en: 'Amazed' },
      { id: 'w_eager', hu: 'Éber / kíváncsi', en: 'Eager' },
    ],
  },
  {
    id: 'w_disgusted',
    hu: 'Idegenkedő',
    en: 'Disgusted',
    color: 'var(--color-chart-cognitive)',
    mapped: 'em_overwhelmed',
    children: [
      { id: 'w_avoidant', hu: 'Elutasító / elzárkózó', en: 'Avoidant' },
      { id: 'w_uncomfortable', hu: 'Kényelmetlen', en: 'Uncomfortable' },
      { id: 'w_hesitant', hu: 'Hezitáló', en: 'Hesitant' },
      { id: 'w_repelled', hu: 'Szenzorosan zavaró', en: 'Sensory repulsion' },
    ],
  },
];

const CX = 190;
const CY = 190;

function polar(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function wedgePath(
  innerR: number,
  outerR: number,
  startDeg: number,
  endDeg: number,
): string {
  const pad = 1.5;
  const s = startDeg + pad;
  const e = endDeg - pad;
  const p1 = polar(s, outerR);
  const p2 = polar(e, outerR);
  const p3 = polar(e, innerR);
  const p4 = polar(s, innerR);
  return [
    `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`,
    `A ${outerR} ${outerR} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`,
    `L ${p3.x.toFixed(1)} ${p3.y.toFixed(1)}`,
    `A ${innerR} ${innerR} 0 0 0 ${p4.x.toFixed(1)} ${p4.y.toFixed(1)}`,
    'Z',
  ].join(' ');
}

function getFeelingLabel(id: string, lang: 'hu' | 'en'): string {
  for (const core of WILLCOX_CORES) {
    if (core.id === id) return lang === 'hu' ? core.hu : core.en;
    const sub = core.children.find((ch) => ch.id === id);
    if (sub) return lang === 'hu' ? sub.hu : sub.en;
  }
  return id;
}

export function EmotionWheel({
  lang,
  selectedIds,
  onChange,
}: EmotionWheelProps) {
  const hu = lang === 'hu';
  const [focusedCoreId, setFocusedCoreId] = useState<string>('w_happy');

  const activeCore =
    WILLCOX_CORES.find((c) => c.id === focusedCoreId) ?? WILLCOX_CORES[0];

  function commitSelection(next: string[]) {
    const mapped = Array.from(
      new Set(
        next
          .map((fid) => {
            const group = WILLCOX_CORES.find(
              (c) => c.id === fid || c.children.some((ch) => ch.id === fid),
            );
            return group?.mapped;
          })
          .filter((x): x is string => Boolean(x)),
      ),
    );
    onChange(next, mapped);
  }

  function toggleFeeling(id: string) {
    const exists = selectedIds.includes(id);
    const next = exists
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    commitSelection(next);
  }

  const sliceStep = 360 / WILLCOX_CORES.length;

  return (
    <div data-no-swipe="true" className="widget-container">
      <div className="grid grid-cols-1 @[560px]:grid-cols-[290px_1fr] gap-5 items-center">
        {/* Open Emotion Wheel (Willcox 7-core radial focus wheel) */}
        <div className="flex flex-col items-center">
          <svg
            viewBox="0 0 380 380"
            className="w-full max-w-[280px] @[560px]:max-w-[290px] h-auto select-none"
            role="group"
            aria-label={
              hu
                ? 'Open Emotion Wheel (Willcox) 7 alapérzelem fókusszal'
                : 'Open Emotion Wheel (Willcox) with 7 focusable core feelings'
            }
          >
            {WILLCOX_CORES.map((core, idx) => {
              const start = idx * sliceStep;
              const end = (idx + 1) * sliceStep;
              const mid = (start + end) / 2;
              const pos = polar(mid, 112);
              const badgePos = polar(mid, 155);
              const isFocused = core.id === focusedCoreId;
              const sliceSelectedCount =
                (selectedIds.includes(core.id) ? 1 : 0) +
                core.children.filter((ch) => selectedIds.includes(ch.id)).length;
              const hasSelectedChild = sliceSelectedCount > 0;

              return (
                <g
                  key={core.id}
                  role="button"
                  tabIndex={0}
                  aria-label={hu ? core.hu : core.en}
                  aria-pressed={isFocused}
                  onClick={() => setFocusedCoreId(core.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setFocusedCoreId(core.id);
                    }
                  }}
                  className="cursor-pointer focus:outline-none"
                >
                  <path
                    d={wedgePath(54, 174, start, end)}
                    fill={`color-mix(in oklch, ${core.color} ${
                      isFocused ? 34 : hasSelectedChild ? 22 : 11
                    }%, var(--color-surface))`}
                    stroke={
                      isFocused || hasSelectedChild
                        ? core.color
                        : 'var(--color-border)'
                    }
                    strokeWidth={isFocused ? 2.4 : hasSelectedChild ? 1.8 : 1.2}
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 4}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight={isFocused ? '700' : '600'}
                    fill="var(--color-ink)"
                  >
                    {hu ? core.hu : core.en}
                  </text>
                  {hasSelectedChild && (
                    <circle
                      cx={badgePos.x}
                      cy={badgePos.y}
                      r="5"
                      fill={core.color}
                    />
                  )}
                </g>
              );
            })}

            <circle
              cx={CX}
              cy={CY}
              r="46"
              fill="var(--color-surface)"
              stroke="var(--color-border-strong)"
              strokeWidth="1.4"
            />
            <text
              x={CX}
              y={CY - 3}
              textAnchor="middle"
              fontSize="15"
              fontWeight="700"
              fill="var(--color-ink)"
            >
              {selectedIds.length}
            </text>
            <text
              x={CX}
              y={CY + 14}
              textAnchor="middle"
              fontSize="12"
              fill="var(--color-ink-muted)"
            >
              {hu ? 'érzés' : 'feelings'}
            </text>
          </svg>
        </div>

        {/* Focused Core Sub-feelings + Multi-slice Selection Chips */}
        <div className="space-y-3 min-w-0">
          <div className="pt-3 border-t border-border/70 space-y-3 @[560px]:p-4 @[560px]:rounded-2xl @[560px]:bg-surface-subtle/70 @[560px]:border @[560px]:border-border">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => toggleFeeling(activeCore.id)}
                aria-pressed={selectedIds.includes(activeCore.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold border transition ${
                  selectedIds.includes(activeCore.id)
                    ? 'bg-accent text-ink-on-accent border-accent'
                    : 'bg-surface border-border-strong text-ink hover:border-accent'
                }`}
              >
                {hu ? activeCore.hu : activeCore.en}
              </button>
            </div>

            <div className="grid grid-cols-1 @[310px]:grid-cols-2 gap-2">
              {activeCore.children.map((ch) => {
                const active = selectedIds.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => toggleFeeling(ch.id)}
                    aria-pressed={active}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left transition ${
                      active
                        ? 'bg-accent text-ink-on-accent border-accent'
                        : 'bg-surface border-border text-ink hover:border-border-strong'
                    }`}
                  >
                    {hu ? ch.hu : ch.en}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="pt-3 border-t border-border/70 space-y-2 @[560px]:p-3 @[560px]:rounded-2xl @[560px]:bg-surface @[560px]:border @[560px]:border-border">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-ink">
                  {hu
                    ? `Kiválasztva (${selectedIds.length})`
                    : `Selected (${selectedIds.length})`}
                </span>
                <button
                  type="button"
                  onClick={() => commitSelection([])}
                  className="text-xs font-semibold text-ink-muted hover:text-ink inline-flex items-center gap-1"
                >
                  <Eraser className="w-3.5 h-3.5" aria-hidden="true" />
                  {hu ? 'Törlés' : 'Clear'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleFeeling(id)}
                    className="px-2.5 py-1 rounded-full bg-accent-soft text-accent-strong text-xs font-semibold hover:opacity-85 transition"
                  >
                    {getFeelingLabel(id, lang)} ×
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
