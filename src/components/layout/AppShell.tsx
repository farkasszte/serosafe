import React, { useEffect, useRef, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  BellOff,
  Calendar,
  LineChart,
  Monitor,
  NotebookPen,
  Pill,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import {
  buildConsultSignature,
  isConsultQuietedForState,
} from '@/engine/consultAlert';
import { STRINGS } from '@/services/i18n';
import type {
  AppSettings,
  ObservableSymptomEntry,
  PageTab,
  StructuredAssessment,
} from '@/types/serosafe';

interface AppShellProps {
  activeTab: PageTab;
  isLegalView?: boolean;
  settings: AppSettings;
  assessment: StructuredAssessment;
  todaySymptom?: ObservableSymptomEntry;
  todayBodySensations?: string[];
  onSelectTab: (tab: PageTab) => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onOpenCrisisCard: () => void;
  onOpenSettings: () => void;
  onOpenLegal: () => void;
  children: React.ReactNode;
}

const TAB_ORDER: PageTab[] = ['today', 'meds', 'calendar', 'insights', 'safety'];

export function AppShell({
  activeTab,
  isLegalView = false,
  settings,
  assessment,
  todaySymptom,
  todayBodySensations = [],
  onSelectTab,
  onUpdateSettings,
  onOpenCrisisCard,
  onOpenSettings,
  onOpenLegal,
  children,
}: AppShellProps) {
  const t = STRINGS[settings.lang];
  const hu = settings.lang === 'hu';

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [confirmQuietOpen, setConfirmQuietOpen] = useState(false);
  const isMobilePreview = settings.desktopFrameMode === 'mobile-preview';

  const consultSignature = buildConsultSignature(
    assessment,
    todaySymptom,
    todayBodySensations,
  );
  const isConsultQuieted = isConsultQuietedForState(
    settings,
    assessment,
    todaySymptom,
    todayBodySensations,
  );

  useEffect(() => {
    setConfirmQuietOpen(false);
  }, [consultSignature, assessment.level]);

  const navItems: {
    id: PageTab;
    label: string;
    icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  }[] = [
    { id: 'today', label: t.nav.today, icon: NotebookPen },
    { id: 'meds', label: t.nav.meds, icon: Pill },
    { id: 'calendar', label: t.nav.calendar, icon: Calendar },
    { id: 'insights', label: t.nav.insights, icon: LineChart },
    { id: 'safety', label: t.nav.safety, icon: ShieldCheck },
  ];

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (isLegalView) {
      touchStartRef.current = null;
      return;
    }
    const target = e.target as HTMLElement | null;
    if (
      target?.closest(
        '[data-no-swipe="true"], input, textarea, select, dialog',
      )
    ) {
      touchStartRef.current = null;
      return;
    }
    const touch = e.touches[0];
    if (touch) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const curIdx = TAB_ORDER.indexOf(activeTab);
    if (dx < 0 && curIdx < TAB_ORDER.length - 1) {
      onSelectTab(TAB_ORDER[curIdx + 1]);
    } else if (dx > 0 && curIdx > 0) {
      onSelectTab(TAB_ORDER[curIdx - 1]);
    }
  }

  const isEmergency = assessment.level === 'CALL_EMERGENCY_112';
  const isConsult = assessment.level === 'CONSULT';
  const hasSafetyFlag = isEmergency || isConsult;
  const reasons = hu ? assessment.summaryReasonsHu : assessment.summaryReasonsEn;
  const primaryReason =
    (isEmergency ? reasons[reasons.length - 1] : reasons[0]) ?? '';

  return (
    <div
      id="app-root-shell"
      className={`min-h-dvh bg-canvas text-ink flex flex-col ${
        isMobilePreview ? 'lg:py-6 lg:items-center lg:justify-center' : ''
      }`}
    >
      <div
        className={`w-full flex flex-col bg-canvas ${
          isMobilePreview
            ? 'min-h-dvh lg:min-h-0 lg:h-[88dvh] lg:max-w-[420px] lg:rounded-[2.25rem] lg:border-2 lg:border-border-strong lg:shadow-xl lg:overflow-hidden'
            : 'min-h-dvh'
        }`}
      >
        {/* Quiet, uncluttered top header */}
        <header className="sticky top-0 z-30 bg-surface/95 border-b border-border px-4 py-2.5">
          <div
            className={`mx-auto flex items-center justify-between gap-3 ${
              isMobilePreview ? '' : 'max-w-5xl'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <svg
                viewBox="0 0 36 36"
                className="w-8 h-8 shrink-0"
                aria-hidden="true"
              >
                <rect width="36" height="36" rx="9" fill="var(--color-accent)" />
                <path
                  d="M18 3.8 L30 8.5 V17.6 C30 25.0 24.9 30.9 18 32.8 C11.1 30.9 6 25.0 6 17.6 V8.5 Z"
                  fill="var(--color-ink-on-accent)"
                  fillOpacity="0.12"
                />
                <path
                  d="M21.15 14.0 L19.33 17.16 L15.67 17.16 L13.85 14.0 L15.67 10.84 L19.33 10.84 Z"
                  fill="none"
                  stroke="var(--color-ink-on-accent)"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19.33 17.16 L20.45 20.63 L17.5 22.78 L14.55 20.63 L15.67 17.16"
                  fill="none"
                  stroke="var(--color-ink-on-accent)"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19.33 10.84 L20.9 8.15 M20.45 20.63 L22.1 23.4 L20.45 26.2 L22.1 29.0"
                  fill="none"
                  stroke="var(--color-ink-on-accent)"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="20.9" cy="8.15" r="1.35" fill="var(--color-warning)" />
                <circle cx="22.1" cy="29.0" r="1.35" fill="var(--color-warning)" />
              </svg>
              <span className="font-bold text-base tracking-tight text-ink">
                {t.appName}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    desktopFrameMode: isMobilePreview
                      ? 'responsive'
                      : 'mobile-preview',
                  })
                }
                title={isMobilePreview ? t.header.frameFull : t.header.frameMobile}
                aria-label={
                  isMobilePreview ? t.header.frameFull : t.header.frameMobile
                }
                className="hidden lg:inline-flex h-9 w-9 rounded-xl bg-surface-subtle text-ink-muted hover:text-ink items-center justify-center transition"
              >
                {isMobilePreview ? (
                  <Monitor className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Smartphone className="w-4 h-4" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={onOpenSettings}
                aria-label={t.header.settings}
                title={t.header.settings}
                className="h-9 w-9 rounded-xl bg-surface-subtle text-ink-muted hover:text-ink flex items-center justify-center transition"
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onOpenCrisisCard}
                className={`h-9 px-3.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition ${
                  isEmergency
                    ? 'bg-emergency text-emergency-ink'
                    : 'bg-warning-soft text-warning-ink border border-warning-border hover:opacity-90'
                }`}
              >
                <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                <span>{t.crisisBtnTop}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Body Layout */}
        <div
          id="app-scroll-container"
          className={`flex-1 flex ${
            isMobilePreview
              ? 'overflow-y-auto calm-scroll'
              : 'max-w-5xl w-full mx-auto lg:gap-8 lg:px-4'
          }`}
        >
          {!isMobilePreview && (
            <aside className="hidden lg:flex lg:w-48 lg:shrink-0 lg:flex-col lg:py-6">
              <nav
                aria-label={hu ? 'Fő navigáció' : 'Primary navigation'}
                className="space-y-1 sticky top-20"
              >
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = !isLegalView && activeTab === item.id;
                  const showSafetyDot = item.id === 'safety' && hasSafetyFlag;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectTab(item.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm flex items-center justify-between gap-2 transition ${
                        active
                          ? 'bg-accent-soft text-accent-strong font-bold'
                          : 'text-ink-muted font-medium hover:text-ink hover:bg-surface'
                      }`}
                    >
                      <span className="inline-flex items-center gap-3 min-w-0">
                        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {showSafetyDot && (
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isEmergency ? 'bg-emergency' : 'bg-warning'
                          }`}
                          aria-label={
                            isEmergency
                              ? hu
                                ? 'Azonnali figyelmeztetés'
                                : 'Emergency alert'
                              : hu
                                ? 'Konzultációs jelzés'
                                : 'Consultation notice'
                          }
                        />
                      )}
                    </button>
                  );
                })}
              </nav>
            </aside>
          )}

          <main
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{ viewTransitionName: 'page-panel' }}
            className={`@container flex-1 min-w-0 px-0 pt-2 pb-24 ${
              isMobilePreview
                ? ''
                : '@lg:px-4 @lg:py-6 lg:pb-12 lg:px-0 lg:py-6'
            }`}
          >
            {/* Global Persistent Consultation / Emergency Banner on non-Safety tabs */}
            {hasSafetyFlag &&
              activeTab !== 'safety' &&
              (isConsult && !isEmergency && isConsultQuieted ? (
                <div
                  role="status"
                  className="mb-3 @lg:mb-5 border-y @lg:border @lg:rounded-2xl px-4 py-2 bg-warning-soft/45 border-warning-border flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <span className="inline-flex items-center gap-2 font-semibold text-warning-ink">
                    <AlertTriangle
                      className="w-3.5 h-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    {hu
                      ? 'Konzultációs állapot aktív (halkítva) — új tünetnél automatikusan visszatér'
                      : 'Consultation notice still active (quieted) — returns if new warning signs appear'}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateSettings({ quietedConsultSignature: undefined })
                      }
                      className="px-2.5 py-1 rounded-lg bg-surface border border-warning-border text-xs font-semibold text-ink hover:opacity-90 transition"
                    >
                      {hu ? 'Visszaállítás' : 'Expand'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectTab('safety')}
                      className="px-2.5 py-1 rounded-lg bg-surface border border-warning-border text-xs font-bold text-warning-ink inline-flex items-center gap-1 hover:opacity-90 transition"
                    >
                      <span>{t.nav.safety}</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  role={isEmergency ? 'alert' : 'status'}
                  className={`mb-3 @lg:mb-6 border-y @lg:border @lg:rounded-2xl px-4 py-3 space-y-2.5 ${
                    isEmergency
                      ? 'bg-emergency-soft border-emergency-border'
                      : 'bg-warning-soft border-warning-border'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {isEmergency ? (
                        <AlertOctagon
                          className="w-4 h-4 text-emergency shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      ) : (
                        <AlertTriangle
                          className="w-4 h-4 text-warning-ink shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      )}
                      <div className="min-w-0 space-y-0.5">
                        <div
                          className={`text-xs font-bold ${
                            isEmergency ? 'text-emergency' : 'text-warning-ink'
                          }`}
                        >
                          {isEmergency
                            ? hu
                              ? 'Azonnali sürgősségi jelzés — Hívd a 112-t!'
                              : 'Immediate emergency alert — Call 112!'
                            : hu
                              ? 'Orvosi vagy gyógyszerészi konzultáció javasolt'
                              : 'Doctor or pharmacist consultation recommended'}
                        </div>
                        {primaryReason && (
                          <p className="text-xs text-ink leading-snug">
                            {primaryReason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {isEmergency && (
                        <button
                          type="button"
                          onClick={onOpenCrisisCard}
                          className="px-3 py-1.5 rounded-xl bg-crisis-bg text-crisis-amber text-xs font-extrabold inline-flex items-center gap-1 hover:opacity-90 transition"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                          {hu ? '112 Kríziskártya' : '112 Crisis Card'}
                        </button>
                      )}
                      {isConsult && !isEmergency && !confirmQuietOpen && (
                        <button
                          type="button"
                          onClick={() => setConfirmQuietOpen(true)}
                          className="px-3 py-1.5 rounded-xl bg-surface/80 border border-warning-border text-xs font-semibold text-ink hover:bg-surface inline-flex items-center gap-1 transition"
                        >
                          <BellOff className="w-3.5 h-3.5" aria-hidden="true" />
                          {hu ? 'Halkítás…' : 'Quiet…'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectTab('safety')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition ${
                          isEmergency
                            ? 'bg-surface border border-emergency-border text-ink hover:opacity-90'
                            : 'bg-surface border border-warning-border text-warning-ink hover:opacity-90'
                        }`}
                      >
                        <span>{t.nav.safety}</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {isConsult && !isEmergency && confirmQuietOpen && (
                    <div className="pt-2.5 border-t border-warning-border/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <p className="text-ink flex-1 min-w-[220px] leading-snug">
                        {hu
                          ? 'A háttérállapot (pl. aktív kiürülés vagy szerotonerg kockázat) ettől még fennáll. Új figyelmeztető tünet vagy gyógyszerváltozás esetén a figyelmeztetés automatikusan visszatér.'
                          : 'The underlying clinical risk remains active. Quieting only shrinks this top banner; any new warning sign or medication change will automatically restore it.'}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setConfirmQuietOpen(false)}
                          className="px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-semibold text-ink-muted hover:text-ink"
                        >
                          {hu ? 'Mégse' : 'Cancel'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateSettings({
                              quietedConsultSignature: consultSignature,
                            });
                            setConfirmQuietOpen(false);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-warning text-warning-ink border border-warning-border text-xs font-bold hover:opacity-90"
                        >
                          {hu ? 'Értem, halkítás' : 'Confirm quiet'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

            {children}

            <footer className="mt-6 pt-4 px-4 @lg:mt-10 @lg:pt-5 @lg:px-0 border-t border-border/70 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-ink-muted text-center">
              <span>
                {hu ? 'SeroSafe · Teljesen helyi működés' : 'SeroSafe · 100% offline'}
              </span>
              {!isLegalView && (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={onOpenLegal}
                    className="font-semibold text-ink-muted hover:text-ink underline underline-offset-2 transition"
                  >
                    {hu
                      ? 'Felhasználási feltételek, adatvédelem és források'
                      : 'Terms, Privacy & Sources'}
                  </button>
                </>
              )}
            </footer>
          </main>
        </div>

        {/* Fixed Bottom Mobile Navigation */}
        <nav
          aria-label={hu ? 'Mobil navigáció' : 'Mobile navigation'}
          className={`bg-surface border-t border-border px-2 py-1.5 z-30 ${
            isMobilePreview
              ? 'sticky bottom-0'
              : 'fixed bottom-0 left-0 right-0 lg:hidden'
          }`}
        >
          <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = !isLegalView && activeTab === item.id;
              const showSafetyDot = item.id === 'safety' && hasSafetyFlag;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs transition ${
                    active
                      ? 'bg-accent-soft text-accent-strong font-bold'
                      : 'text-ink-muted font-medium hover:text-ink'
                  }`}
                >
                  <span className="relative inline-flex">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    {showSafetyDot && (
                      <span
                        className={`w-2 h-2 rounded-full absolute -top-0.5 -right-1.5 ring-2 ring-surface ${
                          isEmergency ? 'bg-emergency' : 'bg-warning'
                        }`}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span className="truncate max-w-full">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
