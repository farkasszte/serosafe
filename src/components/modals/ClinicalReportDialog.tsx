import { useEffect, useMemo, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { ModalDialog } from '@/components/modals/ModalDialog';
import { PAIN_QUALITIES } from '@/data/substances';
import { prioritizeMedicationsForEmergency } from '@/engine/safetyEngine';
import type {
  DailyLogEntry,
  PatternInsight,
  StructuredAssessment,
  UserMedication,
} from '@/types/serosafe';
import { formatLocalDateKey } from '@/utils/date';

interface ClinicalReportDialogProps {
  open: boolean;
  onClose: () => void;
  lang: 'hu' | 'en';
  medications: UserMedication[];
  assessment: StructuredAssessment;
  logs: DailyLogEntry[];
  patterns: PatternInsight[];
}

export function ClinicalReportDialog({
  open,
  onClose,
  lang,
  medications,
  assessment,
  logs,
  patterns,
}: ClinicalReportDialogProps) {
  const hu = lang === 'hu';
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const recentLogs = useMemo(
    () =>
      logs
        .filter((l) => !l.isGap)
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 14),
    [logs],
  );

  const relevantEmergencyMeds = useMemo(
    () => prioritizeMedicationsForEmergency(medications, assessment),
    [medications, assessment],
  );

  const keptPatterns = useMemo(
    () => patterns.filter((p) => p.status !== 'hidden' && p.status !== 'wrong'),
    [patterns],
  );

  const activeReasons = hu
    ? assessment.summaryReasonsHu
    : assessment.summaryReasonsEn;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const summary = [
      'SEROSAFE CLINICAL SUMMARY (OFFLINE)',
      `DATE:${formatLocalDateKey(new Date())}`,
      `MEDS:${relevantEmergencyMeds
        .map((m) => {
          const exp = assessment.exposures.find((e) => e.medicationId === m.id);
          const tag =
            m.isDiscontinued && exp?.isInWashoutWindow
              ? ` [WASHOUT:${exp.daysRemainingInWashout}d]`
              : '';
          return `${m.customName.slice(0, 32)} ${m.doseText.slice(0, 16)}${tag}`;
        })
        .join('; ')
        .slice(0, 360)}`,
      `LEVEL:${assessment.level}`,
      `LOG_DAYS_14D:${recentLogs.length}`,
    ].join('\n');

    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(summary, { width: 160, margin: 1 }),
      )
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [open, relevantEmergencyMeds, assessment, recentLogs.length]);

  function formatMedScheduleLabel(m: UserMedication): string {
    if (!m.isDiscontinued) return m.scheduleTime;
    const exp = assessment.exposures.find((e) => e.medicationId === m.id);
    if (exp?.isInWashoutWindow) {
      return hu
        ? `Leállítva / aktív kiürülés (~${exp.daysRemainingInWashout} nap)`
        : `Discontinued / washout active (~${exp.daysRemainingInWashout}d left)`;
    }
    return hu
      ? 'Leállítva (kiürülés letelt)'
      : 'Discontinued (washout complete)';
  }

  function formatPainText(log: DailyLogEntry): string {
    if (!log.painLevel || log.painLevel <= 0) return '';
    const qLabels = (log.painQualities ?? [])
      .map((qid) => PAIN_QUALITIES.find((q) => q.id === qid))
      .filter((q): q is NonNullable<typeof q> => Boolean(q))
      .map((q) => (hu ? q.labelHu : q.labelEn));
    const prefix = hu ? 'Fájdalom' : 'Pain';
    return qLabels.length > 0
      ? `${prefix}: ${log.painLevel}/10 (${qLabels.join(', ')})`
      : `${prefix}: ${log.painLevel}/10`;
  }

  return (
    <>
      <ModalDialog
        open={open}
        onClose={onClose}
        ariaLabelledBy="clinical-report-title"
        className="serosafe-dialog w-[min(100vw-24px,680px)] max-h-[90dvh] rounded-3xl overflow-hidden"
      >
        <div className="max-h-[90dvh] overflow-y-auto calm-scroll p-3.5 @[480px]:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
            <div>
              <h2 id="clinical-report-title" className="text-base font-bold text-ink">
                {hu
                  ? 'Orvosi összefoglaló (helyben készített, csak olvasható)'
                  : 'Offline Clinical Summary (Read-only)'}
              </h2>
              <p className="text-xs text-ink-muted">
                {hu
                  ? 'Teljesen helyben elkészítve a vizitre — semmilyen adat nem kerül felhőbe'
                  : 'Generated 100% locally for your appointment — zero cloud upload'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={hu ? 'Bezárás' : 'Close'}
              className="p-2 rounded-xl bg-surface-subtle text-ink-muted hover:text-ink"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-col @[520px]:flex-row gap-4 items-start justify-between p-3 @[480px]:p-4 rounded-xl @[480px]:rounded-2xl bg-surface-subtle border border-border">
            <div className="space-y-1.5 text-xs">
              <div className="font-bold text-sm text-ink">
                {hu
                  ? 'Szerotonerg státusz és gyógyszerlista'
                  : 'Serotonergic status & medication list'}
              </div>
              <p className="text-ink-muted">
                {hu
                  ? `Aktív vagy kiürülési időszakban lévő szerotonerg hatóanyagok száma: ${assessment.activeSerotonergicCount}`
                  : `Active/washout serotonergic substances: ${assessment.activeSerotonergicCount}`}
              </p>
              <ul className="list-disc pl-4 space-y-1 text-ink">
                {medications.map((m) => (
                  <li key={m.id}>
                    <strong>{m.customName}</strong> — {m.doseText} (
                    {formatMedScheduleLabel(m)})
                  </li>
                ))}
              </ul>
            </div>

            {qrDataUrl && (
              <div className="shrink-0 p-2 rounded-xl bg-surface border border-border text-center space-y-1">
                <img
                  src={qrDataUrl}
                  alt={hu ? 'Helyi összefoglaló QR-kód' : 'Offline summary QR code'}
                  className="w-32 h-32 mx-auto"
                />
                <div className="text-xs text-ink-muted">
                  {hu ? 'Helyi QR-adat' : 'Offline QR'}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-ink">
              {hu
                ? 'Utolsó 14 naplózott nap áttekintése'
                : 'Last 14 logged days overview'}
            </h3>
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-xs text-left tabular-nums">
                <thead className="bg-surface-subtle text-ink-muted border-b border-border">
                  <tr>
                    <th className="py-2 px-3">{hu ? 'Dátum' : 'Date'}</th>
                    <th className="py-2 px-3">{hu ? 'Energia' : 'Energy'}</th>
                    <th className="py-2 px-3">{hu ? 'Alvás' : 'Sleep'}</th>
                    <th className="py-2 px-3">{hu ? 'Adag %' : 'Meds %'}</th>
                    <th className="py-2 px-3">{hu ? 'Jegyzet' : 'Note'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentLogs.map((l) => {
                    const painTxt = formatPainText(l);
                    const noteTxt = [painTxt, l.note || l.decisionNote]
                      .filter(Boolean)
                      .join(' • ');
                    return (
                      <tr key={l.date}>
                        <td className="py-2 px-3 font-semibold">{l.date}</td>
                        <td className="py-2 px-3">
                          {l.energyLevel !== null ? `${l.energyLevel}%` : '—'}
                        </td>
                        <td className="py-2 px-3">
                          {l.sleepHours !== null
                            ? hu
                              ? `${l.sleepHours} óra`
                              : `${l.sleepHours}h`
                            : '—'}
                        </td>
                        <td className="py-2 px-3">
                          {l.medsTakenPct !== null ? `${l.medsTakenPct}%` : '—'}
                        </td>
                        <td className="py-2 px-3 text-ink-muted">
                          {noteTxt || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {keptPatterns.length > 0 && (
            <div className="space-y-1.5 text-xs">
              <h3 className="text-sm font-bold text-ink">
                {hu ? 'Együttjárási megfigyelések' : 'Observed co-occurrences'}
              </h3>
              <ul className="list-disc pl-4 space-y-1 text-ink-muted">
                {keptPatterns.map((p) => (
                  <li key={p.id}>{hu ? p.titleHu : p.titleEn}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-strong text-ink-on-accent text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              {hu ? 'Nyomtatás / Mentés PDF-be' : 'Print / Save PDF'}
            </button>
          </div>
        </div>
      </ModalDialog>

      {/* Print-only mirror block rendered cleanly on paper/PDF */}
      <div id="printable-clinical-report" aria-hidden="true">
        <h1 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
          SeroSafe —{' '}
          {hu
            ? 'Beteg által vezetett gyógyszer- és tünetösszefoglaló'
            : 'Patient Medication & Symptom Summary'}
        </h1>
        <p style={{ marginBottom: '12px' }}>
          {hu
            ? `Generálva internet nélkül (${formatLocalDateKey(new Date())}) • Nem orvosi diagnózis • A beteg saját eszköze alapján.`
            : `Generated 100% offline (${formatLocalDateKey(new Date())}) • Not a medical diagnosis.`}
        </p>

        {qrDataUrl && (
          <img
            src={qrDataUrl}
            alt="Offline QR"
            style={{ width: '112px', height: '112px', marginBottom: '10px' }}
          />
        )}

        <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
          {hu
            ? 'Gyógyszerek és kiürülési időszakok'
            : 'Medications & washout windows'}
        </h2>
        <ul style={{ marginBottom: '12px', paddingLeft: '18px' }}>
          {medications.map((m) => (
            <li key={m.id}>
              {m.customName} ({m.doseText}) — {formatMedScheduleLabel(m)}
            </li>
          ))}
        </ul>

        {activeReasons.length > 0 && (
          <>
            <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
              {hu ? 'Strukturált figyelmeztetések' : 'Structured clinical notices'}
            </h2>
            <ul style={{ marginBottom: '12px', paddingLeft: '18px' }}>
              {activeReasons.map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          </>
        )}

        <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
          {hu ? 'Utolsó 14 naplózott nap' : 'Last 14 logged days'}
        </h2>
        <ul style={{ marginBottom: '12px', paddingLeft: '18px' }}>
          {recentLogs.map((l) => {
            const painTxt = formatPainText(l);
            return (
              <li key={l.date}>
                {l.date}: {hu ? 'Energia' : 'Energy'} {l.energyLevel ?? '—'}%,{' '}
                {hu ? 'Alvás' : 'Sleep'}{' '}
                {l.sleepHours !== null
                  ? hu
                    ? `${l.sleepHours} óra`
                    : `${l.sleepHours}h`
                  : '—'}
                , {hu ? 'Adag' : 'Meds'} {l.medsTakenPct ?? '—'}%{' '}
                {painTxt ? `— ${painTxt}` : ''}
                {l.decisionNote ? ` — ${l.decisionNote}` : ''}
                {l.note ? ` — ${l.note}` : ''}
              </li>
            );
          })}
        </ul>

        {keptPatterns.length > 0 && (
          <>
            <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
              {hu ? 'Együttjárási megfigyelések' : 'Observed co-occurrences'}
            </h2>
            <ul style={{ paddingLeft: '18px' }}>
              {keptPatterns.map((p) => (
                <li key={p.id}>{hu ? p.titleHu : p.titleEn}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
