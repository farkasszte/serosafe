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

  return (
    <ModalDialog
      open={open}
      onClose={handleClose}
      ariaLabelledBy="crisis-dialog-title"
      className="serosafe-dialog serosafe-crisis-dialog w-[min(100vw-16px,640px)] max-h-[94dvh] rounded-3xl overflow-hidden"
    >
      <div className="max-h-[94dvh] overflow-y-auto calm-scroll p-3.5 @[480px]:p-6 space-y-3 @[480px]:space-y-4">
        {/* Top Action Bar: 112 Call + TTS + Close */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-crisis-border">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-crisis-amber text-crisis-amber-ink">
              <ShieldAlert className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="crisis-dialog-title"
                className="text-base font-extrabold tracking-tight text-crisis-ink"
              >
                {hu
                  ? 'SÜRGŐSSÉGI ADATLAP (112)'
                  : 'OFFLINE EMERGENCY HANDOVER CARD (MIST)'}
              </h2>
              <p className="text-xs text-crisis-muted">
                {hu
                  ? 'Mentőszolgálati átadási kártya • Nem diagnózis'
                  : 'Paramedic handover summary • Not a diagnosis'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label={hu ? 'Kríziskártya bezárása' : 'Close crisis card'}
            className="px-3 py-2 rounded-xl bg-crisis-surface border border-crisis-border text-xs font-semibold text-crisis-ink hover:opacity-85 inline-flex items-center gap-1.5"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            {hu ? 'Bezárás' : 'Close'}
          </button>
        </div>

        {/* Immediate 112 Call & TTS Read-Aloud */}
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-2.5">
          <a
            href="tel:112"
            className="py-3.5 px-4 rounded-2xl bg-crisis-amber text-crisis-amber-ink font-extrabold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition"
          >
            <PhoneCall className="w-5 h-5" aria-hidden="true" />
            {hu ? 'HÍVÁS: 112 MENTŐK' : 'CALL EMERGENCY: 112'}
          </a>

          <button
            type="button"
            onClick={handleSpeakToggle}
            disabled={!isTtsSupported()}
            className="py-3.5 px-4 rounded-2xl bg-crisis-surface border border-crisis-border text-crisis-ink font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
          >
            {speaking ? (
              <>
                <VolumeX className="w-5 h-5 text-crisis-amber" aria-hidden="true" />
                {hu ? 'Felolvasás leállítása' : 'Stop voice readout'}
              </>
            ) : (
              <>
                <Volume2 className="w-5 h-5 text-crisis-amber" aria-hidden="true" />
                {hu ? 'Hangos felolvasás' : 'Read aloud (TTS)'}
              </>
            )}
          </button>
        </div>

        {/* 1. Communication Barrier (Top MIST Priority) */}
        <section className="p-3 @[480px]:p-4 rounded-xl @[480px]:rounded-2xl bg-crisis-surface border-2 border-crisis-amber space-y-2">
          <div className="text-xs font-extrabold uppercase tracking-wide text-crisis-amber">
            {hu
              ? '1. KOMMUNIKÁCIÓ ÉS NEURODIVERGENCIA'
              : '1. COMMUNICATION & NEURODIVERGENCE (ASD)'}
          </div>
          {profile.patientNameOptional && (
            <div className="text-sm font-bold text-crisis-ink">
              {profile.patientNameOptional}
            </div>
          )}
          <p className="text-base font-bold text-crisis-ink leading-snug">
            {hu ? profile.barrierStatementHu : profile.barrierStatementEn}
          </p>
          <ul className="space-y-1 text-xs text-crisis-muted list-disc pl-4">
            {(hu ? profile.doInstructionsHu : profile.doInstructionsEn).map(
              (line, i) => (
                <li key={i}>{line}</li>
              ),
            )}
          </ul>
          {(hu ? profile.sensorySensitivitiesHu : profile.sensorySensitivitiesEn)
            .length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(hu
                ? profile.sensorySensitivitiesHu
                : profile.sensorySensitivitiesEn
              ).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-full bg-crisis-bg border border-crisis-amber text-xs font-semibold text-crisis-amber"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* 2. Serotonergic & Washout Medications */}
        <section className="p-3 @[480px]:p-4 rounded-xl @[480px]:rounded-2xl bg-crisis-surface border border-crisis-border space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-crisis-amber">
              {hu
                ? '2. SZEROTONERG ÉS EGYÉB GYÓGYSZEREK'
                : '2. SEROTONERGIC & OTHER MEDICATIONS'}
            </span>
            {assessment.hasHighRiskCombination && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-crisis-amber text-crisis-amber-ink">
                {assessment.hasContraindicatedMAOI
                  ? hu
                    ? 'MAO-gátló kölcsönhatási jelzés'
                    : 'MAOI interaction flag'
                  : hu
                    ? `${assessment.activeSerotonergicCount} szerotonerg szer`
                    : `${assessment.activeSerotonergicCount} serotonergic agents`}
              </span>
            )}
          </div>

          {emergencyMeds.length === 0 ? (
            <p className="text-sm text-crisis-muted">
              {hu ? 'Nincs rögzített gyógyszer.' : 'No medications logged.'}
            </p>
          ) : (
            <div className="space-y-2">
              {emergencyMeds.map((m) => {
                const exp = assessment.exposures.find(
                  (e) => e.medicationId === m.id,
                );
                const inWashout = m.isDiscontinued && exp?.isInWashoutWindow;

                return (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-xl bg-crisis-bg border border-crisis-border flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-sm font-bold text-crisis-ink">
                        {m.customName}{' '}
                        <span className="text-crisis-amber">{m.doseText}</span>
                      </div>
                      <div className="text-xs text-crisis-muted">
                        {inWashout
                          ? hu
                            ? `LEÁLLÍTVA — Kiürülési időszak aktív: még ${exp.daysRemainingInWashout} nap`
                            : `STOPPED — Washout active: ${exp.daysRemainingInWashout}d left`
                          : `${hu ? 'Utolsó bevétel' : 'Last taken'}: ${formatLastTaken(m.lastTakenIso, lang)}${m.scheduleTime ? ` • ${hu ? 'Terv' : 'Sched'}: ${m.scheduleTime}` : ''}${m.isOTCOrSupplement ? (hu ? ' • Vény nélküli' : ' • OTC') : ''}`}
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-crisis-surface text-crisis-ink border border-crisis-border">
                      {inWashout
                        ? hu
                          ? 'KIÜRÜLÉS'
                          : 'WASHOUT'
                        : formatMedStatus(m.todayStatus, lang)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. Measured Vitals & Patient-Observed Symptoms */}
        <section className="p-3 @[480px]:p-4 rounded-xl @[480px]:rounded-2xl bg-crisis-surface border border-crisis-border space-y-2.5">
          <div className="text-xs font-extrabold uppercase tracking-wide text-crisis-amber">
            {hu
              ? '3. MÉRT VITÁLIS ADATOK ÉS TÜNETEK'
              : '3. MEASURED VITALS & SYMPTOMS'}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center tabular-nums">
            <div className="p-2.5 rounded-xl bg-crisis-bg border border-crisis-border">
              <div className="text-xs text-crisis-muted">
                {hu ? 'Testhő' : 'Temp'}
              </div>
              <div className="text-sm @[420px]:text-base font-extrabold text-crisis-ink">
                {symptom?.measuredTempCelsius
                  ? `${symptom.measuredTempCelsius.toFixed(1)} °C`
                  : '—'}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-crisis-bg border border-crisis-border">
              <div className="text-xs text-crisis-muted">
                {hu ? 'Pulzus' : 'Heart rate'}
              </div>
              <div className="text-sm @[420px]:text-base font-extrabold text-crisis-ink">
                {symptom?.measuredHeartRateBpm
                  ? `${symptom.measuredHeartRateBpm}${hu ? ' /perc' : ' bpm'}`
                  : '—'}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-crisis-bg border border-crisis-border">
              <div className="text-xs text-crisis-muted">
                {hu ? 'Kezdet' : 'Onset'}
              </div>
              <div className="text-sm @[420px]:text-base font-extrabold text-crisis-ink">
                {symptom?.onsetHoursAgo !== undefined
                  ? hu
                    ? `~${symptom.onsetHoursAgo} órája`
                    : `~${symptom.onsetHoursAgo} h`
                  : '—'}
              </div>
            </div>
          </div>

          {loggedSymptomsList.length > 0 ? (
            <ul className="space-y-1 text-sm font-semibold text-crisis-ink list-disc pl-4">
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
        <section className="p-3 @[480px]:p-3.5 rounded-xl @[480px]:rounded-2xl bg-crisis-surface border border-crisis-border flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-crisis-muted">
              {hu ? 'Vészhelyzeti kontakt: ' : 'Emergency contact: '}
            </span>
            <strong className="text-crisis-ink">
              {profile.emergencyContactName || (hu ? 'Nincs megadva' : 'Not set')}
              {contactPhoneTrimmed ? ` (${contactPhoneTrimmed})` : ''}
            </strong>
          </div>
          {contactDialHref && (
            <a
              href={`tel:${contactDialHref}`}
              className="px-3 py-1.5 rounded-xl bg-crisis-bg border border-crisis-border text-crisis-amber font-bold"
            >
              {hu ? 'Kontakt hívása' : 'Call contact'}
            </a>
          )}
        </section>

        <p className="text-xs text-crisis-muted text-center leading-relaxed">
          {hu
            ? 'Jogi nyilatkozat: Ez az adatlap a felhasználó által helyben rögzített strukturált információkat tartalmazza, nem minősül orvosi diagnózisnak.'
            : 'Disclaimer: This handover card displays patient-logged structured information generated offline and is not a medical diagnosis.'}
        </p>
      </div>
    </ModalDialog>
  );
}
