import React, { useState } from 'react';
import { Lock, ShieldAlert, Unlock } from 'lucide-react';

interface PinLockOverlayProps {
  lang: 'hu' | 'en';
  canBypassForCrisis: boolean;
  onUnlock: (pin: string) => Promise<boolean>;
  onOpenCrisisWithoutPin: () => void;
}

export function PinLockOverlay({
  lang,
  canBypassForCrisis,
  onUnlock,
  onOpenCrisisWithoutPin,
}: PinLockOverlayProps) {
  const hu = lang === 'hu';
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) return;
    setBusy(true);
    setError(null);
    const ok = await onUnlock(pin.trim());
    setBusy(false);
    if (!ok) {
      setError(hu ? 'Hibás PIN-kód. Próbáld újra.' : 'Incorrect PIN. Please try again.');
    }
  }

  return (
    <div className="min-h-dvh bg-canvas text-ink flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-3xl p-6 space-y-5 shadow-md">
        <div className="flex flex-col items-center text-center space-y-2">
          <span className="p-3 rounded-2xl bg-accent-soft text-accent border border-accent-border">
            <Lock className="w-6 h-6" aria-hidden="true" />
          </span>
          <h1 className="text-lg font-bold text-ink">SeroSafe</h1>
          <p className="text-xs text-ink-muted">
            {hu
              ? 'A naplóadatok helyi titkosítással védettek. Add meg a PIN-kódot a feloldáshoz.'
              : 'Your diary is encrypted locally with AES-GCM. Enter your PIN to unlock.'}
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder={hu ? 'PIN-kód...' : 'PIN code...'}
            aria-label={hu ? 'PIN-kód' : 'PIN code'}
            className="w-full px-4 py-3 rounded-2xl bg-surface-subtle border border-border text-center text-base font-bold tracking-widest text-ink"
          />
          {error && (
            <p className="text-xs font-semibold text-emergency text-center">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-2xl bg-accent hover:bg-accent-strong text-ink-on-accent text-sm font-bold inline-flex items-center justify-center gap-2 transition disabled:opacity-60"
          >
            <Unlock className="w-4 h-4" aria-hidden="true" />
            {busy
              ? hu
                ? 'Feloldás...'
                : 'Unlocking...'
              : hu
                ? 'Napló feloldása'
                : 'Unlock diary'}
          </button>
        </form>

        {canBypassForCrisis && (
          <div className="pt-3 border-t border-border space-y-2">
            <button
              type="button"
              onClick={onOpenCrisisWithoutPin}
              className="w-full py-3 px-4 rounded-2xl bg-warning-soft border border-warning-border text-warning-ink text-xs font-extrabold inline-flex items-center justify-center gap-2 hover:opacity-90 transition"
            >
              <ShieldAlert className="w-4 h-4" aria-hidden="true" />
              {hu
                ? '112 Kríziskártya megnyitása PIN nélkül'
                : 'Open 112 Offline Crisis Card without PIN'}
            </button>
            <p className="text-xs text-ink-muted text-center">
              {hu
                ? 'Sürgősségi helyzetben mentősök számára feloldás nélkül elérhető.'
                : 'Accessible for paramedics in an emergency without unlocking.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
