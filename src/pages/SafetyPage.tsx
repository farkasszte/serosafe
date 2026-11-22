import React, { useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Info,
  Printer,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { BodyMap } from '@/components/visuals/BodyMap';
import { CURATED_SUBSTANCES } from '@/data/substances';
import { evaluateRiskAndSymptoms } from '@/engine/safetyEngine';
import {
  applyBodyPartsUpdate,
  applyPainLevelChange,
  applyPainQualityToggle,
  applySensationToggle,
  applySymptomFieldUpdate,
} from '@/engine/symptomSync';
import { validateImportedState } from '@/services/db';
import { formatAssessmentLevel, formatDrugClass, STRINGS } from '@/services/i18n';
import { generateLockScreenPng } from '@/services/lockscreenGenerator';
import type {
  BodyRegionId,
  CommunicationProfile,
  DailyLogEntry,
  ObservableSymptomEntry,
  PainQualityId,
  SeroSafeState,
  StructuredAssessment,
  UserMedication,
} from '@/types/serosafe';

interface SafetyPageProps {
  lang: 'hu' | 'en';
  state: SeroSafeState;
  todayLog: DailyLogEntry;
  medications: UserMedication[];
  profile: CommunicationProfile;
  baseAssessment: StructuredAssessment;
  simplifiedMode?: boolean;
  onUpdateTodayLog: (
    updater: (prev: DailyLogEntry) => DailyLogEntry,
    options?: { recomputePatterns?: boolean },
  ) => void;
  onOpenCrisisCard: () => void;
  onOpenClinicalReport: () => void;
  onImportStateJson: (imported: SeroSafeState) => void;
  onResetAllData: () => void;
}

interface StatusFeedback {
  text: string;
  isError?: boolean;
}

function escapeCsvCell(raw: string): string {
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function SafetyPage({
  lang,
  state,
  todayLog,
  medications,
  profile,
  baseAssessment,
  simplifiedMode = false,
  onUpdateTodayLog,
  onOpenCrisisCard,
  onOpenClinicalReport,
  onImportStateJson,
  onResetAllData,
}: SafetyPageProps) {
  const t = STRINGS[lang].safety;
  const hu = lang === 'hu';

  const [candidateSubstanceId, setCandidateSubstanceId] = useState<string>('');
  const [checkerQuery, setCheckerQuery] = useState<string>('');
  const [lockPngUrl, setLockPngUrl] = useState<string | null>(null);
  const [generatingLock, setGeneratingLock] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [lockStatusMessage, setLockStatusMessage] = useState<StatusFeedback | null>(null);
  const [backupStatusMessage, setBackupStatusMessage] = useState<StatusFeedback | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const symptom = todayLog.symptomEntry;

  const assessment = useMemo(
    () =>
      candidateSubstanceId
        ? evaluateRiskAndSymptoms(
            medications,
            CURATED_SUBSTANCES,
            symptom,
            candidateSubstanceId,
          )
        : baseAssessment,
    [candidateSubstanceId, medications, symptom, baseAssessment],
  );

  const filteredSubstances = useMemo(() => {
    const q = checkerQuery.trim().toLowerCase();
    if (!q) return CURATED_SUBSTANCES;
    return CURATED_SUBSTANCES.filter(
      (s) =>
        s.nameHu.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.drugClass.toLowerCase().includes(q) ||
        s.examplesHu.some((ex) => ex.toLowerCase().includes(q)),
    );
  }, [checkerQuery]);

  const otcMatches = useMemo(
    () => filteredSubstances.filter((s) => s.isOTCOrSupplement),
    [filteredSubstances],
  );
  const maoiMatches = useMemo(
    () => filteredSubstances.filter((s) => !s.isOTCOrSupplement && s.drugClass === 'MAOI'),
    [filteredSubstances],
  );
  const otherMatches = useMemo(
    () => filteredSubstances.filter((s) => !s.isOTCOrSupplement && s.drugClass !== 'MAOI'),
    [filteredSubstances],
  );

  const selectedCandidate = useMemo(
    () => CURATED_SUBSTANCES.find((s) => s.id === candidateSubstanceId) ?? null,
    [candidateSubstanceId],
  );

  function updateSymptomField<K extends keyof ObservableSymptomEntry>(
    field: K,
    value: ObservableSymptomEntry[K],
  ) {
    onUpdateTodayLog((prev) => applySymptomFieldUpdate(prev, field, value), {
      recomputePatterns: false,
    });
  }

  function toggleSafetySensation(sensationId: string, _region: BodyRegionId) {
    onUpdateTodayLog((prev) => applySensationToggle(prev, sensationId), {
      recomputePatterns: false,
    });
  }

  function handleChangeSafetyBodyParts(
    partIds: string[],
    derivedRegions: BodyRegionId[],
  ) {
    onUpdateTodayLog((prev) => applyBodyPartsUpdate(prev, partIds, derivedRegions), {
      recomputePatterns: false,
    });
  }

  function handleChangeSafetyPainLevel(level: number) {
    onUpdateTodayLog((prev) => applyPainLevelChange(prev, level), {
      recomputePatterns: false,
    });
  }

  function handleToggleSafetyPainQuality(quality: PainQualityId) {
    onUpdateTodayLog((prev) => applyPainQualityToggle(prev, quality), {
      recomputePatterns: false,
    });
  }

  async function handleGenerateLockScreen() {
    setGeneratingLock(true);
    setLockStatusMessage(null);
    try {
      // Uses `baseAssessment` so temporary "what if I took X?" simulation never leaks into emergency lock-screen PNG
      const url = await generateLockScreenPng({
        lang,
        profile,
        meds: medications,
        assessment: baseAssessment,
        symptom,
      });
      setLockPngUrl(url);
      setLockStatusMessage({
        text: hu
          ? 'Zárolási képernyő háttérkép és QR-kód elkészült.'
          : 'Lock-screen PNG and offline QR code generated.',
      });
    } catch {
      setLockStatusMessage({
        isError: true,
        text: hu
          ? 'Nem sikerült elkészíteni a zárolási képet.'
          : 'Could not generate lock-screen PNG.',
      });
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
    setBackupStatusMessage({
      text: hu ? 'JSON biztonsági mentés letöltve.' : 'JSON backup downloaded.',
    });
  }

  function handleExportCsv() {
    const header =
      'Date,IsGap,EnergyPct,SensoryBatteryPct,SleepHours,PainLevel,MedsPct,DecisionNote,Note\n';
    const rows = state.dailyLogs
      .map(
        (d) =>
          `${d.date},${Boolean(d.isGap)},${d.energyLevel ?? ''},${d.sensoryBattery ?? ''},${d.sleepHours ?? ''},${d.painLevel ?? ''},${d.medsTakenPct ?? ''},${escapeCsvCell(d.decisionNote || '')},${escapeCsvCell(d.note || '')}`,
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serosafe-logs-${todayLog.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupStatusMessage({
      text: hu ? 'CSV táblázat letöltve.' : 'CSV table downloaded.',
    });
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));
        const validated = validateImportedState(parsed);
        if (!validated) {
          throw new Error('Invalid SeroSafe backup format');
        }
        onImportStateJson(validated);
        setBackupStatusMessage({
          text: hu
            ? 'Helyi mentés sikeresen visszatöltve.'
            : 'Backup restored locally.',
        });
      } catch {
        setBackupStatusMessage({
          isError: true,
          text: hu
            ? 'Érvénytelen SeroSafe JSON fájl.'
            : 'Invalid SeroSafe JSON backup file.',
        });
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

        {lockStatusMessage && (
          <p
            role={lockStatusMessage.isError ? 'alert' : 'status'}
            className={`text-xs font-semibold ${
              lockStatusMessage.isError ? 'text-emergency' : 'text-accent-strong'
            }`}
          >
            {lockStatusMessage.text}
          </p>
        )}

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

      {/* Curated 30-Substance Interaction Filter + Inline Immediate Result Card */}
      <section className="bg-surface border-y border-border px-4 py-4 @lg:border @lg:rounded-3xl @lg:p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-ink">{t.checkerTitle}</h2>
          {(checkerQuery || candidateSubstanceId) && (
            <button
              type="button"
              onClick={() => {
                setCheckerQuery('');
                setCandidateSubstanceId('');
              }}
              className="px-2.5 py-1 rounded-full bg-surface-subtle border border-border text-xs font-semibold text-ink-muted hover:text-ink inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              {hu ? 'Szűrő törlése' : 'Clear check'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 @lg:grid-cols-2 gap-2.5">
          <div className="relative">
            <Search
              className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label={
                hu
                  ? 'Keresés hatóanyagra vagy márkanévre (pl. Robitussin, orbáncfű)'
                  : 'Search ingredient or brand (e.g. DXM, St. John’s Wort)'
              }
              value={checkerQuery}
              onChange={(e) => setCheckerQuery(e.target.value)}
              placeholder={
                hu
                  ? 'Keresés névre vagy márkanévre (pl. DXM, Robitussin)...'
                  : 'Search ingredient or brand (e.g. DXM, Zoloft)...'
              }
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-subtle border border-border text-xs font-medium text-ink"
            />
          </div>

          <select
            aria-label={t.checkerLabel}
            value={candidateSubstanceId}
            onChange={(e) => setCandidateSubstanceId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-subtle border border-border text-xs font-medium text-ink"
          >
            <option value="">{t.checkerNone}</option>
            {otcMatches.length > 0 && (
              <optgroup label={hu ? 'Vény nélküli / étrend-kiegészítők' : 'OTC & Supplements'}>
                {otcMatches.map((s) => (
                  <option key={s.id} value={s.id}>
                    {hu ? s.nameHu : s.nameEn} ({s.examplesHu.join(', ')}) —{' '}
                    {hu
                      ? `[${s.clinicalWashoutDays} nap kiürülés]`
                      : `[${s.clinicalWashoutDays}d washout]`}
                  </option>
                ))}
              </optgroup>
            )}
            {maoiMatches.length > 0 && (
              <optgroup label={hu ? 'MAO-gátlók és kórházi szerek' : 'MAOIs & Hospital agents'}>
                {maoiMatches.map((s) => (
                  <option key={s.id} value={s.id}>
                    {hu ? s.nameHu : s.nameEn} ({s.examplesHu.join(', ')}) —{' '}
                    {hu
                      ? `[${s.clinicalWashoutDays} nap kiürülés]`
                      : `[${s.clinicalWashoutDays}d washout]`}
                  </option>
                ))}
              </optgroup>
            )}
            {otherMatches.length > 0 && (
              <optgroup label={hu ? 'Antidepresszánsok, fájdalomcsillapítók és triptánok' : 'Antidepressants, Analgesics & Triptans'}>
                {otherMatches.map((s) => (
                  <option key={s.id} value={s.id}>
                    {hu ? s.nameHu : s.nameEn} ({s.examplesHu.join(', ')}) —{' '}
                    {formatDrugClass(s.drugClass, lang)}{' '}
                    {hu
                      ? `[${s.clinicalWashoutDays} nap kiürülés]`
                      : `[${s.clinicalWashoutDays}d washout]`}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Quick tap chips when user filters to a focused subset */}
        {checkerQuery.trim().length > 0 && (
          filteredSubstances.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {filteredSubstances.slice(0, 6).map((s) => {
                const selected = candidateSubstanceId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setCandidateSubstanceId(selected ? '' : s.id)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition ${
                      selected
                        ? 'bg-accent text-ink-on-accent border-accent'
                        : 'bg-surface-subtle border-border text-ink hover:border-border-strong'
                    }`}
                  >
                    {hu ? s.nameHu : s.nameEn} ({s.examplesHu[0]})
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-ink-muted">
              {hu
                ? 'Nincs találat a 30 tételes listában — töröld a keresést a teljes lista megjelenítéséhez.'
                : 'No match in the 30-substance list — clear search to browse all.'}
            </p>
          )
        )}

        {/* Inline Assessment Result Card right below the checker (always visible without scrolling up) */}
        {selectedCandidate && (
          <div
            role={isEmergency ? 'alert' : 'status'}
            className={`p-3.5 rounded-2xl border space-y-2 ${
              isEmergency
                ? 'bg-emergency-soft border-emergency-border'
                : isConsult
                  ? 'bg-warning-soft border-warning-border'
                  : 'bg-surface-blue border-secondary-border'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-ink">
                {hu ? selectedCandidate.nameHu : selectedCandidate.nameEn} (
                {selectedCandidate.examplesHu.join(', ')}) ·{' '}
                <span className="font-semibold text-ink-muted">
                  {hu
                    ? `${selectedCandidate.clinicalWashoutDays} napos kiürülési ablak`
                    : `${selectedCandidate.clinicalWashoutDays}-day washout window`}
                </span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
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

            <p className="text-xs text-ink">
              {hu ? selectedCandidate.notesHu : selectedCandidate.notesEn}
            </p>

            <ul className="space-y-1 text-xs font-medium text-ink list-disc pl-4">
              {(hu ? assessment.summaryReasonsHu : assessment.summaryReasonsEn).map(
                (reason, idx) => (
                  <li key={idx}>{reason}</li>
                ),
              )}
            </ul>
          </div>
        )}
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
              onChange={(e) => {
                const rawVal = e.target.value;
                if (rawVal === '') {
                  updateSymptomField('measuredTempCelsius', undefined);
                  return;
                }
                const parsed = Number(rawVal);
                if (Number.isFinite(parsed)) {
                  updateSymptomField('measuredTempCelsius', parsed);
                }
              }}
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
              onChange={(e) => {
                const rawVal = e.target.value;
                if (rawVal === '') {
                  updateSymptomField('measuredHeartRateBpm', undefined);
                  return;
                }
                const parsed = Number(rawVal);
                if (Number.isFinite(parsed)) {
                  updateSymptomField('measuredHeartRateBpm', parsed);
                }
              }}
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
              onChange={(e) => {
                const parsed = e.target.value === '' ? 0 : Number(e.target.value);
                if (Number.isFinite(parsed)) {
                  updateSymptomField('onsetHoursAgo', Math.max(0, parsed));
                }
              }}
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
          simplifiedMode={simplifiedMode}
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

            {!confirmReset && (
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

          {confirmReset && (
            <div
              role="alert"
              className="p-3 rounded-2xl bg-emergency-soft border border-emergency-border flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <span className="font-semibold text-ink">
                {hu
                  ? 'Biztosan törlöd az összes helyi naplót, gyógyszert és beállítást? Ez nem vonható vissza.'
                  : 'Erase all local logs, medications, and settings? This cannot be undone.'}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="py-1.5 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-ink-muted hover:text-ink"
                >
                  {hu ? 'Mégse' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetAllData();
                    setConfirmReset(false);
                  }}
                  className="py-1.5 px-3 rounded-xl bg-emergency text-emergency-ink text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  {hu ? 'Végleges törlés' : 'Confirm erase'}
                </button>
              </div>
            </div>
          )}

          {backupStatusMessage && (
            <p
              role={backupStatusMessage.isError ? 'alert' : 'status'}
              className={`text-xs font-semibold ${
                backupStatusMessage.isError ? 'text-emergency' : 'text-accent-strong'
              }`}
            >
              {backupStatusMessage.text}
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
