import React, { useEffect, useRef, useState } from 'react';
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
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [newPin, setNewPin] = useState('');
  const [pinMsg, setPinMsg] = useState<string | null>(null);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [newInstruction, setNewInstruction] = useState('');
  const [newSensitivity, setNewSensitivity] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setPinMsg(null);
      setProfileMsg(null);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  async function handleSetPin(e: React.FormEvent) {
    e.preventDefault();
    if (newPin.trim().length < 4) {
      setPinMsg(
        hu
          ? 'Legalább 4 karakteres vagy 4 számjegyű PIN szükséges.'
          : 'Enter at least a 4-character PIN.',
      );
      return;
    }
    await onEnablePin(newPin.trim());
    setNewPin('');
    setPinMsg(
      hu
        ? 'PIN-zár és helyi titkosítás bekapcsolva.'
        : 'PIN lock and local AES-GCM encryption enabled.',
    );
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="settings-dialog-title"
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

        {/* Display & Sensory Preferences */}
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

          <label className="flex items-center justify-between p-3 rounded-xl bg-surface-subtle border border-border cursor-pointer text-xs font-semibold text-ink">
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
              className="w-4 h-4 rounded"
            />
          </label>
        </section>

        {/* OTIO / Jury / Paramedic A/B Testing Controller */}
        <section className="p-3 @[480px]:p-3.5 rounded-xl @[480px]:rounded-2xl bg-surface-blue border border-secondary-border space-y-2.5">
          <h3 className="text-sm font-bold text-ink">
            {hu
              ? 'Bemutató és tesztelési forgatókönyvek'
              : 'Testing & Demo Scenarios (OTIO / A-B simulation)'}
          </h3>
          <p className="text-xs text-ink-muted">
            {hu
              ? 'Válts egy kattintással a mintaadatok, a sürgősségi 112-es szimuláció és a tiszta üres profil között.'
              : 'Switch in one tap between realistic history, acute 112 crisis simulation, or a clean empty profile.'}
          </p>
          <div className="grid grid-cols-1 @[520px]:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                onLoadDemoScenario();
                onClose();
              }}
              className="py-2.5 px-3 rounded-xl bg-surface border border-border hover:border-border-strong text-xs font-bold text-ink inline-flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              {hu ? 'Mintaadatok' : 'Demo dataset'}
            </button>
            <button
              type="button"
              onClick={() => {
                onLoadCrisisSimulation();
                onClose();
              }}
              className="py-2.5 px-3 rounded-xl bg-warning-soft border border-warning-border text-xs font-bold text-warning-ink inline-flex items-center justify-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              {hu ? 'Krízisszimuláció' : 'Crisis simulation'}
            </button>
            <button
              type="button"
              onClick={() => {
                onLoadCleanProfile();
                onClose();
              }}
              className="py-2.5 px-3 rounded-xl bg-surface border border-border hover:border-border-strong text-xs font-semibold text-ink-muted hover:text-ink"
            >
              {hu ? 'Tiszta üres profil' : 'Clean empty profile'}
            </button>
          </div>
        </section>

        {/* Editable Communication Profile */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-ink">
              {hu
                ? 'Sürgősségi kommunikációs profil (Kríziskártyára kerül)'
                : 'Emergency communication profile (shown on Crisis Card)'}
            </h3>
            <button
              type="button"
              onClick={() => {
                onResetProfile();
                setNewInstruction('');
                setNewSensitivity('');
                setProfileMsg(
                  hu
                    ? 'Kommunikációs profil visszaállítva az alapértelmezett szövegekre.'
                    : 'Communication profile restored to default wording.',
                );
              }}
              className="px-2.5 py-1 rounded-xl bg-surface-subtle border border-border hover:border-border-strong text-xs font-semibold text-ink-muted hover:text-ink inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              {hu ? 'Alapértelmezett visszaállítása' : 'Reset defaults'}
            </button>
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

        {/* WebCrypto AES-GCM PIN Protection */}
        <section className="pt-3.5 border-t border-border @[480px]:p-3.5 @[480px]:rounded-2xl @[480px]:bg-surface-subtle @[480px]:border space-y-3">
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
              onClick={() => void onDisablePin()}
              className="w-full py-2.5 px-3 rounded-xl bg-surface border border-border text-xs font-bold text-ink inline-flex items-center justify-center gap-1.5"
            >
              <Unlock className="w-4 h-4" aria-hidden="true" />
              {hu ? 'PIN-zár kikapcsolása' : 'Disable PIN lock'}
            </button>
          ) : (
            <form onSubmit={(e) => void handleSetPin(e)} className="flex gap-2">
              <input
                type="password"
                inputMode="numeric"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder={hu ? 'Új PIN (min. 4 karakter)' : 'New PIN (min 4 chars)'}
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-surface border border-border text-xs text-ink"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-accent text-ink-on-accent text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                {hu ? 'Titkosítás' : 'Lock'}
              </button>
            </form>
          )}

          {pinMsg && <p className="text-xs font-semibold text-accent">{pinMsg}</p>}
        </section>

        {/* Terms, Privacy & Scientific Sources */}
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
      </div>
    </dialog>
  );
}
