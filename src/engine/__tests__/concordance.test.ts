import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  COMMON_CO_MEDICATIONS,
  CURATED_SUBSTANCES,
} from '@/data/substances';
import { evaluateRiskAndSymptoms } from '@/engine/safetyEngine';
import type { UserMedication } from '@/types/serosafe';

const NOW = new Date('2026-11-21T12:00:00Z');
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const VALIDATION_DIR = path.resolve(
  import.meta.dirname,
  '../../../docs/validation',
);

function parseCsvRecords(csvContent: string): Record<string, string>[] {
  const text = csvContent.replace(/^\uFEFF/, '').trim();
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\r' && text[i + 1] === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const [header, ...dataRows] = rows;
  return dataRows.map((cols) => {
    const rec: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) {
      rec[header[i]] = cols[i] ?? '';
    }
    return rec;
  });
}

function makeMed(
  overrides: Partial<UserMedication> & Pick<UserMedication, 'id' | 'customName'>,
): UserMedication {
  return {
    doseText: '1x',
    scheduleTime: '08:00',
    lastTakenIso: NOW.toISOString(),
    isDiscontinued: false,
    todayStatus: 'TOOK',
    withdrawalCaution: false,
    skipHistoryHu: '',
    skipHistoryEn: '',
    ...overrides,
  };
}

