import { CURATED_SUBSTANCES } from '@/data/substances';
import type {
  ActionGuidanceLevel,
  CuratedSubstance,
  ObservableSymptomEntry,
  StructuredAssessment,
  UserMedication,
  WashoutExposureInfo,
} from '@/types/serosafe';
import { formatLocalDateKey } from '@/utils/date';

export { computeExplainablePatterns } from '@/engine/patternEngine';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Resets non-discontinued medication dailyStatuses (`TOOK`/`LATER`/`SKIPPED` -> `PENDING`)
 * when entering a new calendar day, while preserving the real `lastTakenIso` timestamp.
 */
export function normalizeMedicationsForDate(
  meds: UserMedication[],
  todayKey: string,
  fallbackDateKey?: string,
): UserMedication[] {
  return meds.map((med) => {
    if (med.isDiscontinued) return med;

    let statusDate = med.todayStatusDate;
    if (!statusDate) {
      if (med.todayStatus === 'TOOK' && med.lastTakenIso) {
        const parsed = new Date(med.lastTakenIso);
        if (!Number.isNaN(parsed.getTime())) {
          statusDate = formatLocalDateKey(parsed);
        }
      }
      if (!statusDate && fallbackDateKey) {
        statusDate = fallbackDateKey;
      }
    }

    if (med.todayStatus !== 'PENDING' && statusDate && statusDate !== todayKey) {
      return {
        ...med,
        todayStatus: 'PENDING',
        todayStatusDate: todayKey,
      };
    }

    if (med.todayStatus !== 'PENDING' && statusDate === todayKey && !med.todayStatusDate) {
      return {
        ...med,
        todayStatusDate: todayKey,
      };
    }

    return med;
  });
}

/**
 * Orders medications for emergency Lock-Screen & MIST handover by clinical risk:
 * 0: MAOI (active or in washout), 1: Active washout discontinued med,
 * 2: Other serotonergic active med, 3: NMS-watch antipsychotic, 4: Other active med.
 * Excludes discontinued meds whose washout window has already completed.
 */
export function prioritizeMedicationsForEmergency(
  meds: UserMedication[],
  assessment: StructuredAssessment,
): UserMedication[] {
  const exposureByMedId = new Map(
    assessment.exposures.map((e) => [e.medicationId, e]),
  );

  const relevant = meds.filter((m) => {
    if (!m.isDiscontinued) return true;
    const exp = exposureByMedId.get(m.id);
    return Boolean(exp?.isInWashoutWindow);
  });

  function getPriorityRank(m: UserMedication): number {
    const exp = exposureByMedId.get(m.id);
    if (exp?.substance.mechanisms.includes('MAOI')) return 0;
    if (m.isDiscontinued && exp?.isInWashoutWindow) return 1;
    if (exp) return 2;
    if (m.nmsWatch) return 3;
    return 4;
  }

  return [...relevant].sort((a, b) => getPriorityRank(a) - getPriorityRank(b));
}

export function getMedicationExposure(
  med: UserMedication,
  substance: CuratedSubstance,
  nowDate: Date = new Date(),
): WashoutExposureInfo {
  const referenceIso = med.isDiscontinued
    ? med.discontinuedAtIso ?? med.lastTakenIso
    : med.lastTakenIso;
  const referenceMs = new Date(referenceIso).getTime();
  const elapsedDays = Number.isNaN(referenceMs)
    ? 0
    : Math.max(0, (nowDate.getTime() - referenceMs) / MS_PER_DAY);

  const isInWashoutWindow = elapsedDays <= substance.clinicalWashoutDays;
  const daysRemainingInWashout = Math.max(
    0,
    Math.ceil(substance.clinicalWashoutDays - elapsedDays),
  );

  // If the medication is actively scheduled (not discontinued), it is considered active
  // unless its lastTakenIso is wildly stale (> washout window AND marked stopped).
  const isActiveExposure = !med.isDiscontinued || isInWashoutWindow;

  return {
    medicationId: med.id,
    name: med.customName || substance.nameHu,
    substance,
    isDiscontinued: med.isDiscontinued,
    isActiveExposure,
    isInWashoutWindow,
    daysElapsedSinceStop: Math.floor(elapsedDays),
    daysRemainingInWashout,
  };
}

/**
 * Nem-diagnosztikai kockázat- és tünetstrukturáló motor.
 * Szigorúan betartja az Anti-Reassurance elvet: soha nem ad "Zöld / Biztonságos" státuszt.
 */
