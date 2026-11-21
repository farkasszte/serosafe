import React, { useEffect, useMemo, useRef, useState } from 'react';
import { COMMON_CO_MEDICATIONS, CURATED_SUBSTANCES } from '@/data/substances';
import { formatDrugClass } from '@/services/i18n';
import type { MedicationStatus, UserMedication } from '@/types/serosafe';
import { Plus, Search, X } from 'lucide-react';

type LastTakenPreset = 'not_yet' | 'now' | '2h' | 'yesterday_eve' | 'custom';

function toLocalDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toDatetimeLocalValue(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

interface AddMedDialogProps {
  open: boolean;
  onClose: () => void;
  lang: 'hu' | 'en';
  onAddMedication: (med: UserMedication) => void;
}

export function AddMedDialog({
  open,
  onClose,
  lang,
  onAddMedication,
}: AddMedDialogProps) {
  const hu = lang === 'hu';
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [query, setQuery] = useState('');
  const [selectedKind, setSelectedKind] = useState<'serotonergic' | 'comed' | 'custom'>('serotonergic');
  const [selectedId, setSelectedId] = useState('sertraline');
  const [customName, setCustomName] = useState('');
  const [doseText, setDoseText] = useState('50 mg');
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [lastTakenPreset, setLastTakenPreset] = useState<LastTakenPreset>('not_yet');
  const [customTakenLocal, setCustomTakenLocal] = useState(() =>
    toDatetimeLocalValue(new Date()),
  );
  const [isDiscontinued, setIsDiscontinued] = useState(false);
  const [stoppedDaysAgo, setStoppedDaysAgo] = useState(7);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  const filteredSerotonergic = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CURATED_SUBSTANCES;
    return CURATED_SUBSTANCES.filter(
      (s) =>
        s.nameHu.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.drugClass.toLowerCase().includes(q) ||
        s.examplesHu.some((ex) => ex.toLowerCase().includes(q)),
    );
  }, [query]);

  const filteredCoMeds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMON_CO_MEDICATIONS;
    return COMMON_CO_MEDICATIONS.filter(
      (s) =>
        s.nameHu.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.examplesHu.some((ex) => ex.toLowerCase().includes(q)),
    );
  }, [query]);

  const activeSubstance = CURATED_SUBSTANCES.find((s) => s.id === selectedId);
  const activeCoMed = COMMON_CO_MEDICATIONS.find((s) => s.id === selectedId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date();
    const stoppedIso = new Date(
      now.getTime() - stoppedDaysAgo * 24 * 3600 * 1000,
    ).toISOString();

    let displayName = customName.trim();
    let substanceId: string | undefined;
    let coMedId: string | undefined;
    let withdrawalCaution = false;
    let nmsWatch = false;
    let isOTCOrSupplement = false;

    if (selectedKind === 'serotonergic' && activeSubstance) {
      substanceId = activeSubstance.id;
      displayName = `${hu ? activeSubstance.nameHu : activeSubstance.nameEn} (${activeSubstance.examplesHu[0]})`;
      withdrawalCaution = activeSubstance.withdrawalCaution;
      isOTCOrSupplement = activeSubstance.isOTCOrSupplement;
    } else if (selectedKind === 'comed' && activeCoMed) {
      coMedId = activeCoMed.id;
      displayName = `${hu ? activeCoMed.nameHu : activeCoMed.nameEn} (${activeCoMed.examplesHu[0]})`;
      withdrawalCaution = activeCoMed.withdrawalCaution;
      nmsWatch = activeCoMed.nmsWatch;
    }

    if (!displayName) return;

    const todayKey = toLocalDateKey(now);
    let activeLastTakenIso = '';
    let activeTodayStatus: MedicationStatus = 'PENDING';

    if (!isDiscontinued) {
      if (lastTakenPreset === 'now') {
        activeLastTakenIso = now.toISOString();
        activeTodayStatus = 'TOOK';
      } else if (lastTakenPreset === '2h') {
        const twoHoursAgo = new Date(now.getTime() - 2 * 3600 * 1000);
        activeLastTakenIso = twoHoursAgo.toISOString();
        activeTodayStatus =
          toLocalDateKey(twoHoursAgo) === todayKey ? 'TOOK' : 'PENDING';
      } else if (lastTakenPreset === 'yesterday_eve') {
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        yest.setHours(22, 0, 0, 0);
        activeLastTakenIso = yest.toISOString();
        activeTodayStatus = 'PENDING';
      } else if (lastTakenPreset === 'custom' && customTakenLocal) {
        const parsed = new Date(customTakenLocal);
        if (!Number.isNaN(parsed.getTime())) {
          activeLastTakenIso = parsed.toISOString();
          activeTodayStatus =
            toLocalDateKey(parsed) === todayKey ? 'TOOK' : 'PENDING';
        }
      }
    }

    onAddMedication({
      id: `med_${Date.now()}`,
      substanceId,
      coMedId,
      customName: displayName,
      doseText: doseText.trim() || '1 db',
      scheduleTime: isDiscontinued
        ? hu
          ? `Leállítva ${stoppedDaysAgo} napja`
          : `Stopped ${stoppedDaysAgo}d ago`
        : scheduleTime,
      lastTakenIso: isDiscontinued ? stoppedIso : activeLastTakenIso,
      discontinuedAtIso: isDiscontinued ? stoppedIso : undefined,
      isDiscontinued,
      todayStatus: isDiscontinued ? 'SKIPPED' : activeTodayStatus,
      todayStatusDate: todayKey,
      withdrawalCaution,
      nmsWatch,
      isOTCOrSupplement,
      skipHistoryHu: 'Még nincs korábbi kihagyási napló ehhez a szerhez.',
      skipHistoryEn: 'No skipped-dose history logged for this item yet.',
    });

    setCustomName('');
    setLastTakenPreset('not_yet');
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="add-med-title"
      className="serosafe-dialog w-[min(100vw-24px,560px)] max-h-[90dvh] rounded-3xl overflow-hidden"
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[90dvh] overflow-y-auto calm-scroll p-3.5 @[480px]:p-5 space-y-3.5 @[480px]:space-y-4"
      >
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
          <h2 id="add-med-title" className="text-base font-bold text-ink">
            {hu
              ? 'Gyógyszer vagy kiegészítő rögzítése'
              : 'Add medication or supplement'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={hu ? 'Bezárás' : 'Close'}
            className="p-2 rounded-xl bg-surface-subtle text-ink-muted hover:text-ink"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-1 @[420px]:grid-cols-3 gap-1.5 p-1 rounded-xl bg-surface-subtle border border-border">
          {(
            [
              {
                key: 'serotonergic',
                hu: 'Szerotonerg (30)',
                en: '30 Serotonergic',
              },
              {
                key: 'comed',
                hu: 'ADHD / Alvás / Egyéb',
                en: 'ADHD / Sleep',
              },
              { key: 'custom', hu: 'Egyéni név', en: 'Custom' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setSelectedKind(t.key);
                if (t.key === 'serotonergic' && filteredSerotonergic[0]) {
                  setSelectedId(filteredSerotonergic[0].id);
                } else if (t.key === 'comed' && filteredCoMeds[0]) {
                  setSelectedId(filteredCoMeds[0].id);
                }
              }}
              className={`py-2 px-2 rounded-lg text-xs font-semibold transition ${
                selectedKind === t.key
                  ? 'bg-surface text-ink border border-border shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {hu ? t.hu : t.en}
            </button>
          ))}
        </div>

        {selectedKind !== 'custom' ? (
          <div className="space-y-2.5">
            <div className="relative">
              <Search
                className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  hu
                    ? 'Keresés hatóanyagra vagy márkanévre (pl. Zoloft, Robitussin)...'
                    : 'Search active ingredient or brand (e.g. Zoloft, DXM)...'
                }
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-subtle border border-border text-xs text-ink"
              />
            </div>

            <div className="max-h-48 overflow-y-auto calm-scroll space-y-1.5 pr-1">
              {selectedKind === 'serotonergic'
                ? filteredSerotonergic.map((s) => {
                    const active = selectedId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedId(s.id)}
                        className={`w-full text-left p-2.5 rounded-xl border transition ${
                          active
                            ? 'bg-accent-soft border-accent text-ink'
                            : 'bg-surface border-border hover:border-border-strong'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="text-xs font-bold text-ink">
                            {hu ? s.nameHu : s.nameEn} ({s.examplesHu.join(', ')})
                          </span>
                          <span className="text-xs font-semibold text-secondary tabular-nums">
                            {formatDrugClass(s.drugClass, lang)} •{' '}
                            {hu
                              ? `${s.clinicalWashoutDays} nap kiürülés`
                              : `${s.clinicalWashoutDays}d washout`}
                          </span>
                        </div>
                        <p className="text-xs text-ink-muted mt-0.5">
                          {hu ? s.notesHu : s.notesEn}
                        </p>
                      </button>
                    );
                  })
                : filteredCoMeds.map((c) => {
                    const active = selectedId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className={`w-full text-left p-2.5 rounded-xl border transition ${
                          active
                            ? 'bg-accent-soft border-accent text-ink'
                            : 'bg-surface border-border hover:border-border-strong'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-ink">
                            {hu ? c.nameHu : c.nameEn} ({c.examplesHu.join(', ')})
                          </span>
                          {c.nmsWatch && (
                            <span className="text-xs font-semibold text-warning-ink">
                              {hu ? 'NMS-figyelés' : 'NMS watch'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink-muted mt-0.5">
                          {hu ? c.notesHu : c.notesEn}
                        </p>
                      </button>
                    );
                  })}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">
              {hu ? 'Gyógyszer vagy készítmény neve' : 'Medication name'}
            </label>
            <input
              type="text"
              required
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={hu ? 'Pl. Magnézium-biszglicinát' : 'E.g. Magnesium'}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-subtle border border-border text-sm text-ink"
            />
          </div>
        )}

        {/* Dose & Schedule */}
        <div className="grid grid-cols-1 @[420px]:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">
              {hu ? 'Adag' : 'Dose'}
            </label>
            <input
              type="text"
              value={doseText}
              onChange={(e) => setDoseText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border text-sm text-ink"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">
              {hu ? 'Tervezett időpont' : 'Schedule time'}
            </label>
            <input
              type="time"
              value={scheduleTime}
              disabled={isDiscontinued}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border text-sm text-ink disabled:opacity-50"
            />
          </div>
        </div>

        {/* Last taken timestamp for active / OTC medications */}
        {!isDiscontinued && (
          <div className="p-2.5 @[480px]:p-3 rounded-xl @[480px]:rounded-2xl bg-surface-subtle border border-border space-y-2">
            <label className="block text-xs font-semibold text-ink">
              {hu ? 'Utolsó bevétel időpontja' : 'Last taken time'}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'not_yet', hu: 'Még nem vettem be', en: 'Not taken yet' },
                  { id: 'now', hu: 'Most', en: 'Now' },
                  { id: '2h', hu: '2 órája', en: '2h ago' },
                  { id: 'yesterday_eve', hu: 'Tegnap 22:00', en: 'Yesterday 22:00' },
                  { id: 'custom', hu: 'Egyéni időpont', en: 'Custom time' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLastTakenPreset(opt.id)}
                  aria-pressed={lastTakenPreset === opt.id}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    lastTakenPreset === opt.id
                      ? 'bg-accent text-ink-on-accent border-accent'
                      : 'bg-surface border-border text-ink-muted hover:text-ink'
                  }`}
                >
                  {hu ? opt.hu : opt.en}
                </button>
              ))}
            </div>
            {lastTakenPreset === 'custom' && (
              <input
                type="datetime-local"
                aria-label={hu ? 'Utolsó bevétel pontos ideje' : 'Exact last taken time'}
                value={customTakenLocal}
                onChange={(e) => setCustomTakenLocal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-ink tabular-nums"
              />
            )}
          </div>
        )}

        {/* Already Discontinued (Washout tracking) */}
        <div className="p-2.5 @[480px]:p-3 rounded-xl @[480px]:rounded-2xl bg-surface-subtle border border-border space-y-2">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-ink">
            <input
              type="checkbox"
              checked={isDiscontinued}
              onChange={(e) => setIsDiscontinued(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            {hu
              ? 'Már abbahagytam — kövesse a kiürülési időszakot'
              : 'Already discontinued — track clinical washout window'}
          </label>

          {isDiscontinued && (
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-xs text-ink-muted">
                {hu ? 'Hány napja hagytad abba?' : 'Days since last dose:'}
              </span>
              <input
                type="number"
                min={0}
                max={60}
                value={stoppedDaysAgo}
                onChange={(e) =>
                  setStoppedDaysAgo(Math.max(0, Number(e.target.value)))
                }
                className="w-24 px-2.5 py-1.5 rounded-lg bg-surface border border-border text-sm font-bold text-ink tabular-nums"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-surface-subtle border border-border text-xs font-semibold text-ink"
          >
            {hu ? 'Mégse' : 'Cancel'}
          </button>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-strong text-ink-on-accent text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            {hu ? 'Mentés a listába' : 'Save medication'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
