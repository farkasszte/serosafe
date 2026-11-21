import React, { useMemo, useRef, useState } from 'react';
import {
  CHOIR_SEGMENTS,
  getSelectedBodyRegions,
  type BodyMapView,
  type ChoirSegment,
} from '@/data/choirBodyRegions';
import { BODY_SENSATIONS, PAIN_QUALITIES } from '@/data/substances';
import type { BodyRegionId, PainQualityId } from '@/types/serosafe';
import {
  Activity,
  AlertTriangle,
  Check,
  Eraser,
  ScanFace,
  Sparkles,
  ZoomIn,
} from 'lucide-react';

interface BodyMapProps {
  lang: 'hu' | 'en';
  selectedRegions: BodyRegionId[];
  selectedSensations: string[];
  selectedBodyPartIds?: string[];
  painLevel?: number | null;
  painQualities?: PainQualityId[];
  mode?: 'diary' | 'safety';
  onToggleSensation: (sensationId: string, region: BodyRegionId) => void;
  onChangeSelectedBodyParts?: (
    partIds: string[],
    derivedRegions: BodyRegionId[],
  ) => void;
  onChangePainLevel?: (level: number) => void;
  onTogglePainQuality?: (quality: PainQualityId) => void;
}

const REGION_TITLES: Record<BodyRegionId, { hu: string; en: string }> = {
  head: { hu: 'Fej, szemek és fülek', en: 'Head, eyes & ears' },
  mouth: { hu: 'Száj és állkapocs', en: 'Mouth & jaw' },
  throat: { hu: 'Torok, gége és beszéd', en: 'Throat, larynx & speech' },
  chest: { hu: 'Mellkas és hát felső része', en: 'Chest & upper back' },
  stomach: { hu: 'Has, gyomor és derék', en: 'Stomach, abdomen & lower back' },
  arms: { hu: 'Karok, vállak és kezek', en: 'Arms, shoulders & hands' },
  legs: { hu: 'Lábak, izmok és lábfejek', en: 'Legs, muscles & feet' },
  skin: { hu: 'Bőr, hőérzet és izzadás', en: 'Skin, heat & sweating' },
};

const PAIN_NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

function getPainBandMeta(level: number, hu: boolean) {
  if (level <= 0) {
    return {
      text: hu ? '0 — Nincs fájdalom' : '0 — No pain',
      badgeClass: 'bg-surface-subtle text-ink-muted',
    };
  }
  if (level <= 3) {
    return {
      text: hu ? `${level}/10 — Enyhe` : `${level}/10 — Mild`,
      badgeClass: 'bg-accent-soft text-accent-strong',
    };
  }
  if (level <= 6) {
    return {
      text: hu ? `${level}/10 — Mérsékelt` : `${level}/10 — Moderate`,
      badgeClass: 'bg-warning-soft text-warning-ink',
    };
  }
  return {
    text: hu ? `${level}/10 — Erős` : `${level}/10 — Severe`,
    badgeClass: 'bg-emergency-soft text-emergency',
  };
}