export function evaluateRiskAndSymptoms(
  meds: UserMedication[],
  substances: CuratedSubstance[] = CURATED_SUBSTANCES,
  symptom?: ObservableSymptomEntry,
  candidateSubstanceId?: string,
  nowDate: Date = new Date(),
): StructuredAssessment {
  const substanceMap = new Map(substances.map((s) => [s.id, s]));
  const reasonsHu: string[] = [];
  const reasonsEn: string[] = [];
  const sources = new Set<string>();

  const activeExposures: WashoutExposureInfo[] = [];

  for (const med of meds) {
    if (!med.substanceId) continue;
    const sub = substanceMap.get(med.substanceId);
    if (!sub) continue;

    const exposure = getMedicationExposure(med, sub, nowDate);
    if (exposure.isActiveExposure) {
      activeExposures.push(exposure);
      sources.add(sub.sourceRef);
    }
  }

  // Opcionális "Mi történne, ha bevenném ezt az új / OTC szert?" teszt
  let hasDuplicateCandidate = false;
  if (candidateSubstanceId) {
    const candidate = substanceMap.get(candidateSubstanceId);
    if (candidate) {
      const alreadyPresent = activeExposures.some(
        (e) => e.substance.id === candidate.id,
      );
      sources.add(candidate.sourceRef);
      if (!alreadyPresent) {
        activeExposures.push({
          medicationId: `candidate_${candidate.id}`,
          name: candidate.nameHu,
          substance: candidate,
          isDiscontinued: false,
          isActiveExposure: true,
          isInWashoutWindow: true,
          daysElapsedSinceStop: 0,
          daysRemainingInWashout: candidate.clinicalWashoutDays,
        });
      } else {
        hasDuplicateCandidate = true;
        reasonsHu.push(
          `Duplikált hatóanyag-kockázat: a(z) ${candidate.nameHu} már szerepel az aktív vagy kiürülési listádon (más márkanéven vagy OTC készítményben is). Együttes bevétele túladagoláshoz vagy szerotonerg kumulációhoz vezethet — egyeztess orvossal vagy gyógyszerésszel!`,
        );
        reasonsEn.push(
          `Duplicate ingredient warning: ${candidate.nameEn} is already active or within its washout window on your list. Taking an overlapping brand or OTC product may cause accumulation or overdose — consult a doctor or pharmacist.`,
        );
      }
    }
  }

  // Washout-ban lévő leállított szerek külön kiemelése
  const washoutMeds = activeExposures.filter((e) => e.isDiscontinued);
  for (const w of washoutMeds) {
    reasonsHu.push(
      `Aktív kiürülési időszak: a leállított ${w.substance.nameHu} még kb. ${w.daysRemainingInWashout} napig jelen lehet a szervezetben (${w.substance.clinicalWashoutDays} napos kiürülési idő).`,
    );
    reasonsEn.push(
      `Active washout window: discontinued ${w.substance.nameEn} can remain active for ~${w.daysRemainingInWashout} more days (${w.substance.clinicalWashoutDays}-day window).`,
    );
  }

  const hasMAOI = activeExposures.some((e) =>
    e.substance.mechanisms.includes('MAOI'),
  );
  const distinctSubstanceIds = new Set(
    activeExposures.map((e) => e.substance.id),
  );
  const activeSerotonergicCount = distinctSubstanceIds.size;
  const hasContraindicatedMAOI = hasMAOI && activeSerotonergicCount >= 2;
  const hasMultipleSerotonergics = activeSerotonergicCount >= 2;
  const hasHighRiskCombination =
    hasContraindicatedMAOI || hasMultipleSerotonergics;

  if (hasContraindicatedMAOI) {
    reasonsHu.push(
      'Kontraindikált kombináció: MAO-gátló és más szerotonerg hatóanyag egyidejű vagy kiürülési időn belüli jelenléte. Azonnal egyeztess orvossal vagy gyógyszerésszel!',
    );
    reasonsEn.push(
      'Contraindicated combination: MAOI alongside another serotonergic agent within its clinical washout window. Contact a physician or pharmacist immediately.',
    );
  } else if (hasMultipleSerotonergics) {
    reasonsHu.push(
      `Többszörös szerotonerg terhelés: ${activeSerotonergicCount} különböző szerotonerg hatású szer aktív vagy kiürülési ablakon belül van.`,
    );
    reasonsEn.push(
      `Multiple serotonergic load: ${activeSerotonergicCount} distinct serotonergic substances are active or within their washout window.`,
    );
  }

  const hasAntipsychoticNmsWatch = meds.some(
    (m) => !m.isDiscontinued && m.nmsWatch,
  );

  if (!symptom) {
    const level: ActionGuidanceLevel =
      hasHighRiskCombination || hasDuplicateCandidate ? 'CONSULT' : 'INFO_LOGGED';
    if (level === 'INFO_LOGGED' && reasonsHu.length === 0) {
      reasonsHu.push(
        'A rögzített gyógyszeradatok strukturálva vannak. Szokatlan testi tünet (különösen láz vagy izommerevség) esetén a gyógyszerlistától függetlenül kérj orvosi segítséget.',
      );
      reasonsEn.push(
        'Medication entries are logged. Regardless of serotonergic status, seek medical evaluation for unusual physical symptoms such as fever or muscle rigidity.',
      );
    }
    return {
      level,
      activeSerotonergicCount,
      exposures: activeExposures,
      hasHighRiskCombination,
      hasContraindicatedMAOI,
      hasNmsOrSepsisConcern: false,
      summaryReasonsHu: reasonsHu,
      summaryReasonsEn: reasonsEn,
      sources: Array.from(sources),
    };
  }

  const hasFever =
    symptom.measuredTempCelsius !== undefined &&
    symptom.measuredTempCelsius >= 38.0;
  const hasHighFever =
    symptom.measuredTempCelsius !== undefined &&
    symptom.measuredTempCelsius >= 38.5;
  const hasTachycardia =
    Boolean(symptom.hasRestingTachycardia) ||
    (symptom.measuredHeartRateBpm !== undefined &&
      symptom.measuredHeartRateBpm >= 110);
  const hasSevereTachycardia =
    symptom.measuredHeartRateBpm !== undefined &&
    symptom.measuredHeartRateBpm >= 130;
  const hasNeuromuscularSigns =
    symptom.hasInvoluntaryTwitching ||
    symptom.hasMuscleStiffness ||
    symptom.hasTremor;
  const hasAutonomicOrMentalSigns =
    hasFever ||
    hasTachycardia ||
    symptom.hasHeavySweating ||
    symptom.hasSevereRestlessnessOrConfusion;

  const hasNmsOrSepsisConcern =
    (hasFever && symptom.hasMuscleStiffness) ||
    symptom.hasInvoluntaryTwitching ||
    (hasHighFever &&
      (symptom.hasSevereRestlessnessOrConfusion || symptom.hasHeavySweating)) ||
    (hasFever && hasSevereTachycardia);

  // Súlyos vészjelek esetén szerotonerg státusztól FÜGGETLENÜL is 112-t javaslunk (NMS / szepszis védelem)
  if (
    hasNmsOrSepsisConcern ||
    (hasNeuromuscularSigns &&
      hasAutonomicOrMentalSigns &&
      activeSerotonergicCount > 0)
  ) {
    if (hasAntipsychoticNmsWatch && hasFever && symptom.hasMuscleStiffness) {
      reasonsHu.push(
        'Magas láz és izommerevség együttes jelenléte (antipszichotikum mellett Malignus Neuroleptikus Szindróma / NMS vagy egyéb sürgősségi állapot sem zárható ki). Azonnali 112 hívás javasolt.',
      );
      reasonsEn.push(
        'Fever with muscle rigidity (NMS or other acute emergency cannot be excluded). Call 112 immediately.',
      );
    } else {
      reasonsHu.push(
        'Súlyos neuromuszkuláris és/vagy autonóm tünetegyüttes észlelhető. A gyógyszerstátusztól függetlenül azonnali sürgősségi vizsgálat szükséges (112).',
      );
      reasonsEn.push(
        'Severe neuromuscular and/or autonomic warning cluster observed. Immediate emergency evaluation (112) is recommended regardless of medication status.',
      );
    }

    return {
      level: 'CALL_EMERGENCY_112',
      activeSerotonergicCount,
      exposures: activeExposures,
      hasHighRiskCombination,
      hasContraindicatedMAOI,
      hasNmsOrSepsisConcern,
      summaryReasonsHu: reasonsHu,
      summaryReasonsEn: reasonsEn,
      sources: Array.from(sources),
    };
  }

  if (
    hasNeuromuscularSigns ||
    hasAutonomicOrMentalSigns ||
    symptom.hasGIDistress
  ) {
    reasonsHu.push(
      'Szokatlan fizikai tünetek kerültek rögzítésre. Orvosi vagy gyógyszerészi konzultáció és a tünetek szoros megfigyelése javasolt; romlásnál hívd a 112-t.',
    );
    reasonsEn.push(
      'Unusual physical symptoms logged. Consult a doctor or pharmacist and monitor closely; call 112 if symptoms worsen.',
    );
    return {
      level: 'CONSULT',
      activeSerotonergicCount,
      exposures: activeExposures,
      hasHighRiskCombination,
      hasContraindicatedMAOI,
      hasNmsOrSepsisConcern: false,
      summaryReasonsHu: reasonsHu,
      summaryReasonsEn: reasonsEn,
      sources: Array.from(sources),
    };
  }

  const level: ActionGuidanceLevel =
    hasHighRiskCombination || hasDuplicateCandidate ? 'CONSULT' : 'INFO_LOGGED';

  if (level === 'INFO_LOGGED' && reasonsHu.length === 0) {
    reasonsHu.push(
      'A vitális és testi megfigyelések rögzítve lettek. Bármilyen új láz, remegés vagy merevség esetén azonnal jelezd orvosnak.',
    );
    reasonsEn.push(
      'Observations logged. Seek prompt medical advice if new fever, tremor, or muscle rigidity appears.',
    );
  }

  return {
    level,
    activeSerotonergicCount,
    exposures: activeExposures,
    hasHighRiskCombination,
    hasContraindicatedMAOI,
    hasNmsOrSepsisConcern: false,
    summaryReasonsHu: reasonsHu,
    summaryReasonsEn: reasonsEn,
    sources: Array.from(sources),
  };
}
