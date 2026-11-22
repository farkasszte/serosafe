import type {
  DailyLogEntry,
  HabitChip,
  PatternInsight,
} from '@/types/serosafe';
import { daysBetweenDateKeys } from '@/utils/date';

const CALM_EMOTIONS = new Set([
  'em_calm',
  'em_content',
  'em_steady',
  'em_relieved',
  'em_focused',
]);

const STRAIN_EMOTIONS = new Set([
  'em_overwhelmed',
  'em_confused',
  'em_anxious',
  'em_drained',
  'em_shutdown',
  'em_irritable',
]);

interface ScoredPattern {
  insight: PatternInsight;
  rankScore: number;
}

interface ContingencySpec {
  id: string;
  lag: 0 | 1;
  excludeConfounderId?: string;
  isEligible: (expLog: DailyLogEntry, outLog: DailyLogEntry) => boolean;
  isExposed: (expLog: DailyLogEntry) => boolean;
  isOutcome: (outLog: DailyLogEntry) => boolean;
  buildTitles: (
    matches: number,
    exposedTotal: number,
    rateDiffPct: number,
  ) => { hu: string; en: string };
}

function summarizeConfounders(
  matchingPairs: { exp: DailyLogEntry; out: DailyLogEntry }[],
  excludeId?: string,
): { hu: string; en: string } {
  const candidates: {
    key: string;
    hu: string;
    en: string;
    test: (exp: DailyLogEntry, out: DailyLogEntry) => boolean;
  }[] = [
    {
      key: 'short_sleep',
      hu: 'rövid alvás (<6 óra)',
      en: 'short sleep (<6h)',
      test: (exp) => exp.sleepHours !== null && exp.sleepHours < 6,
    },
    {
      key: 'night_wake',
      hu: 'éjszakai felébredés',
      en: 'night waking',
      test: (exp) => exp.wokeAtNight,
    },
    {
      key: 'c_caffeine',
      hu: 'koffein',
      en: 'caffeine',
      test: (exp, out) =>
        exp.chipIds.includes('c_caffeine') || out.chipIds.includes('c_caffeine'),
    },
    {
      key: 'c_masking',
      hu: 'maszkolás fáradtság',
      en: 'masking fatigue',
      test: (exp, out) =>
        exp.chipIds.includes('c_masking') || out.chipIds.includes('c_masking'),
    },
    {
      key: 'delayed_meds',
      hu: 'késleltetett/kihagyott adag',
      en: 'delayed/skipped dose',
      test: (exp, out) =>
        (exp.medsTakenPct !== null && exp.medsTakenPct < 100) ||
        (out.medsTakenPct !== null && out.medsTakenPct < 100),
    },
    {
      key: 'low_sensory',
      hu: 'alacsony szenzoros tartalék (<=40%)',
      en: 'low sensory reserve (<=40%)',
      test: (exp) => exp.sensoryBattery !== null && exp.sensoryBattery <= 40,
    },
  ];

  const counted = candidates
    .filter((c) => c.key !== excludeId)
    .map((c) => ({
      ...c,
      count: matchingPairs.filter((p) => c.test(p.exp, p.out)).length,
    }))
    .filter(
      (c) =>
        c.count >= 2 ||
        (matchingPairs.length > 0 && c.count / matchingPairs.length >= 0.5),
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, 2);

  if (counted.length === 0) {
    return {
      hu: 'Külön kiugró kísérő tényező nem azonosítható; figyeld az alvásidőt és a környezeti ingereket.',
      en: 'No single dominant co-logged confounder detected; also check sleep and sensory load.',
    };
  }

  return {
    hu: `Együtt naplózva: ${counted.map((c) => `${c.hu} (${c.count} nap)`).join(', ')}`,
    en: `Co-logged: ${counted.map((c) => `${c.en} (${c.count} days)`).join(', ')}`,
  };
}

