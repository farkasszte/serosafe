import React, { useRef, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Info,
  Printer,
  ShieldAlert,
  Trash2,
  Upload,
} from 'lucide-react';
import { BodyMap } from '@/components/visuals/BodyMap';
import { getSelectedBodyRegions } from '@/data/choirBodyRegions';
import { BODY_SENSATIONS, CURATED_SUBSTANCES } from '@/data/substances';
import { evaluateRiskAndSymptoms } from '@/engine/safetyEngine';
import { formatAssessmentLevel, formatDrugClass, STRINGS } from '@/services/i18n';
import { generateLockScreenPng } from '@/services/lockscreenGenerator';
import type {
  BodyRegionId,
  CommunicationProfile,
  DailyLogEntry,
  ObservableSymptomEntry,
  PainQualityId,
  SeroSafeState,
  UserMedication,
} from '@/types/serosafe';

interface SafetyPageProps {
  lang: 'hu' | 'en';
  state: SeroSafeState;
  todayLog: DailyLogEntry;
  medications: UserMedication[];
  profile: CommunicationProfile;
  onUpdateTodayLog: (updater: (prev: DailyLogEntry) => DailyLogEntry) => void;
  onOpenCrisisCard: () => void;
  onOpenClinicalReport: () => void;
  onImportStateJson: (imported: SeroSafeState) => void;
  onResetAllData: () => void;
}

