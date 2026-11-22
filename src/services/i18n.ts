import type {
  ActionGuidanceLevel,
  DrugCategory,
  MedicationStatus,
} from '@/types/serosafe';

export type Lang = 'hu' | 'en';

export function formatAssessmentLevel(
  level: ActionGuidanceLevel,
  lang: Lang,
): string {
  const hu = lang === 'hu';
  switch (level) {
    case 'CALL_EMERGENCY_112':
      return hu ? 'Azonnali 112 hívás' : 'Call 112 now';
    case 'CONSULT':
      return hu ? 'Konzultáció javasolt' : 'Consult doctor';
    case 'INFO_LOGGED':
      return hu ? 'Rögzítve' : 'Logged';
  }
}

export function formatMedStatus(
  status: MedicationStatus,
  lang: Lang,
): string {
  const hu = lang === 'hu';
  switch (status) {
    case 'TOOK':
      return hu ? 'Bevéve' : 'Taken';
    case 'LATER':
      return hu ? 'Később' : 'Later';
    case 'SKIPPED':
      return hu ? 'Kihagyva' : 'Skipped';
    case 'PENDING':
      return hu ? 'Várakozik' : 'Pending';
  }
}

export function formatDrugClass(drugClass: DrugCategory, lang: Lang): string {
  const hu = lang === 'hu';
  switch (drugClass) {
    case 'SSRI':
      return 'SSRI';
    case 'SNRI':
      return 'SNRI';
    case 'TCA':
      return hu ? 'Triciklikus (TCA)' : 'TCA';
    case 'MAOI':
      return hu ? 'MAO-gátló' : 'MAOI';
    case 'ATYPICAL_ANTIDEPRESSANT':
      return hu ? 'Atípusos antidepresszáns' : 'Atypical antidepressant';
    case 'OPIOID_ANALGESIC':
      return hu ? 'Opioid fájdalomcsillapító' : 'Opioid analgesic';
    case 'TRIPTAN':
      return hu ? 'Migrén elleni triptán' : 'Triptan';
    case 'OTC_SUPPLEMENT':
      return hu ? 'Vény nélküli / kiegészítő' : 'OTC / Supplement';
    case 'ANTIPSYCHOTIC_NMS':
      return hu ? 'Antipszichotikum' : 'Antipsychotic';
    case 'ADHD_STIMULANT_NON_SERO':
      return hu ? 'ADHD-gyógyszer' : 'ADHD (non-serotonergic)';
    case 'SLEEP_NON_SERO':
      return hu ? 'Alvást segítő' : 'Sleep aid';
    case 'OTHER':
      return hu ? 'Egyéb szerotonerg' : 'Other serotonergic';
  }
}

export function formatLastTaken(
  iso: string | undefined,
  lang: Lang,
  nowDate: Date = new Date(),
): string {
  const hu = lang === 'hu';
  if (!iso) {
    return hu ? 'Nincs rögzített bevétel' : 'No dose logged';
  }
  const taken = new Date(iso);
  if (Number.isNaN(taken.getTime())) {
    return hu ? 'Nincs rögzített bevétel' : 'No dose logged';
  }

  const hh = String(taken.getHours()).padStart(2, '0');
  const min = String(taken.getMinutes()).padStart(2, '0');
  const hhmm = `${hh}:${min}`;

  const todayMidnight = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate(),
  ).getTime();
  const takenMidnight = new Date(
    taken.getFullYear(),
    taken.getMonth(),
    taken.getDate(),
  ).getTime();
  const diffDays = Math.round((todayMidnight - takenMidnight) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return hu ? `Ma ${hhmm}` : `Today ${hhmm}`;
  }
  if (diffDays === 1) {
    return hu ? `Tegnap ${hhmm}` : `Yesterday ${hhmm}`;
  }
  if (diffDays >= 2 && diffDays <= 6) {
    return hu ? `${diffDays} napja (${hhmm})` : `${diffDays}d ago (${hhmm})`;
  }

  const yyyy = taken.getFullYear();
  const mm = String(taken.getMonth() + 1).padStart(2, '0');
  const dd = String(taken.getDate()).padStart(2, '0');
  return hu ? `${yyyy}.${mm}.${dd}. ${hhmm}` : `${yyyy}-${mm}-${dd} ${hhmm}`;
}

