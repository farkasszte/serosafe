export type SerotonergicMechanism =
  | 'SRI'
  | 'MAOI'
  | 'PRECURSOR'
  | 'AGONIST'
  | 'CYP_INHIBITOR_HYPERICUM'
  | 'MODULATOR';

export type DrugCategory =
  | 'SSRI'
  | 'SNRI'
  | 'TCA'
  | 'MAOI'
  | 'ATYPICAL_ANTIDEPRESSANT'
  | 'OPIOID_ANALGESIC'
  | 'TRIPTAN'
  | 'OTC_SUPPLEMENT'
  | 'ANTIPSYCHOTIC_NMS'
  | 'ADHD_STIMULANT_NON_SERO'
  | 'SLEEP_NON_SERO'
  | 'OTHER';

export interface CuratedSubstance {
  id: string;
  nameHu: string;
  nameEn: string;
  drugClass: DrugCategory;
  examplesHu: string[];
  isOTCOrSupplement: boolean;
  mechanisms: SerotonergicMechanism[];
  clinicalWashoutDays: number;
  withdrawalCaution: boolean;
  sourceRef: string;
  notesHu: string;
  notesEn: string;
}

export interface CoMedicationOption {
  id: string;
  nameHu: string;
  nameEn: string;
  drugClass: DrugCategory;
  examplesHu: string[];
  isSerotonergic: false;
  nmsWatch: boolean;
  withdrawalCaution: boolean;
  notesHu: string;
  notesEn: string;
}

export type MedicationStatus = 'PENDING' | 'TOOK' | 'LATER' | 'SKIPPED';

export interface UserMedication {
  id: string;
  substanceId?: string;
  coMedId?: string;
  customName: string;
  doseText: string;
  scheduleTime: string;
  lastTakenIso: string;
  isDiscontinued: boolean;
  discontinuedAtIso?: string;
  todayStatus: MedicationStatus;
  todayStatusDate?: string; // YYYY-MM-DD of todayStatus (for midnight reset)
  withdrawalCaution: boolean;
  nmsWatch?: boolean;
  isOTCOrSupplement?: boolean;
  skipHistoryHu: string;
  skipHistoryEn: string;
}

export type BodyRegionId =
  | 'head'
  | 'mouth'
  | 'throat'
  | 'chest'
  | 'stomach'
  | 'arms'
  | 'legs'
  | 'skin';

export type PainQualityId =
  | 'sharp'
  | 'burning'
  | 'pressing'
  | 'throbbing'
  | 'cramping'
  | 'dull'
  | 'tingling';

export interface PainQualityOption {
  id: PainQualityId;
  labelHu: string;
  labelEn: string;
}

export interface EmotionModelData {
  willcox?: string[]; // e.g. ['w_peaceful', 'w_anxious']
}

export interface ObservableSymptomFlags {
  hasInvoluntaryTwitching: boolean;
  hasTremor: boolean;
  hasMuscleStiffness: boolean;
  hasHeavySweating: boolean;
  hasSevereRestlessnessOrConfusion: boolean;
  hasGIDistress: boolean;
  hasRestingTachycardia?: boolean;
}

export interface BodySensation {
  id: string;
  region: BodyRegionId;
  labelHu: string;
  labelEn: string;
  hintHu: string;
  hintEn: string;
  isRedFlag: boolean;
  mapsToField?: keyof ObservableSymptomFlags;
}

export interface ObservableSymptomEntry extends ObservableSymptomFlags {
  id: string;
  timestampIso: string;
  onsetHoursAgo: number;
  measuredTempCelsius?: number;
  measuredHeartRateBpm?: number;
  selectedBodyRegions: BodyRegionId[];
  selectedSensations: string[];
}

export type ActionGuidanceLevel =
  | 'INFO_LOGGED'
  | 'CONSULT'
  | 'CALL_EMERGENCY_112';