export function SafetyPage({
  lang,
  state,
  todayLog,
  medications,
  profile,
  onUpdateTodayLog,
  onOpenCrisisCard,
  onOpenClinicalReport,
  onImportStateJson,
  onResetAllData,
}: SafetyPageProps) {
  const t = STRINGS[lang].safety;
  const hu = lang === 'hu';

  const [candidateSubstanceId, setCandidateSubstanceId] = useState<string>('');
  const [lockPngUrl, setLockPngUrl] = useState<string | null>(null);
  const [generatingLock, setGeneratingLock] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const symptom = todayLog.symptomEntry;

  const assessment = evaluateRiskAndSymptoms(
    medications,
    CURATED_SUBSTANCES,
    symptom,
    candidateSubstanceId || undefined,
  );

  function ensureSymptom(prev: DailyLogEntry): ObservableSymptomEntry {
    return (
      prev.symptomEntry ?? {
        id: `sym_${prev.date}`,
        timestampIso: new Date().toISOString(),
        onsetHoursAgo: 1,
        hasInvoluntaryTwitching: false,
        hasTremor: false,
        hasMuscleStiffness: false,
        hasHeavySweating: false,
        hasSevereRestlessnessOrConfusion: false,
        hasGIDistress: false,
        selectedBodyRegions: prev.bodyRegions,
        selectedSensations: prev.bodySensations,
      }
    );
  }

  function updateSymptomField<K extends keyof ObservableSymptomEntry>(
    field: K,
    value: ObservableSymptomEntry[K],
  ) {
    onUpdateTodayLog((prev) => {
      const sym = ensureSymptom(prev);
      return {
        ...prev,
        isGap: false,
        symptomEntry: {
          ...sym,
          timestampIso: new Date().toISOString(),
          [field]: value,
        },
      };
    });
  }

  function toggleSafetySensation(sensationId: string, _region: BodyRegionId) {
    onUpdateTodayLog((prev) => {
      const exists = prev.bodySensations.includes(sensationId);
      const bodySensations = exists
        ? prev.bodySensations.filter((id) => id !== sensationId)
        : [...prev.bodySensations, sensationId];
      const bodyRegions = getSelectedBodyRegions(
        prev.selectedBodyPartIds ?? [],
        prev.bodyRegions.includes('skin'),
      );

      const sym = ensureSymptom(prev);
      const updatedSym: ObservableSymptomEntry = {
        ...sym,
        timestampIso: new Date().toISOString(),
        selectedBodyRegions: bodyRegions,
        selectedSensations: bodySensations,
        hasInvoluntaryTwitching: bodySensations.some(
          (sid) =>
            BODY_SENSATIONS.find((s) => s.id === sid)?.mapsToField ===
            'hasInvoluntaryTwitching',
        ),
        hasTremor: bodySensations.some(
          (sid) =>
            BODY_SENSATIONS.find((s) => s.id === sid)?.mapsToField ===
            'hasTremor',
        ),
        hasMuscleStiffness: bodySensations.some(
          (sid) =>
            BODY_SENSATIONS.find((s) => s.id === sid)?.mapsToField ===
            'hasMuscleStiffness',
        ),
        hasHeavySweating: bodySensations.some(
          (sid) =>
            BODY_SENSATIONS.find((s) => s.id === sid)?.mapsToField ===
            'hasHeavySweating',
        ),
        hasSevereRestlessnessOrConfusion: bodySensations.some(
          (sid) =>
            BODY_SENSATIONS.find((s) => s.id === sid)?.mapsToField ===
            'hasSevereRestlessnessOrConfusion',
        ),
        hasGIDistress: bodySensations.some(
          (sid) =>
            BODY_SENSATIONS.find((s) => s.id === sid)?.mapsToField ===
            'hasGIDistress',
        ),
      };

      return {
        ...prev,
        isGap: false,
        bodyRegions,
        bodySensations,
        symptomEntry: updatedSym,
      };
    });
  }

  function handleChangeSafetyBodyParts(
    partIds: string[],
    derivedRegions: BodyRegionId[],
  ) {
    onUpdateTodayLog((prev) => {
      const prunedSensations = prev.bodySensations.filter((sid) => {
        const def = BODY_SENSATIONS.find((s) => s.id === sid);
        return def ? derivedRegions.includes(def.region) : false;
      });
      const sym = ensureSymptom(prev);
      return {
        ...prev,
        isGap: false,
        selectedBodyPartIds: partIds,
        bodyRegions: derivedRegions,
        bodySensations: prunedSensations,
        painLevel: derivedRegions.length === 0 ? 0 : prev.painLevel,
        painQualities: derivedRegions.length === 0 ? [] : prev.painQualities,
        symptomEntry: {
          ...sym,
          timestampIso: new Date().toISOString(),
          selectedBodyRegions: derivedRegions,
          selectedSensations: prunedSensations,
          hasInvoluntaryTwitching: prunedSensations.some(
            (sid) =>
              BODY_SENSATIONS.find((s) => s.id === sid)?.mapsToField ===
              'hasInvoluntaryTwitching',
          ),
          hasTremor: prunedSensations.some(
            (sid) =>
              BODY_SENSATIONS.find((s) => s.id === sid)?.mapsToField ===
              'hasTremor',
          ),
          hasMuscleStiffness: prunedSensations.some(
            (sid) =>
              BODY_SENSATIONS.find((s) => s.id === sid)?.mapsToField ===
              'hasMuscleStiffness',
          ),
          hasHeavySweating: prunedSensations.some(
            (sid) =>
              BODY_SENSATIONS.find((s) => s.id === sid)?.mapsToField ===
              'hasHeavySweating',
          ),
          hasSevereRestlessnessOrConfusion: prunedSensations.some(
            (sid) =>
              BODY_SENSATIONS.find((s) => s.id === sid)?.mapsToField ===
              'hasSevereRestlessnessOrConfusion',
          ),
          hasGIDistress: prunedSensations.some(
            (sid) =>
              BODY_SENSATIONS.find((s) => s.id === sid)?.mapsToField ===
              'hasGIDistress',
          ),
        },
      };
    });
  }

  function handleChangeSafetyPainLevel(level: number) {
    onUpdateTodayLog((prev) => ({
      ...prev,
      isGap: false,
      painLevel: level,
      painQualities: level === 0 ? [] : prev.painQualities,
    }));
  }

  function handleToggleSafetyPainQuality(quality: PainQualityId) {
    onUpdateTodayLog((prev) => {
      const current = prev.painQualities ?? [];
      const exists = current.includes(quality);
      return {
        ...prev,
        isGap: false,
        painQualities: exists
          ? current.filter((q) => q !== quality)
          : [...current, quality],
      };
    });
  }

  async function handleGenerateLockScreen() {
    setGeneratingLock(true);
    try {
      const url = await generateLockScreenPng({
        lang,
        profile,
        meds: medications,
        assessment,
        symptom,
      });
      setLockPngUrl(url);
      setStatusMessage(
        hu
          ? 'Zárolási képernyő háttérkép és QR-kód elkészült.'
          : 'Lock-screen PNG and offline QR code generated.',
      );
    } finally {
      setGeneratingLock(false);
    }
  }

  function handleExportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serosafe-backup-${todayLog.date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportCsv() {
    const header =
      'Date,IsGap,EnergyPct,SensoryBatteryPct,SleepHours,MedsPct,Note\n';
    const rows = state.dailyLogs
      .map(
        (d) =>
          `${d.date},${Boolean(d.isGap)},${d.energyLevel ?? ''},${d.sensoryBattery ?? ''},${d.sleepHours ?? ''},${d.medsTakenPct ?? ''},"${(d.note || '').replace(/"/g, '""')}"`,
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serosafe-logs-${todayLog.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as SeroSafeState;
        if (!parsed.dailyLogs || !parsed.medications) {
          throw new Error('Invalid format');
        }
        onImportStateJson(parsed);
        setStatusMessage(
          hu ? 'Helyi mentés sikeresen visszatöltve.' : 'Backup restored locally.',
        );
      } catch {
        setStatusMessage(
          hu
            ? 'Érvénytelen SeroSafe JSON fájl.'
            : 'Invalid SeroSafe JSON backup file.',
        );
      }
    };
    reader.readAsText(file);
  }

  const isEmergency = assessment.level === 'CALL_EMERGENCY_112';
  const isConsult = assessment.level === 'CONSULT';

  return (
    <div className="space-y-3 @lg:space-y-6">
      {/* Live Anti-Reassurance Assessment Banner */}
      <section
        className={`border-y px-4 py-4 @lg:border @lg:rounded-3xl @lg:p-6 space-y-4 ${
          isEmergency
            ? 'bg-emergency-soft border-emergency-border'
            : isConsult
              ? 'bg-warning-soft border-warning-border'
              : 'bg-surface-blue border-secondary-border'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={`p-2 rounded-xl shrink-0 ${
                isEmergency
                  ? 'bg-emergency text-emergency-ink'
                  : isConsult
                    ? 'bg-warning text-warning-ink'
                    : 'bg-surface text-secondary'
              }`}
            >
              {isEmergency ? (
                <AlertOctagon className="w-5 h-5" aria-hidden="true" />
              ) : isConsult ? (
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Info className="w-5 h-5" aria-hidden="true" />
              )}
            </span>
            <div>
              <h1 className="text-lg font-bold text-ink">{t.title}</h1>
              <p className="text-xs text-ink-muted">{t.subtitle}</p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold ${
              isEmergency
                ? 'bg-emergency text-emergency-ink'
                : isConsult
                  ? 'bg-surface text-warning-ink border border-warning-border'
                  : 'bg-surface text-secondary border border-secondary-border'
            }`}
          >
            {formatAssessmentLevel(assessment.level, lang)}
          </span>
        </div>

        <ul className="space-y-1.5 text-xs font-medium text-ink list-disc pl-5">
          {(hu ? assessment.summaryReasonsHu : assessment.summaryReasonsEn).map(
            (reason, i) => (
              <li key={i}>{reason}</li>
            ),
          )}
        </ul>

        {assessment.sources.length > 0 && (
          <p className="text-xs text-ink-muted leading-snug">
            <strong className="text-ink font-semibold">
              {hu ? 'Klinikai források: ' : 'Clinical references: '}
            </strong>
            {assessment.sources.join(' · ')}
          </p>
        )}

        <div className="grid grid-cols-1 @lg:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onOpenCrisisCard}
            className="py-3 px-4 rounded-2xl bg-crisis-bg text-crisis-amber font-extrabold text-xs inline-flex items-center justify-center gap-2 hover:opacity-90 transition"
          >
            <ShieldAlert className="w-4 h-4" aria-hidden="true" />
            {t.openCrisis}
          </button>

          <button
            type="button"
            onClick={() => void handleGenerateLockScreen()}
            disabled={generatingLock}
            className="py-3 px-4 rounded-2xl bg-surface border border-border text-ink font-bold text-xs inline-flex items-center justify-center gap-2 hover:border-border-strong transition"
          >
            <ImageIcon className="w-4 h-4 text-accent" aria-hidden="true" />
            {generatingLock
              ? hu
                ? 'Generálás...'
                : 'Generating...'
              : t.generateLock}
          </button>
        </div>

        {lockPngUrl && (
          <div className="flex flex-col @lg:flex-row items-center gap-4 p-3.5 rounded-2xl bg-surface border border-border">
            <img
              src={lockPngUrl}
              alt={
                hu
                  ? 'Generált zárolási képernyő kártya'
                  : 'Generated lock-screen wallpaper preview'
              }
              className="w-32 h-auto rounded-xl border border-border"
            />
            <div className="space-y-2 text-xs">
              <p className="font-bold text-ink">
                {hu
                  ? 'Zárolási képernyő kép és QR-kód elkészült'
                  : '1080×1920 Lock-Screen Wallpaper + Offline QR Ready'}
              </p>
              <a
                href={lockPngUrl}
                download={`SeroSafe-LockScreen-${todayLog.date}.png`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-ink-on-accent font-bold"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                {hu ? 'PNG letöltése' : 'Download PNG'}
              </a>
            </div>
          </div>
        )}
      </section>

      {/* Curated 30-Substance Interaction Filter */}
      <section className="bg-surface border-y border-border px-4 py-4 @lg:border @lg:rounded-3xl @lg:p-6 space-y-3">
        <h2 className="text-base font-bold text-ink">{t.checkerTitle}</h2>
        <select
          aria-label={t.checkerLabel}
          value={candidateSubstanceId}
          onChange={(e) => setCandidateSubstanceId(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-surface-subtle border border-border text-xs font-medium text-ink"
        >
          <option value="">{t.checkerNone}</option>
          {CURATED_SUBSTANCES.map((s) => (
            <option key={s.id} value={s.id}>
              {hu ? s.nameHu : s.nameEn} ({s.examplesHu.join(', ')}) —{' '}
              {s.isOTCOrSupplement
                ? hu
                  ? 'Vény nélküli'
                  : 'OTC'
                : formatDrugClass(s.drugClass, lang)}{' '}
              {hu
                ? `[${s.clinicalWashoutDays} nap kiürülés]`
                : `[${s.clinicalWashoutDays}d washout]`}
            </option>
          ))}
        </select>
      </section>

      {/* Vitals & Synced Safety BodyMap */}
      <section className="bg-surface border-y border-border px-4 py-4 @lg:border @lg:rounded-3xl @lg:p-6 space-y-4">
        <h2 className="text-base font-bold text-ink">{t.symptomsTitle}</h2>

        <div className="grid grid-cols-1 @lg:grid-cols-3 gap-3 tabular-nums">
          <div>
            <label
              htmlFor="vital-temp"
              className="block text-xs font-semibold text-ink-muted mb-1"
            >
              {t.tempLabel}
            </label>
            <input
              id="vital-temp"
              type="number"
              step="0.1"
              min={34}
              max={43}
              value={symptom?.measuredTempCelsius ?? ''}
              placeholder="36.8"
              onChange={(e) =>
                updateSymptomField(
                  'measuredTempCelsius',
                  e.target.value === '' ? undefined : Number(e.target.value),
                )
              }
              className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border text-sm font-bold text-ink"
            />
          </div>

          <div>
            <label
              htmlFor="vital-hr"
              className="block text-xs font-semibold text-ink-muted mb-1"
            >
              {t.hrLabel}
            </label>
            <input
              id="vital-hr"
              type="number"
              min={35}
              max={220}
              value={symptom?.measuredHeartRateBpm ?? ''}
              placeholder="76"
              onChange={(e) =>
                updateSymptomField(
                  'measuredHeartRateBpm',
                  e.target.value === '' ? undefined : Number(e.target.value),
                )
              }
              className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border text-sm font-bold text-ink"
            />
          </div>

          <div>
            <label
              htmlFor="vital-onset"
              className="block text-xs font-semibold text-ink-muted mb-1"
            >
              {t.onsetLabel}
            </label>
            <input
              id="vital-onset"
              type="number"
              min={0}
              max={240}
              value={symptom?.onsetHoursAgo ?? 1}
              onChange={(e) =>
                updateSymptomField('onsetHoursAgo', Number(e.target.value))
              }
              className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border text-sm font-bold text-ink"
            />
          </div>
        </div>

        <BodyMap
          lang={lang}
          selectedRegions={todayLog.bodyRegions}
          selectedSensations={todayLog.bodySensations}
          selectedBodyPartIds={todayLog.selectedBodyPartIds ?? []}
          painLevel={todayLog.painLevel ?? 0}
          painQualities={todayLog.painQualities ?? []}
          mode="safety"
          onToggleSensation={toggleSafetySensation}
          onChangeSelectedBodyParts={handleChangeSafetyBodyParts}
          onChangePainLevel={handleChangeSafetyPainLevel}
          onTogglePainQuality={handleToggleSafetyPainQuality}
        />
      </section>

      {/* Collapsible Clinical Report & Data Export */}
      <details className="bg-surface border-y border-border px-4 py-4 @lg:border @lg:rounded-3xl @lg:px-6 group">
        <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-bold text-ink">
          <span>
            {hu
              ? 'Orvosi összefoglaló (PDF) és helyi adatmentés'
              : 'Clinical Summary (PDF) & local backup'}
          </span>
          <ChevronDown
            className="w-4 h-4 text-ink-muted transition group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>

        <div className="pt-4 mt-3 border-t border-border space-y-3">
          <div className="grid grid-cols-2 @lg:grid-cols-5 gap-2">
            <button
              type="button"
              onClick={onOpenClinicalReport}
              className="col-span-2 @lg:col-span-1 py-2.5 px-3 rounded-xl bg-accent text-ink-on-accent text-xs font-bold inline-flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              {hu ? 'PDF / Nyomtatás' : 'Print / PDF'}
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="py-2.5 px-3 rounded-xl bg-surface-subtle text-xs font-semibold text-ink inline-flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              {t.exportJson}
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl bg-surface-subtle text-xs font-semibold text-ink inline-flex items-center justify-center gap-1.5"
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              {t.importJson}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="hidden"
            />

            <button
              type="button"
              onClick={handleExportCsv}
              className="py-2.5 px-3 rounded-xl bg-surface-subtle text-xs font-semibold text-ink inline-flex items-center justify-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
              {t.exportCsv}
            </button>

            {confirmReset ? (
              <button
                type="button"
                onClick={() => {
                  onResetAllData();
                  setConfirmReset(false);
                }}
                className="py-2.5 px-3 rounded-xl bg-emergency text-emergency-ink text-xs font-bold inline-flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                {hu ? 'Törlés' : 'Confirm'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="py-2.5 px-3 rounded-xl bg-emergency-soft text-emergency text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                {t.resetAll}
              </button>
            )}
          </div>

          {statusMessage && (
            <p className="text-xs font-semibold text-accent">{statusMessage}</p>
          )}
        </div>
      </details>
    </div>
  );
}
