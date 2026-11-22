import { useEffect, useMemo, useState } from 'react';
import { PhoneCall, ShieldAlert, Volume2, VolumeX, X } from 'lucide-react';
import { ModalDialog } from '@/components/modals/ModalDialog';
import { BODY_SENSATIONS } from '@/data/substances';
import { prioritizeMedicationsForEmergency } from '@/engine/safetyEngine';
import { formatLastTaken, formatMedStatus } from '@/services/i18n';
import {
  buildCrisisSpeechText,
  isTtsSupported,
  speakCrisisText,
  stopCrisisSpeech,
} from '@/services/tts';
import type {
  CommunicationProfile,
  ObservableSymptomEntry,
  StructuredAssessment,
  UserMedication,
} from '@/types/serosafe';

interface CrisisCardDialogProps {
  open: boolean;
  onClose: () => void;
  lang: 'hu' | 'en';
  profile: CommunicationProfile;
  meds: UserMedication[];
  assessment: StructuredAssessment;
  symptom?: ObservableSymptomEntry;
}

export function CrisisCardDialog({
  open,
  onClose,
  lang,
  profile,
  meds,
  assessment,
  symptom,
}: CrisisCardDialogProps) {
  const hu = lang === 'hu';
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!open) {
      stopCrisisSpeech();
      setSpeaking(false);
    }
    return () => {
      stopCrisisSpeech();
    };
  }, [open]);

  function handleClose() {
    stopCrisisSpeech();
    setSpeaking(false);
    onClose();
  }

  function handleSpeakToggle() {
    if (speaking) {
      stopCrisisSpeech();
      setSpeaking(false);
      return;
    }
    const speech = buildCrisisSpeechText({
      lang,
      profile,
      meds,
      assessment,
      symptom,
    });
    const started = speakCrisisText(speech, lang, {
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
    setSpeaking(started);
  }

  const emergencyMeds = useMemo(
    () => prioritizeMedicationsForEmergency(meds, assessment),
    [meds, assessment],
  );

  const contactPhoneTrimmed = profile.emergencyContactPhone.trim();
  const contactDialHref = contactPhoneTrimmed.replace(/[^\d+*#,;]/g, '');

  const loggedSymptomsList = useMemo(() => {
    if (!symptom) return [];
    const items: string[] = [];
    for (const id of symptom.selectedSensations) {
      const found = BODY_SENSATIONS.find((s) => s.id === id);
      if (found) items.push(hu ? found.labelHu : found.labelEn);
    }
    if (
      symptom.hasInvoluntaryTwitching &&
      !symptom.selectedSensations.includes('legs_twitch')
    ) {
      items.push(hu ? 'Akaratlan izomrángás' : 'Involuntary twitching');
    }
    if (
      symptom.hasMuscleStiffness &&
      !symptom.selectedSensations.includes('legs_stiff')
    ) {
      items.push(hu ? 'Szokatlan izommerevség' : 'Muscle stiffness');
    }
    if (symptom.hasTremor && !symptom.selectedSensations.includes('arms_tremor')) {
      items.push(hu ? 'Kéz- vagy végtagremegés' : 'Tremor');
    }
    if (
      symptom.hasRestingTachycardia &&
      !symptom.selectedSensations.includes('chest_racing')
    ) {
      items.push(
        hu
          ? 'Szapora, erős szívdobogás nyugalomban'
          : 'Fast, pounding heartbeat at rest',
      );
    }
    if (
      symptom.hasHeavySweating &&
      !symptom.selectedSensations.includes('skin_sweat')
    ) {
      items.push(hu ? 'Erős nyugalmi izzadás' : 'Heavy sweating at rest');
    }
    if (
      symptom.hasSevereRestlessnessOrConfusion &&
      !symptom.selectedSensations.includes('head_confusion')
    ) {
      items.push(
        hu
          ? 'Kifejezett nyugtalanság vagy zavartság'
          : 'Severe restlessness or confusion',
      );
    }
    if (symptom.hasGIDistress && !symptom.selectedSensations.includes('stomach_gi')) {
      items.push(hu ? 'Hirtelen hányinger / hasmenés' : 'Sudden GI distress');
    }
    return items;
  }, [symptom, hu]);

  const topInstruction = hu
    ? profile.doInstructionsHu[0]
    : profile.doInstructionsEn[0];
  const extraInstructions = (
    hu ? profile.doInstructionsHu : profile.doInstructionsEn
  ).slice(1);
  const sensoryTags = hu
    ? profile.sensorySensitivitiesHu
    : profile.sensorySensitivitiesEn;

  return (
    <ModalDialog
      open={open}
      onClose={handleClose}
      ariaLabelledBy="crisis-dialog-title"
      className="serosafe-dialog serosafe-crisis-dialog w-[min(100vw-12px,640px)] max-h-[94dvh] rounded-3xl overflow-hidden flex flex-col"
    >
      {/* Sticky Single-Row Header & Immediate Action Bar */}
      <div className="shrink-0 bg-crisis-bg border-b border-crisis-border px-3.5 pt-3 pb-2.5 @[480px]:px-5 @[480px]:pt-4 @[480px]:pb-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 @[480px]:p-2 rounded-xl bg-crisis-amber text-crisis-amber-ink shrink-0">
              <ShieldAlert className="w-4 h-4 @[480px]:w-5 @[480px]:h-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="crisis-dialog-title"
                className="text-sm @[480px]:text-base font-extrabold tracking-tight text-crisis-ink"
              >
                {hu ? 'SÜRGŐSSÉGI ADATLAP' : 'EMERGENCY CARD (MIST)'}
              </h2>
              <p className="text-xs text-crisis-muted">
                {hu
                  ? 'Mentős átadás • Nem diagnózis'
                  : 'Paramedic handover • Not a diagnosis'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label={hu ? 'Kríziskártya bezárása' : 'Close crisis card'}
            className="shrink-0 px-2.5 py-1.5 rounded-xl bg-crisis-surface border border-crisis-border text-xs font-semibold text-crisis-ink hover:opacity-85 inline-flex items-center gap-1 whitespace-nowrap"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            <span>{hu ? 'Bezárás' : 'Close'}</span>
          </button>
        </div>

        {/* Immediate 112 Call & TTS Read-Aloud — always 2 columns side-by-side */}
        <div className="grid grid-cols-2 gap-2">
          <a
            href="tel:112"
            className="py-2.5 px-2.5 rounded-xl bg-crisis-amber text-crisis-amber-ink font-extrabold text-xs @[420px]:text-sm flex items-center justify-center gap-1.5 hover:opacity-90 transition whitespace-nowrap"
          >
            <PhoneCall className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{hu ? 'HÍVÁS: 112' : 'CALL 112'}</span>
          </a>

          <button
            type="button"
            onClick={handleSpeakToggle}
            disabled={!isTtsSupported()}
            className="py-2.5 px-2.5 rounded-xl bg-crisis-surface border border-crisis-border text-crisis-ink font-bold text-xs @[420px]:text-sm flex items-center justify-center gap-1.5 hover:opacity-90 transition disabled:opacity-50 whitespace-nowrap"
          >
            {speaking ? (
              <>
                <VolumeX className="w-4 h-4 text-crisis-amber shrink-0" aria-hidden="true" />
                <span>{hu ? 'Leállítás' : 'Stop TTS'}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-crisis-amber shrink-0" aria-hidden="true" />
                <span>{hu ? 'Felolvasás (TTS)' : 'Read aloud'}</span>
              </>
            )}
          </button>
        </div>

        {/* Compact Above-the-Fold MIST Vital + Risk Strip */}
        <div className="grid grid-cols-3 gap-1.5 text-center tabular-nums">
          <div className="py-1.5 px-2 rounded-xl bg-crisis-surface border border-crisis-border">
            <div className="text-xs text-crisis-muted">{hu ? 'Testhő' : 'Temp'}</div>
            <div className="text-xs @[420px]:text-sm font-extrabold text-crisis-ink">
              {symptom?.measuredTempCelsius
                ? `${symptom.measuredTempCelsius.toFixed(1)} °C`
                : '—'}
            </div>
          </div>
          <div className="py-1.5 px-2 rounded-xl bg-crisis-surface border border-crisis-border">
            <div className="text-xs text-crisis-muted">{hu ? 'Pulzus' : 'HR'}</div>
            <div className="text-xs @[420px]:text-sm font-extrabold text-crisis-ink">
              {symptom?.measuredHeartRateBpm
                ? `${symptom.measuredHeartRateBpm}${hu ? '/p' : ' bpm'}`
                : '—'}
            </div>
          </div>
          <div className="py-1.5 px-2 rounded-xl bg-crisis-surface border border-crisis-border">
            <div className="text-xs text-crisis-muted">
              {hu ? 'Szerotonerg' : 'Serotonergic'}
            </div>
            <div className="text-xs @[420px]:text-sm font-extrabold text-crisis-amber">
              {assessment.activeSerotonergicCount}{' '}
              {hu ? 'aktív' : 'active'}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable MIST Body — Flattened bands so Barrier, Meds & Vitals fit without deep nesting */}
      <div className="flex-1 overflow-y-auto calm-scroll divide-y divide-crisis-border">
        {/* 1. Communication Barrier (Top MIST Priority) */}
        <section className="px-3.5 py-2.5 @[480px]:px-5 @[480px]:py-3.5 bg-crisis-surface space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-xs font-extrabold uppercase tracking-wide text-crisis-amber">
              {hu ? '1. KOMMUNIKÁCIÓ (ASD / MUTIZMUS)' : '1. COMMUNICATION (ASD / MUTISM)'}
            </span>
            {profile.patientNameOptional && (
              <span className="text-xs font-bold text-crisis-ink">
                {profile.patientNameOptional}
              </span>
            )}
          </div>
          <p className="text-sm @[480px]:text-base font-bold text-crisis-ink leading-snug">
            {hu ? profile.barrierStatementHu : profile.barrierStatementEn}
          </p>
          {topInstruction && (
            <p className="text-xs font-semibold text-crisis-amber leading-snug">
              → {topInstruction}
            </p>
          )}
          {(extraInstructions.length > 0 || sensoryTags.length > 0) && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {sensoryTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-full bg-crisis-bg border border-crisis-amber text-xs font-semibold text-crisis-amber"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {extraInstructions.length > 0 && (
            <ul className="space-y-0.5 text-xs text-crisis-muted list-disc pl-4">
              {extraInstructions.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </section>

        {/* 2. Serotonergic & Washout Medications (Prioritized by Risk) */}
        <section className="px-3.5 py-2.5 @[480px]:px-5 @[480px]:py-3.5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-xs font-extrabold uppercase tracking-wide text-crisis-amber">
              {hu
                ? '2. SZEROTONERG ÉS EGYÉB GYÓGYSZEREK'
                : '2. MEDICATIONS & WASHOUT'}
            </span>
            {assessment.hasHighRiskCombination && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-crisis-amber text-crisis-amber-ink">
                {assessment.hasContraindicatedMAOI
                  ? hu
                    ? 'MAO-gátló jelzés'
                    : 'MAOI flag'
                  : hu
                    ? `${assessment.activeSerotonergicCount} szerotonerg szer`
                    : `${assessment.activeSerotonergicCount} serotonergic`}
              </span>
            )}
          </div>

          {emergencyMeds.length === 0 ? (
            <p className="text-xs text-crisis-muted">
              {hu ? 'Nincs rögzített gyógyszer.' : 'No medications logged.'}
            </p>
          ) : (
            <ul className="divide-y divide-crisis-border/70 border-y border-crisis-border/70">
              {emergencyMeds.map((m) => {
                const exp = assessment.exposures.find(
                  (e) => e.medicationId === m.id,
                );
                const inWashout = m.isDiscontinued && exp?.isInWashoutWindow;

                return (
                  <li
                    key={m.id}
                    className="py-1.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs @[480px]:text-sm font-bold text-crisis-ink leading-tight">
                        {m.customName}{' '}
                        <span className="text-crisis-amber">{m.doseText}</span>
                      </div>
                      <div className="text-xs text-crisis-muted leading-tight">
                        {inWashout
                          ? hu
                            ? `LEÁLLÍTVA — Kiürülés aktív: még ${exp.daysRemainingInWashout} nap`
                            : `STOPPED — Washout active: ${exp.daysRemainingInWashout}d left`
                          : `${hu ? 'Utolsó' : 'Last'}: ${formatLastTaken(m.lastTakenIso, lang)}${m.isOTCOrSupplement ? (hu ? ' • Vény nélküli' : ' • OTC') : ''}`}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg bg-crisis-surface text-crisis-ink border border-crisis-border">
                      {inWashout
                        ? hu
                          ? 'KIÜRÜLÉS'
                          : 'WASHOUT'
                        : formatMedStatus(m.todayStatus, lang)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 3. Measured Symptoms & Onset */}
        <section className="px-3.5 py-2.5 @[480px]:px-5 @[480px]:py-3.5 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-crisis-amber">
              {hu ? '3. ÉSZLELT TÜNETEK' : '3. OBSERVED SYMPTOMS'}
            </span>
            {symptom?.onsetHoursAgo !== undefined && (
              <span className="text-xs text-crisis-muted tabular-nums">
                {hu ? `Kezdet: ~${symptom.onsetHoursAgo} órája` : `Onset: ~${symptom.onsetHoursAgo}h ago`}
              </span>
            )}
          </div>

          {loggedSymptomsList.length > 0 ? (
            <ul className="space-y-0.5 text-xs @[480px]:text-sm font-semibold text-crisis-ink list-disc pl-4">
              {loggedSymptomsList.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-crisis-muted">
              {hu
                ? 'Nincs külön vörös zászló testi tünet rögzítve.'
                : 'No acute red-flag physical symptoms logged.'}
            </p>
          )}
        </section>

        {/* 4. Emergency Contact & Disclaimer */}
        <section className="px-3.5 py-2.5 @[480px]:px-5 @[480px]:py-3.5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-crisis-muted">
                {hu ? 'Vészhelyzeti kontakt: ' : 'ICE Contact: '}
              </span>
              <strong className="text-crisis-ink">
                {profile.emergencyContactName || (hu ? 'Nincs megadva' : 'Not set')}
                {contactPhoneTrimmed ? ` (${contactPhoneTrimmed})` : ''}
              </strong>
            </div>
            {contactDialHref && (
              <a
                href={`tel:${contactDialHref}`}
                className="px-3 py-1 rounded-xl bg-crisis-surface border border-crisis-border text-crisis-amber font-bold"
              >
                {hu ? 'Kontakt hívása' : 'Call ICE'}
              </a>
            )}
          </div>

          <p className="text-xs text-crisis-muted leading-relaxed">
            {hu
              ? 'Jogi nyilatkozat: A felhasználó által helyben rögzített tájékoztató adatlap, nem minősül orvosi diagnózisnak.'
              : 'Disclaimer: Patient-logged offline handover summary; not a medical diagnosis.'}
          </p>
        </section>
      </div>
    </ModalDialog>
  );
}