export interface WashoutExposureInfo {
  medicationId: string;
  name: string;
  substance: CuratedSubstance;
  isDiscontinued: boolean;
  isActiveExposure: boolean;
  isInWashoutWindow: boolean;
  daysElapsedSinceStop: number;
  daysRemainingInWashout: number;
}

export interface StructuredAssessment {
  level: ActionGuidanceLevel;
  activeSerotonergicCount: number;
  exposures: WashoutExposureInfo[];
  hasHighRiskCombination: boolean;
  hasContraindicatedMAOI: boolean;
  hasNmsOrSepsisConcern: boolean;
  summaryReasonsHu: string[];
  summaryReasonsEn: string[];
  sources: string[];
}

export type EmotionQuadrant = 'calm' | 'low' | 'tense' | 'wired';

export interface EmotionWheelNode {
  id: string;
  quadrant: EmotionQuadrant;
  labelHu: string;
  labelEn: string;
  score: {
    mood?: number;
    energy?: number;
    cognitive?: number;
  };
}

export type DayPart =
  | 'morning'
  | 'forenoon'
  | 'midday'
  | 'afternoon'
  | 'evening'
  | 'night';

export type IntentTag = 'decision' | 'objective' | 'observation' | string;

export interface HabitChip {
  id: string;
  group: 'activity' | 'cognitive' | 'social' | 'sleep' | 'substances';
  labelHu: string;
  labelEn: string;
  intent: IntentTag;
  onGraph?: boolean;
  count?: number;
}

export interface DailyLogEntry {
  date: string; // YYYY-MM-DD
  isGap?: boolean;
  dayPartsLogged: DayPart[];
  emotions: string[];
  energyLevel: number | null; // 0-100
  sensoryBattery: number | null; // 0-100
  sleepHours: number | null; // 0-14
  wokeAtNight: boolean;
  bodyRegions: BodyRegionId[];
  bodySensations: string[];
  selectedBodyPartIds?: string[];
  painLevel?: number | null; // 0-10 NRS
  painQualities?: PainQualityId[];
  emotionModelData?: EmotionModelData;
  chipIds: string[];
  note: string;
  addedLater: boolean;
  medsTakenPct: number | null;
  decisionNote?: string;
  reactionObserved?: string;
  symptomEntry?: ObservableSymptomEntry;
}

export interface PatternInsight {
  id: string;
  strong: boolean;
  early?: boolean;
  titleHu: string;
  titleEn: string;
  descHu: string;
  descEn: string;
  confoundersHu: string;
  confoundersEn: string;
  matchingDates: string[];
  nDays: number;
  status: 'shown' | 'kept' | 'hidden' | 'wrong';
}

export interface CommunicationProfile {
  patientNameOptional: string;
  barrierStatementHu: string;
  barrierStatementEn: string;
  doInstructionsHu: string[];
  doInstructionsEn: string[];
  sensorySensitivitiesHu: string[];
  sensorySensitivitiesEn: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export interface DoctorReferenceNote {
  authorLabelHu: string;
  authorLabelEn: string;
  dateIso: string;
  noteHu: string;
  noteEn: string;
}

export type PageTab = 'today' | 'meds' | 'calendar' | 'insights' | 'safety';

export interface AppSettings {
  lang: 'hu' | 'en';
  theme: 'light' | 'dark';
  reducedMotion: boolean;
  hidePercentages: boolean;
  desktopFrameMode: 'responsive' | 'mobile-preview';
  pinEnabled: boolean;
  allowEmergencyWithoutPin: boolean;
  profileMode: 'demo' | 'clean';
}

export interface SeroSafeState {
  settings: AppSettings;
  medications: UserMedication[];
  dailyLogs: DailyLogEntry[];
  habits: HabitChip[];
  patterns: PatternInsight[];
  communicationProfile: CommunicationProfile;
  doctorNote: DoctorReferenceNote | null;
  selectedDate: string;
  activeDayPart: DayPart;
}
