import { CURATED_SUBSTANCES } from '@/data/substances';
import type {
  ActionGuidanceLevel,
  CuratedSubstance,
  DailyLogEntry,
  HabitChip,
  ObservableSymptomEntry,
  PatternInsight,
  StructuredAssessment,
  UserMedication,
  WashoutExposureInfo,
} from '@/types/serosafe';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toLocalDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
          statusDate = toLocalDateKey(parsed);
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
  if (candidateSubstanceId) {
    const candidate = substanceMap.get(candidateSubstanceId);
    if (candidate) {
      const alreadyPresent = activeExposures.some(
        (e) => e.substance.id === candidate.id,
      );
      if (!alreadyPresent) {
        activeExposures.push({
          medicationId: `candidate_${candidate.id}`,
          name: `${candidate.nameHu} (ellenőrzött szer)`,
          substance: candidate,
          isDiscontinued: false,
          isActiveExposure: true,
          isInWashoutWindow: true,
          daysElapsedSinceStop: 0,
          daysRemainingInWashout: candidate.clinicalWashoutDays,
        });
        sources.add(candidate.sourceRef);
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
    const level: ActionGuidanceLevel = hasHighRiskCombination
      ? 'CONSULT'
      : 'INFO_LOGGED';
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
  const hasNeuromuscularSigns =
    symptom.hasInvoluntaryTwitching ||
    symptom.hasMuscleStiffness ||
    symptom.hasTremor;
  const hasAutonomicOrMentalSigns =
    hasFever ||
    symptom.hasHeavySweating ||
    symptom.hasSevereRestlessnessOrConfusion;

  const hasNmsOrSepsisConcern =
    (hasFever && symptom.hasMuscleStiffness) ||
    symptom.hasInvoluntaryTwitching ||
    (hasHighFever &&
      (symptom.hasSevereRestlessnessOrConfusion || symptom.hasHeavySweating));

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
      hasNmsOrSepsisConcern: true,
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

  const level: ActionGuidanceLevel = hasHighRiskCombination
    ? 'CONSULT'
    : 'INFO_LOGGED';

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

/**
 * Dinamikusan kiszámolja a valós naplókból származó magyarázható együttjárási mintázatokat.
 * Soha nem tesz ok-okozati állítást, megjelöli az érintett dátumokat és a zavaró tényezőket.
 */
export function computeExplainablePatterns(
  logs: DailyLogEntry[],
  habits: HabitChip[],
): PatternInsight[] {
  const activeLogs = logs
    .filter((l) => !l.isGap)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  const nDays = activeLogs.length;
  const insights: PatternInsight[] = [];

  if (nDays === 0) return insights;

  // 1. Short sleep (<6h) -> next-day low energy (<50)
  const sleepLowEnergyDates: string[] = [];
  let shortSleepOpportunities = 0;
  let caffeineCoDays = 0;

  for (let i = 0; i < activeLogs.length - 1; i++) {
    const cur = activeLogs[i];
    const next = activeLogs[i + 1];
    if (cur.sleepHours !== null && cur.sleepHours < 6) {
      shortSleepOpportunities++;
      if (next.energyLevel !== null && next.energyLevel < 55) {
        sleepLowEnergyDates.push(next.date.slice(5));
        if (cur.chipIds.includes('c_caffeine') || next.chipIds.includes('c_caffeine')) {
          caffeineCoDays++;
        }
      }
    }
  }

  if (sleepLowEnergyDates.length >= 2) {
    const isEarly = nDays < 14 || sleepLowEnergyDates.length < 5;
    insights.push({
      id: 'pat_sleep_energy',
      strong: !isEarly && sleepLowEnergyDates.length >= 5,
      early: isEarly,
      titleHu: `6 óránál kevesebb alvás után másnap alacsonyabb energia (${sleepLowEnergyDates.length} / ${shortSleepOpportunities} alkalom).`,
      titleEn: `Sleep under 6h followed by lower next-day energy (${sleepLowEnergyDates.length} of ${shortSleepOpportunities} times).`,
      descHu: isEarly
        ? 'Még kevés adat áll rendelkezésre (minimum 14 nap és 5 egybeesés szükséges a biztosabb mintázathoz).'
        : 'Az együttjárás több héten át ismétlődött; nem orvosi diagnózis.',
      descEn: isEarly
        ? 'Too early to conclude (at least 14 logged days and 5 occurrences are needed).'
        : 'Repeated co-occurrence across weeks; descriptive observation, not a diagnosis.',
      confoundersHu: `Együtt naplózva: koffein (${caffeineCoDays} nap)`,
      confoundersEn: `Co-logged: caffeine (${caffeineCoDays} days)`,
      matchingDates: sleepLowEnergyDates,
      nDays,
      status: 'shown',
    });
  }

  // 2. Skipped/partial doses -> mental fog / overwhelmed emotion
  const skippedDoseDates: string[] = [];
  let lowAdherenceCount = 0;
  for (const log of activeLogs) {
    if (log.medsTakenPct !== null && log.medsTakenPct < 100) {
      lowAdherenceCount++;
      if (
        log.chipIds.includes('c_fog') ||
        log.emotions.includes('em_overwhelmed') ||
        log.emotions.includes('em_confused') ||
        log.emotions.includes('em_anxious')
      ) {
        skippedDoseDates.push(log.date.slice(5));
      }
    }
  }

  if (skippedDoseDates.length >= 2) {
    const isEarly = nDays < 14 || skippedDoseDates.length < 5;
    insights.push({
      id: 'pat_meds_cog',
      strong: !isEarly && skippedDoseDates.length >= 4,
      early: isEarly,
      titleHu: `Késleltetett vagy kihagyott adag napján szorongó/ködös állapot (${skippedDoseDates.length} / ${lowAdherenceCount} nap).`,
      titleEn: `On delayed or skipped dose days: anxious or foggy state (${skippedDoseDates.length} of ${lowAdherenceCount} days).`,
      descHu: 'Saját naplóbejegyzéseid időbeli egybeesése.',
      descEn: 'Temporal co-occurrence from your personal diary logs.',
      confoundersHu: 'Ellenőrizd az alvásidőt és a délutáni túlterhelést is.',
      confoundersEn: 'Also check sleep duration and afternoon sensory load.',
      matchingDates: skippedDoseDates,
      nDays,
      status: 'shown',
    });
  }

  // 3. Positive restorative habit co-occurrence (e.g. walk / quiet time -> calm emotion)
  const walkHabit = habits.find((h) => h.id === 'c_walk');
  if (walkHabit) {
    const walkDates: string[] = [];
    let totalWalks = 0;
    for (const log of activeLogs) {
      if (log.chipIds.includes('c_walk')) {
        totalWalks++;
        if (log.emotions.includes('em_calm') || log.emotions.includes('em_content')) {
          walkDates.push(log.date.slice(5));
        }
      }
    }
    if (walkDates.length >= 2) {
      const isEarly = nDays < 14 || walkDates.length < 5;
      insights.push({
        id: 'pat_walk_calm',
        strong: !isEarly && walkDates.length >= 5,
        early: isEarly,
        titleHu: `„Séta / természet” és nyugodt közérzet ugyanazon a napon (${walkDates.length} / ${totalWalks} nap).`,
        titleEn: `"Walk / outdoors" and calm state on the same day (${walkDates.length} of ${totalWalks} days).`,
        descHu: 'Együtt fordul elő a naplódban; bűntudat nélküli megfigyelés.',
        descEn: 'Co-occurs in your personal logs; neutral observation.',
        confoundersHu: 'Együtt naplózva: elegendő alvás és magasabb szenzoros tartalék.',
        confoundersEn: 'Co-logged: adequate sleep and higher sensory reserve.',
        matchingDates: walkDates,
        nDays,
        status: 'shown',
      });
    }
  }

  return insights;
}
