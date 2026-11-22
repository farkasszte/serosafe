import { useEffect, useState } from 'react';
import {
  Check,
  Clock,
  Focus,
  Info,
  Minus,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { WashoutArc } from '@/components/visuals/WashoutArc';
import { CURATED_SUBSTANCES } from '@/data/substances';
import { formatDrugClass, formatLastTaken, STRINGS } from '@/services/i18n';
import type {
  MedicationStatus,
  StructuredAssessment,
  UserMedication,
} from '@/types/serosafe';

interface MedsPageProps {
  lang: 'hu' | 'en';
  medications: UserMedication[];
  assessment: StructuredAssessment;
  onSetStatus: (medId: string, status: MedicationStatus) => void;
  onToggleDiscontinued: (medId: string) => void;
  onDeleteMedication: (medId: string) => void;
  onOpenFocusMode: () => void;
  onOpenAddMed: () => void;
}

export function MedsPage({
  lang,
  medications,
  assessment,
  onSetStatus,
  onToggleDiscontinued,
  onDeleteMedication,
  onOpenFocusMode,
  onOpenAddMed,
}: MedsPageProps) {
  const t = STRINGS[lang].meds;
  const hu = lang === 'hu';
  const [pendingDeleteMedId, setPendingDeleteMedId] = useState<string | null>(
    null,
  );

  // Close any open overflow <details data-med-menu> when clicking outside or pressing Escape
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      document
        .querySelectorAll<HTMLDetailsElement>('details[data-med-menu][open]')
        .forEach((el) => {
          if (!target || !el.contains(target)) {
            el.removeAttribute('open');
          }
        });
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        document
          .querySelectorAll<HTMLDetailsElement>('details[data-med-menu][open]')
          .forEach((el) => el.removeAttribute('open'));
      }
    }
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const activeMeds = medications.filter((m) => !m.isDiscontinued);
  const discontinuedMeds = medications.filter((m) => m.isDiscontinued);

  return (
    <div className="space-y-3 @lg:space-y-6">
      {/* Calm Header & Primary Actions */}
      <section className="flex flex-wrap items-center justify-between gap-3 px-4 pt-2 @lg:px-1 @lg:pt-0">
        <h1 className="text-lg font-bold text-ink">
          {hu ? 'Gyógyszerek' : 'Medications'}
        </h1>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenFocusMode}
            disabled={activeMeds.length === 0}
            className="px-3.5 py-2 rounded-xl bg-surface border border-border text-xs font-bold text-ink inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Focus className="w-4 h-4 text-accent" aria-hidden="true" />
            {t.focusMode}
          </button>

          <button
            type="button"
            onClick={onOpenAddMed}
            className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-strong text-ink-on-accent text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t.addMed}
          </button>
        </div>
      </section>

      {/* Active Medications as one calm flat divided list */}
      <section className="bg-surface border-y border-border @lg:border @lg:rounded-3xl">
        {activeMeds.length === 0 ? (
          <div className="p-6 text-center space-y-3">
            <p className="text-xs text-ink-muted">{t.emptyMeds}</p>
            <button
              type="button"
              onClick={onOpenAddMed}
              className="px-4 py-2.5 rounded-xl bg-accent text-ink-on-accent text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              {t.addMed}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activeMeds.map((med) => {
              const sub = CURATED_SUBSTANCES.find((s) => s.id === med.substanceId);
              return (
                <article key={med.id} className="p-4 @lg:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-bold text-ink">
                          {med.customName}
                        </h2>
                        {med.isOTCOrSupplement && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-warning-soft text-warning-ink">
                            {hu ? 'Vény nélküli' : 'OTC'}
                          </span>
                        )}
                        {sub && (
                          <span className="text-xs font-medium text-secondary">
                            {formatDrugClass(sub.drugClass, lang)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-muted tabular-nums">
                        {med.doseText}
                        {med.scheduleTime ? ` • ${med.scheduleTime}` : ''}
                        {med.lastTakenIso
                          ? ` • ${hu ? 'Utolsó' : 'Last'}: ${formatLastTaken(med.lastTakenIso, lang)}`
                          : ''}
                      </p>
                    </div>

                    {/* Overflow secondary actions tucked cleanly */}
                    <details data-med-menu="true" className="relative">
                      <summary
                        aria-label={hu ? 'További műveletek' : 'More actions'}
                        className="list-none cursor-pointer p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-subtle"
                      >
                        <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                      </summary>
                      <div className="absolute right-0 mt-1 w-48 bg-surface border border-border rounded-2xl shadow-md p-1.5 z-20 space-y-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.currentTarget
                              .closest('details')
                              ?.removeAttribute('open');
                            onToggleDiscontinued(med.id);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-ink hover:bg-surface-subtle"
                        >
                          {t.stopTracking}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.currentTarget
                              .closest('details')
                              ?.removeAttribute('open');
                            setPendingDeleteMedId(med.id);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-emergency hover:bg-emergency-soft inline-flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          {hu ? 'Eltávolítás' : 'Delete'}
                        </button>
                      </div>
                    </details>
                  </div>

                  {pendingDeleteMedId === med.id && (
                    <div
                      role="alert"
                      className="p-2.5 rounded-xl bg-emergency-soft border border-emergency-border flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-semibold text-ink">
                        {hu
                          ? `Eltávolítod a(z) ${med.customName} készítményt a listáról?`
                          : `Remove ${med.customName} from your medication list?`}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPendingDeleteMedId(null)}
                          className="px-2.5 py-1 rounded-lg bg-surface border border-border text-xs font-semibold text-ink-muted hover:text-ink"
                        >
                          {hu ? 'Mégse' : 'Cancel'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteMedication(med.id);
                            setPendingDeleteMedId(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emergency text-emergency-ink text-xs font-bold"
                        >
                          {hu ? 'Eltávolítás' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Guilt-free 3-state buttons */}
                  <div className="grid grid-cols-3 gap-2 max-w-md">
                    <button
                      type="button"
                      onClick={() => onSetStatus(med.id, 'TOOK')}
                      aria-pressed={med.todayStatus === 'TOOK'}
                      className={`py-2 rounded-xl text-xs font-bold transition inline-flex items-center justify-center gap-1 ${
                        med.todayStatus === 'TOOK'
                          ? 'bg-accent text-ink-on-accent'
                          : 'bg-surface-subtle text-ink-muted hover:text-ink'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      {t.took}
                    </button>

                    <button
                      type="button"
                      onClick={() => onSetStatus(med.id, 'LATER')}
                      aria-pressed={med.todayStatus === 'LATER'}
                      className={`py-2 rounded-xl text-xs font-bold transition inline-flex items-center justify-center gap-1 ${
                        med.todayStatus === 'LATER'
                          ? 'bg-warning-soft text-warning-ink border border-warning-border'
                          : 'bg-surface-subtle text-ink-muted hover:text-ink'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      {t.later}
                    </button>

                    <button
                      type="button"
                      onClick={() => onSetStatus(med.id, 'SKIPPED')}
                      aria-pressed={med.todayStatus === 'SKIPPED'}
                      className={`py-2 rounded-xl text-xs font-bold transition inline-flex items-center justify-center gap-1 ${
                        med.todayStatus === 'SKIPPED'
                          ? 'bg-surface-blue text-ink'
                          : 'bg-surface-subtle text-ink-muted hover:text-ink'
                      }`}
                    >
                      <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                      {t.skipped}
                    </button>
                  </div>

                  {med.todayStatus === 'SKIPPED' && (
                    <div className="p-3 rounded-2xl bg-surface-subtle/70 text-xs text-ink-muted space-y-1">
                      <p>{hu ? med.skipHistoryHu : med.skipHistoryEn}</p>
                      {med.withdrawalCaution && (
                        <p className="font-semibold text-warning-ink flex items-start gap-1.5">
                          <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>
                            {hu
                              ? 'Hirtelen elhagyásnál megvonásos tünetek jelentkezhetnek — egyeztess orvosoddal.'
                              : 'Abrupt stopping may cause withdrawal effects — consult your prescriber.'}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Active Washout Windows */}
      {discontinuedMeds.length > 0 && (
        <section className="space-y-3 px-4 @lg:px-0">
          <h2 className="text-sm font-bold text-ink">{t.washoutSection}</h2>
          <div className="space-y-3">
            {discontinuedMeds.map((med) => {
              const exposure = assessment.exposures.find(
                (e) => e.medicationId === med.id,
              );
              const sub = CURATED_SUBSTANCES.find((s) => s.id === med.substanceId);
              if (exposure && sub && exposure.isInWashoutWindow) {
                return (
                  <div key={med.id} className="space-y-1.5">
                    <WashoutArc
                      lang={lang}
                      name={med.customName}
                      doseText={med.doseText}
                      totalDays={sub.clinicalWashoutDays}
                      daysElapsed={exposure.daysElapsedSinceStop}
                      daysRemaining={exposure.daysRemainingInWashout}
                      sourceRef={sub.sourceRef}
                      notes={hu ? sub.notesHu : sub.notesEn}
                    />
                    <div className="flex justify-end gap-3 px-1 text-xs">
                      <button
                        type="button"
                        onClick={() => onToggleDiscontinued(med.id)}
                        className="text-ink-muted hover:text-ink font-semibold inline-flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        {t.resumeTracking}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteMedId(med.id)}
                        className="text-ink-muted hover:text-emergency font-semibold inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        {hu ? 'Eltávolítás' : 'Remove'}
                      </button>
                    </div>
                    {pendingDeleteMedId === med.id && (
                      <div
                        role="alert"
                        className="p-2.5 rounded-xl bg-emergency-soft border border-emergency-border flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-semibold text-ink">
                          {hu
                            ? `Törlöd a kiürülés alatt lévő ${med.customName} bejegyzést?`
                            : `Remove ${med.customName} washout record?`}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPendingDeleteMedId(null)}
                            className="px-2.5 py-1 rounded-lg bg-surface border border-border text-xs font-semibold text-ink-muted hover:text-ink"
                          >
                            {hu ? 'Mégse' : 'Cancel'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteMedication(med.id);
                              setPendingDeleteMedId(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emergency text-emergency-ink text-xs font-bold"
                          >
                            {hu ? 'Eltávolítás' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={med.id}
                  className="p-3.5 rounded-2xl bg-surface border border-border space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-ink">
                        {med.customName} ({med.doseText})
                      </div>
                      <div className="text-ink-muted">
                        {hu
                          ? 'Leállítva — kiürülési ablak letelt.'
                          : 'Discontinued — washout window complete.'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteMedId(med.id)}
                      aria-label={
                        hu
                          ? `${med.customName} eltávolítása`
                          : `Remove ${med.customName}`
                      }
                      className="p-2 rounded-xl text-ink-muted hover:text-emergency"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                  {pendingDeleteMedId === med.id && (
                    <div
                      role="alert"
                      className="p-2 rounded-xl bg-emergency-soft border border-emergency-border flex flex-wrap items-center justify-between gap-2"
                    >
                      <span className="font-semibold text-ink">
                        {hu
                          ? `Eltávolítod a leállított ${med.customName} szert?`
                          : `Remove discontinued ${med.customName}?`}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPendingDeleteMedId(null)}
                          className="px-2.5 py-1 rounded-lg bg-surface border border-border text-xs font-semibold text-ink-muted hover:text-ink"
                        >
                          {hu ? 'Mégse' : 'Cancel'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteMedication(med.id);
                            setPendingDeleteMedId(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emergency text-emergency-ink text-xs font-bold"
                        >
                          {hu ? 'Eltávolítás' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
