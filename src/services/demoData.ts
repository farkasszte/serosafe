import type {
  CommunicationProfile,
  DailyLogEntry,
  DoctorReferenceNote,
  HabitChip,
  PatternInsight,
  SeroSafeState,
  UserMedication,
} from '@/types/serosafe';
import { computeExplainablePatterns } from '@/engine/safetyEngine';

export function formatIsoDateLocal(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDaysAgoIso(daysAgo: number, hour = 8): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const DEFAULT_HABITS: HabitChip[] = [
  {
    id: 'c_walk',
    group: 'activity',
    labelHu: 'Séta / természet',
    labelEn: 'Walk / outdoors',
    intent: 'decision',
    onGraph: true,
    count: 16,
  },
  {
    id: 'c_focus',
    group: 'cognitive',
    labelHu: 'Mélyfókusz / munka',
    labelEn: 'Deep focus / work',
    intent: 'objective',
    onGraph: true,
    count: 14,
  },
  {
    id: 'c_quiet',
    group: 'activity',
    labelHu: 'Zajszűrés / csendes szünet',
    labelEn: 'Noise break / quiet rest',
    intent: 'decision',
    onGraph: false,
    count: 12,
  },
  {
    id: 'c_caffeine',
    group: 'substances',
    labelHu: 'Kávé / koffein',
    labelEn: 'Coffee / caffeine',
    intent: 'decision',
    onGraph: true,
    count: 19,
  },
  {
    id: 'c_fog',
    group: 'cognitive',
    labelHu: 'Ködös agy / lassabb indulás',
    labelEn: 'Mental fog / hard to start',
    intent: 'observation',
    onGraph: true,
    count: 10,
  },
  {
    id: 'c_masking',
    group: 'social',
    labelHu: 'Maszkolás fáradtság',
    labelEn: 'Masking fatigue',
    intent: 'observation',
    onGraph: true,
    count: 11,
  },
  {
    id: 'c_ate',
    group: 'activity',
    labelHu: 'Rendszeres étkezés & víz',
    labelEn: 'Regular food & water',
    intent: 'objective',
    onGraph: false,
    count: 20,
  },
];

export const DEFAULT_COMMUNICATION_PROFILE: CommunicationProfile = {
  patientNameOptional: '',
  barrierStatementHu:
    'Autista / neurodivergens vagyok. Akut stressz vagy fájdalom alatt szelektív mutizmus vagy lefagyás léphet fel, így nem biztos, hogy szóban tudok válaszolni.',
  barrierStatementEn:
    'I am autistic / neurodivergent. Under acute stress or pain I may experience selective mutism or shutdown and be unable to speak.',
  doInstructionsHu: [
    'Tegyen fel rövid, eldöntendő (Igen / Nem) kérdéseket, és adjon időt a válaszra.',
    'Kerülje a váratlan fizikai érintést előzetes szóbeli jelzés nélkül.',
    'Ha lehetséges, csökkentse a vakító fényt és az erős zajt.',
  ],
  doInstructionsEn: [
    'Ask short Yes / No questions and allow extra processing time.',
    'Avoid sudden physical contact without telling me first.',
    'Reduce bright lights and loud noise if possible.',
  ],
  sensorySensitivitiesHu: [
    'Erős sziréna / villogó fények túlterhelést okoznak',
    'Érintés csak előzetes jelzéssel',
  ],
  sensorySensitivitiesEn: [
    'Bright flashing lights and loud sounds cause overload',
    'Announce before physical touch',
  ],
  emergencyContactName: 'Támogató kontakt',
  emergencyContactPhone: '+36 30 000 0000',
};

export const DEMO_DOCTOR_NOTE: DoctorReferenceNote = {
  authorLabelHu: 'Kezelőorvosi támogató jegyzet',
  authorLabelEn: 'Clinician supportive note',
  dateIso: getDaysAgoIso(4, 14).slice(0, 10),
  noteHu:
    'A korábbi naplókban a 6 óránál rövidebb alvás és a 14:00 utáni koffein gyakran együtt járt az esti nyugtalansággal. Ez csak tájékoztató megfigyelés, nem adagolási utasítás.',
  noteEn:
    'In earlier logs, sleep under 6 hours and caffeine after 14:00 frequently co-occurred with evening restlessness. Reference observation only — not a dosing order.',
};

export function createDemoMedications(): UserMedication[] {
  const todayKey = formatIsoDateLocal(new Date());
  return [
    {
      id: 'med_sertraline',
      substanceId: 'sertraline',
      customName: 'Szertralin (Zoloft)',
      doseText: '50 mg',
      scheduleTime: '08:00',
      lastTakenIso: getDaysAgoIso(0, 8),
      isDiscontinued: false,
      todayStatus: 'TOOK',
      todayStatusDate: todayKey,
      withdrawalCaution: true,
      skipHistoryHu:
        'A korábbi 4 kihagyott napodon ezek jelentek meg a naplóban: szorongó (3x), ködös agy (2x).',
      skipHistoryEn:
        'On your previous 4 skipped days you logged: anxious (3x), mental fog (2x).',
    },
    {
      id: 'med_mph',
      coMedId: 'methylphenidate',
      customName: 'Metilfenidát (Ritalin)',
      doseText: '18 mg',
      scheduleTime: '08:30',
      lastTakenIso: getDaysAgoIso(0, 8),
      isDiscontinued: false,
      todayStatus: 'TOOK',
      todayStatusDate: todayKey,
      withdrawalCaution: false,
      skipHistoryHu:
        'A korábbi 3 kihagyott napon: lassabb indulás (3x), alacsony energia (2x).',
      skipHistoryEn:
        'On your previous 3 skipped days: hard to start (3x), low energy (2x).',
    },
    {
      id: 'med_melatonin',
      coMedId: 'melatonin',
      customName: 'Melatonin',
      doseText: '3 mg',
      scheduleTime: '22:00',
      lastTakenIso: getDaysAgoIso(1, 22),
      isDiscontinued: false,
      todayStatus: 'PENDING',
      todayStatusDate: todayKey,
      withdrawalCaution: false,
      skipHistoryHu: 'Nincs rögzített kihagyási tünet.',
      skipHistoryEn: 'No skipped-dose pattern recorded yet.',
    },
    {
      id: 'med_fluoxetine_washout',
      substanceId: 'fluoxetine',
      customName: 'Fluoxetin (Prozac)',
      doseText: '20 mg',
      scheduleTime: 'Leállítva 12 napja',
      lastTakenIso: getDaysAgoIso(12, 8),
      discontinuedAtIso: getDaysAgoIso(12, 8),
      isDiscontinued: true,
      todayStatus: 'SKIPPED',
      todayStatusDate: todayKey,
      withdrawalCaution: true,
      skipHistoryHu:
        'Gyógyszerváltás miatt leállítva — 35 napos kiürülési ablak figyelése aktív.',
      skipHistoryEn:
        'Stopped due to medication switch — 35-day washout window active.',
    },
  ];
}

export function createDemoLogs(): DailyLogEntry[] {
  const logs: DailyLogEntry[] = [];
  const today = new Date();

  for (let daysAgo = 44; daysAgo >= 0; daysAgo--) {
    const d = new Date(today);
    d.setDate(today.getDate() - daysAgo);
    const dateKey = formatIsoDateLocal(d);

    // Természetes szünetek (Gap napok, sosem piros hiba)
    const isGap = daysAgo === 38 || daysAgo === 29 || daysAgo === 19 || daysAgo === 9;
    if (isGap) {
      logs.push({
        date: dateKey,
        isGap: true,
        dayPartsLogged: [],
        emotions: [],
        energyLevel: null,
        sensoryBattery: null,
        sleepHours: null,
        wokeAtNight: false,
        bodyRegions: [],
        bodySensations: [],
        chipIds: [],
        note: '',
        addedLater: false,
        medsTakenPct: null,
      });
      continue;
    }

    const isToday = daysAgo === 0;
    const shortSleep = daysAgo % 6 === 2;
    const delayedMeds = daysAgo % 7 === 4;
    const walkedToday = daysAgo % 3 === 0 || isToday;
    const hadCaffeine = daysAgo % 2 === 0;

    const sleepHours = shortSleep ? 5.2 : 7.3;
    const prevShortSleep = (daysAgo + 1) % 6 === 2;
    const baseEnergy = prevShortSleep ? 42 : 68 + ((daysAgo * 7) % 16);
    const energyLevel = isToday ? 74 : Math.min(95, Math.max(30, baseEnergy));
    const sensoryBattery = isToday
      ? 68
      : Math.min(92, Math.max(28, 72 - (hadCaffeine && shortSleep ? 24 : 0) + (walkedToday ? 10 : 0)));

    const emotions: string[] = [];
    if (walkedToday && !delayedMeds) {
      emotions.push('em_calm', 'em_content');
    } else if (delayedMeds) {
      emotions.push('em_anxious', 'em_confused');
    } else if (prevShortSleep) {
      emotions.push('em_drained', 'em_heavy');
    } else {
      emotions.push('em_focused', 'em_steady');
    }

    const chipIds: string[] = ['c_ate'];
    if (walkedToday) chipIds.push('c_walk');
    if (hadCaffeine) chipIds.push('c_caffeine');
    if (delayedMeds) chipIds.push('c_fog');
    if (!prevShortSleep) chipIds.push('c_focus');
    if (daysAgo % 5 === 1) chipIds.push('c_masking');
    if (daysAgo % 4 === 0) chipIds.push('c_quiet');

    const bodyRegions: DailyLogEntry['bodyRegions'] = isToday
      ? []
      : delayedMeds
        ? ['head', 'chest']
        : prevShortSleep
          ? ['head', 'arms']
          : [];

    const bodySensations: string[] = isToday
      ? []
      : delayedMeds
        ? ['head_fog', 'chest_tight']
        : prevShortSleep
          ? ['head_fog', 'arms_tension']
          : [];

    let decisionNote: string | undefined;
    let reactionObserved: string | undefined;
    if (daysAgo === 15) {
      decisionNote = '14:00 utáni kávé elhagyása';
      reactionObserved = 'Nyugodtabb elalvás, +1.5 óra mélyebb pihenés';
    } else if (daysAgo === 10) {
      decisionNote = 'Zajszűrős séta munka után';
      reactionObserved = 'Szenzoros akkumulátor +22% estére';
    } else if (daysAgo === 4) {
      decisionNote = 'Délelőtti adag 3 órás csúszása';
      reactionObserved = 'Délutáni ködös agy és feszült vállak';
    }

    logs.push({
      date: dateKey,
      isGap: false,
      dayPartsLogged: isToday
        ? ['now', 'morning']
        : ['morning', 'afternoon', 'evening'],
      emotions,
      energyLevel,
      sensoryBattery,
      sleepHours,
      wokeAtNight: shortSleep,
      bodyRegions,
      bodySensations,
      selectedBodyPartIds: [],
      painLevel: 0,
      painQualities: [],
      emotionModelData: isToday
        ? {
            willcox: ['w_peaceful', 'w_optimistic'],
          }
        : undefined,
      chipIds,
      note: isToday
        ? 'Reggeli séta után kiegyensúlyozottabb fókusz.'
        : '',
      addedLater: false,
      medsTakenPct: delayedMeds ? 50 : isToday ? 67 : 100,
      decisionNote,
      reactionObserved,
    });
  }

  return logs;
}

export function createDemoDataset(
  lang: 'hu' | 'en' = 'hu',
  theme: 'light' | 'dark' = 'light',
): SeroSafeState {
  const dailyLogs = createDemoLogs();
  const habits = DEFAULT_HABITS.map((h) => ({ ...h }));
  const patterns: PatternInsight[] = computeExplainablePatterns(
    dailyLogs,
    habits,
  );
  const todayKey = formatIsoDateLocal(new Date());

  return {
    settings: {
      lang,
      theme,
      reducedMotion: false,
      hidePercentages: false,
      desktopFrameMode: 'responsive',
      pinEnabled: false,
      allowEmergencyWithoutPin: true,
      profileMode: 'demo',
    },
    medications: createDemoMedications(),
    dailyLogs,
    habits,
    patterns,
    communicationProfile: { ...DEFAULT_COMMUNICATION_PROFILE },
    doctorNote: { ...DEMO_DOCTOR_NOTE },
    selectedDate: todayKey,
    activeDayPart: 'now',
  };
}

export function createCleanDataset(
  lang: 'hu' | 'en' = 'hu',
  theme: 'light' | 'dark' = 'light',
): SeroSafeState {
  const todayKey = formatIsoDateLocal(new Date());
  return {
    settings: {
      lang,
      theme,
      reducedMotion: false,
      hidePercentages: false,
      desktopFrameMode: 'responsive',
      pinEnabled: false,
      allowEmergencyWithoutPin: true,
      profileMode: 'clean',
    },
    medications: [],
    dailyLogs: [
      {
        date: todayKey,
        isGap: false,
        dayPartsLogged: ['now'],
        emotions: [],
        energyLevel: 65,
        sensoryBattery: 70,
        sleepHours: 7,
        wokeAtNight: false,
        bodyRegions: [],
        bodySensations: [],
        selectedBodyPartIds: [],
        painLevel: 0,
        painQualities: [],
        chipIds: [],
        note: '',
        addedLater: false,
        medsTakenPct: null,
      },
    ],
    habits: DEFAULT_HABITS.map((h) => ({ ...h, count: 0 })),
    patterns: [],
    communicationProfile: { ...DEFAULT_COMMUNICATION_PROFILE },
    doctorNote: null,
    selectedDate: todayKey,
    activeDayPart: 'now',
  };
}

/**
 * OTIO és mentőszolgálati szimulációs preset:
 * Hozzáad egy vény nélküli DXM köhögéscsillapítót + 38.4 °C láz, 118 bpm, izomrángás/merevség tüneteket,
 * hogy azonnal bemutatható legyen a 112 eszkaláció és a MIST Kríziskártya.
 */
export function applyCrisisDemoPreset(state: SeroSafeState): SeroSafeState {
  const todayKey = formatIsoDateLocal(new Date());
  const hasDxm = state.medications.some(
    (m) => m.substanceId === 'dextromethorphan',
  );

  const nextMeds: UserMedication[] = hasDxm
    ? state.medications
    : [
        ...state.medications,
        {
          id: 'med_dxm_otc_sim',
          substanceId: 'dextromethorphan',
          customName: 'Dextrometorfán (Robitussin — Vény nélküli)',
          doseText: '30 mg',
          scheduleTime: '4 órája (vény nélküli)',
          lastTakenIso: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
          isDiscontinued: false,
          todayStatus: 'TOOK',
          todayStatusDate: todayKey,
          withdrawalCaution: false,
          isOTCOrSupplement: true,
          skipHistoryHu: 'Eseti vény nélküli köhögéscsillapító.',
          skipHistoryEn: 'As-needed OTC cough suppressant.',
        },
      ];

  const crisisSymptom = {
    id: 'sym_crisis_sim',
    timestampIso: new Date().toISOString(),
    onsetHoursAgo: 3,
    measuredTempCelsius: 38.4,
    measuredHeartRateBpm: 118,
    hasInvoluntaryTwitching: true,
    hasTremor: true,
    hasMuscleStiffness: true,
    hasHeavySweating: true,
    hasSevereRestlessnessOrConfusion: true,
    hasGIDistress: false,
    selectedBodyRegions: ['legs', 'arms', 'skin', 'chest', 'head'] as DailyLogEntry['bodyRegions'],
    selectedSensations: [
      'legs_twitch',
      'legs_stiff',
      'arms_tremor',
      'skin_sweat',
      'chest_racing',
      'head_confusion',
    ],
  };

  const existingIdx = state.dailyLogs.findIndex((l) => l.date === todayKey);
  const nextLogs = [...state.dailyLogs];

  if (existingIdx >= 0) {
    nextLogs[existingIdx] = {
      ...nextLogs[existingIdx],
      isGap: false,
      bodyRegions: crisisSymptom.selectedBodyRegions,
      bodySensations: crisisSymptom.selectedSensations,
      selectedBodyPartIds: [
        'f_head_upper',
        'f_chest_l',
        'f_chest_r',
        'f_forearm_l',
        'f_forearm_r',
        'f_shin_l',
        'f_shin_r',
      ],
      painLevel: 7,
      painQualities: ['cramping', 'pressing'],
      emotions: ['em_overwhelmed', 'em_agitated'],
      symptomEntry: crisisSymptom,
    };
  } else {
    nextLogs.push({
      date: todayKey,
      isGap: false,
      dayPartsLogged: ['now'],
      emotions: ['em_overwhelmed', 'em_agitated'],
      energyLevel: 35,
      sensoryBattery: 20,
      sleepHours: 5.5,
      wokeAtNight: true,
      bodyRegions: crisisSymptom.selectedBodyRegions,
      bodySensations: crisisSymptom.selectedSensations,
      selectedBodyPartIds: [
        'f_head_upper',
        'f_chest_l',
        'f_chest_r',
        'f_forearm_l',
        'f_forearm_r',
        'f_shin_l',
        'f_shin_r',
      ],
      painLevel: 7,
      painQualities: ['cramping', 'pressing'],
      chipIds: [],
      note: 'Akut krízis szimuláció rögzítve.',
      addedLater: false,
      medsTakenPct: 100,
      symptomEntry: crisisSymptom,
    });
  }

  return {
    ...state,
    medications: nextMeds,
    dailyLogs: nextLogs,
    selectedDate: todayKey,
  };
}