export const STRINGS = {
  hu: {
    appName: 'SeroSafe',
    crisisBtnTop: '112 Krízis',
    nav: {
      today: 'Ma',
      meds: 'Gyógyszer',
      calendar: 'Naptár',
      insights: 'Elemzés',
      safety: 'Biztonság',
    },
    header: {
      frameMobile: 'Mobil nézet',
      frameFull: 'Teljes nézet',
      settings: 'Beállítások',
    },
    today: {
      addedLater: 'Utólag hozzáadva',
      viewWheel: 'Érzelmi kör',
      viewBody: 'Testséma',
      viewDials: 'Energia és alvás',
      addHabitBtn: 'Hozzáadás',
      noteLabel: 'Rövid napi jegyzet (csak ezen az eszközön marad)',
      notePlaceholder: 'Pl. délelőtti séta után nyugodtabb fókusz...',
      decisionLabel: 'Döntés az idővonalhoz (opcionális)',
      decisionPlaceholder: 'Pl. 14:00 utáni koffein elhagyása',
      dayParts: {
        morning: 'Reggel',
        forenoon: 'Délelőtt',
        midday: 'Dél',
        afternoon: 'Délután',
        evening: 'Este',
        night: 'Éjszaka',
      },
    },
    meds: {
      focusMode: 'Fókusz mód',
      addMed: 'Gyógyszer hozzáadása',
      took: 'Bevettem',
      later: 'Később',
      skipped: 'Kihagytam',
      stopTracking: 'Leállítás (kiürülés követése)',
      resumeTracking: 'Újra aktív',
      washoutSection: 'Aktív kiürülési időszakok',
      emptyMeds: 'Még nincs gyógyszer rögzítve. Adj hozzá egy hatóanyagot a 30 tételes listából vagy egyéni nevet.',
    },
    calendar: {
      title: 'Havi folyamatosság',
      hidePct: '% elrejtése',
      showPct: '% mutatása',
      noEntry: 'Ezen a napon nem készült bejegyzés (semleges szünet).',
    },
    insights: {
      range14: '14 nap',
      range30: '30 nap',
      range90: '45 nap',
      timelineTitle: 'Döntések és utólagos reakciók idővonala',
      patternsTitle: 'Feltárt mintázatok',
      strongOnly: 'Csak erős minták',
      allPatterns: 'Minden minta',
      daysBehind: 'Napok mögötte',
      hideDays: 'Napok elrejtése',
      keep: 'Megtart',
      hide: 'Elrejt',
      wrong: 'Ez téves',
      emptyPatterns: 'Legalább néhány napos naplózás után jelennek meg a megfigyelhető együttjárások.',
    },
    safety: {
      title: 'Szerotonerg biztonság és kríziskártya',
      subtitle: 'A figyelmeztetés hiánya soha nem jelent „biztonságos” igazolást',
      checkerTitle: 'Kurált szerotonerg kölcsönhatás-szűrő (30 hazai hatóanyag)',
      checkerLabel: 'Mi történik, ha ezt a szert is beveszem?',
      checkerNone: '— Csak a jelenlegi gyógyszerlistám ellenőrzése —',
      symptomsTitle: 'Megfigyelés-alapú tünetnapló és vitális értékek',
      tempLabel: 'Mért testhőmérséklet (°C)',
      hrLabel: 'Pulzus (ütés/perc)',
      onsetLabel: 'Tünetek kezdete (órája)',
      openCrisis: 'Azonnali Kríziskártya (internet nélkül)',
      generateLock: 'Zárolási képernyő kép + QR-kód',
      exportJson: 'JSON mentés',
      importJson: 'JSON visszatöltés',
      exportCsv: 'Táblázat (CSV)',
      resetAll: 'Minden adat törlése',
    },
  },
  en: {
    appName: 'SeroSafe',
    crisisBtnTop: '112 Crisis',
    nav: {
      today: 'Today',
      meds: 'Meds',
      calendar: 'Calendar',
      insights: 'Insights',
      safety: 'Safety',
    },
    header: {
      frameMobile: 'Mobile preview',
      frameFull: 'Full layout',
      settings: 'Settings',
    },
    today: {
      addedLater: 'Added later',
      viewWheel: 'Emotion wheel',
      viewBody: 'Body map',
      viewDials: 'Energy & Sleep',
      addHabitBtn: 'Add',
      noteLabel: 'Short daily note (stays only on this device)',
      notePlaceholder: 'E.g. steadier focus after morning walk...',
      decisionLabel: 'Decision for timeline (optional)',
      decisionPlaceholder: 'E.g. No caffeine after 14:00',
      dayParts: {
        morning: 'Morning',
        forenoon: 'Late morning',
        midday: 'Midday',
        afternoon: 'Afternoon',
        evening: 'Evening',
        night: 'Night',
      },
    },
    meds: {
      focusMode: 'Focus mode',
      addMed: 'Add medication',
      took: 'Took it',
      later: 'Later',
      skipped: 'Skipped',
      stopTracking: 'Stop (track washout)',
      resumeTracking: 'Mark active',
      washoutSection: 'Active clinical washout windows',
      emptyMeds: 'No medications added yet. Pick from the 30 curated substances or enter a custom name.',
    },
    calendar: {
      title: 'Monthly continuity',
      hidePct: 'Hide %',
      showPct: 'Show %',
      noEntry: 'No entry recorded on this day (neutral gap).',
    },
    insights: {
      range14: '14d',
      range30: '30d',
      range90: '45d',
      timelineTitle: 'Decisions & 24h reactions timeline',
      patternsTitle: 'Observed patterns',
      strongOnly: 'Strong only',
      allPatterns: 'All patterns',
      daysBehind: 'Matching days',
      hideDays: 'Hide days',
      keep: 'Keep',
      hide: 'Hide',
      wrong: 'Wrong',
      emptyPatterns: 'Co-occurrence insights appear once enough daily entries are logged.',
    },
    safety: {
      title: 'Serotonergic safety & crisis handover',
      subtitle: 'Absence of a flag is never a "green / safe" guarantee (Anti-Reassurance)',
      checkerTitle: 'Curated serotonergic interaction filter (30 substances)',
      checkerLabel: 'Check adding a new or OTC substance:',
      checkerNone: '— Check my current medication list only —',
      symptomsTitle: 'Observation-based symptom log & vitals',
      tempLabel: 'Measured temperature (°C)',
      hrLabel: 'Heart rate (bpm)',
      onsetLabel: 'Symptom onset (hours ago)',
      openCrisis: '0-second Offline Crisis Card',
      generateLock: 'Lock-screen PNG + QR',
      exportJson: 'Export JSON',
      importJson: 'Import JSON',
      exportCsv: 'Export CSV',
      resetAll: 'Erase all local data',
    },
  },
} as const;