function evaluateContingency(
  spec: ContingencySpec,
  activeLogs: DailyLogEntry[],
): ScoredPattern | null {
  const nDays = activeLogs.length;
  const pairs: { exp: DailyLogEntry; out: DailyLogEntry }[] = [];

  if (spec.lag === 0) {
    for (const log of activeLogs) {
      if (spec.isEligible(log, log)) {
        pairs.push({ exp: log, out: log });
      }
    }
  } else {
    for (let i = 0; i < activeLogs.length - 1; i++) {
      const cur = activeLogs[i];
      const next = activeLogs[i + 1];
      if (daysBetweenDateKeys(cur.date, next.date) !== 1) continue;
      if (spec.isEligible(cur, next)) {
        pairs.push({ exp: cur, out: next });
      }
    }
  }

  let exposedMatches = 0;
  let exposedTotal = 0;
  let unexposedMatches = 0;
  let unexposedTotal = 0;
  const matchingPairs: { exp: DailyLogEntry; out: DailyLogEntry }[] = [];

  for (const pair of pairs) {
    const exposed = spec.isExposed(pair.exp);
    const outcome = spec.isOutcome(pair.out);
    if (exposed) {
      exposedTotal++;
      if (outcome) {
        exposedMatches++;
        matchingPairs.push(pair);
      }
    } else {
      unexposedTotal++;
      if (outcome) {
        unexposedMatches++;
      }
    }
  }

  if (exposedMatches < 2 || exposedTotal < 2) return null;

  const rateWith = exposedMatches / exposedTotal;
  const rateWithout = unexposedTotal > 0 ? unexposedMatches / unexposedTotal : 0;
  const rateDiff = rateWith - rateWithout;

  // Reject habits/signals without meaningful signal above baseline:
  // with >=2 control days require +15pp lift over baseline; without >=2 control days require >=75% consistency
  if (unexposedTotal >= 2) {
    if (rateWith < 0.5 || rateDiff < 0.15) return null;
  } else if (rateWith < 0.75) {
    return null;
  }

  const isEarly = nDays < 14 || exposedMatches < 5;
  const isStrong =
    !isEarly && exposedMatches >= 5 && (unexposedTotal < 2 || rateDiff >= 0.2);

  const titles = spec.buildTitles(
    exposedMatches,
    exposedTotal,
    Math.round(rateDiff * 100),
  );
  const confounders = summarizeConfounders(
    matchingPairs,
    spec.excludeConfounderId,
  );

  return {
    rankScore:
      (isStrong ? 10 : 0) +
      exposedMatches * (0.45 + Math.max(0, rateDiff)) +
      (rateDiff >= 0.35 ? 2 : 0),
    insight: {
      id: spec.id,
      strong: isStrong,
      early: isEarly,
      titleHu: titles.hu,
      titleEn: titles.en,
      descHu: isEarly
        ? 'Kezdeti algoritmikus megfigyelés (minimum 14 nap és 5 egybeesés szükséges a biztosabb mintázathoz).'
        : 'Több héten át ismétlődő, alapértéknél gyakoribb együttjárás a saját naplódban — nem orvosi diagnózis.',
      descEn: isEarly
        ? 'Early algorithmic observation (at least 14 logged days and 5 occurrences needed for stronger signal).'
        : 'Repeated co-occurrence above baseline across your logs — descriptive observation, not a diagnosis.',
      confoundersHu: confounders.hu,
      confoundersEn: confounders.en,
      matchingDates: matchingPairs.map((p) => p.out.date.slice(5)),
      nDays,
      status: 'shown',
    },
  };
}

/**
 * Általános, 100% offline determinisztikus együttjárás-felfedező algoritmus.
 * Kiértékeli az alvást, gyógyszeridőzítést, testérzeteket/fájdalmat és az ÖSSZES
 * (beleértve a felhasználó által felvett egyéni) napi szokást/tényezőt, kontingencia-küszöbbel
 * és valódi zavarótényező-számlálással. Soha nem tesz ok-okozati vagy diagnosztikai állítást.
 */
