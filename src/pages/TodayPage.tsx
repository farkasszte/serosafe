import React, { useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Plus,
  Stethoscope,
  UserCheck,
  X,
} from 'lucide-react';
import { BodyMap } from '@/components/visuals/BodyMap';
import { EmotionWheel } from '@/components/visuals/EmotionWheel';
import { EnergySensoryDial } from '@/components/visuals/EnergySensoryDial';
import {
  applyBodyPartsUpdate,
  applyPainLevelChange,
  applyPainQualityToggle,
  applySensationToggle,
} from '@/engine/symptomSync';
import { STRINGS } from '@/services/i18n';
import type {
  BodyRegionId,
  DailyLogEntry,
  DayPart,
  DoctorReferenceNote,
  HabitChip,
  IntentTag,
  PainQualityId,
} from '@/types/serosafe';

interface TodayPageProps {
  lang: 'hu' | 'en';
  activeDayPart: DayPart;
  isDayPartAuto?: boolean;
  simplifiedMode?: boolean;
  todayLog: DailyLogEntry;
  habits: HabitChip[];
  doctorNote: DoctorReferenceNote | null;
  onSelectDayPart: (part: DayPart) => void;
  onResetDayPartAuto?: () => void;
  onToggleSimplifiedMode?: () => void;
  onUpdateTodayLog: (
    updater: (prev: DailyLogEntry) => DailyLogEntry,
    options?: { recomputePatterns?: boolean },
  ) => void;
  onAddHabit: (label: string, group: HabitChip['group'], intent: IntentTag) => void;
  onDeleteHabit?: (habitId: string) => void;
}

const DAY_PARTS: DayPart[] = [
  'morning',
  'forenoon',
  'midday',
  'afternoon',
  'evening',
  'night',
];

const SIMPLIFIED_DAY_PARTS: DayPart[] = [
  'morning',
  'midday',
  'evening',
  'night',
];

function mapToSimplifiedDayPart(part: DayPart): DayPart {
  if (part === 'forenoon') return 'morning';
  if (part === 'afternoon') return 'midday';
  return part;
}

function isLoadFactor(chip: HabitChip): boolean {
  return (
    chip.group === 'substances' ||
    chip.group === 'social' ||
    chip.id === 'c_fog' ||
    chip.intent === 'observation'
  );
}

