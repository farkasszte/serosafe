import { useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { AddMedDialog } from '@/components/modals/AddMedDialog';
import { ClinicalReportDialog } from '@/components/modals/ClinicalReportDialog';
import { CrisisCardDialog } from '@/components/modals/CrisisCardDialog';
import { FocusModeDialog } from '@/components/modals/FocusModeDialog';
import { PinLockOverlay } from '@/components/modals/PinLockOverlay';
import { SettingsDialog } from '@/components/modals/SettingsDialog';
import { CURATED_SUBSTANCES } from '@/data/substances';
import {
  computeExplainablePatterns,
  evaluateRiskAndSymptoms,
  normalizeMedicationsForDate,
} from '@/engine/safetyEngine';
import { CalendarPage } from '@/pages/CalendarPage';
import { InsightsPage } from '@/pages/InsightsPage';
import { LegalPage } from '@/pages/LegalPage';
import { MedsPage } from '@/pages/MedsPage';
import { SafetyPage } from '@/pages/SafetyPage';
import { TodayPage } from '@/pages/TodayPage';
import {
  createPinConfig,
  type PinLockConfig,
  verifyPinAndDeriveKey,
} from '@/services/crypto';
import {
  disablePinProtection,
  type EmergencySnapshot,
  enablePinProtection,
  getEmergencySnapshot,
  getPinConfig,
  loadEncryptedState,
  loadPlainState,
  saveAppState,
  wipeAllLocalData,
} from '@/services/db';
import {
  applyCrisisDemoPreset,
  createCleanDataset,
  createDemoDataset,
  DEFAULT_COMMUNICATION_PROFILE,
  formatIsoDateLocal,
} from '@/services/demoData';
import type {
  AppSettings,
  CommunicationProfile,
  DailyLogEntry,
  DayPart,
  HabitChip,
  IntentTag,
  MedicationStatus,
  PageTab,
  PatternInsight,
  SeroSafeState,
  UserMedication,
} from '@/types/serosafe';

function createEmptyTodayLog(dateKey: string): DailyLogEntry {
  return {
    date: dateKey,
    isGap: false,
    dayPartsLogged: ['now'],
    emotions: [],
    energyLevel: 65,
    sensoryBattery: 70,
    sleepHours: 7,
    wokeAtNight: false,
    bodyRegions: [],
    bodySensations: [],
    chipIds: [],
    note: '',
    addedLater: false,
    medsTakenPct: null,
  };
}

export function App() {
  const [state, setState] = useState<SeroSafeState | null>(null);
  const [pinConfig, setPinConfig] = useState<PinLockConfig | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [emergencySnapshot, setEmergencySnapshot] =
    useState<EmergencySnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<PageTab>('today');
  const [crisisOpen, setCrisisOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [addMedOpen, setAddMedOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);

  // Initial local IndexedDB hydration
  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      const cfg = await getPinConfig();
      if (!mounted) return;
      if (cfg) {
        setPinConfig(cfg);
        const snap = await getEmergencySnapshot();
        if (mounted) {
          setEmergencySnapshot(snap);
          setLoading(false);
        }
        return;
      }

      const existing = await loadPlainState();
      if (!mounted) return;
      if (existing) {
        const currentToday = formatIsoDateLocal(new Date());
        setState({
          ...existing,
          selectedDate: currentToday,
          medications: normalizeMedicationsForDate(
            existing.medications,
            currentToday,
            existing.selectedDate,
          ),
        });
      } else {
        const seeded = createDemoDataset('hu', 'light');
        await saveAppState(seeded, null);
        if (mounted) setState(seeded);
      }
      if (mounted) setLoading(false);
    }
    void bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  // Sync theme, reduced motion, desktop frame mode, and document lang attributes
  useEffect(() => {
    if (!state) return;
    document.documentElement.dataset.theme = state.settings.theme;
    document.documentElement.dataset.reducedMotion = String(
      state.settings.reducedMotion,
    );
    document.documentElement.dataset.frameMode = state.settings.desktopFrameMode;
    document.documentElement.lang = state.settings.lang;
  }, [
    state?.settings.theme,
    state?.settings.reducedMotion,
    state?.settings.desktopFrameMode,
    state?.settings.lang,
  ]);

  // Persist changes locally to Dexie IndexedDB
  useEffect(() => {
    if (!state) return;
    void saveAppState(state, encryptionKey);
  }, [state, encryptionKey]);

  const todayKey = formatIsoDateLocal(new Date());

  const todayLog = useMemo(() => {
    if (!state) return createEmptyTodayLog(todayKey);
    return (
      state.dailyLogs.find((l) => l.date === todayKey) ??
      createEmptyTodayLog(todayKey)
    );
  }, [state, todayKey]);

  const assessment = useMemo(() => {
    const meds = state?.medications ?? emergencySnapshot?.medications ?? [];
    const sym = todayLog.symptomEntry ?? emergencySnapshot?.latestSymptom;
    return evaluateRiskAndSymptoms(meds, CURATED_SUBSTANCES, sym);
  }, [state?.medications, todayLog.symptomEntry, emergencySnapshot]);

  function handleOpenLegal() {
    setLegalOpen(true);
    window.scrollTo({ top: 0 });
    document.getElementById('app-scroll-container')?.scrollTo({ top: 0 });
  }

  function handleSelectTab(nextTab: PageTab) {
    if (nextTab === activeTab && !legalOpen) return;
    const reduced = state?.settings.reducedMotion ?? false;
    const startVt = (
      document as Document & {
        startViewTransition?: (cb: () => void) => void;
      }
    ).startViewTransition;

    if (typeof startVt === 'function' && !reduced) {
      startVt.call(document, () => {
        flushSync(() => {
          setLegalOpen(false);
          setActiveTab(nextTab);
        });
      });
    } else {
      setLegalOpen(false);
      setActiveTab(nextTab);
    }
  }

  function updateStateWithPatterns(updater: (prev: SeroSafeState) => SeroSafeState) {
    setState((prev) => {
      if (!prev) return prev;
      const updated = updater(prev);
      const computed = computeExplainablePatterns(
        updated.dailyLogs,
        updated.habits,
      );
      const prevStatusMap = new Map(
        updated.patterns.map((p) => [p.id, p.status]),
      );
      const mergedPatterns: PatternInsight[] = computed.map((p) => ({
        ...p,
        status: prevStatusMap.get(p.id) ?? p.status,
      }));
      return {
        ...updated,
        patterns: mergedPatterns,
      };
    });
  }

  function handleUpdateTodayLog(
    updater: (prevLog: DailyLogEntry) => DailyLogEntry,
  ) {
    updateStateWithPatterns((prev) => {
      const idx = prev.dailyLogs.findIndex((l) => l.date === todayKey);
      const current = idx >= 0 ? prev.dailyLogs[idx] : createEmptyTodayLog(todayKey);
      const nextLog = updater(current);
      const nextLogs = [...prev.dailyLogs];
      if (idx >= 0) nextLogs[idx] = nextLog;
      else nextLogs.push(nextLog);
      return { ...prev, dailyLogs: nextLogs };
    });
  }

  function handleAddHabit(
    label: string,
    group: HabitChip['group'],
    intent: IntentTag,
  ) {
    const id = `c_custom_${Date.now()}`;
    updateStateWithPatterns((prev) => {
      const nextHabit: HabitChip = {
        id,
        group,
        labelHu: label,
        labelEn: label,
        intent,
        onGraph: true,
        count: 1,
      };
      const idx = prev.dailyLogs.findIndex((l) => l.date === todayKey);
      const current = idx >= 0 ? prev.dailyLogs[idx] : createEmptyTodayLog(todayKey);
      const nextLog: DailyLogEntry = {
        ...current,
        isGap: false,
        chipIds: [...current.chipIds, id],
      };
      const nextLogs = [...prev.dailyLogs];
      if (idx >= 0) nextLogs[idx] = nextLog;
      else nextLogs.push(nextLog);
      return {
        ...prev,
        habits: [...prev.habits, nextHabit],
        dailyLogs: nextLogs,
      };
    });
  }

  function handleDeleteHabit(habitId: string) {
    updateStateWithPatterns((prev) => ({
      ...prev,
      habits: prev.habits.filter((h) => h.id !== habitId),
      dailyLogs: prev.dailyLogs.map((l) =>
        l.chipIds.includes(habitId)
          ? { ...l, chipIds: l.chipIds.filter((id) => id !== habitId) }
          : l,
      ),
    }));
  }

  function handleSetMedStatus(medId: string, status: MedicationStatus) {
    updateStateWithPatterns((prev) => {
      const nextMeds = prev.medications.map((m) =>
        m.id === medId
          ? {
              ...m,
              todayStatus: status,
              todayStatusDate: todayKey,
              lastTakenIso:
                status === 'TOOK' ? new Date().toISOString() : m.lastTakenIso,
            }
          : m,
      );
      const activeMeds = nextMeds.filter((m) => !m.isDiscontinued);
      const tookCount = activeMeds.filter(
        (m) => m.todayStatus === 'TOOK',
      ).length;
      const pct =
        activeMeds.length > 0
          ? Math.round((tookCount / activeMeds.length) * 100)
          : 100;

      const idx = prev.dailyLogs.findIndex((l) => l.date === todayKey);
      const current = idx >= 0 ? prev.dailyLogs[idx] : createEmptyTodayLog(todayKey);
      const nextLogs = [...prev.dailyLogs];
      const nextLog = { ...current, isGap: false, medsTakenPct: pct };
      if (idx >= 0) nextLogs[idx] = nextLog;
      else nextLogs.push(nextLog);

      return { ...prev, medications: nextMeds, dailyLogs: nextLogs };
    });
  }

  function handleToggleDiscontinued(medId: string) {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        medications: prev.medications.map((m) => {
          if (m.id !== medId) return m;
          const nextStopped = !m.isDiscontinued;
          return {
            ...m,
            isDiscontinued: nextStopped,
            discontinuedAtIso: nextStopped
              ? new Date().toISOString()
              : undefined,
            scheduleTime: nextStopped
              ? prev.settings.lang === 'hu'
                ? 'Ma leállítva (kiürülés aktív)'
                : 'Stopped today (washout active)'
              : '08:00',
          };
        }),
      };
    });
  }

  function handleDeleteMedication(medId: string) {
    setState((prev) =>
      prev
        ? {
            ...prev,
            medications: prev.medications.filter((m) => m.id !== medId),
          }
        : prev,
    );
  }

  function handleAddMedication(med: UserMedication) {
    setState((prev) =>
      prev ? { ...prev, medications: [med, ...prev.medications] } : prev,
    );
  }

  function handleUpdateSettings(patch: Partial<AppSettings>) {
    setState((prev) =>
      prev ? { ...prev, settings: { ...prev.settings, ...patch } } : prev,
    );
  }

  function handleUpdateProfile(profile: CommunicationProfile) {
    setState((prev) =>
      prev ? { ...prev, communicationProfile: profile } : prev,
    );
  }

  async function handleUnlockPin(pin: string): Promise<boolean> {
    if (!pinConfig) return false;
    const key = await verifyPinAndDeriveKey(pin, pinConfig);
    if (!key) return false;
    try {
      const decrypted = await loadEncryptedState(key);
      if (decrypted) {
        setEncryptionKey(key);
        setState({
          ...decrypted,
          selectedDate: todayKey,
          medications: normalizeMedicationsForDate(
            decrypted.medications,
            todayKey,
            decrypted.selectedDate,
          ),
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function handleEnablePin(pin: string) {
    if (!state) return;
    const { config, key } = await createPinConfig(pin);
    setPinConfig(config);
    setEncryptionKey(key);
    const next: SeroSafeState = {
      ...state,
      settings: { ...state.settings, pinEnabled: true },
    };
    await enablePinProtection(next, config, key);
    setState(next);
  }

  async function handleDisablePin() {
    if (!state) return;
    setPinConfig(null);
    setEncryptionKey(null);
    const next: SeroSafeState = {
      ...state,
      settings: { ...state.settings, pinEnabled: false },
    };
    await disablePinProtection(next);
    setState(next);
  }

  async function handleResetAllData() {
    await wipeAllLocalData();
    setPinConfig(null);
    setEncryptionKey(null);
    const clean = createCleanDataset(
      state?.settings.lang ?? 'hu',
      state?.settings.theme ?? 'light',
    );
    await saveAppState(clean, null);
    setState(clean);
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-canvas text-ink flex items-center justify-center p-6">
        <div className="text-sm font-semibold text-ink-muted">
          SeroSafe betöltése...
        </div>
      </div>
    );
  }

  // PIN-locked startup screen (with optional Zero-Second Crisis Card bypass)
  if (pinConfig && !state) {
    const snapLang = emergencySnapshot?.lang ?? 'hu';
    return (
      <>
        <PinLockOverlay
          lang={snapLang}
          canBypassForCrisis={Boolean(emergencySnapshot)}
          onUnlock={handleUnlockPin}
          onOpenCrisisWithoutPin={() => setCrisisOpen(true)}
        />
        {emergencySnapshot && (
          <CrisisCardDialog
            open={crisisOpen}
            onClose={() => setCrisisOpen(false)}
            lang={snapLang}
            profile={emergencySnapshot.communicationProfile}
            meds={emergencySnapshot.medications}
            assessment={assessment}
            symptom={emergencySnapshot.latestSymptom}
          />
        )}
      </>
    );
  }

  if (!state) return null;

  return (
    <>
      <AppShell
        activeTab={activeTab}
        isLegalView={legalOpen}
        settings={state.settings}
        assessment={assessment}
        onSelectTab={handleSelectTab}
        onUpdateSettings={handleUpdateSettings}
        onOpenCrisisCard={() => setCrisisOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenLegal={handleOpenLegal}
      >
        {legalOpen ? (
          <LegalPage
            lang={state.settings.lang}
            onBack={() => setLegalOpen(false)}
          />
        ) : (
          <>
            {activeTab === 'today' && (
          <TodayPage
            lang={state.settings.lang}
            activeDayPart={state.activeDayPart}
            todayLog={todayLog}
            habits={state.habits}
            doctorNote={state.doctorNote}
            onSelectDayPart={(part: DayPart) =>
              setState((prev) =>
                prev ? { ...prev, activeDayPart: part } : prev,
              )
            }
            onUpdateTodayLog={handleUpdateTodayLog}
            onAddHabit={handleAddHabit}
            onDeleteHabit={handleDeleteHabit}
          />
        )}

        {activeTab === 'meds' && (
          <MedsPage
            lang={state.settings.lang}
            medications={state.medications}
            assessment={assessment}
            onSetStatus={handleSetMedStatus}
            onToggleDiscontinued={handleToggleDiscontinued}
            onDeleteMedication={handleDeleteMedication}
            onOpenFocusMode={() => setFocusOpen(true)}
            onOpenAddMed={() => setAddMedOpen(true)}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarPage
            lang={state.settings.lang}
            logs={state.dailyLogs}
            hidePercentages={state.settings.hidePercentages}
            onToggleHidePercentages={() =>
              handleUpdateSettings({
                hidePercentages: !state.settings.hidePercentages,
              })
            }
          />
        )}

        {activeTab === 'insights' && (
          <InsightsPage
            lang={state.settings.lang}
            logs={state.dailyLogs}
            patterns={state.patterns}
            onSetPatternStatus={(id, status) =>
              setState((prev) =>
                prev
                  ? {
                      ...prev,
                      patterns: prev.patterns.map((p) =>
                        p.id === id ? { ...p, status } : p,
                      ),
                    }
                  : prev,
              )
            }
          />
        )}

        {activeTab === 'safety' && (
          <SafetyPage
            lang={state.settings.lang}
            state={state}
            todayLog={todayLog}
            medications={state.medications}
            profile={state.communicationProfile}
            onUpdateTodayLog={handleUpdateTodayLog}
            onOpenCrisisCard={() => setCrisisOpen(true)}
            onOpenClinicalReport={() => setReportOpen(true)}
            onImportStateJson={(imported) =>
              setState({
                ...imported,
                selectedDate: todayKey,
                medications: normalizeMedicationsForDate(
                  imported.medications,
                  todayKey,
                  imported.selectedDate,
                ),
              })
            }
            onResetAllData={() => void handleResetAllData()}
          />
        )}
          </>
        )}
      </AppShell>

      {/* Native <dialog> Modals */}
      <CrisisCardDialog
        open={crisisOpen}
        onClose={() => setCrisisOpen(false)}
        lang={state.settings.lang}
        profile={state.communicationProfile}
        meds={state.medications}
        assessment={assessment}
        symptom={todayLog.symptomEntry}
      />

      <FocusModeDialog
        open={focusOpen}
        onClose={() => setFocusOpen(false)}
        lang={state.settings.lang}
        medications={state.medications}
        onSetStatus={handleSetMedStatus}
      />

      <AddMedDialog
        open={addMedOpen}
        onClose={() => setAddMedOpen(false)}
        lang={state.settings.lang}
        onAddMedication={handleAddMedication}
      />

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={state.settings}
        profile={state.communicationProfile}
        onUpdateSettings={handleUpdateSettings}
        onUpdateProfile={handleUpdateProfile}
        onResetProfile={() =>
          handleUpdateProfile(structuredClone(DEFAULT_COMMUNICATION_PROFILE))
        }
        onLoadDemoScenario={() =>
          setState(
            createDemoDataset(state.settings.lang, state.settings.theme),
          )
        }
        onLoadCrisisSimulation={() => {
          setState((prev) =>
            prev ? applyCrisisDemoPreset(prev) : prev,
          );
          setActiveTab('safety');
        }}
        onLoadCleanProfile={() =>
          setState(
            createCleanDataset(state.settings.lang, state.settings.theme),
          )
        }
        onEnablePin={handleEnablePin}
        onDisablePin={handleDisablePin}
        onOpenLegal={handleOpenLegal}
      />

      <ClinicalReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        lang={state.settings.lang}
        medications={state.medications}
        assessment={assessment}
        logs={state.dailyLogs}
        patterns={state.patterns}
      />
    </>
  );
}

export default App;