export function computeExplainablePatterns(
  logs: DailyLogEntry[],
  habits: HabitChip[],
): PatternInsight[] {
  const activeLogs = logs
    .filter((l) => !l.isGap)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  if (activeLogs.length < 2) return [];

  const results: ScoredPattern[] = [];

  // 1. Sleep duration (<6h) -> Next-day energy (<55)
  const sleepEnergy = evaluateContingency(
    {
      id: 'pat_sleep_energy',
      lag: 1,
      excludeConfounderId: 'short_sleep',
      isEligible: (cur, next) =>
        cur.sleepHours !== null && next.energyLevel !== null,
      isExposed: (cur) => cur.sleepHours !== null && cur.sleepHours < 6,
      isOutcome: (next) => next.energyLevel !== null && next.energyLevel < 55,
      buildTitles: (m, total) => ({
        hu: `6 óránál kevesebb alvás után másnap alacsonyabb energia (${m} / ${total} alkalom).`,
        en: `Sleep under 6h followed by lower next-day energy (${m} of ${total} times).`,
      }),
    },
    activeLogs,
  );
  if (sleepEnergy) results.push(sleepEnergy);

  // 2. Fragmented sleep (wokeAtNight) -> Next-day sensory or energy drop
  const nightWakeSensory = evaluateContingency(
    {
      id: 'pat_night_wake_sensory',
      lag: 1,
      excludeConfounderId: 'night_wake',
      isEligible: (_cur, next) =>
        next.sensoryBattery !== null || next.energyLevel !== null,
      isExposed: (cur) => cur.wokeAtNight,
      isOutcome: (next) =>
        (next.sensoryBattery !== null && next.sensoryBattery <= 45) ||
        (next.energyLevel !== null && next.energyLevel < 55),
      buildTitles: (m, total) => ({
        hu: `Éjszakai felébredés után másnap alacsonyabb szenzoros vagy testi tartalék (${m} / ${total} alkalom).`,
        en: `Night waking followed by lower next-day sensory or physical reserve (${m} of ${total} times).`,
      }),
    },
    activeLogs,
  );
  if (nightWakeSensory) results.push(nightWakeSensory);

  // 3. Delayed/skipped medication days (<100%) -> Cognitive fog / anxious strain
  const medsCog = evaluateContingency(
    {
      id: 'pat_meds_cog',
      lag: 0,
      excludeConfounderId: 'delayed_meds',
      isEligible: (log) =>
        log.medsTakenPct !== null &&
        (log.emotions.length > 0 || log.chipIds.includes('c_fog')),
      isExposed: (log) => log.medsTakenPct !== null && log.medsTakenPct < 100,
      isOutcome: (log) =>
        log.chipIds.includes('c_fog') ||
        log.emotions.some((e) => STRAIN_EMOTIONS.has(e)),
      buildTitles: (m, total) => ({
        hu: `Késleltetett vagy kihagyott adag napján szorongó/terhelt állapot (${m} / ${total} nap).`,
        en: `On delayed or skipped dose days: strained or foggy state (${m} of ${total} days).`,
      }),
    },
    activeLogs,
  );
  if (medsCog) results.push(medsCog);

  // 4. Dynamic Habit / Factor Discovery across ALL built-in + user custom chips
  for (const habit of habits) {
    // Skip c_fog as exposure here since it is primarily an observed cognitive state
    if (habit.id === 'c_fog') continue;

    const candidates: ContingencySpec[] = [
      {
        id: habit.id === 'c_walk' ? 'pat_walk_calm' : `pat_habit_${habit.id}_calm_same`,
        lag: 0,
        excludeConfounderId: habit.id,
        isEligible: (log) => log.emotions.length > 0,
        isExposed: (log) => log.chipIds.includes(habit.id),
        isOutcome: (log) => log.emotions.some((e) => CALM_EMOTIONS.has(e)),
        buildTitles: (m, total) => ({
          hu: `„${habit.labelHu}” és nyugodt/fókuszált közérzet ugyanazon a napon (${m} / ${total} nap).`,
          en: `"${habit.labelEn}" and calm/focused state on the same day (${m} of ${total} days).`,
        }),
      },
      {
        id: `pat_habit_${habit.id}_low_reserve_same`,
        lag: 0,
        excludeConfounderId: habit.id,
        isEligible: (log) =>
          log.sensoryBattery !== null || log.energyLevel !== null,
        isExposed: (log) => log.chipIds.includes(habit.id),
        isOutcome: (log) =>
          (log.sensoryBattery !== null && log.sensoryBattery <= 45) ||
          (log.energyLevel !== null && log.energyLevel < 55),
        buildTitles: (m, total) => ({
          hu: `„${habit.labelHu}” napján alacsonyabb energia vagy szenzoros tartalék (${m} / ${total} nap).`,
          en: `"${habit.labelEn}" co-occurs with lower energy or sensory reserve (${m} of ${total} days).`,
        }),
      },
      {
        id: `pat_habit_${habit.id}_low_reserve_next`,
        lag: 1,
        excludeConfounderId: habit.id,
        isEligible: (_cur, next) =>
          next.sensoryBattery !== null || next.energyLevel !== null,
        isExposed: (cur) => cur.chipIds.includes(habit.id),
        isOutcome: (next) =>
          (next.sensoryBattery !== null && next.sensoryBattery <= 45) ||
          (next.energyLevel !== null && next.energyLevel < 55),
        buildTitles: (m, total) => ({
          hu: `„${habit.labelHu}” után másnap alacsonyabb energia vagy szenzoros tartalék (${m} / ${total} alkalom).`,
          en: `After "${habit.labelEn}", lower next-day energy or sensory reserve (${m} of ${total} times).`,
        }),
      },
      {
        id: `pat_habit_${habit.id}_strain_same`,
        lag: 0,
        excludeConfounderId: habit.id,
        isEligible: (log) =>
          log.emotions.length > 0 || log.chipIds.includes('c_fog'),
        isExposed: (log) => log.chipIds.includes(habit.id),
        isOutcome: (log) =>
          log.chipIds.includes('c_fog') ||
          log.emotions.some((e) => STRAIN_EMOTIONS.has(e)),
        buildTitles: (m, total) => ({
          hu: `„${habit.labelHu}” és feszült/túlterhelt állapot együttjárása (${m} / ${total} nap).`,
          en: `"${habit.labelEn}" co-occurs with strained or overwhelmed state (${m} of ${total} days).`,
        }),
      },
      {
        id: `pat_habit_${habit.id}_body_same`,
        lag: 0,
        excludeConfounderId: habit.id,
        isEligible: (log) =>
          (log.painLevel !== undefined && log.painLevel !== null) ||
          log.bodySensations.length > 0,
        isExposed: (log) => log.chipIds.includes(habit.id),
        isOutcome: (log) =>
          (log.painLevel !== undefined &&
            log.painLevel !== null &&
            log.painLevel >= 4) ||
          log.bodySensations.length >= 2,
        buildTitles: (m, total) => ({
          hu: `„${habit.labelHu}” napján gyakoribb testi jelzés vagy fájdalom (>=4/10) (${m} / ${total} nap).`,
          en: `"${habit.labelEn}" co-occurs with elevated pain (>=4/10) or body signals (${m} of ${total} days).`,
        }),
      },
    ];

    // Keep at most the single strongest pattern per habit so Insights stays concise
    let bestForHabit: ScoredPattern | null = null;
    for (const spec of candidates) {
      const evaluated = evaluateContingency(spec, activeLogs);
      if (evaluated && (!bestForHabit || evaluated.rankScore > bestForHabit.rankScore)) {
        bestForHabit = evaluated;
      }
    }
    if (bestForHabit) results.push(bestForHabit);
  }

  // 5. Sensory overload (<=35%) -> Elevated next-day pain / somatic load
  const sensoryBodyLoad = evaluateContingency(
    {
      id: 'pat_sensory_body_next',
      lag: 1,
      excludeConfounderId: 'low_sensory',
      isEligible: (cur, next) =>
        cur.sensoryBattery !== null &&
        (next.painLevel !== undefined || next.bodySensations.length > 0),
      isExposed: (cur) => cur.sensoryBattery !== null && cur.sensoryBattery <= 35,
      isOutcome: (next) =>
        (next.painLevel !== undefined &&
          next.painLevel !== null &&
          next.painLevel >= 4) ||
        next.bodySensations.length >= 2,
      buildTitles: (m, total) => ({
        hu: `Szenzoros kimerülés (<=35%) után másnap gyakoribb testi jelzés/fájdalom (${m} / ${total} alkalom).`,
        en: `Sensory depletion (<=35%) followed by next-day body signals or pain (${m} of ${total} times).`,
      }),
    },
    activeLogs,
  );
  if (sensoryBodyLoad) results.push(sensoryBodyLoad);

  return results
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 6)
    .map((r) => r.insight);
}
