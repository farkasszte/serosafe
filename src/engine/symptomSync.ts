import { getSelectedBodyRegions } from '@/data/choirBodyRegions';
import { BODY_SENSATIONS } from '@/data/substances';
import type {
  BodyRegionId,
  DailyLogEntry,
  DayPart,
  ObservableSymptomEntry,
  ObservableSymptomFlags,
  PainQualityId,
} from '@/types/serosafe';

export const BODY_SENSATION_BY_ID = new Map(
  BODY_SENSATIONS.map((s) => [s.id, s]),
);

/** Computes all red-flag boolean fields in a single pass over sensation IDs. */
export function mapFlagsFromSensations(
  sensationIds: string[],
): ObservableSymptomFlags {
  const flags: ObservableSymptomFlags = {
    hasInvoluntaryTwitching: false,
    hasTremor: false,
    hasMuscleStiffness: false,
    hasHeavySweating: false,
    hasSevereRestlessnessOrConfusion: false,
    hasGIDistress: false,
    hasRestingTachycardia: false,
  };

  for (const sid of sensationIds) {
    const field = BODY_SENSATION_BY_ID.get(sid)?.mapsToField;
    if (field) {
      flags[field] = true;
    }
  }
  return flags;
}

/** True if the symptom entry has any measured vital, boolean sign, or selected sensation. */
export function hasActiveSymptomData(
  sym: ObservableSymptomEntry | undefined,
): boolean {
  if (!sym) return false;
  return Boolean(
    sym.measuredTempCelsius !== undefined ||
      sym.measuredHeartRateBpm !== undefined ||
      sym.selectedSensations.length > 0 ||
      sym.hasInvoluntaryTwitching ||
      sym.hasTremor ||
      sym.hasMuscleStiffness ||
      sym.hasHeavySweating ||
      sym.hasSevereRestlessnessOrConfusion ||
      sym.hasGIDistress ||
      sym.hasRestingTachycardia,
  );
}

function appendDayPart(
  dayParts: DayPart[],
  activeDayPart?: DayPart,
): DayPart[] {
  if (!activeDayPart || dayParts.includes(activeDayPart)) return dayParts;
  return [...dayParts, activeDayPart];
}

function buildBaseSymptom(prev: DailyLogEntry): ObservableSymptomEntry {
  return (
    prev.symptomEntry ?? {
      id: `sym_${prev.date}`,
      timestampIso: new Date().toISOString(),
      onsetHoursAgo: 1,
      ...mapFlagsFromSensations(prev.bodySensations),
      selectedBodyRegions: prev.bodyRegions,
      selectedSensations: prev.bodySensations,
    }
  );
}

export function applyBodyPartsUpdate(
  prev: DailyLogEntry,
  partIds: string[],
  derivedRegions: BodyRegionId[],
  activeDayPart?: DayPart,
): DailyLogEntry {
  const prunedSensations = prev.bodySensations.filter((sid) => {
    const def = BODY_SENSATION_BY_ID.get(sid);
    return def ? derivedRegions.includes(def.region) : false;
  });
  const mappedFlags = mapFlagsFromSensations(prunedSensations);

  let nextSymptom: ObservableSymptomEntry | undefined;
  if (prev.symptomEntry) {
    const candidate: ObservableSymptomEntry = {
      ...prev.symptomEntry,
      ...mappedFlags,
      timestampIso: new Date().toISOString(),
      selectedBodyRegions: derivedRegions,
      selectedSensations: prunedSensations,
    };
    nextSymptom = hasActiveSymptomData(candidate) ? candidate : undefined;
  }

  return {
    ...prev,
    isGap: false,
    dayPartsLogged: appendDayPart(prev.dayPartsLogged, activeDayPart),
    selectedBodyPartIds: partIds,
    bodyRegions: derivedRegions,
    bodySensations: prunedSensations,
    painLevel: derivedRegions.length === 0 ? 0 : prev.painLevel,
    painQualities: derivedRegions.length === 0 ? [] : prev.painQualities,
    symptomEntry: nextSymptom,
  };
}

export function applySensationToggle(
  prev: DailyLogEntry,
  sensationId: string,
  activeDayPart?: DayPart,
): DailyLogEntry {
  const exists = prev.bodySensations.includes(sensationId);
  const bodySensations = exists
    ? prev.bodySensations.filter((id) => id !== sensationId)
    : [...prev.bodySensations, sensationId];

  const selectedParts = prev.selectedBodyPartIds ?? [];
  const sensationDef = BODY_SENSATION_BY_ID.get(sensationId);
  let activeRegionSet: BodyRegionId[];

  if (selectedParts.length > 0) {
    activeRegionSet = getSelectedBodyRegions(
      selectedParts,
      prev.bodyRegions.includes('skin'),
    );
  } else {
    const regionSet = new Set<BodyRegionId>(prev.bodyRegions);
    if (!exists && sensationDef) {
      regionSet.add(sensationDef.region);
    }
    activeRegionSet = Array.from(regionSet);
  }

  const prevSym = buildBaseSymptom(prev);
  const mappedFlags = mapFlagsFromSensations(bodySensations);
  const candidateSym: ObservableSymptomEntry = {
    ...prevSym,
    ...mappedFlags,
    timestampIso: new Date().toISOString(),
    selectedBodyRegions: activeRegionSet,
    selectedSensations: bodySensations,
  };

  return {
    ...prev,
    isGap: false,
    dayPartsLogged: appendDayPart(prev.dayPartsLogged, activeDayPart),
    bodyRegions: activeRegionSet,
    bodySensations,
    symptomEntry: hasActiveSymptomData(candidateSym) ? candidateSym : undefined,
  };
}

export function applyPainLevelChange(
  prev: DailyLogEntry,
  level: number,
  activeDayPart?: DayPart,
): DailyLogEntry {
  return {
    ...prev,
    isGap: false,
    dayPartsLogged: appendDayPart(prev.dayPartsLogged, activeDayPart),
    painLevel: level,
    painQualities: level === 0 ? [] : prev.painQualities,
  };
}

export function applyPainQualityToggle(
  prev: DailyLogEntry,
  quality: PainQualityId,
): DailyLogEntry {
  const current = prev.painQualities ?? [];
  const exists = current.includes(quality);
  return {
    ...prev,
    isGap: false,
    painQualities: exists
      ? current.filter((q) => q !== quality)
      : [...current, quality],
  };
}

export function applySymptomFieldUpdate<K extends keyof ObservableSymptomEntry>(
  prev: DailyLogEntry,
  field: K,
  value: ObservableSymptomEntry[K],
): DailyLogEntry {
  const sym = buildBaseSymptom(prev);
  const candidateSym: ObservableSymptomEntry = {
    ...sym,
    timestampIso: new Date().toISOString(),
    [field]: value,
  };
  return {
    ...prev,
    isGap: false,
    symptomEntry: hasActiveSymptomData(candidateSym) ? candidateSym : undefined,
  };
}