describe('Pharmacological Concordance Matrix & OTIO Phase 1 Validation Suite', () => {
  const subCsv = fs.readFileSync(
    path.join(VALIDATION_DIR, 'substances-audit-table.csv'),
    'utf8',
  );
  const matrixCsv = fs.readFileSync(
    path.join(VALIDATION_DIR, 'concordance-matrix-30x30.csv'),
    'utf8',
  );

  const substanceRecords = parseCsvRecords(subCsv);
  const pairRecords = parseCsvRecords(matrixCsv);

  it('audits all 30 curated serotonergic substances and 5 non-serotonergic co-medications in CSV', () => {
    expect(substanceRecords).toHaveLength(35);

    const byId = new Map(substanceRecords.map((r) => [r.id, r]));
    for (const s of CURATED_SUBSTANCES) {
      const rec = byId.get(s.id);
      expect(rec, `Missing CSV row for ${s.id}`).toBeDefined();
      expect(rec?.category_group).toBe('SEROTONERGIC_CURATED');
      expect(Number(rec?.clinical_washout_days)).toBe(s.clinicalWashoutDays);
      expect(rec?.mechanisms).toBe(s.mechanisms.join('+'));
      expect(rec?.drug_class).toBe(s.drugClass);
      expect(rec?.is_otc_or_supplement).toBe(String(s.isOTCOrSupplement));
    }

    for (const c of COMMON_CO_MEDICATIONS) {
      const rec = byId.get(c.id);
      expect(rec, `Missing CSV row for co-med ${c.id}`).toBeDefined();
      expect(rec?.category_group).toBe('CO_MEDICATION_NON_SERO');
      expect(rec?.mechanisms).toBe('NONE');
      expect(rec?.nms_watch).toBe(String(c.nmsWatch));
    }
  });

  it('covers all 435 unique unordered pairs (30 × 29 / 2) with 100% engine concordance', () => {
    expect(pairRecords).toHaveLength(435);

    const seenPairKeys = new Set<string>();
    const validIds = new Set(CURATED_SUBSTANCES.map((s) => s.id));

    for (const row of pairRecords) {
      expect(validIds.has(row.substance_a_id)).toBe(true);
      expect(validIds.has(row.substance_b_id)).toBe(true);
      expect(row.substance_a_id).not.toBe(row.substance_b_id);

      const pairKey = [row.substance_a_id, row.substance_b_id].sort().join('::');
      expect(seenPairKeys.has(pairKey), `Duplicate pair ${pairKey}`).toBe(false);
      seenPairKeys.add(pairKey);

      const res = evaluateRiskAndSymptoms(
        [
          makeMed({
            id: `a_${row.substance_a_id}`,
            substanceId: row.substance_a_id,
            customName: row.substance_a_hu,
          }),
          makeMed({
            id: `b_${row.substance_b_id}`,
            substanceId: row.substance_b_id,
            customName: row.substance_b_hu,
          }),
        ],
        CURATED_SUBSTANCES,
        undefined,
        undefined,
        NOW,
      );

      expect(res.level).toBe(row.serosafe_level);
      expect(String(res.hasContraindicatedMAOI)).toBe(
        row.serosafe_contraindicated_maoi,
      );
      expect(res.hasHighRiskCombination).toBe(true);
      expect(res.activeSerotonergicCount).toBe(2);
      expect(res.sources.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('enforces Anti-Reassurance baseline across all 30 single-agent exposures (30/30)', () => {
    for (const s of CURATED_SUBSTANCES) {
      const res = evaluateRiskAndSymptoms(
        [
          makeMed({
            id: `single_${s.id}`,
            substanceId: s.id,
            customName: s.nameHu,
          }),
        ],
        CURATED_SUBSTANCES,
        undefined,
        undefined,
        NOW,
      );

      expect(res.level).toBe('INFO_LOGGED');
      expect(String(res.level)).not.toMatch(/SAFE|GREEN/);
      expect(res.hasHighRiskCombination).toBe(false);
      expect(res.activeSerotonergicCount).toBe(1);
    }
  });

  it('enforces exact clinicalWashoutDays boundaries (days - 1 vs days + 1) across all 30 substances (60/60)', () => {
    for (const s of CURATED_SUBSTANCES) {
      const partnerId = s.id === 'sertraline' ? 'escitalopram' : 'sertraline';
      const partnerName = s.id === 'sertraline' ? 'Eszcitaloprám' : 'Szertralin';

      const insideStopIso = new Date(
        NOW.getTime() - (s.clinicalWashoutDays - 1) * MS_PER_DAY,
      ).toISOString();
      const outsideStopIso = new Date(
        NOW.getTime() - (s.clinicalWashoutDays + 1) * MS_PER_DAY,
      ).toISOString();

      const partnerMed = makeMed({
        id: `partner_${partnerId}`,
        substanceId: partnerId,
        customName: partnerName,
      });

      const insideRes = evaluateRiskAndSymptoms(
        [
          makeMed({
            id: `w_in_${s.id}`,
            substanceId: s.id,
            customName: s.nameHu,
            isDiscontinued: true,
            discontinuedAtIso: insideStopIso,
            lastTakenIso: insideStopIso,
          }),
          partnerMed,
        ],
        CURATED_SUBSTANCES,
        undefined,
        undefined,
        NOW,
      );

      expect(insideRes.activeSerotonergicCount).toBe(2);
      expect(insideRes.hasHighRiskCombination).toBe(true);
      expect(insideRes.level).toBe('CONSULT');
      expect(
        insideRes.summaryReasonsHu.some((r) =>
          r.includes('Aktív kiürülési időszak:'),
        ),
      ).toBe(true);

      const outsideRes = evaluateRiskAndSymptoms(
        [
          makeMed({
            id: `w_out_${s.id}`,
            substanceId: s.id,
            customName: s.nameHu,
            isDiscontinued: true,
            discontinuedAtIso: outsideStopIso,
            lastTakenIso: outsideStopIso,
          }),
          partnerMed,
        ],
        CURATED_SUBSTANCES,
        undefined,
        undefined,
        NOW,
      );

      expect(outsideRes.activeSerotonergicCount).toBe(1);
      expect(outsideRes.hasHighRiskCombination).toBe(false);
      expect(outsideRes.level).toBe('INFO_LOGGED');
    }
  });

  it('validates high-priority clinical vignettes (Fluoxetine 34d vs 36d + MAOIs, OTC overlaps, hidden hospital MAOIs, co-meds & NMS)', () => {
    // 1. Fluoxetine stopped 34d ago vs 36d ago paired with all 5 MAOIs
    const maoiIds = [
      'moclobemide',
      'selegiline',
      'rasagiline',
      'linezolid',
      'methylene_blue',
    ];
    const fluo34dIso = new Date(NOW.getTime() - 34 * MS_PER_DAY).toISOString();
    const fluo36dIso = new Date(NOW.getTime() - 36 * MS_PER_DAY).toISOString();

    for (const maoiId of maoiIds) {
      const withinRes = evaluateRiskAndSymptoms(
        [
          makeMed({
            id: 'fluo_34',
            substanceId: 'fluoxetine',
            customName: 'Fluoxetin',
            isDiscontinued: true,
            discontinuedAtIso: fluo34dIso,
            lastTakenIso: fluo34dIso,
          }),
        ],
        CURATED_SUBSTANCES,
        undefined,
        maoiId,
        NOW,
      );
      expect(withinRes.hasContraindicatedMAOI).toBe(true);
      expect(withinRes.level).toBe('CONSULT');

      const clearedRes = evaluateRiskAndSymptoms(
        [
          makeMed({
            id: 'fluo_36',
            substanceId: 'fluoxetine',
            customName: 'Fluoxetin',
            isDiscontinued: true,
            discontinuedAtIso: fluo36dIso,
            lastTakenIso: fluo36dIso,
          }),
        ],
        CURATED_SUBSTANCES,
        undefined,
        maoiId,
        NOW,
      );
      expect(clearedRes.hasContraindicatedMAOI).toBe(false);
      expect(clearedRes.activeSerotonergicCount).toBe(1);
    }

    // 2. SSRI/SNRI + OTC/Analgesic combinations (DXM, St. John's Wort, 5-HTP, L-Tryptophan, Tramadol)
    const sertraline = makeMed({
      id: 'sert',
      substanceId: 'sertraline',
      customName: 'Szertralin',
    });
    for (const candidate of [
      'dextromethorphan',
      'st_johns_wort',
      'htp5',
      'l_tryptophan',
      'tramadol',
    ]) {
      const res = evaluateRiskAndSymptoms(
        [sertraline],
        CURATED_SUBSTANCES,
        undefined,
        candidate,
        NOW,
      );
      expect(res.level).toBe('CONSULT');
      expect(res.hasHighRiskCombination).toBe(true);
    }

    // 3. Hospital hidden MAOIs (Linezolid & Methylene Blue) + SNRI
    const venlafaxine = makeMed({
      id: 'venla',
      substanceId: 'venlafaxine',
      customName: 'Venlafaxin',
    });
    for (const hospitalMaoi of ['linezolid', 'methylene_blue']) {
      const res = evaluateRiskAndSymptoms(
        [venlafaxine],
        CURATED_SUBSTANCES,
        undefined,
        hospitalMaoi,
        NOW,
      );
      expect(res.hasContraindicatedMAOI).toBe(true);
      expect(res.level).toBe('CONSULT');
    }

    // 4. Negative control: all 5 non-serotonergic co-medications yield 0 serotonergic exposures
    const coMedList = COMMON_CO_MEDICATIONS.map((c) =>
      makeMed({
        id: `co_${c.id}`,
        coMedId: c.id,
        customName: c.nameHu,
        nmsWatch: c.nmsWatch,
      }),
    );
    const negRes = evaluateRiskAndSymptoms(
      coMedList,
      CURATED_SUBSTANCES,
      undefined,
      undefined,
      NOW,
    );
    expect(negRes.activeSerotonergicCount).toBe(0);
    expect(negRes.level).toBe('INFO_LOGGED');

    // 5. NMS positive control: antipsychotic + 38.5 C fever + stiffness -> CALL_EMERGENCY_112
    for (const nmsMedId of ['aripiprazole', 'risperidone']) {
      const nmsRes = evaluateRiskAndSymptoms(
        [
          makeMed({
            id: `nms_${nmsMedId}`,
            coMedId: nmsMedId,
            customName: nmsMedId,
            nmsWatch: true,
          }),
        ],
        CURATED_SUBSTANCES,
        {
          id: 'sym_nms',
          timestampIso: NOW.toISOString(),
          onsetHoursAgo: 2,
          measuredTempCelsius: 38.5,
          hasInvoluntaryTwitching: false,
          hasTremor: false,
          hasMuscleStiffness: true,
          hasHeavySweating: false,
          hasSevereRestlessnessOrConfusion: false,
          hasGIDistress: false,
          selectedBodyRegions: ['legs'],
          selectedSensations: ['legs_stiff'],
        },
        undefined,
        NOW,
      );
      expect(nmsRes.activeSerotonergicCount).toBe(0);
      expect(nmsRes.hasNmsOrSepsisConcern).toBe(true);
      expect(nmsRes.level).toBe('CALL_EMERGENCY_112');
    }
  });
});
