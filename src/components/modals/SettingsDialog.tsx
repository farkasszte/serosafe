import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  FileText,
  Lock,
  Moon,
  Plus,
  RotateCcw,
  Shield,
  Sun,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { ModalDialog } from '@/components/modals/ModalDialog';
import type { AppSettings, CommunicationProfile } from '@/types/serosafe';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  profile: CommunicationProfile;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onUpdateProfile: (profile: CommunicationProfile) => void;
  onResetProfile: () => void;
  onLoadDemoScenario: () => void;
  onLoadCrisisSimulation: () => void;
  onLoadCleanProfile: () => void;
  onEnablePin: (pin: string) => Promise<void>;
  onDisablePin: () => Promise<void>;
  onOpenLegal: () => void;
}

export function SettingsDialog({
  open,
  onClose,
  settings,
  profile,
  onUpdateSettings,
  onUpdateProfile,
  onResetProfile,
  onLoadDemoScenario,
  onLoadCrisisSimulation,
  onLoadCleanProfile,
  onEnablePin,
  onDisablePin,
  onOpenLegal,
}: SettingsDialogProps) {
  const hu = settings.lang === 'hu';

  const [activeSection, setActiveSection] = useState<
    'display' | 'profile' | 'security' | 'demo'
  >('display');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinMsg, setPinMsg] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [confirmResetProfile, setConfirmResetProfile] = useState(false);
  const [pendingScenario, setPendingScenario] = useState<
    'demo' | 'crisis' | 'clean' | null
  >(null);
  const [newInstruction, setNewInstruction] = useState('');
  const [newSensitivity, setNewSensitivity] = useState('');

  useEffect(() => {
    if (open) {
      setNewPin('');
      setConfirmPin('');
      setPinMsg(null);
      setPinError(null);
      setProfileMsg(null);
      setConfirmResetProfile(false);
      setPendingScenario(null);
    }
  }, [open]);

  async function handleSetPin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newPin.trim();
    const confirmed = confirmPin.trim();
    setPinError(null);
    setPinMsg(null);

    if (trimmed.length < 4) {
      setPinError(
        hu
          ? 'Legalább 4 karakteres vagy 4 számjegyű PIN szükséges.'
          : 'Enter at least a 4-character PIN.',
      );
      return;
    }
    if (trimmed !== confirmed) {
      setPinError(
        hu
          ? 'A két PIN-kód nem egyezik meg. Kérlek ellenőrizd.'
          : 'The two PIN entries do not match.',
      );
      return;
    }

    setPinBusy(true);
    try {
      await onEnablePin(trimmed);
      setNewPin('');
      setConfirmPin('');
      setPinMsg(
        hu
          ? 'PIN-zár és helyi titkosítás bekapcsolva.'
          : 'PIN lock and local AES-GCM encryption enabled.',
      );
    } catch {
      setPinError(
        hu
          ? 'A helyi titkosítás ebben a környezetben nem indítható el (WebCrypto / HTTPS szükséges).'
          : 'Local encryption could not be initialized (requires WebCrypto / secure context).',
      );
    } finally {
      setPinBusy(false);
    }
  }

  async function handleDisablePinClick() {
    setPinError(null);
    setPinMsg(null);
    setPinBusy(true);
    try {
      await onDisablePin();
      setPinMsg(
        hu ? 'PIN-zár sikeresen kikapcsolva.' : 'PIN lock disabled.',
      );
    } catch {
      setPinError(
        hu
          ? 'Nem sikerült kikapcsolni a PIN-zárat.'
          : 'Failed to disable PIN lock.',
      );
    } finally {
      setPinBusy(false);
    }
  }

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      ariaLabelledBy="settings-dialog-title"
      className="serosafe-dialog w-[min(100vw-24px,580px)] max-h-[90dvh] rounded-3xl overflow-hidden"
    >
      <div className="max-h-[90dvh] overflow-y-auto calm-scroll p-3.5 @[480px]:p-5 space-y-4 @[480px]:space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h2 id="settings-dialog-title" className="text-base font-bold text-ink">
              {hu
                ? 'Beállítások, tesztmód és titkosítás'
                : 'Settings, Demo Modes & Encryption'}
            </h2>
            <p className="text-xs text-ink-muted">
              {hu
                ? 'Szenzoros kényelem és teljesen helyi adatvédelem'
                : 'Sensory accessibility & 100% local privacy'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={hu ? 'Bezárás' : 'Close'}
            className="p-2 rounded-xl bg-surface-subtle text-ink-muted hover:text-ink"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* 4 Clean Topic Tabs inside SettingsDialog */}
        <div
          role="tablist"
          aria-label={hu ? 'Beállítási kategóriák' : 'Settings categories'}
          className="grid grid-cols-2 @[460px]:grid-cols-4 gap-1 p-1 rounded-2xl bg-surface-subtle"
        >
          {(
            [
              { id: 'display', hu: 'Megjelenés', en: 'Display' },
              { id: 'profile', hu: 'Kríziskártya', en: 'Crisis card' },
              { id: 'security', hu: 'PIN-zár', en: 'PIN lock' },
              { id: 'demo', hu: 'Tesztmód', en: 'Demo mode' },
            ] as const
          ).map((tab) => {
            const active = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setActiveSection(tab.id);
                  setConfirmResetProfile(false);
                  setPendingScenario(null);
                }}
                className={`py-1.5 px-2 rounded-xl text-xs text-center transition ${
                  active
                    ? 'bg-surface text-ink font-bold shadow-xs'
                    : 'text-ink-muted font-medium hover:text-ink'
                }`}
              >
                {hu ? tab.hu : tab.en}
              </button>
            );
          })}
        </div>

        {/* Display & Sensory Preferences */}
        {activeSection === 'display' && (
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-ink">
              {hu ? 'Megjelenés és szenzoros kényelem' : 'Display & sensory comfort'}
            </h3>

            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    theme: settings.theme === 'light' ? 'dark' : 'light',
                  })
                }
                className="p-3 rounded-xl bg-surface-subtle border border-border flex items-center justify-between text-xs font-semibold text-ink"
              >
                <span>{hu ? 'Téma' : 'Theme'}</span>
                <span className="inline-flex items-center gap-1.5 text-accent">
                  {settings.theme === 'light' ? (
                    <>
                      <Sun className="w-4 h-4" aria-hidden="true" />
                      {hu ? 'Világos zsálya' : 'Calm light'}
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4" aria-hidden="true" />
                      {hu ? 'Nyugodt sötét' : 'Calm dark'}
                    </>
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    lang: settings.lang === 'hu' ? 'en' : 'hu',
                  })
                }
                className="p-3 rounded-xl bg-surface-subtle border border-border flex items-center justify-between text-xs font-semibold text-ink"
              >
                <span>{hu ? 'Nyelv' : 'Language'}</span>
                <span className="text-accent font-bold">
                  {settings.lang === 'hu' ? 'Magyar' : 'English'}
                </span>
              </button>
            </div>

            <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-subtle border border-border cursor-pointer text-xs font-semibold text-ink">
              <div>
                <div>
                  {hu
                    ? 'Egyszerűsített mód (legfeljebb 4 opció)'
                    : 'Simplified mode (max 4 options per choice)'}
                </div>
                <div className="font-normal text-ink-muted">
                  {hu
                    ? 'Alacsonyabb kognitív terhelés fáradtság vagy szenzoros túlterhelés idején'
                    : 'Reduces simultaneous options during fatigue or sensory overload'}
                </div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings.simplifiedMode)}
                onChange={(e) =>
                  onUpdateSettings({ simplifiedMode: e.target.checked })
                }
                className="w-4 h-4 rounded shrink-0"
              />
            </label>

            <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-subtle border border-border cursor-pointer text-xs font-semibold text-ink">
              <span>
                {hu
                  ? 'Százalékok elrejtése a Naptár nézetben'
                  : 'Hide percentages in Calendar view'}
              </span>
              <input
                type="checkbox"
                checked={settings.hidePercentages}
                onChange={(e) =>
                  onUpdateSettings({ hidePercentages: e.target.checked })
                }
                className="w-4 h-4 rounded shrink-0"
              />
            </label>

            <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-subtle border border-border cursor-pointer text-xs font-semibold text-ink">
              <span>
                {hu
                  ? 'Animációk csökkentése'
                  : 'Reduced motion (disable transitions)'}
              </span>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) =>
                  onUpdateSettings({ reducedMotion: e.target.checked })
                }
                className="w-4 h-4 rounded shrink-0"
              />
            </label>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLegal();
              }}
              className="w-full py-2.5 px-3.5 rounded-xl bg-surface-subtle border border-border hover:border-border-strong text-xs font-semibold text-ink inline-flex items-center justify-center gap-2 transition"
            >
              <FileText className="w-4 h-4 text-secondary" aria-hidden="true" />
              {hu
                ? 'Felhasználási feltételek, adatvédelem és források'
                : 'Terms of Use, Privacy & Sources'}
            </button>
          </section>
        )}

        {/* OTIO / Jury / Paramedic A/B Testing Controller (Protected with explicit confirmation) */}
        {activeSection === 'demo' && (
          <section className="p-3 @[480px]:p-4 rounded-xl @[480px]:rounded-2xl bg-surface-blue border border-secondary-border space-y-3">
            <h3 className="text-sm font-bold text-ink">
              {hu
                ? 'Bemutató és tesztmód (OTIO / védett felülírás)'
                : 'Testing & Demo Mode (Confirmation Required)'}
            </h3>
            <p className="text-xs text-ink-muted">
              {hu
                ? 'A mintaadatok és az üres profil lecserélhetik a jelenlegi helyi naplódat, ezért minden profilváltás előtt megerősítést kérünk.'
                : 'Loading demo scenarios or a clean profile alters or replaces your current local logs. Confirmation is required before applying.'}
            </p>
            <div className="grid grid-cols-1 @[520px]:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPendingScenario('demo')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1.5 ${
                  pendingScenario === 'demo'
                    ? 'bg-accent text-ink-on-accent border-accent'
                    : 'bg-surface border-border hover:border-border-strong text-ink'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                {hu ? 'Mintaadatok' : 'Demo dataset'}
              </button>
              <button
                type="button"
                onClick={() => setPendingScenario('crisis')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1.5 ${
                  pendingScenario === 'crisis'
                    ? 'bg-warning text-warning-ink border-warning-border'
                    : 'bg-warning-soft border-warning-border text-warning-ink'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                {hu ? 'Krízisszimuláció' : 'Crisis simulation'}
              </button>
              <button
                type="button"
                onClick={() => setPendingScenario('clean')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold ${
                  pendingScenario === 'clean'
                    ? 'bg-emergency text-emergency-ink border-emergency'
                    : 'bg-surface border-border hover:border-border-strong text-ink-muted hover:text-ink'
                }`}
              >
                {hu ? 'Tiszta üres profil' : 'Clean empty profile'}
              </button>
            </div>

            {pendingScenario && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-surface border border-warning-border space-y-2 text-xs"
              >
                <p className="font-semibold text-ink">
                  {pendingScenario === 'demo'
                    ? hu
                      ? 'Megerősíted a Mintaadatok betöltését? Ez felülírja a jelenlegi helyi naplódat és gyógyszereidet.'
                      : 'Confirm loading Demo dataset? This replaces your current local logs and medications.'
                    : pendingScenario === 'crisis'
                      ? hu
                        ? 'Megerősíted a Krízisszimulációt? Ez DXM köhögéscsillapítót és akut riasztási tüneteket ad a mai naphoz.'
                        : 'Confirm Crisis simulation? This adds OTC DXM and acute warning symptoms to today.'
                      : hu
                        ? 'Megerősíted a Tiszta üres profil betöltését? Minden korábbi minta és rögzített bejegyzés törlődik.'
                        : 'Confirm Clean empty profile? All current logs and medications will be cleared.'}
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingScenario(null)}
                    className="px-3 py-1.5 rounded-xl bg-surface-subtle border border-border text-xs font-semibold text-ink-muted hover:text-ink"
                  >
                    {hu ? 'Mégse' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (pendingScenario === 'demo') onLoadDemoScenario();
                      else if (pendingScenario === 'crisis')
                        onLoadCrisisSimulation();
                      else onLoadCleanProfile();
                      setPendingScenario(null);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-accent text-ink-on-accent text-xs font-bold"
                  >
                    {hu ? 'Megerősítem, betöltés' : 'Confirm & load'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Editable Communication Profile */}
        {activeSection === 'profile' && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-ink">
                {hu
                  ? 'Sürgősségi kommunikációs profil (Kríziskártyára kerül)'
                  : 'Emergency communication profile (shown on Crisis Card)'}
              </h3>
              {confirmResetProfile ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConfirmResetProfile(false)}
                    className="px-2.5 py-1 rounded-xl bg-surface-subtle border border-border text-xs font-semibold text-ink-muted hover:text-ink"
                  >
                    {hu ? 'Mégse' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onResetProfile();
                      setNewInstruction('');
                      setNewSensitivity('');
                      setConfirmResetProfile(false);
                      setProfileMsg(
                        hu
                          ? 'Kommunikációs profil visszaállítva az alapértelmezett szövegekre.'
                          : 'Communication profile restored to default wording.',
                      );
                    }}
                    className="px-2.5 py-1 rounded-xl bg-emergency text-emergency-ink text-xs font-bold"
                  >
                    {hu ? 'Visszaállítás' : 'Confirm reset'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmResetProfile(true)}
                  className="px-2.5 py-1 rounded-xl bg-surface-subtle border border-border hover:border-border-strong text-xs font-semibold text-ink-muted hover:text-ink inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  {hu ? 'Alapértelmezett visszaállítása' : 'Reset defaults'}
                </button>
              )}
            </div>

          {profileMsg && (
            <p className="text-xs font-semibold text-accent">{profileMsg}</p>
          )}

          <div>
            <label
              htmlFor="comm-patient-name"
              className="block text-xs font-semibold text-ink-muted mb-1"
            >
              {hu ? 'Név / megszólítás (opcionális)' : 'Name / preferred name (optional)'}
            </label>
            <input
              id="comm-patient-name"
              type="text"
              value={profile.patientNameOptional}
              placeholder={hu ? 'Pl. Kovács Anna (üresen is hagyható)' : 'E.g. Alex (optional)'}
              onChange={(e) => {
                setProfileMsg(null);
                onUpdateProfile({
                  ...profile,
                  patientNameOptional: e.target.value,
                });
              }}
              className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border text-xs text-ink"
            />
          </div>

          <div>
            <label
              htmlFor="comm-barrier-statement"
              className="block text-xs font-semibold text-ink-muted mb-1"
            >
              {hu ? 'Kommunikációs nyilatkozat' : 'Barrier statement (EN)'}
            </label>
            <textarea
              id="comm-barrier-statement"
              rows={2}
              value={hu ? profile.barrierStatementHu : profile.barrierStatementEn}
              onChange={(e) => {
                setProfileMsg(null);
                onUpdateProfile(
                  hu
                    ? { ...profile, barrierStatementHu: e.target.value }
                    : { ...profile, barrierStatementEn: e.target.value },
                );
              }}
              className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border text-xs text-ink"
            />
          </div>

          {/* Editable Paramedic Do Instructions */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink-muted">
              {hu
                ? 'Utasítások az ellátóknak (Kríziskártya és zárolási kép)'
                : 'Responder instructions (Crisis Card & lock-screen)'}
            </label>
            <div className="space-y-1.5">
              {(hu ? profile.doInstructionsHu : profile.doInstructionsEn).map(
                (line, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={line}
                      aria-label={
                        hu
                          ? `Ellátói utasítás ${idx + 1}`
                          : `Responder instruction ${idx + 1}`
                      }
                      onChange={(e) => {
                        setProfileMsg(null);
                        const field = hu ? 'doInstructionsHu' : 'doInstructionsEn';
                        const nextList = [...profile[field]];
                        nextList[idx] = e.target.value;
                        onUpdateProfile({ ...profile, [field]: nextList });
                      }}
                      className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-surface-subtle border border-border text-xs text-ink"
                    />
                    <button
                      type="button"
                      aria-label={
                        hu ? `Utasítás törlése (${idx + 1})` : `Remove instruction ${idx + 1}`
                      }
                      onClick={() => {
                        setProfileMsg(null);
                        const field = hu ? 'doInstructionsHu' : 'doInstructionsEn';
                        const nextList = profile[field].filter((_, i) => i !== idx);
                        onUpdateProfile({ ...profile, [field]: nextList });
                      }}
                      className="p-2 rounded-xl bg-surface-subtle border border-border text-ink-muted hover:text-emergency"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ),
              )}
            </div>
            <div className="flex gap-1.5 pt-1">
              <input
                type="text"
                value={newInstruction}
                onChange={(e) => setNewInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmed = newInstruction.trim();
                    if (!trimmed) return;
                    const field = hu ? 'doInstructionsHu' : 'doInstructionsEn';
                    onUpdateProfile({
                      ...profile,
                      [field]: [...profile[field], trimmed],
                    });
                    setNewInstruction('');
                    setProfileMsg(null);
                  }
                }}
                placeholder={
                  hu ? 'Új ellátói kérés hozzáadása...' : 'Add responder instruction...'
                }
                className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-ink"
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = newInstruction.trim();
                  if (!trimmed) return;
                  const field = hu ? 'doInstructionsHu' : 'doInstructionsEn';
                  onUpdateProfile({
                    ...profile,
                    [field]: [...profile[field], trimmed],
                  });
                  setNewInstruction('');
                  setProfileMsg(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-surface-subtle border border-border hover:border-border-strong text-xs font-semibold text-ink inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                {hu ? 'Hozzáad' : 'Add'}
              </button>
            </div>
          </div>

          {/* Editable Sensory Sensitivities */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink-muted">
              {hu
                ? 'Szenzoros érzékenységek (címkék a Kríziskártyán)'
                : 'Sensory sensitivities (shown on Crisis Card)'}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(hu
                ? profile.sensorySensitivitiesHu
                : profile.sensorySensitivitiesEn
              ).map((tag, idx) => (
                <span
                  key={`${tag}-${idx}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-subtle border border-border text-xs font-medium text-ink"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    aria-label={hu ? `${tag} eltávolítása` : `Remove ${tag}`}
                    onClick={() => {
                      setProfileMsg(null);
                      const field = hu
                        ? 'sensorySensitivitiesHu'
                        : 'sensorySensitivitiesEn';
                      onUpdateProfile({
                        ...profile,
                        [field]: profile[field].filter((_, i) => i !== idx),
                      });
                    }}
                    className="text-ink-muted hover:text-emergency"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5 pt-1">
              <input
                type="text"
                value={newSensitivity}
                onChange={(e) => setNewSensitivity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmed = newSensitivity.trim();
                    if (!trimmed) return;
                    const field = hu
                      ? 'sensorySensitivitiesHu'
                      : 'sensorySensitivitiesEn';
                    onUpdateProfile({
                      ...profile,
                      [field]: [...profile[field], trimmed],
                    });
                    setNewSensitivity('');
                    setProfileMsg(null);
                  }
                }}
                placeholder={
                  hu
                    ? 'Új szenzoros érzékenység (pl. Tűfóbia, Neonfény)...'
                    : 'Add sensory trigger (e.g. Flashing strobe)...'
                }
                className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-ink"
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = newSensitivity.trim();
                  if (!trimmed) return;
                  const field = hu
                    ? 'sensorySensitivitiesHu'
                    : 'sensorySensitivitiesEn';
                  onUpdateProfile({
                    ...profile,
                    [field]: [...profile[field], trimmed],
                  });
                  setNewSensitivity('');
                  setProfileMsg(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-surface-subtle border border-border hover:border-border-strong text-xs font-semibold text-ink inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                {hu ? 'Hozzáad' : 'Add'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                {hu ? 'Vészhelyzeti kontakt neve' : 'Emergency contact name'}
              </label>
              <input
                type="text"
                value={profile.emergencyContactName}
                onChange={(e) => {
                  setProfileMsg(null);
                  onUpdateProfile({
                    ...profile,
                    emergencyContactName: e.target.value,
                  });
                }}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border text-xs text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                {hu ? 'Telefonszám' : 'Phone number'}
              </label>
              <input
                type="tel"
                value={profile.emergencyContactPhone}
                onChange={(e) => {
                  setProfileMsg(null);
                  onUpdateProfile({
                    ...profile,
                    emergencyContactPhone: e.target.value,
                  });
                }}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border text-xs text-ink"
              />
            </div>
          </div>
        </section>
        )}

        {/* WebCrypto AES-GCM PIN Protection */}
        {activeSection === 'security' && (
        <section className="p-3.5 rounded-2xl bg-surface-subtle border border-border space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-ink inline-flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-accent" aria-hidden="true" />
              {hu
                ? 'Helyi PIN-zár és titkosítás'
                : 'Local PIN lock & AES-GCM encryption'}
            </h3>
            <span className="text-xs font-bold text-accent">
              {settings.pinEnabled
                ? hu
                  ? 'Aktív'
                  : 'Active'
                : hu
                  ? 'Kikapcsolva'
                  : 'Off'}
            </span>
          </div>

          <label className="flex items-center justify-between gap-2 text-xs text-ink cursor-pointer">
            <span>
              {hu
                ? 'Kríziskártya elérése PIN nélkül is (mentős biztonság)'
                : 'Allow Crisis Card access without PIN (paramedic safety)'}
            </span>
            <input
              type="checkbox"
              checked={settings.allowEmergencyWithoutPin}
              onChange={(e) =>
                onUpdateSettings({
                  allowEmergencyWithoutPin: e.target.checked,
                })
              }
              className="w-4 h-4 rounded"
            />
          </label>

          {settings.pinEnabled ? (
            <button
              type="button"
              disabled={pinBusy}
              onClick={() => void handleDisablePinClick()}
              className="w-full py-2.5 px-3 rounded-xl bg-surface border border-border text-xs font-bold text-ink inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Unlock className="w-4 h-4" aria-hidden="true" />
              {pinBusy
                ? hu
                  ? 'Kikapcsolás...'
                  : 'Disabling...'
                : hu
                  ? 'PIN-zár kikapcsolása'
                  : 'Disable PIN lock'}
            </button>
          ) : (
            <form onSubmit={(e) => void handleSetPin(e)} className="space-y-2">
              <div className="grid grid-cols-1 @[440px]:grid-cols-2 gap-2">
                <input
                  type="password"
                  inputMode="numeric"
                  aria-label={hu ? 'Új PIN (min. 4 karakter)' : 'New PIN (min 4 chars)'}
                  value={newPin}
                  onChange={(e) => {
                    setNewPin(e.target.value);
                    setPinError(null);
                  }}
                  placeholder={hu ? 'Új PIN (min. 4 karakter)' : 'New PIN (min 4 chars)'}
                  className="min-w-0 px-3 py-2 rounded-xl bg-surface border border-border text-xs text-ink"
                />
                <input
                  type="password"
                  inputMode="numeric"
                  aria-label={hu ? 'PIN megerősítése' : 'Confirm PIN'}
                  value={confirmPin}
                  onChange={(e) => {
                    setConfirmPin(e.target.value);
                    setPinError(null);
                  }}
                  placeholder={hu ? 'PIN megerősítése...' : 'Confirm PIN...'}
                  className="min-w-0 px-3 py-2 rounded-xl bg-surface border border-border text-xs text-ink"
                />
              </div>
              <button
                type="submit"
                disabled={pinBusy}
                className="w-full py-2 px-3.5 rounded-xl bg-accent text-ink-on-accent text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                {pinBusy
                  ? hu
                    ? 'Kulcs létrehozása...'
                    : 'Encrypting...'
                  : hu
                    ? 'Helyi titkosítás bekapcsolása'
                    : 'Enable local PIN lock'}
              </button>
            </form>
          )}

          {pinError && (
            <p role="alert" className="text-xs font-semibold text-emergency">
              {pinError}
            </p>
          )}
          {pinMsg && <p className="text-xs font-semibold text-accent">{pinMsg}</p>}
        </section>
        )}
      </div>
    </ModalDialog>
  );
}
