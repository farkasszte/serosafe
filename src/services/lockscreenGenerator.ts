import { prioritizeMedicationsForEmergency } from '@/engine/safetyEngine';
import { formatLastTaken } from '@/services/i18n';
import type {
  CommunicationProfile,
  ObservableSymptomEntry,
  StructuredAssessment,
  UserMedication,
} from '@/types/serosafe';

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4,
): number {
  const words = text.split(/\s+/);
  let line = '';
  let currentY = y;
  let linesDrawn = 0;

  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY, maxWidth);
      linesDrawn++;
      if (linesDrawn >= maxLines) {
        return currentY + lineHeight;
      }
      line = words[i];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line && linesDrawn < maxLines) {
    ctx.fillText(line, x, currentY, maxWidth);
    currentY += lineHeight;
  }
  return currentY;
}

function drawRoundedBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string,
  lineWidth = 2,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

export interface LockScreenParams {
  lang: 'hu' | 'en';
  profile: CommunicationProfile;
  meds: UserMedication[];
  assessment: StructuredAssessment;
  symptom?: ObservableSymptomEntry;
}

export async function generateLockScreenPng(
  params: LockScreenParams,
): Promise<string> {
  const { lang, profile, meds, assessment, symptom } = params;
  const hu = lang === 'hu';

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D Canvas context unavailable');
  }

  // Background — Deep high-contrast dark slate so lock-screen text stays readable
  ctx.fillStyle = '#0D1318';
  ctx.fillRect(0, 0, 1080, 1920);

  // Subtle top zone hint for phone clock (y: 0..380 stays clear of medical cards)
  ctx.fillStyle = '#475569';
  ctx.font = '600 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    hu
      ? '▲ ZÁROLÁSI KÉPERNYŐ ÓRA HELYE (SEROSAFE) ▲'
      : '▲ LOCK-SCREEN CLOCK SAFE ZONE (SEROSAFE OFFLINE ICE) ▲',
    540,
    350,
    968,
  );
  ctx.textAlign = 'left';

  // Top MIST Emergency Strip (y: 390)
  const isEmergency = assessment.level === 'CALL_EMERGENCY_112';
  drawRoundedBox(
    ctx,
    56,
    390,
    968,
    112,
    24,
    isEmergency ? '#B91C1C' : '#D97706',
  );
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 36px system-ui, sans-serif';
  ctx.fillText(
    hu
      ? 'SEROSAFE • SÜRGŐSSÉGI ADATLAP (112)'
      : 'SEROSAFE • EMERGENCY HANDOVER (112)',
    88,
    442,
    904,
  );
  ctx.font = '600 24px system-ui, sans-serif';
  ctx.fillStyle = '#FEF3C7';
  ctx.fillText(
    hu
      ? 'Feloldás nélkül olvasható • Nem orvosi diagnózis'
      : 'Readable without unlocking • Not a medical diagnosis',
    88,
    480,
    904,
  );

  // 1. COMMUNICATION BARRIER (MIST Top Priority)
  drawRoundedBox(ctx, 56, 526, 968, 250, 24, '#18222C', '#FBBF24', 4);
  ctx.fillStyle = '#FBBF24';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText(
    hu
      ? '1. KOMMUNIKÁCIÓS PROFIL (AUTIZMUS / MUTIZMUS)'
      : '1. COMMUNICATION BARRIER (AUTISM / MUTISM)',
    88,
    572,
    904,
  );
  const barrierText = hu
    ? profile.barrierStatementHu
    : profile.barrierStatementEn;
  const hasName = profile.patientNameOptional.trim().length > 0;
  let barrierY = 616;
  if (hasName) {
    ctx.fillStyle = '#FDE68A';
    ctx.font = '700 25px system-ui, sans-serif';
    ctx.fillText(profile.patientNameOptional.trim(), 88, 608, 904);
    barrierY = 644;
  }
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '700 29px system-ui, sans-serif';
  const afterBarrierY = wrapCanvasText(
    ctx,
    barrierText,
    88,
    barrierY,
    904,
    36,
    hasName ? 2 : 3,
  );
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '500 23px system-ui, sans-serif';
  const tipText = hu
    ? profile.doInstructionsHu[0] ?? ''
    : profile.doInstructionsEn[0] ?? '';
  wrapCanvasText(ctx, `→ ${tipText}`, 88, afterBarrierY + 4, 904, 30, 2);

  // 2. MEDICATIONS & WASHOUT
  drawRoundedBox(ctx, 56, 800, 968, 460, 24, '#18222C', '#334155', 2);
  ctx.fillStyle = '#5EEAD4';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText(
    hu
      ? '2. GYÓGYSZEREK ÉS KIÜRÜLÉSI IDŐSZAK'
      : '2. MEDICATIONS & CLINICAL WASHOUT WINDOW',
    88,
    846,
    904,
  );

  const prioritizedMeds = prioritizeMedicationsForEmergency(meds, assessment);
  const hasOverflow = prioritizedMeds.length > 5;
  const visibleMeds = hasOverflow
    ? prioritizedMeds.slice(0, 4)
    : prioritizedMeds;
  const overflowCount = hasOverflow ? prioritizedMeds.length - 4 : 0;

  let medY = 898;
  if (visibleMeds.length === 0) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 26px system-ui, sans-serif';
    ctx.fillText(
      hu ? 'Nincs rögzített gyógyszer.' : 'No medications recorded.',
      88,
      medY,
      904,
    );
  } else {
    for (const m of visibleMeds) {
      const exposure = assessment.exposures.find(
        (e) => e.medicationId === m.id,
      );
      const isWashout = m.isDiscontinued && exposure?.isInWashoutWindow;

      ctx.fillStyle = isWashout ? '#FCD34D' : '#F8FAFC';
      ctx.font = '700 27px system-ui, sans-serif';
      const label = `${m.customName} (${m.doseText})`;
      ctx.fillText(`• ${label}`, 88, medY, 904);

      ctx.fillStyle = isWashout ? '#FDE68A' : '#94A3B8';
      ctx.font = '500 22px system-ui, sans-serif';
      const sub = isWashout
        ? hu
          ? `  LEÁLLÍTVA — Kiürülés aktív: még ${exposure.daysRemainingInWashout} nap`
          : `  STOPPED — Washout active: ${exposure.daysRemainingInWashout}d left`
        : m.isOTCOrSupplement
          ? hu
            ? `  Vény nélküli • Utolsó: ${formatLastTaken(m.lastTakenIso, lang)}`
            : `  OTC / Supplement • Last: ${formatLastTaken(m.lastTakenIso, lang)}`
          : `  ${hu ? 'Utolsó' : 'Last'}: ${formatLastTaken(m.lastTakenIso, lang)}`;
      ctx.fillText(sub, 88, medY + 30, 904);
      medY += 72;
    }

    if (overflowCount > 0) {
      ctx.fillStyle = '#FCD34D';
      ctx.font = '700 24px system-ui, sans-serif';
      ctx.fillText(
        hu
          ? `+ ${overflowCount} további gyógyszer a SeroSafe alkalmazásban`
          : `+ ${overflowCount} more medications in SeroSafe app`,
        88,
        medY + 6,
        904,
      );
    }
  }

  // 3. VITALS, SYMPTOMS & OFFLINE QR CODE
  drawRoundedBox(ctx, 56, 1284, 650, 440, 24, '#18222C', '#334155', 2);
  ctx.fillStyle = '#FCA5A5';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText(
    hu ? '3. VITÁLIS JELEK ÉS KONTAKT' : '3. VITALS & EMERGENCY CONTACT',
    88,
    1330,
    586,
  );

  ctx.fillStyle = '#F8FAFC';
  ctx.font = '700 27px system-ui, sans-serif';
  const tempText = symptom?.measuredTempCelsius
    ? `${symptom.measuredTempCelsius.toFixed(1)} °C`
    : '—';
  const hrText = symptom?.measuredHeartRateBpm
    ? `${symptom.measuredHeartRateBpm} ${hu ? '/perc' : 'bpm'}`
    : '—';
  ctx.fillText(
    hu ? `Testhő: ${tempText}  |  Pulzus: ${hrText}` : `Temp: ${tempText}  |  HR: ${hrText}`,
    88,
    1382,
    586,
  );

  const flags: string[] = [];
  if (symptom?.hasInvoluntaryTwitching)
    flags.push(hu ? 'Akaratlan izomrángás' : 'Involuntary twitching');
  if (symptom?.hasMuscleStiffness)
    flags.push(hu ? 'Izommerevség' : 'Muscle stiffness');
  if (symptom?.hasTremor) flags.push(hu ? 'Remegés' : 'Tremor');
  if (symptom?.hasRestingTachycardia)
    flags.push(hu ? 'Nyugalmi szapora pulzus' : 'Fast resting pulse');
  if (symptom?.hasHeavySweating)
    flags.push(hu ? 'Nyugalmi izzadás' : 'Heavy sweating');
  if (symptom?.hasSevereRestlessnessOrConfusion)
    flags.push(hu ? 'Zavartság / nyugtalanság' : 'Confusion / agitation');

  ctx.fillStyle = flags.length > 0 ? '#FECACA' : '#CBD5E1';
  ctx.font = '600 24px system-ui, sans-serif';
  const nextY = wrapCanvasText(
    ctx,
    flags.length > 0
      ? `${hu ? 'Észlelt jelek: ' : 'Logged signs: '}${flags.join(', ')}`
      : hu
        ? 'Nincs akut vörös zászló tünet rögzítve.'
        : 'No acute red-flag symptoms logged.',
    88,
    1432,
    586,
    34,
    4,
  );

  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 23px system-ui, sans-serif';
  ctx.fillText(
    `${hu ? 'Vészhelyzeti kontakt:' : 'ICE Contact:'} ${profile.emergencyContactName}`,
    88,
    Math.max(nextY + 28, 1618),
    586,
  );
  ctx.fillStyle = '#FBBF24';
  ctx.font = '800 28px system-ui, sans-serif';
  ctx.fillText(
    profile.emergencyContactPhone || '112',
    88,
    Math.max(nextY + 66, 1656),
    586,
  );

  // QR Box on the right (contains offline plain-text summary — zero server URLs!)
  drawRoundedBox(ctx, 728, 1284, 296, 440, 24, '#FFFFFF');
  const qrMedsList = prioritizedMeds
    .slice(0, 8)
    .map((m) => {
      const exp = assessment.exposures.find((e) => e.medicationId === m.id);
      const washTag =
        m.isDiscontinued && exp?.isInWashoutWindow
          ? hu
            ? ` [KIÜRÜLÉS:${exp.daysRemainingInWashout}n]`
            : ` [WASHOUT:${exp.daysRemainingInWashout}d]`
          : '';
      return `${m.customName.slice(0, 32)} ${m.doseText.slice(0, 16)}${washTag}`;
    })
    .join('; ');

  const qrPayload = hu
    ? [
        'SEROSAFE HELYI VÉSZHELYZETI ADATLAP',
        profile.patientNameOptional.trim()
          ? `NEV:${profile.patientNameOptional.trim().slice(0, 60)}`
          : '',
        `KOMMUNIKACIO:${barrierText.slice(0, 120)}`,
        `GYOGYSZEREK:${qrMedsList.slice(0, 360) || 'nincs'}`,
        `VITALIS:T=${tempText},P=${hrText}`,
        flags.length ? `TUNETEK:${flags.join(', ').slice(0, 140)}` : 'TUNETEK:nincs',
        `KONTAKT:${profile.emergencyContactPhone.slice(0, 40)}`,
      ]
        .filter(Boolean)
        .join('\n')
    : [
        'SEROSAFE OFFLINE ICE',
        profile.patientNameOptional.trim()
          ? `NAME:${profile.patientNameOptional.trim().slice(0, 60)}`
          : '',
        `COMM:${barrierText.slice(0, 120)}`,
        `MEDS:${qrMedsList.slice(0, 360) || 'none'}`,
        `VITALS:T=${tempText},HR=${hrText}`,
        flags.length ? `SIGNS:${flags.join(', ').slice(0, 140)}` : 'SIGNS:none',
        `ICE:${profile.emergencyContactPhone.slice(0, 40)}`,
      ]
        .filter(Boolean)
        .join('\n');

  const { default: QRCode } = await import('qrcode');
  const qrCanvas = document.createElement('canvas');
  try {
    await QRCode.toCanvas(qrCanvas, qrPayload, {
      width: 248,
      margin: 1,
      color: { dark: '#0D1318', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    });
  } catch {
    const compactPayload = hu
      ? `SEROSAFE ICE\nT=${tempText},P=${hrText}\n${qrMedsList.slice(0, 160)}`
      : `SEROSAFE ICE\nT=${tempText},HR=${hrText}\n${qrMedsList.slice(0, 160)}`;
    await QRCode.toCanvas(qrCanvas, compactPayload, {
      width: 248,
      margin: 1,
      color: { dark: '#0D1318', light: '#FFFFFF' },
      errorCorrectionLevel: 'L',
    });
  }
  ctx.drawImage(qrCanvas, 752, 1310, 248, 248);

  ctx.fillStyle = '#0D1318';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    hu ? 'Helyi QR-adatlap' : 'Offline QR summary',
    876,
    1602,
    264,
  );
  ctx.fillStyle = '#475569';
  ctx.font = '500 18px system-ui, sans-serif';
  ctx.fillText(
    hu ? 'Internet nélkül olvasható' : 'No internet required',
    876,
    1634,
    264,
  );
  ctx.textAlign = 'left';

  // Footer
  ctx.fillStyle = '#64748B';
  ctx.font = '500 22px system-ui, sans-serif';
  ctx.fillText(
    hu
      ? `Generálva: ${new Date().toLocaleDateString('hu-HU')} • Beteg által rögzített tájékoztató adat`
      : `Generated: ${new Date().toLocaleDateString('en-US')} • Patient-logged handover data`,
    56,
    1790,
    968,
  );

  return canvas.toDataURL('image/png');
}