export function TodayPage({
  lang,
  activeDayPart,
  isDayPartAuto = true,
  simplifiedMode = false,
  todayLog,
  habits,
  doctorNote,
  onSelectDayPart,
  onResetDayPartAuto,
  onToggleSimplifiedMode,
  onUpdateTodayLog,
  onAddHabit,
  onDeleteHabit,
}: TodayPageProps) {
  const t = STRINGS[lang].today;
  const hu = lang === 'hu';

  const [visualMode, setVisualMode] = useState<'wheel' | 'body' | 'dials'>('wheel');
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [showAllFactors, setShowAllFactors] = useState(false);
  const [pendingDeleteHabitId, setPendingDeleteHabitId] = useState<string | null>(null);
  const [newHabitText, setNewHabitText] = useState('');
  const [newFactorKind, setNewFactorKind] = useState<'support' | 'load'>('support');
  const [showDocNote, setShowDocNote] = useState(false);

  const supportHabits = habits.filter((h) => !isLoadFactor(h));
  const loadHabits = habits.filter((h) => isLoadFactor(h));

  function pickSimplifiedSlice(list: HabitChip[]): HabitChip[] {
    if (!simplifiedMode || showAllFactors || list.length <= 4) return list;
    const prioritized = [...list].sort((a, b) => {
      const aSelected = todayLog.chipIds.includes(a.id) ? 1 : 0;
      const bSelected = todayLog.chipIds.includes(b.id) ? 1 : 0;
      if (aSelected !== bSelected) return bSelected - aSelected;
      const aCustom = a.id.startsWith('c_custom_') ? 1 : 0;
      const bCustom = b.id.startsWith('c_custom_') ? 1 : 0;
      return bCustom - aCustom;
    });
    return prioritized.slice(0, 4);
  }

  const displayedSupportHabits = pickSimplifiedSlice(supportHabits);
  const displayedLoadHabits = pickSimplifiedSlice(loadHabits);
  const visibleDayParts = simplifiedMode ? SIMPLIFIED_DAY_PARTS : DAY_PARTS;
  const highlightedDayPart = simplifiedMode
    ? mapToSimplifiedDayPart(activeDayPart)
    : activeDayPart;
  const pendingDeleteHabit = pendingDeleteHabitId
    ? habits.find((h) => h.id === pendingDeleteHabitId) ?? null
    : null;

  function handleUpdateWillcox(
    willcoxIds: string[],
    mappedEmotionIds: string[],
  ) {
    onUpdateTodayLog((prev) => ({
      ...prev,
      isGap: false,
      dayPartsLogged: prev.dayPartsLogged.includes(activeDayPart)
        ? prev.dayPartsLogged
        : [...prev.dayPartsLogged, activeDayPart],
      emotions: mappedEmotionIds,
      emotionModelData: { willcox: willcoxIds },
    }));
  }

  function handleChangeSelectedBodyParts(
    partIds: string[],
    derivedRegions: BodyRegionId[],
  ) {
    onUpdateTodayLog(
      (prev) => applyBodyPartsUpdate(prev, partIds, derivedRegions, activeDayPart),
      { recomputePatterns: false },
    );
  }

  function handleChangePainLevel(level: number) {
    onUpdateTodayLog(
      (prev) => applyPainLevelChange(prev, level, activeDayPart),
      { recomputePatterns: false },
    );
  }

  function handleTogglePainQuality(quality: PainQualityId) {
    onUpdateTodayLog((prev) => applyPainQualityToggle(prev, quality), {
      recomputePatterns: false,
    });
  }

  function toggleSensation(sensationId: string, _region: BodyRegionId) {
    onUpdateTodayLog(
      (prev) => applySensationToggle(prev, sensationId, activeDayPart),
      { recomputePatterns: false },
    );
  }

  function toggleHabit(chipId: string) {
    onUpdateTodayLog((prev) => {
      const exists = prev.chipIds.includes(chipId);
      const chipIds = exists
        ? prev.chipIds.filter((id) => id !== chipId)
        : [...prev.chipIds, chipId];
      return {
        ...prev,
        isGap: false,
        dayPartsLogged: prev.dayPartsLogged.includes(activeDayPart)
          ? prev.dayPartsLogged
          : [...prev.dayPartsLogged, activeDayPart],
        chipIds,
      };
    });
  }

  function handleAddHabitSubmit(e: React.FormEvent) {
    e.preventDefault();
    const label = newHabitText.trim();
    if (!label) return;
    if (newFactorKind === 'support') {
      onAddHabit(label, 'activity', 'decision');
    } else {
      onAddHabit(label, 'substances', 'observation');
    }
    setNewHabitText('');
    setNewFactorKind('support');
    setShowAddHabit(false);
  }

  function renderFactorChip(chip: HabitChip, tone: 'support' | 'load') {
    const selected = todayLog.chipIds.includes(chip.id);
    const isCustom = chip.id.startsWith('c_custom_');
    const activeCls =
      tone === 'support'
        ? 'bg-accent text-ink-on-accent border-accent'
        : 'bg-warning-soft text-warning-ink border-warning-border';
    const inactiveCls =
      'bg-surface-subtle text-ink-muted border-transparent hover:text-ink';

    if (isCustom && onDeleteHabit) {
      return (
        <span
          key={chip.id}
          className={`inline-flex items-center rounded-full border text-xs font-semibold transition overflow-hidden ${
            selected ? activeCls : inactiveCls
          }`}
        >
          <button
            type="button"
            onClick={() => toggleHabit(chip.id)}
            aria-pressed={selected}
            className="pl-3.5 pr-1.5 py-1.5"
          >
            {hu ? chip.labelHu : chip.labelEn}
          </button>
          <button
            type="button"
            onClick={() => setPendingDeleteHabitId(chip.id)}
            aria-label={
              hu
                ? `${chip.labelHu} törlése`
                : `Delete ${chip.labelEn}`
            }
            className="pr-2.5 pl-1 py-1.5 opacity-75 hover:opacity-100"
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </span>
      );
    }

    return (
      <button
        key={chip.id}
        type="button"
        onClick={() => toggleHabit(chip.id)}
        aria-pressed={selected}
        className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold transition ${
          selected ? activeCls : inactiveCls
        }`}
      >
        {hu ? chip.labelHu : chip.labelEn}
      </button>
    );
  }

  return (
    <div className="space-y-3 @lg:space-y-6">
      {/* Primary Visual Check-In Surface */}
      <section className="bg-surface border-y border-border px-4 py-4 @lg:border @lg:rounded-3xl @lg:p-6 space-y-4 @lg:space-y-5">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-bold text-ink">
              {hu ? 'Mai állapot' : 'Today'}
            </h1>
            {onToggleSimplifiedMode && (
              <button
                type="button"
                aria-pressed={simplifiedMode}
                onClick={() => {
                  setShowAllFactors(false);
                  onToggleSimplifiedMode();
                }}
                className={`px-3 py-1 rounded-full border text-xs font-semibold transition ${
                  simplifiedMode
                    ? 'bg-accent text-ink-on-accent border-accent'
                    : 'bg-surface-subtle border-border text-ink-muted hover:text-ink'
                }`}
              >
                {simplifiedMode
                  ? hu
                    ? 'Egyszerűsített mód (max. 4)'
                    : 'Simplified mode (max 4)'
                  : hu
                    ? 'Egyszerűsített mód'
                    : 'Simplified mode'}
              </button>
            )}
          </div>

          {/* Auto-selected clock DayPart strip (user can tap any part to adjust) */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                {isDayPartAuto
                  ? hu
                    ? `Napszak (automatikus: ${t.dayParts[activeDayPart]})`
                    : `Part of day (auto: ${t.dayParts[activeDayPart]})`
                  : hu
                    ? `Napszak (kézzel módosítva: ${t.dayParts[activeDayPart]})`
                    : `Part of day (manual: ${t.dayParts[activeDayPart]})`}
              </span>
              {!isDayPartAuto && onResetDayPartAuto && (
                <button
                  type="button"
                  onClick={onResetDayPartAuto}
                  className="font-semibold text-accent hover:underline"
                >
                  {hu ? 'Vissza az aktuálisra' : 'Sync to current'}
                </button>
              )}
            </div>

            <div
              role="group"
              aria-label={hu ? 'Napszak' : 'Part of day'}
              className={`grid gap-1 p-1 rounded-2xl bg-surface-subtle ${
                simplifiedMode
                  ? 'grid-cols-4'
                  : 'grid-cols-3 @[480px]:grid-cols-6'
              }`}
            >
              {visibleDayParts.map((part) => {
                const active = highlightedDayPart === part;
                return (
                  <button
                    key={part}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelectDayPart(part)}
                    className={`py-1.5 px-2 rounded-xl text-xs text-center transition ${
                      active
                        ? 'bg-accent text-ink-on-accent font-bold shadow-xs'
                        : 'text-ink-muted font-medium hover:text-ink'
                    }`}
                  >
                    {t.dayParts[part]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Clean 3-Instrument Visual Switcher */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setVisualMode('wheel')}
            className={`py-2 px-2 rounded-2xl text-xs font-bold flex flex-col @lg:flex-row items-center justify-center gap-1 @lg:gap-1.5 transition ${
              visualMode === 'wheel'
                ? 'bg-accent-soft text-accent-strong'
                : 'bg-surface-subtle/70 text-ink-muted hover:text-ink'
            }`}
          >
            <Compass className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-center leading-tight">
              {t.viewWheel}{' '}
              <span className="tabular-nums">
                ({todayLog.emotionModelData?.willcox?.length ?? todayLog.emotions.length})
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setVisualMode('body')}
            className={`py-2 px-2 rounded-2xl text-xs font-bold flex flex-col @lg:flex-row items-center justify-center gap-1 @lg:gap-1.5 transition ${
              visualMode === 'body'
                ? 'bg-accent-soft text-accent-strong'
                : 'bg-surface-subtle/70 text-ink-muted hover:text-ink'
            }`}
          >
            <UserCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-center leading-tight">
              {t.viewBody}{' '}
              <span className="tabular-nums">
                ({(todayLog.selectedBodyPartIds?.length ?? 0) +
                  (todayLog.bodyRegions.includes('skin') ? 1 : 0)})
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setVisualMode('dials')}
            className={`py-2 px-2 rounded-2xl text-xs font-bold flex flex-col @lg:flex-row items-center justify-center gap-1 @lg:gap-1.5 transition ${
              visualMode === 'dials'
                ? 'bg-accent-soft text-accent-strong'
                : 'bg-surface-subtle/70 text-ink-muted hover:text-ink'
            }`}
          >
            <Activity className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-center leading-tight">{t.viewDials}</span>
          </button>
        </div>

        {/* Active Visual Instrument */}
        <div>
          {visualMode === 'wheel' && (
            <EmotionWheel
              lang={lang}
              selectedIds={todayLog.emotionModelData?.willcox ?? []}
              simplifiedMode={simplifiedMode}
              onChange={handleUpdateWillcox}
            />
          )}

          {visualMode === 'body' && (
            <BodyMap
              lang={lang}
              selectedRegions={todayLog.bodyRegions}
              selectedSensations={todayLog.bodySensations}
              selectedBodyPartIds={todayLog.selectedBodyPartIds ?? []}
              painLevel={todayLog.painLevel ?? 0}
              painQualities={todayLog.painQualities ?? []}
              mode="diary"
              simplifiedMode={simplifiedMode}
              onToggleSensation={toggleSensation}
              onChangeSelectedBodyParts={handleChangeSelectedBodyParts}
              onChangePainLevel={handleChangePainLevel}
              onTogglePainQuality={handleTogglePainQuality}
            />
          )}

          {visualMode === 'dials' && (
            <EnergySensoryDial
              lang={lang}
              energyLevel={todayLog.energyLevel ?? 65}
              sensoryBattery={todayLog.sensoryBattery ?? 70}
              sleepHours={todayLog.sleepHours ?? 7}
              wokeAtNight={todayLog.wokeAtNight}
              onChangeEnergy={(val) =>
                onUpdateTodayLog((prev) => ({
                  ...prev,
                  isGap: false,
                  energyLevel: val,
                }))
              }
              onChangeSensory={(val) =>
                onUpdateTodayLog(
                  (prev) => ({
                    ...prev,
                    isGap: false,
                    sensoryBattery: val,
                  }),
                  { recomputePatterns: false },
                )
              }
              onChangeSleepHours={(val) =>
                onUpdateTodayLog((prev) => ({
                  ...prev,
                  isGap: false,
                  sleepHours: val,
                }))
              }
              onToggleWokeAtNight={() =>
                onUpdateTodayLog(
                  (prev) => ({
                    ...prev,
                    isGap: false,
                    wokeAtNight: !prev.wokeAtNight,
                  }),
                  { recomputePatterns: false },
                )
              }
            />
          )}
        </div>
      </section>

      {/* Quiet Daily Factors: Clear Supports vs Load/Triggers */}
      <section className="bg-surface border-y border-border px-4 py-4 @lg:border @lg:rounded-3xl @lg:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-ink">
              {hu ? 'Napi tényezők' : 'Daily factors'}
            </h2>
            <p className="text-xs text-ink-muted">
              {hu
                ? 'Mi segített és mi terhelt ma?'
                : 'What helped and what drained you today?'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddHabit((v) => !v)}
            aria-expanded={showAddHabit}
            className="px-3 py-1.5 rounded-full bg-surface-subtle text-xs font-semibold text-ink-muted hover:text-ink inline-flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            {hu ? 'Új tényező' : 'New factor'}
          </button>
        </div>

        {/* Fixed-order semantic groups */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold text-ink-muted">
              {hu ? 'Támogató tényezők' : 'Supports & routine'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {displayedSupportHabits.map((chip) =>
                renderFactorChip(chip, 'support'),
              )}
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <h3 className="text-xs font-semibold text-ink-muted">
              {hu
                ? 'Terhelés / Inger / Koffein'
                : 'Load, triggers & caffeine'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {displayedLoadHabits.map((chip) =>
                renderFactorChip(chip, 'load'),
              )}
            </div>
          </div>

          {simplifiedMode && (supportHabits.length > 4 || loadHabits.length > 4) && (
            <div>
              <button
                type="button"
                onClick={() => setShowAllFactors((v) => !v)}
                className="text-xs font-semibold text-secondary hover:underline"
              >
                {showAllFactors
                  ? hu
                    ? 'Vissza max. 4 opcióra'
                    : 'Show max 4 per group'
                  : hu
                    ? `Összes tényező mutatása (${supportHabits.length + loadHabits.length})`
                    : `Show all factors (${supportHabits.length + loadHabits.length})`}
              </button>
            </div>
          )}

          {pendingDeleteHabit && onDeleteHabit && (
            <div
              role="alert"
              className="p-2.5 rounded-xl bg-emergency-soft border border-emergency-border flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <span className="font-semibold text-ink">
                {hu
                  ? `Törlöd az egyéni tényezőt: „${pendingDeleteHabit.labelHu}”?`
                  : `Delete custom factor "${pendingDeleteHabit.labelEn}"?`}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPendingDeleteHabitId(null)}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-border text-xs font-semibold text-ink-muted hover:text-ink"
                >
                  {hu ? 'Mégse' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteHabit(pendingDeleteHabit.id);
                    setPendingDeleteHabitId(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emergency text-emergency-ink text-xs font-bold"
                >
                  {hu ? 'Törlés' : 'Delete'}
                </button>
              </div>
            </div>
          )}
        </div>

        {showAddHabit && (
          <form
            onSubmit={handleAddHabitSubmit}
            className="pt-3 border-t border-border space-y-3 @[520px]:p-3.5 @[520px]:rounded-2xl @[520px]:bg-surface-subtle/60 @[520px]:border"
          >
            <div className="space-y-1">
              <label
                htmlFor="new-factor-input"
                className="block text-xs font-semibold text-ink"
              >
                {hu ? 'Tényező neve' : 'Factor name'}
              </label>
              <input
                id="new-factor-input"
                type="text"
                value={newHabitText}
                onChange={(e) => setNewHabitText(e.target.value)}
                placeholder={
                  hu
                    ? 'Pl. Délutáni pihenő, Zajos környezet, Edzés...'
                    : 'E.g. Afternoon rest, Loud environment, Exercise...'
                }
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-ink"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                className="inline-flex gap-1 p-1 rounded-xl bg-surface border border-border"
                role="group"
                aria-label={hu ? 'Típus' : 'Type'}
              >
                <button
                  type="button"
                  onClick={() => setNewFactorKind('support')}
                  aria-pressed={newFactorKind === 'support'}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    newFactorKind === 'support'
                      ? 'bg-accent text-ink-on-accent'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {hu ? 'Támogató' : 'Support'}
                </button>
                <button
                  type="button"
                  onClick={() => setNewFactorKind('load')}
                  aria-pressed={newFactorKind === 'load'}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    newFactorKind === 'load'
                      ? 'bg-warning-soft text-warning-ink'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {hu ? 'Terhelés / Inger' : 'Load / Trigger'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewHabitText('');
                    setShowAddHabit(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-ink-muted hover:text-ink"
                >
                  {hu ? 'Mégse' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-accent hover:bg-accent-strong text-ink-on-accent text-xs font-bold"
                >
                  {t.addHabitBtn}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Progressive disclosure for optional note, timeline decision, and added-later flag */}
        <details className="pt-2 border-t border-border group">
          <summary className="cursor-pointer list-none flex items-center justify-between text-xs font-semibold text-ink-muted hover:text-ink py-1">
            <span>
              {hu
                ? 'Napi jegyzet és utólagos rögzítés'
                : 'Daily note & retrospective flag'}
            </span>
            <ChevronDown className="w-4 h-4 transition group-open:rotate-180" aria-hidden="true" />
          </summary>

          <div className="pt-3 space-y-3">
            <div className="grid grid-cols-1 @xl:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  {t.noteLabel}
                </label>
                <input
                  type="text"
                  value={todayLog.note}
                  onChange={(e) =>
                    onUpdateTodayLog(
                      (prev) => ({
                        ...prev,
                        isGap: false,
                        note: e.target.value,
                      }),
                      { recomputePatterns: false },
                    )
                  }
                  placeholder={t.notePlaceholder}
                  className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border text-xs text-ink"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  {t.decisionLabel}
                </label>
                <input
                  type="text"
                  value={todayLog.decisionNote ?? ''}
                  onChange={(e) =>
                    onUpdateTodayLog(
                      (prev) => ({
                        ...prev,
                        isGap: false,
                        decisionNote: e.target.value,
                      }),
                      { recomputePatterns: false },
                    )
                  }
                  placeholder={t.decisionPlaceholder}
                  className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border text-xs text-ink"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
              <input
                type="checkbox"
                checked={todayLog.addedLater}
                onChange={(e) =>
                  onUpdateTodayLog(
                    (prev) => ({
                      ...prev,
                      addedLater: e.target.checked,
                    }),
                    { recomputePatterns: false },
                  )
                }
                className="w-4 h-4 rounded"
              />
              {t.addedLater}
            </label>
          </div>
        </details>
      </section>

      {/* Quiet single-row read-only clinician reference note */}
      {doctorNote && (
        <section className="bg-surface-blue/60 border-y border-secondary-border/60 px-4 py-3 @lg:border @lg:rounded-2xl">
          <button
            type="button"
            onClick={() => setShowDocNote((v) => !v)}
            className="w-full flex items-center justify-between gap-2 text-left"
          >
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-ink">
              <Stethoscope className="w-4 h-4 text-secondary" aria-hidden="true" />
              {hu ? doctorNote.authorLabelHu : doctorNote.authorLabelEn} (
              {doctorNote.dateIso})
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-secondary">
              {hu ? 'Referencia' : 'Reference'}
              {showDocNote ? (
                <ChevronUp className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              )}
            </span>
          </button>

          {showDocNote && (
            <p className="mt-2 pt-2 border-t border-secondary-border/50 text-xs text-ink leading-relaxed">
              {hu ? doctorNote.noteHu : doctorNote.noteEn}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
