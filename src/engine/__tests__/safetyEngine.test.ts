import { describe, expect, it } from 'vitest';
import {
  CHOIR_SEGMENTS,
  getSelectedBodyRegions,
} from '@/data/choirBodyRegions';
import {
  BODY_SENSATIONS,
  CURATED_SUBSTANCES,
  PAIN_QUALITIES,
} from '@/data/substances';
import {
  evaluateRiskAndSymptoms,
  normalizeMedicationsForDate,
  prioritizeMedicationsForEmergency,
} from '@/engine/safetyEngine';
import { createCleanDataset, createDemoDataset } from '@/services/demoData';
import {
  formatAssessmentLevel,
  formatDrugClass,
  formatLastTaken,
  formatMedStatus,
  STRINGS,
} from '@/services/i18n';
import type { ObservableSymptomEntry, UserMedication } from '@/types/serosafe';

const NOW = new Date('2026-11-21T12:00:00Z');

function makeMed(overrides: Partial<UserMedication>): UserMedication {
  return {
    id: 'm_test',
    customName: 'Test Med',
    doseText: '50 mg',
    scheduleTime: '08:00',
    lastTakenIso: '2026-11-21T08:00:00Z',
    isDiscontinued: false,
    todayStatus: 'TOOK',
    withdrawalCaution: true,
    skipHistoryHu: '',
    skipHistoryEn: '',
    ...overrides,
  };
}

function makeSymptom(
  overrides: Partial<ObservableSymptomEntry> = {},
): ObservableSymptomEntry {
  return {
    id: 'sym_1',
    timestampIso: NOW.toISOString(),
    onsetHoursAgo: 2,
    hasInvoluntaryTwitching: false,
    hasTremor: false,
    hasMuscleStiffness: false,
    hasHeavySweating: false,
    hasSevereRestlessnessOrConfusion: false,
    hasGIDistress: false,
    selectedBodyRegions: [],
    selectedSensations: [],
    ...overrides,
  };
}

describe('CURATED_SUBSTANCES matrix', () => {
  it('contains exactly 30 curated Hungarian substances with unique IDs and positive washout days', () => {
    expect(CURATED_SUBSTANCES).toHaveLength(30);
    const ids = new Set(CURATED_SUBSTANCES.map((s) => s.id));
    expect(ids.size).toBe(30);
    for (const s of CURATED_SUBSTANCES) {
      expect(s.clinicalWashoutDays).toBeGreaterThan(0);
      expect(s.examplesHu.length).toBeGreaterThan(0);
    }
  });
});

