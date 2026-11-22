import type {
  AppSettings,
  ObservableSymptomEntry,
  StructuredAssessment,
} from '@/types/serosafe';

function normalizeTempBucket(temp?: number): string {
  if (temp === undefined || !Number.isFinite(temp) || temp < 37.5) {
    return 't0';
  }
  return `t${(Math.round(temp * 2) / 2).toFixed(1)}`;
}

function normalizeHrBucket(hr?: number): string {
  if (hr === undefined || !Number.isFinite(hr) || hr < 100) {
    return 'hr0';
  }
  return `hr${Math.floor(hr / 10) * 10}`;
}

/**
 * Builds a deterministic fingerprint for the current CONSULT safety state.
 * Natural washout day-countdown ticks (e.g. 35d -> 34d) preserve the same signature,
 * whereas any new/worsening warning symptom, body sensation, medication change,
 * or risk escalation produces a different signature so the banner returns automatically.
 */
export function buildConsultSignature(
  assessment: StructuredAssessment,
  symptom?: ObservableSymptomEntry,
  bodySensations: string[] = [],
): string {
  if (assessment.level !== 'CONSULT') {
    return '';
  }

  const exposuresKey = assessment.exposures
    .map(
      (e) =>
        `${e.medicationId}:${e.substance.id}:${e.isDiscontinued ? 'w' : 'a'}`,
    )
    .sort()
    .join(',');

  const reasonsKey = assessment.summaryReasonsEn
    .map((r) => r.replace(/~\d+ more days|\d+-day/g, '#d'))
    .sort()
    .join('|');

  const flags = [
    symptom?.hasInvoluntaryTwitching ? 'tw' : '',
    symptom?.hasTremor ? 'tr' : '',
    symptom?.hasMuscleStiffness ? 'ms' : '',
    symptom?.hasHeavySweating ? 'sw' : '',
    symptom?.hasSevereRestlessnessOrConfusion ? 'ag' : '',
    symptom?.hasGIDistress ? 'gi' : '',
    symptom?.hasRestingTachycardia ? 'ta' : '',
    normalizeTempBucket(symptom?.measuredTempCelsius),
    normalizeHrBucket(symptom?.measuredHeartRateBpm),
  ]
    .filter(Boolean)
    .join(',');

  const mergedSensations = Array.from(
    new Set([
      ...(symptom?.selectedSensations ?? []),
      ...bodySensations,
    ]),
  )
    .sort()
    .join(',');

  return [
    `lvl=${assessment.level}`,
    `cnt=${assessment.activeSerotonergicCount}`,
    `hr=${assessment.hasHighRiskCombination ? 1 : 0}`,
    `maoi=${assessment.hasContraindicatedMAOI ? 1 : 0}`,
    `exp=${exposuresKey}`,
    `sym=${flags}`,
    `sens=${mergedSensations}`,
    `rsn=${reasonsKey}`,
  ].join(';');
}

/**
 * Returns true only when `assessment.level === 'CONSULT'` and the user explicitly
 * confirmed quieting the exact same clinical signature (never suppresses 112 emergencies).
 */
export function isConsultQuietedForState(
  settings: Pick<AppSettings, 'quietedConsultSignature'>,
  assessment: StructuredAssessment,
  symptom?: ObservableSymptomEntry,
  bodySensations: string[] = [],
): boolean {
  if (assessment.level !== 'CONSULT' || !settings.quietedConsultSignature) {
    return false;
  }
  const currentSignature = buildConsultSignature(
    assessment,
    symptom,
    bodySensations,
  );
  return (
    currentSignature.length > 0 &&
    settings.quietedConsultSignature === currentSignature
  );
}
