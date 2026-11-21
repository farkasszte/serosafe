import { formatLastTaken } from '@/services/i18n';
import type {
  CommunicationProfile,
  ObservableSymptomEntry,
  StructuredAssessment,
  UserMedication,
} from '@/types/serosafe';

export function buildCrisisSpeechText(params: {
  lang: 'hu' | 'en';
  profile: CommunicationProfile;
  meds: UserMedication[];
  assessment: StructuredAssessment;
  symptom?: ObservableSymptomEntry;
}): string {
  const { lang, profile, meds, assessment, symptom } = params;
  const hu = lang === 'hu';

  const barrier = hu
    ? profile.barrierStatementHu
    : profile.barrierStatementEn;

  const medParts = meds.map((m) => {
    const exp = assessment.exposures.find((e) => e.medicationId === m.id);
    if (m.isDiscontinued && exp?.isInWashoutWindow) {
      return hu
        ? `${m.customName} ${m.doseText}, leállítva, de még ${exp.daysRemainingInWashout} napos kiürülési ablakban aktív`
        : `${m.customName} ${m.doseText}, discontinued, still within ${exp.daysRemainingInWashout}-day washout window`;
    }
    const lastStr = m.lastTakenIso
      ? `${hu ? ', utolsó bevétel: ' : ', last taken: '}${formatLastTaken(m.lastTakenIso, lang)}`
      : '';
    return `${m.customName} ${m.doseText}${lastStr}`;
  });

  const medsSentence =
    medParts.length > 0
      ? `${hu ? 'Rögzített gyógyszerek:' : 'Recorded medications:'} ${medParts.join(', ')}.`
      : hu
        ? 'Nincs rögzített gyógyszer.'
        : 'No medications recorded.';

  const vitalsParts: string[] = [];
  if (symptom?.measuredTempCelsius) {
    vitalsParts.push(
      hu
        ? `Testhőmérséklet ${symptom.measuredTempCelsius.toFixed(1)} Celsius-fok`
        : `Temperature ${symptom.measuredTempCelsius.toFixed(1)} degrees Celsius`,
    );
  }
  if (symptom?.measuredHeartRateBpm) {
    vitalsParts.push(
      hu
        ? `Pulzus ${symptom.measuredHeartRateBpm} per perc`
        : `Heart rate ${symptom.measuredHeartRateBpm} beats per minute`,
    );
  }
  if (symptom?.hasInvoluntaryTwitching) {
    vitalsParts.push(hu ? 'akaratlan izomrángás' : 'involuntary muscle twitching');
  }
  if (symptom?.hasMuscleStiffness) {
    vitalsParts.push(hu ? 'szokatlan izommerevség' : 'unusual muscle stiffness');
  }
  if (symptom?.hasTremor) {
    vitalsParts.push(hu ? 'kéz- vagy végtagremegés' : 'tremor');
  }
  if (symptom?.hasHeavySweating) {
    vitalsParts.push(hu ? 'nyugalmi erős izzadás' : 'heavy sweating at rest');
  }
  if (symptom?.hasSevereRestlessnessOrConfusion) {
    vitalsParts.push(hu ? 'zavartság vagy erős nyugtalanság' : 'confusion or agitation');
  }

  const symptomSentence =
    vitalsParts.length > 0
      ? `${hu ? 'Rögzített tünetek és vitális jelek:' : 'Logged symptoms and vitals:'} ${vitalsParts.join(', ')}.`
      : '';

  return `${barrier} ${medsSentence} ${symptomSentence}`.trim();
}

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopCrisisSpeech(): void {
  if (isTtsSupported()) {
    window.speechSynthesis.cancel();
  }
}

export function speakCrisisText(
  text: string,
  lang: 'hu' | 'en',
  callbacks?: { onEnd?: () => void; onError?: () => void },
): boolean {
  if (!isTtsSupported()) {
    callbacks?.onError?.();
    return false;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'hu' ? 'hu-HU' : 'en-US';
  utterance.rate = 0.94;
  utterance.onend = () => callbacks?.onEnd?.();
  utterance.onerror = () => callbacks?.onError?.();
  window.speechSynthesis.speak(utterance);
  return true;
}