describe('evaluateRiskAndSymptoms (Clinical Safety & Anti-Reassurance)', () => {
  it('never returns a green/safe status even when no medications or symptoms exist', () => {
    const res = evaluateRiskAndSymptoms([], CURATED_SUBSTANCES, undefined, undefined, NOW);
    expect(res.level).toBe('INFO_LOGGED');
    expect(String(res.level)).not.toContain('SAFE');
    expect(String(res.level)).not.toContain('GREEN');
  });

  it('flags Fluoxetine stopped 12 days ago (within 35-day washout) + OTC DXM as CONSULT with washout warning', () => {
    const fluoxetineStopped12d = makeMed({
      id: 'm_fluo',
      substanceId: 'fluoxetine',
      customName: 'Fluoxetin',
      isDiscontinued: true,
      discontinuedAtIso: '2026-11-09T08:00:00Z', // 12 days before NOW
      lastTakenIso: '2026-11-09T08:00:00Z',
    });

    const res = evaluateRiskAndSymptoms(
      [fluoxetineStopped12d],
      CURATED_SUBSTANCES,
      undefined,
      'dextromethorphan',
      NOW,
    );

    expect(res.level).toBe('CONSULT');
    expect(res.activeSerotonergicCount).toBe(2);
    expect(res.hasHighRiskCombination).toBe(true);
    expect(res.summaryReasonsHu.some((r) => r.includes('23 napig') || r.includes('washout'))).toBe(true);
  });

  it('excludes Fluoxetine stopped 40 days ago (outside 35-day washout window)', () => {
    const fluoxetineStopped40d = makeMed({
      id: 'm_fluo_old',
      substanceId: 'fluoxetine',
      customName: 'Fluoxetin',
      isDiscontinued: true,
      discontinuedAtIso: '2026-10-12T08:00:00Z', // 40 days before NOW
      lastTakenIso: '2026-10-12T08:00:00Z',
    });

    const res = evaluateRiskAndSymptoms(
      [fluoxetineStopped40d],
      CURATED_SUBSTANCES,
      undefined,
      'dextromethorphan',
      NOW,
    );

    expect(res.activeSerotonergicCount).toBe(1);
    expect(res.hasHighRiskCombination).toBe(false);
    expect(res.level).toBe('INFO_LOGGED');
  });

  it('flags MAOI + SSRI as contraindicated high-risk combination', () => {
    const sertraline = makeMed({
      id: 'm_sert',
      substanceId: 'sertraline',
      customName: 'Szertralin',
    });
    const moclobemide = makeMed({
      id: 'm_mocl',
      substanceId: 'moclobemide',
      customName: 'Moklobemid',
    });

    const res = evaluateRiskAndSymptoms(
      [sertraline, moclobemide],
      CURATED_SUBSTANCES,
      undefined,
      undefined,
      NOW,
    );

    expect(res.hasContraindicatedMAOI).toBe(true);
    expect(res.level).toBe('CONSULT');
  });

  it('triggers CALL_EMERGENCY_112 for Fever >=38.0 + Muscle Stiffness even with ZERO serotonergic meds (Anti-Reassurance / NMS protection)', () => {
    const aripiprazoleOnly = makeMed({
      id: 'm_ari',
      coMedId: 'aripiprazole',
      customName: 'Aripiprazol',
      nmsWatch: true,
    });

    const res = evaluateRiskAndSymptoms(
      [aripiprazoleOnly],
      CURATED_SUBSTANCES,
      makeSymptom({
        measuredTempCelsius: 38.4,
        hasMuscleStiffness: true,
      }),
      undefined,
      NOW,
    );

    expect(res.activeSerotonergicCount).toBe(0);
    expect(res.hasNmsOrSepsisConcern).toBe(true);
    expect(res.level).toBe('CALL_EMERGENCY_112');
  });

  it('triggers CALL_EMERGENCY_112 for involuntary twitching even without fever', () => {
    const res = evaluateRiskAndSymptoms(
      [],
      CURATED_SUBSTANCES,
      makeSymptom({ hasInvoluntaryTwitching: true }),
      undefined,
      NOW,
    );

    expect(res.level).toBe('CALL_EMERGENCY_112');
  });

  it('triggers CONSULT for isolated mild GI distress or tremor without autonomic signs', () => {
    const res = evaluateRiskAndSymptoms(
      [],
      CURATED_SUBSTANCES,
      makeSymptom({ hasGIDistress: true }),
      undefined,
      NOW,
    );

    expect(res.level).toBe('CONSULT');
  });
});