export function BodyMap({
  lang,
  selectedRegions,
  selectedSensations,
  selectedBodyPartIds = [],
  painLevel = 0,
  painQualities = [],
  mode = 'diary',
  onToggleSensation,
  onChangeSelectedBodyParts,
  onChangePainLevel,
  onTogglePainQuality,
}: BodyMapProps) {
  const hu = lang === 'hu';
  const [view, setView] = useState<BodyMapView>('front');
  const brushActionRef = useRef<'select' | 'deselect' | null>(null);
  const selectedIdsRef = useRef<string[]>(selectedBodyPartIds);
  selectedIdsRef.current = selectedBodyPartIds;

  const skinSelected = selectedRegions.includes('skin');

  const segmentsInView = useMemo(
    () => CHOIR_SEGMENTS.filter((s) => s.view === view),
    [view],
  );

  const segmentById = useMemo(
    () => new Map(CHOIR_SEGMENTS.map((s) => [s.id, s])),
    [],
  );

  const redFlagRegions = useMemo(() => {
    const set = new Set<BodyRegionId>();
    for (const id of selectedSensations) {
      const s = BODY_SENSATIONS.find((x) => x.id === id);
      if (s?.isRedFlag) set.add(s.region);
    }
    return set;
  }, [selectedSensations]);

  function commitParts(nextIds: string[], nextSkin = skinSelected) {
    const derivedRegions = getSelectedBodyRegions(nextIds, nextSkin);
    onChangeSelectedBodyParts?.(nextIds, derivedRegions);
  }

  function applyBrushToSegment(seg: ChoirSegment, action: 'select' | 'deselect') {
    const current = selectedIdsRef.current;
    const exists = current.includes(seg.id);

    if (action === 'select' && !exists) {
      const next = [...current, seg.id];
      selectedIdsRef.current = next;
      commitParts(next);
    } else if (action === 'deselect' && exists) {
      const next = current.filter((id) => id !== seg.id);
      selectedIdsRef.current = next;
      commitParts(next);
    }
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const target = (e.target as HTMLElement | null)?.closest(
      '[data-choir-id]',
    ) as SVGElement | null;
    if (!target) return;
    const id = target.getAttribute('data-choir-id');
    if (!id) return;
    const seg = segmentById.get(id);
    if (!seg) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    const already = selectedIdsRef.current.includes(id);
    const action: 'select' | 'deselect' = already ? 'deselect' : 'select';
    brushActionRef.current = action;
    applyBrushToSegment(seg, action);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const action = brushActionRef.current;
    if (!action) return;
    const el = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest('[data-choir-id]') as SVGElement | null;
    if (!el) return;
    const id = el.getAttribute('data-choir-id');
    if (!id) return;
    const seg = segmentById.get(id);
    if (seg) {
      applyBrushToSegment(seg, action);
    }
  }

  function handlePointerEnd() {
    brushActionRef.current = null;
  }

  function handleSegmentKey(e: React.KeyboardEvent, seg: ChoirSegment) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const already = selectedBodyPartIds.includes(seg.id);
      applyBrushToSegment(seg, already ? 'deselect' : 'select');
    }
  }

  function toggleSkinSystemic() {
    commitParts(selectedBodyPartIds, !skinSelected);
  }

  function clearAllSegments() {
    selectedIdsRef.current = [];
    onChangeSelectedBodyParts?.([], []);
    onChangePainLevel?.(0);
  }

  const activeSelectedRegions = useMemo(
    () => getSelectedBodyRegions(selectedBodyPartIds, skinSelected),
    [selectedBodyPartIds, skinSelected],
  );

  const visibleSensations = useMemo(() => {
    if (activeSelectedRegions.length === 0) return [];
    const list = BODY_SENSATIONS.filter((s) =>
      activeSelectedRegions.includes(s.region),
    );
    if (mode === 'safety') {
      return [...list].sort((a, b) => Number(b.isRedFlag) - Number(a.isRedFlag));
    }
    return list;
  }, [activeSelectedRegions, mode]);

  const selectedSegmentObjects = useMemo(
    () =>
      selectedBodyPartIds
        .map((id) => segmentById.get(id))
        .filter((s): s is ChoirSegment => Boolean(s)),
    [selectedBodyPartIds, segmentById],
  );

  const safePain = Math.max(0, Math.min(10, painLevel ?? 0));
  const painBand = getPainBandMeta(safePain, hu);
  const viewBox = view === 'head' ? '0 0 320 340' : '0 0 280 460';

  return (
    <div data-no-swipe="true" className="widget-container">
      <div className="grid grid-cols-1 @[560px]:grid-cols-[270px_1fr] gap-4 @[560px]:gap-5 items-start">
        {/* Left: CHOIR Interactive Brush-Selectable SVG Body Map */}
        <div className="flex flex-col items-center p-0 @[560px]:bg-surface-subtle/50 @[560px]:rounded-2xl @[560px]:p-3 space-y-3">
          {/* View Switcher: Anterior / Posterior / Detailed Head & Throat */}
          <div
            className="w-full grid grid-cols-3 gap-1 p-1 rounded-xl bg-surface border border-border"
            role="tablist"
            aria-label={hu ? 'Testséma nézetek' : 'Body map views'}
          >
            {(
              [
                { id: 'front', hu: 'Elölnézet', en: 'Front' },
                { id: 'back', hu: 'Hátulnézet', en: 'Back' },
                { id: 'head', hu: 'Fej és torok', en: 'Head & neck' },
              ] as const
            ).map((tab) => {
              const active = view === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setView(tab.id)}
                  className={`py-1.5 px-1 rounded-lg text-xs font-semibold transition ${
                    active
                      ? 'bg-accent text-ink-on-accent'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {hu ? tab.hu : tab.en}
                </button>
              );
            })}
          </div>

          {/* Instruction + Quick Head Zoom Shortcut */}
          <div className="w-full flex items-center justify-between gap-2 text-xs text-ink-muted px-1">
            <span>
              {hu
                ? 'Húzd végig a kijelöléshez / törléshez'
                : 'Drag across zones to paint / erase'}
            </span>
            {view !== 'head' && (
              <button
                type="button"
                onClick={() => setView('head')}
                className="inline-flex items-center gap-1 font-semibold text-accent hover:underline shrink-0"
              >
                <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
                {hu ? 'Fej nagyítása' : 'Zoom head'}
              </button>
            )}
          </div>

          {/* SVG Brush Canvas */}
          <svg
            viewBox={viewBox}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            className="w-full max-w-[250px] h-auto select-none touch-none"
            role="group"
            aria-label={
              hu
                ? 'CHOIR-ihletésű testséma: húzással több testrész jelölhető vagy törölhető'
                : 'CHOIR-inspired body map: drag to select or deselect multiple regions'
            }
          >
            {segmentsInView.map((seg) => {
              const isSelected = selectedBodyPartIds.includes(seg.id);
              const hasRedFlag = redFlagRegions.has(seg.parentRegion);
              const isMouth = seg.parentRegion === 'mouth';
              const isThroat = seg.parentRegion === 'throat';

              let fill = 'var(--color-surface)';
              let stroke = 'var(--color-border-strong)';
              let strokeWidth = 1.25;

              if (isSelected && hasRedFlag) {
                fill =
                  'color-mix(in oklch, var(--color-emergency) 32%, var(--color-surface))';
                stroke = 'var(--color-emergency)';
                strokeWidth = 2;
              } else if (isSelected) {
                fill = isMouth
                  ? 'color-mix(in oklch, var(--color-secondary) 32%, var(--color-surface))'
                  : isThroat
                    ? 'color-mix(in oklch, var(--color-warning) 28%, var(--color-surface))'
                    : 'color-mix(in oklch, var(--color-accent) 30%, var(--color-surface))';
                stroke = isMouth
                  ? 'var(--color-secondary)'
                  : isThroat
                    ? 'var(--color-warning)'
                    : 'var(--color-accent)';
                strokeWidth = 2;
              }

              return (
                <path
                  key={seg.id}
                  data-choir-id={seg.id}
                  d={seg.pathD}
                  fillRule="evenodd"
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeLinejoin="round"
                  role="button"
                  tabIndex={0}
                  aria-label={hu ? seg.labelHu : seg.labelEn}
                  aria-pressed={isSelected}
                  onKeyDown={(e) => handleSegmentKey(e, seg)}
                  className="cursor-crosshair transition-colors duration-100 focus:outline-none"
                />
              );
            })}

            {/* Clear anatomical landmarks on Detailed Head & Neck view */}
            {view === 'head' && (
              <g pointerEvents="none" opacity="0.72">
                <path
                  d="M114 114 Q128 106 142 114 M178 114 Q192 106 206 114"
                  fill="none"
                  stroke="var(--color-ink-muted)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <ellipse
                  cx="128"
                  cy="124"
                  rx="9"
                  ry="5"
                  fill="none"
                  stroke="var(--color-ink-muted)"
                  strokeWidth="1.4"
                />
                <ellipse
                  cx="192"
                  cy="124"
                  rx="9"
                  ry="5"
                  fill="none"
                  stroke="var(--color-ink-muted)"
                  strokeWidth="1.4"
                />
                <path
                  d="M160 120 L156 148 Q160 153 164 148"
                  fill="none"
                  stroke="var(--color-ink-muted)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
                <path
                  d="M140 168 Q160 172 180 168"
                  fill="none"
                  stroke="var(--color-ink-muted)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <text
                  x="160"
                  y="186"
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill="var(--color-ink)"
                >
                  {hu ? 'Száj' : 'Mouth'}
                </text>
                <text
                  x="160"
                  y="272"
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill="var(--color-ink)"
                >
                  {hu ? 'Torok' : 'Throat'}
                </text>
              </g>
            )}
          </svg>

          {/* Systemic Skin/Sweating & Reset Row */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={toggleSkinSystemic}
              aria-pressed={skinSelected}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition ${
                skinSelected
                  ? 'bg-accent text-ink-on-accent'
                  : 'bg-surface border border-border text-ink-muted hover:text-ink'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              {hu ? 'Bőr / Izzadás / Hő' : 'Skin / Sweat / Heat'}
            </button>

            {(selectedBodyPartIds.length > 0 || skinSelected) && (
              <button
                type="button"
                onClick={clearAllSegments}
                className="px-2.5 py-1.5 rounded-full text-xs font-semibold text-ink-muted hover:text-ink inline-flex items-center gap-1"
              >
                <Eraser className="w-3.5 h-3.5" aria-hidden="true" />
                {hu ? 'Kijelölés törlése' : 'Clear'}
              </button>
            )}
          </div>
        </div>

        {/* Right: Strictly Filtered Sensations + Pain Scale & Type */}
        <div className="space-y-4 min-w-0">
          {/* Selected zones bar */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-ink">
                {activeSelectedRegions.length > 0
                  ? hu
                    ? `Kijelölt zónák (${selectedSegmentObjects.length + (skinSelected ? 1 : 0)})`
                    : `Selected zones (${selectedSegmentObjects.length + (skinSelected ? 1 : 0)})`
                  : hu
                    ? 'Testérzetek és fájdalom'
                    : 'Body sensations & pain'}
              </h3>
              <button
                type="button"
                onClick={() => setView('head')}
                className="text-xs font-semibold text-secondary hover:underline inline-flex items-center gap-1"
              >
                <ScanFace className="w-3.5 h-3.5" aria-hidden="true" />
                {hu ? 'Száj és torok nézet' : 'Mouth & throat view'}
              </button>
            </div>

            {selectedSegmentObjects.length > 0 || skinSelected ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedSegmentObjects.map((seg) => (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => applyBrushToSegment(seg, 'deselect')}
                    className="px-2.5 py-1 rounded-full bg-surface-subtle border border-border text-xs font-medium text-ink hover:border-border-strong"
                  >
                    {hu ? seg.labelHu : seg.labelEn} ×
                  </button>
                ))}
                {skinSelected && (
                  <button
                    type="button"
                    onClick={toggleSkinSystemic}
                    className="px-2.5 py-1 rounded-full bg-surface-subtle border border-border text-xs font-medium text-ink hover:border-border-strong"
                  >
                    {hu ? 'Bőr / Izzadás / Hő' : 'Skin / Sweat / Heat'} ×
                  </button>
                )}
              </div>
            ) : null}
          </div>

          {activeSelectedRegions.length === 0 ? (
            <div className="py-4 px-3 rounded-xl bg-surface-subtle/50 border border-dashed border-border text-center space-y-1">
              <p className="text-sm font-semibold text-ink">
                {hu ? 'Nincs kijelölt testrész' : 'No body zone selected'}
              </p>
              <p className="text-xs text-ink-muted">
                {hu
                  ? 'Koppints vagy húzd végig az ujjad a testsémán egy terület kijelöléséhez — csak a kijelölt zónákhoz kapcsolódó érzések és a fájdalomskála jelennek meg itt.'
                  : 'Tap or drag across the body map to select one or more areas — only sensations for selected zones and the pain scale will appear here.'}
              </p>
            </div>
          ) : (
            <>
              {/* Strictly filtered concrete sensations for selected zones */}
              <div className="divide-y divide-border border-y border-border @[560px]:border @[560px]:rounded-2xl overflow-hidden bg-surface">
                {visibleSensations.map((s) => {
                  const isSelected = selectedSensations.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onToggleSensation(s.id, s.region)}
                      aria-pressed={isSelected}
                      className={`w-full text-left py-3 px-1 @[560px]:p-3.5 transition flex items-start justify-between gap-3 ${
                        isSelected
                          ? s.isRedFlag
                            ? 'bg-emergency-soft'
                            : 'bg-accent-soft/70'
                          : 'hover:bg-surface-subtle/60'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-ink">
                            {hu ? s.labelHu : s.labelEn}
                          </span>
                          <span className="text-xs font-medium text-ink-muted">
                            ({REGION_TITLES[s.region][lang].split(',')[0]})
                          </span>
                          {s.isRedFlag && (
                            <AlertTriangle
                              className="w-3.5 h-3.5 text-warning-ink shrink-0"
                              aria-label={hu ? 'Vörös zászló jel' : 'Red-flag sign'}
                            />
                          )}
                        </div>
                        <p className="text-xs text-ink-muted">
                          {hu ? s.hintHu : s.hintEn}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 ${
                          isSelected
                            ? s.isRedFlag
                              ? 'bg-emergency border-emergency text-emergency-ink'
                              : 'bg-accent border-accent text-ink-on-accent'
                            : 'border-border-strong text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 0-10 Pain Intensity Scale + Pain Quality / Type Selector */}
              <div className="pt-3.5 border-t border-border space-y-3 @[560px]:p-4 @[560px]:rounded-2xl @[560px]:bg-surface-subtle/60 @[560px]:border @[560px]:border-border">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
                    <Activity className="w-4 h-4 text-secondary" aria-hidden="true" />
                    {hu ? 'Fájdalom skála (0–10)' : 'Pain scale (0–10)'}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums ${painBand.badgeClass}`}
                  >
                    {painBand.text}
                  </span>
                </div>

                <div
                  className="grid grid-cols-6 @[420px]:grid-cols-11 gap-1 tabular-nums"
                  role="group"
                  aria-label={hu ? 'Fájdalom intenzitása 0 és 10 között' : 'Pain intensity from 0 to 10'}
                >
                  {PAIN_NUMBERS.map((n) => {
                    const active = safePain === n;
                    let activeStyle =
                      'bg-surface border-border-strong text-ink font-bold ring-1 ring-border-strong';
                    if (n >= 1 && n <= 3) {
                      activeStyle = 'bg-accent border-accent text-ink-on-accent font-bold';
                    } else if (n >= 4 && n <= 6) {
                      activeStyle = 'bg-warning border-warning-border text-warning-ink font-bold';
                    } else if (n >= 7) {
                      activeStyle = 'bg-emergency border-emergency text-emergency-ink font-bold';
                    }

                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => onChangePainLevel?.(n)}
                        aria-pressed={active}
                        className={`min-h-9 rounded-lg border text-xs transition ${
                          active
                            ? activeStyle
                            : 'bg-surface border-border text-ink-muted hover:text-ink hover:border-border-strong'
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>

                {safePain > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs font-semibold text-ink-muted">
                      {hu
                        ? 'Fájdalom jellege (több is választható):'
                        : 'Pain quality (multi-select):'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {PAIN_QUALITIES.map((q) => {
                        const selected = painQualities.includes(q.id);
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => onTogglePainQuality?.(q.id)}
                            aria-pressed={selected}
                            className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition ${
                              selected
                                ? 'bg-accent text-ink-on-accent border-accent'
                                : 'bg-surface border-border text-ink-muted hover:text-ink hover:border-border-strong'
                            }`}
                          >
                            {hu ? q.labelHu : q.labelEn}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
