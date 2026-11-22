import { createCleanDataset } from '@/services/demoData';
import type {
  DailyLogEntry,
  ObservableSymptomEntry,
  SeroSafeState,
  UserMedication,
} from '@/types/serosafe';
import { normalizeDayPart } from '@/utils/date';

function isPlainRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Validates and safely normalizes an imported JSON backup onto a complete SeroSafeState shape.
 * Returns `null` if required arrays or item fields are missing/malformed.
 */
export function validateImportedState(raw: unknown): SeroSafeState | null {
  if (!isPlainRecord(raw)) return null;
  if (!Array.isArray(raw.dailyLogs) || !Array.isArray(raw.medications)) {
    return null;
  }

  for (const med of raw.medications) {
    if (!isPlainRecord(med)) return null;
    if (typeof med.id !== 'string' || !med.id.trim()) return null;
    if (typeof med.customName !== 'string' || !med.customName.trim()) return null;
  }

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  for (const log of raw.dailyLogs) {
    if (!isPlainRecord(log)) return null;
    if (typeof log.date !== 'string' || !dateRe.test(log.date)) return null;
  }

  const rawSettings = isPlainRecord(raw.settings) ? raw.settings : {};
  const lang = rawSettings.lang === 'en' ? 'en' : 'hu';
  const theme = rawSettings.theme === 'dark' ? 'dark' : 'light';
  const baseline = createCleanDataset(lang, theme);

  const normalizedLogs: DailyLogEntry[] = raw.dailyLogs.map((entry) => {
    const rec = entry as unknown as DailyLogEntry;
    return {
      date: rec.date,
      isGap: Boolean(rec.isGap),
      dayPartsLogged: Array.isArray(rec.dayPartsLogged)
        ? Array.from(
            new Set(rec.dayPartsLogged.map((dp) => normalizeDayPart(dp))),
          )
        : [],
      emotions: Array.isArray(rec.emotions) ? rec.emotions : [],
      energyLevel:
        typeof rec.energyLevel === 'number' ? rec.energyLevel : null,
      sensoryBattery:
        typeof rec.sensoryBattery === 'number' ? rec.sensoryBattery : null,
      sleepHours: typeof rec.sleepHours === 'number' ? rec.sleepHours : null,
      wokeAtNight: Boolean(rec.wokeAtNight),
      bodyRegions: Array.isArray(rec.bodyRegions) ? rec.bodyRegions : [],
      bodySensations: Array.isArray(rec.bodySensations) ? rec.bodySensations : [],
      selectedBodyPartIds: Array.isArray(rec.selectedBodyPartIds)
        ? rec.selectedBodyPartIds
        : [],
      painLevel: typeof rec.painLevel === 'number' ? rec.painLevel : 0,
      painQualities: Array.isArray(rec.painQualities) ? rec.painQualities : [],
      emotionModelData: isPlainRecord(rec.emotionModelData)
        ? (rec.emotionModelData as DailyLogEntry['emotionModelData'])
        : undefined,
      chipIds: Array.isArray(rec.chipIds) ? rec.chipIds : [],
      note: typeof rec.note === 'string' ? rec.note : '',
      addedLater: Boolean(rec.addedLater),
      medsTakenPct:
        typeof rec.medsTakenPct === 'number' ? rec.medsTakenPct : null,
      decisionNote:
        typeof rec.decisionNote === 'string' ? rec.decisionNote : undefined,
      reactionObserved:
        typeof rec.reactionObserved === 'string' ? rec.reactionObserved : undefined,
      symptomEntry: isPlainRecord(rec.symptomEntry)
        ? (rec.symptomEntry as unknown as ObservableSymptomEntry)
        : undefined,
    };
  });

  const normalizedMeds: UserMedication[] = raw.medications.map((m) => {
    const rec = m as unknown as UserMedication;
    return {
      id: rec.id,
      substanceId: typeof rec.substanceId === 'string' ? rec.substanceId : undefined,
      coMedId: typeof rec.coMedId === 'string' ? rec.coMedId : undefined,
      customName: rec.customName,
      doseText: typeof rec.doseText === 'string' ? rec.doseText : '',
      scheduleTime: typeof rec.scheduleTime === 'string' ? rec.scheduleTime : '',
      lastTakenIso: typeof rec.lastTakenIso === 'string' ? rec.lastTakenIso : '',
      isDiscontinued: Boolean(rec.isDiscontinued),
      discontinuedAtIso:
        typeof rec.discontinuedAtIso === 'string'
          ? rec.discontinuedAtIso
          : undefined,
      todayStatus:
        rec.todayStatus === 'TOOK' ||
        rec.todayStatus === 'LATER' ||
        rec.todayStatus === 'SKIPPED' ||
        rec.todayStatus === 'PENDING'
          ? rec.todayStatus
          : 'PENDING',
      todayStatusDate:
        typeof rec.todayStatusDate === 'string' ? rec.todayStatusDate : undefined,
      withdrawalCaution: Boolean(rec.withdrawalCaution),
      nmsWatch: Boolean(rec.nmsWatch),
      isOTCOrSupplement: Boolean(rec.isOTCOrSupplement),
      skipHistoryHu: typeof rec.skipHistoryHu === 'string' ? rec.skipHistoryHu : '',
      skipHistoryEn: typeof rec.skipHistoryEn === 'string' ? rec.skipHistoryEn : '',
    };
  });

  const rawProfile = isPlainRecord(raw.communicationProfile)
    ? raw.communicationProfile
    : {};

  return {
    settings: {
      ...baseline.settings,
      lang,
      theme,
      reducedMotion: Boolean(rawSettings.reducedMotion),
      hidePercentages: Boolean(rawSettings.hidePercentages),
      desktopFrameMode:
        rawSettings.desktopFrameMode === 'mobile-preview'
          ? 'mobile-preview'
          : 'responsive',
      pinEnabled: Boolean(rawSettings.pinEnabled),
      allowEmergencyWithoutPin:
        rawSettings.allowEmergencyWithoutPin === undefined
          ? true
          : Boolean(rawSettings.allowEmergencyWithoutPin),
      profileMode:
        rawSettings.profileMode === 'demo' ? 'demo' : baseline.settings.profileMode,
    },
    medications: normalizedMeds,
    dailyLogs: normalizedLogs,
    habits: Array.isArray(raw.habits) ? raw.habits : baseline.habits,
    patterns: Array.isArray(raw.patterns) ? raw.patterns : [],
    communicationProfile: {
      ...baseline.communicationProfile,
      patientNameOptional:
        typeof rawProfile.patientNameOptional === 'string'
          ? rawProfile.patientNameOptional
          : baseline.communicationProfile.patientNameOptional,
      barrierStatementHu:
        typeof rawProfile.barrierStatementHu === 'string'
          ? rawProfile.barrierStatementHu
          : baseline.communicationProfile.barrierStatementHu,
      barrierStatementEn:
        typeof rawProfile.barrierStatementEn === 'string'
          ? rawProfile.barrierStatementEn
          : baseline.communicationProfile.barrierStatementEn,
      doInstructionsHu: Array.isArray(rawProfile.doInstructionsHu)
        ? rawProfile.doInstructionsHu.filter((x): x is string => typeof x === 'string')
        : baseline.communicationProfile.doInstructionsHu,
      doInstructionsEn: Array.isArray(rawProfile.doInstructionsEn)
        ? rawProfile.doInstructionsEn.filter((x): x is string => typeof x === 'string')
        : baseline.communicationProfile.doInstructionsEn,
      sensorySensitivitiesHu: Array.isArray(rawProfile.sensorySensitivitiesHu)
        ? rawProfile.sensorySensitivitiesHu.filter(
            (x): x is string => typeof x === 'string',
          )
        : baseline.communicationProfile.sensorySensitivitiesHu,
      sensorySensitivitiesEn: Array.isArray(rawProfile.sensorySensitivitiesEn)
        ? rawProfile.sensorySensitivitiesEn.filter(
            (x): x is string => typeof x === 'string',
          )
        : baseline.communicationProfile.sensorySensitivitiesEn,
      emergencyContactName:
        typeof rawProfile.emergencyContactName === 'string'
          ? rawProfile.emergencyContactName
          : baseline.communicationProfile.emergencyContactName,
      emergencyContactPhone:
        typeof rawProfile.emergencyContactPhone === 'string'
          ? rawProfile.emergencyContactPhone
          : baseline.communicationProfile.emergencyContactPhone,
    },
    doctorNote: isPlainRecord(raw.doctorNote)
      ? (raw.doctorNote as unknown as SeroSafeState['doctorNote'])
      : null,
    selectedDate:
      typeof raw.selectedDate === 'string' && dateRe.test(raw.selectedDate)
        ? raw.selectedDate
        : baseline.selectedDate,
    activeDayPart: normalizeDayPart(raw.activeDayPart),
  };
}