describe('Anatomical separation (Mouth vs Throat & CHOIR views)', () => {
  it('cleanly separates mouth sensations from throat sensations in BODY_SENSATIONS', () => {
    const mouthIds = BODY_SENSATIONS.filter((s) => s.region === 'mouth').map((s) => s.id);
    const throatIds = BODY_SENSATIONS.filter((s) => s.region === 'throat').map((s) => s.id);

    expect(mouthIds).toContain('mouth_dry');
    expect(mouthIds).toContain('mouth_jaw');
    expect(throatIds).toContain('throat_mute');
    expect(throatIds).toContain('throat_lump');
    expect(mouthIds.some((id) => throatIds.includes(id))).toBe(false);
  });

  it('covers front, back, and zoomed head views in CHOIR_SEGMENTS with distinct mouth and throat parentRegions', () => {
    const views = new Set(CHOIR_SEGMENTS.map((seg) => seg.view));
    expect(views).toEqual(new Set(['front', 'back', 'head']));

    const headViewMouth = CHOIR_SEGMENTS.filter(
      (seg) => seg.view === 'head' && seg.parentRegion === 'mouth',
    );
    const headViewThroat = CHOIR_SEGMENTS.filter(
      (seg) => seg.view === 'head' && seg.parentRegion === 'throat',
    );
    const frontMouth = CHOIR_SEGMENTS.filter(
      (seg) => seg.view === 'front' && seg.parentRegion === 'mouth',
    );
    const frontThroat = CHOIR_SEGMENTS.filter(
      (seg) => seg.view === 'front' && seg.parentRegion === 'throat',
    );

    expect(headViewMouth.length).toBeGreaterThanOrEqual(2);
    expect(headViewThroat.length).toBeGreaterThanOrEqual(2);
    expect(frontMouth.length).toBeGreaterThanOrEqual(1);
    expect(frontThroat.length).toBeGreaterThanOrEqual(1);
  });

  it('filters derived regions strictly to actually selected CHOIR segments and includes all 7 pain qualities', () => {
    expect(getSelectedBodyRegions([], false)).toEqual([]);
    expect(getSelectedBodyRegions([], true)).toEqual(['skin']);
    expect(getSelectedBodyRegions(['f_face_mouth'], false)).toEqual(['mouth']);
    expect(getSelectedBodyRegions(['h_mouth', 'h_throat'], false)).toEqual([
      'mouth',
      'throat',
    ]);

    const mouthOnlySensations = BODY_SENSATIONS.filter((s) =>
      getSelectedBodyRegions(['f_face_mouth'], false).includes(s.region),
    );
    expect(mouthOnlySensations.map((s) => s.id)).toEqual([
      'mouth_dry',
      'mouth_jaw',
    ]);

    const qualityIds = PAIN_QUALITIES.map((q) => q.id);
    expect(new Set(qualityIds).size).toBe(7);
    expect(qualityIds).toContain('sharp');
    expect(qualityIds).toContain('burning');
    expect(qualityIds).toContain('pressing');
  });

  it('defaults DayPart to now and includes forenoon in bilingual i18n dayParts', () => {
    expect(createDemoDataset('hu', 'light').activeDayPart).toBe('now');
    expect(createCleanDataset('en', 'light').activeDayPart).toBe('now');
    expect(STRINGS.hu.today.dayParts.now).toBe('Most');
    expect(STRINGS.hu.today.dayParts.forenoon).toBe('Délelőtt');
    expect(STRINGS.en.today.dayParts.now).toBe('Now');
    expect(STRINGS.en.today.dayParts.forenoon).toBe('Late morning');
  });

  it('formats assessment levels, medication statuses, and drug classes cleanly into Hungarian', () => {
    expect(formatAssessmentLevel('INFO_LOGGED', 'hu')).toBe('Rögzítve');
    expect(formatAssessmentLevel('CONSULT', 'hu')).toBe('Konzultáció javasolt');
    expect(formatAssessmentLevel('CALL_EMERGENCY_112', 'hu')).toBe('Azonnali 112 hívás');
    expect(formatMedStatus('TOOK', 'hu')).toBe('Bevéve');
    expect(formatMedStatus('PENDING', 'hu')).toBe('Várakozik');
    expect(formatDrugClass('ANTIPSYCHOTIC_NMS', 'hu')).toBe('Antipszichotikum');
    expect(formatDrugClass('OTC_SUPPLEMENT', 'hu')).toBe('Vény nélküli / kiegészítő');
  });

  it('formats real lastTakenIso timestamps cleanly in HU and EN', () => {
    const refNow = new Date(2026, 10, 21, 15, 30, 0);
    const sameDay = new Date(2026, 10, 21, 8, 5, 0).toISOString();
    const yesterday = new Date(2026, 10, 20, 22, 0, 0).toISOString();
    const threeDays = new Date(2026, 10, 18, 9, 15, 0).toISOString();

    expect(formatLastTaken(undefined, 'hu', refNow)).toBe('Nincs rögzített bevétel');
    expect(formatLastTaken('', 'en', refNow)).toBe('No dose logged');
    expect(formatLastTaken(sameDay, 'hu', refNow)).toBe('Ma 08:05');
    expect(formatLastTaken(yesterday, 'hu', refNow)).toBe('Tegnap 22:00');
    expect(formatLastTaken(yesterday, 'en', refNow)).toBe('Yesterday 22:00');
    expect(formatLastTaken(threeDays, 'hu', refNow)).toBe('3 napja (09:15)');
  });

  it('resets active medication todayStatus to PENDING on a new calendar day while preserving lastTakenIso', () => {
    const yesterdayIso = new Date(2026, 10, 20, 8, 30, 0).toISOString();
    const activeOld = makeMed({
      id: 'm_active_old',
      todayStatus: 'TOOK',
      todayStatusDate: '2026-11-20',
      lastTakenIso: yesterdayIso,
      isDiscontinued: false,
    });
    const activeToday = makeMed({
      id: 'm_active_today',
      todayStatus: 'TOOK',
      todayStatusDate: '2026-11-21',
      lastTakenIso: new Date(2026, 10, 21, 8, 0, 0).toISOString(),
    });
    const stoppedOld = makeMed({
      id: 'm_stopped',
      isDiscontinued: true,
      todayStatus: 'SKIPPED',
      todayStatusDate: '2026-11-20',
    });

    const normalized = normalizeMedicationsForDate(
      [activeOld, activeToday, stoppedOld],
      '2026-11-21',
    );

    expect(normalized[0].todayStatus).toBe('PENDING');
    expect(normalized[0].todayStatusDate).toBe('2026-11-21');
    expect(normalized[0].lastTakenIso).toBe(yesterdayIso);
    expect(normalized[1].todayStatus).toBe('TOOK');
    expect(normalized[2].todayStatus).toBe('SKIPPED');
  });

  it('prioritizes emergency meds by MAOI > washout > serotonergic > NMS-watch > other and drops completed washouts', () => {
    const melatonin = makeMed({
      id: 'm_mel',
      coMedId: 'melatonin',
      customName: 'Melatonin',
    });
    const aripiprazole = makeMed({
      id: 'm_ari',
      coMedId: 'aripiprazole',
      customName: 'Aripiprazol',
      nmsWatch: true,
    });
    const sertraline = makeMed({
      id: 'm_sert',
      substanceId: 'sertraline',
      customName: 'Szertralin',
    });
    const fluoxetineWashout = makeMed({
      id: 'm_fluo_w',
      substanceId: 'fluoxetine',
      customName: 'Fluoxetin',
      isDiscontinued: true,
      discontinuedAtIso: '2026-11-10T08:00:00Z',
      lastTakenIso: '2026-11-10T08:00:00Z',
    });
    const expiredWashout = makeMed({
      id: 'm_fluo_done',
      substanceId: 'fluoxetine',
      customName: 'Fluoxetin old',
      isDiscontinued: true,
      discontinuedAtIso: '2026-09-01T08:00:00Z',
      lastTakenIso: '2026-09-01T08:00:00Z',
    });
    const moclobemide = makeMed({
      id: 'm_mocl',
      substanceId: 'moclobemide',
      customName: 'Moklobemid',
    });

    const allMeds = [
      melatonin,
      aripiprazole,
      sertraline,
      fluoxetineWashout,
      expiredWashout,
      moclobemide,
    ];
    const assessment = evaluateRiskAndSymptoms(allMeds, CURATED_SUBSTANCES, undefined, undefined, NOW);
    const ordered = prioritizeMedicationsForEmergency(allMeds, assessment);

    expect(ordered.map((m) => m.id)).toEqual([
      'm_mocl',
      'm_fluo_w',
      'm_sert',
      'm_ari',
      'm_mel',
    ]);
  });
});
