import { useEffect, useState } from 'react';
import { Check, Clock, Minus, X } from 'lucide-react';
import { ModalDialog } from '@/components/modals/ModalDialog';
import type { MedicationStatus, UserMedication } from '@/types/serosafe';

interface FocusModeDialogProps {
  open: boolean;
  onClose: () => void;
  lang: 'hu' | 'en';
  medications: UserMedication[];
  onSetStatus: (medId: string, status: MedicationStatus) => void;
}

export function FocusModeDialog({
  open,
  onClose,
  lang,
  medications,
  onSetStatus,
}: FocusModeDialogProps) {
  const hu = lang === 'hu';
  const activeMeds = medications.filter((m) => !m.isDiscontinued);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open) {
      const firstPending = activeMeds.findIndex(
        (m) => m.todayStatus === 'PENDING',
      );
      setIndex(firstPending >= 0 ? firstPending : 0);
    }
  }, [open]);

  useEffect(() => {
    if (activeMeds.length > 0 && index >= activeMeds.length) {
      setIndex(activeMeds.length - 1);
    }
  }, [index, activeMeds.length]);

  const currentMed = activeMeds[index];

  function handleAnswer(status: MedicationStatus) {
    if (!currentMed) return;
    onSetStatus(currentMed.id, status);

    const nextPendingAfter = activeMeds.findIndex(
      (m, idx) => idx > index && m.todayStatus === 'PENDING',
    );
    if (nextPendingAfter >= 0) {
      setIndex(nextPendingAfter);
      return;
    }

    const nextPendingBefore = activeMeds.findIndex(
      (m, idx) => idx < index && m.todayStatus === 'PENDING',
    );
    if (nextPendingBefore >= 0) {
      setIndex(nextPendingBefore);
      return;
    }

    if (currentMed.todayStatus !== 'PENDING' && index + 1 < activeMeds.length) {
      setIndex(index + 1);
    } else {
      onClose();
    }
  }

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      ariaLabelledBy="focus-dialog-title"
      className="serosafe-dialog w-[min(100vw-24px,420px)] rounded-3xl"
    >
      <div className="p-4 @[400px]:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wide text-accent">
            {hu ? 'Fókusz mód • Egyetlen adag' : 'Focus mode • Single dose'}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={hu ? 'Bezárás' : 'Close'}
            className="p-2 rounded-xl bg-surface-subtle text-ink-muted hover:text-ink"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {!currentMed ? (
          <div className="py-6 text-center space-y-3">
            <p className="text-sm font-semibold text-ink">
              {hu
                ? 'Nincs aktív napi gyógyszer beállítva.'
                : 'No active daily medications scheduled.'}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-accent text-ink-on-accent text-sm font-semibold"
            >
              {hu ? 'Rendben' : 'Done'}
            </button>
          </div>
        ) : (
          <>
            <div className="text-center space-y-1.5 py-2">
              <div className="text-xs font-semibold text-ink-muted tabular-nums">
                {index + 1} / {activeMeds.length} • {currentMed.scheduleTime}
              </div>
              <h2
                id="focus-dialog-title"
                className="text-2xl font-bold text-ink"
              >
                {currentMed.customName}
              </h2>
              <p className="text-sm font-semibold text-secondary tabular-nums">
                {currentMed.doseText}
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleAnswer('TOOK')}
                className="w-full py-4 rounded-2xl bg-accent hover:bg-accent-strong text-ink-on-accent font-bold text-sm flex items-center justify-center gap-2 transition"
              >
                <Check className="w-5 h-5" aria-hidden="true" />
                {hu ? 'Bevettem' : 'Took it'}
              </button>

              <button
                type="button"
                onClick={() => handleAnswer('LATER')}
                className="w-full py-3.5 rounded-2xl bg-warning-soft border border-warning-border text-warning-ink font-bold text-sm flex items-center justify-center gap-2 transition"
              >
                <Clock className="w-4 h-4" aria-hidden="true" />
                {hu ? 'Később veszem be' : 'Take later'}
              </button>

              <button
                type="button"
                onClick={() => handleAnswer('SKIPPED')}
                className="w-full py-3.5 rounded-2xl bg-surface-subtle border border-border text-ink font-semibold text-sm flex items-center justify-center gap-2 transition"
              >
                <Minus className="w-4 h-4" aria-hidden="true" />
                {hu ? 'Ma kihagytam' : 'Skipped today'}
              </button>
            </div>

            <p className="text-xs text-ink-muted text-center">
              {hu
                ? 'Bűntudat nélkül: csak a saját naplód és kimosódási időablakod frissül.'
                : 'No guilt: updates only your personal adherence log and washout timer.'}
            </p>
          </>
        )}
      </div>
    </ModalDialog>
  );
}
