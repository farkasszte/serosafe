import { useEffect, useMemo, useRef, useState } from 'react';
import { CURATED_SUBSTANCES } from '@/data/substances';
import {
  computeExplainablePatterns,
  evaluateRiskAndSymptoms,
  normalizeMedicationsForDate,
} from '@/engine/safetyEngine';
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
  getUiPrefs,
  loadEncryptedState,
  loadPlainState,
  saveAppState,
  type UiPrefsSnapshot,
  wipeAllLocalData,
} from '@/services/db';
import {
  applyCrisisDemoPreset,
  createCleanDataset,
  createDemoDataset,
  createEmptyDailyLog,
  DEFAULT_COMMUNICATION_PROFILE,
} from '@/services/demoData';
import type {
  AppSettings,
  CommunicationProfile,
  DailyLogEntry,
  DayPart,
  HabitChip,
  IntentTag,
  MedicationStatus,
  PatternInsight,
  SeroSafeState,
  UserMedication,
} from '@/types/serosafe';
import { formatLocalDateKey } from '@/utils/date';

function mergeRecomputedPatterns(updated: SeroSafeState): PatternInsight[] {
  const computed = computeExplainablePatterns(updated.dailyLogs, updated.habits);
  const prevStatusMap = new Map(updated.patterns.map((p) => [p.id, p.status]));
  return computed.map((p) => ({
    ...p,
    status: prevStatusMap.get(p.id) ?? p.status,
  }));
}

function preserveUserSettings(
  incoming: AppSettings,
  current: AppSettings,
  pinActive: boolean,
  keepIncomingLangTheme = false,
): AppSettings {
  return {
    ...incoming,
    lang: keepIncomingLangTheme ? incoming.lang : current.lang,
    theme: keepIncomingLangTheme ? incoming.theme : current.theme,
    reducedMotion: current.reducedMotion,
    hidePercentages: current.hidePercentages,
    desktopFrameMode: current.desktopFrameMode,
    allowEmergencyWithoutPin: current.allowEmergencyWithoutPin,
    pinEnabled: pinActive,
  };
}

export function useSeroSafeStore() {
  const [state, setState] = useState<SeroSafeState | null>(null);
  const [pinConfig, setPinConfig] = useState<PinLockConfig | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [emergencySnapshot, setEmergencySnapshot] =
    useState<EmergencySnapshot | null>(null);
  const [uiPrefs, setUiPrefs] = useState<UiPrefsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayKey, setTodayKey] = useState<string>(() => formatLocalDateKey());

  const pendingSaveRef = useRef<{
    state: SeroSafeState;
    key: CryptoKey | null;
  } | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const skipNextAutoSaveRef = useRef(false);

  // Initial local IndexedDB hydration
  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      const [cfg, prefs] = await Promise.all([getPinConfig(), getUiPrefs()]);
      if (!mounted) return;
      if (prefs) setUiPrefs(prefs);

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
      const currentToday = formatLocalDateKey();
      setTodayKey(currentToday);

      if (existing) {
        skipNextAutoSaveRef.current = false;
        setState({
          ...existing,
          settings: { ...existing.settings, pinEnabled: false },
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
        if (mounted) {
          skipNextAutoSaveRef.current = true;
          setState(seeded);
        }
      }
      if (mounted) setLoading(false);
    }
    void bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  // Midnight rollover detection while the PWA stays open overnight
  useEffect(() => {
    function checkDateRollover() {
      const freshKey = formatLocalDateKey();
      setTodayKey((prevKey) => {
        if (prevKey === freshKey) return prevKey;
        setState((prevState) =>
          prevState
            ? {
                ...prevState,
                selectedDate: freshKey,
                medications: normalizeMedicationsForDate(
                  prevState.medications,
                  freshKey,
                  prevState.selectedDate,
                ),
              }
            : prevState,
        );
        return freshKey;
      });
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkDateRollover();
    };
    const interval = window.setInterval(checkDateRollover, 60_000);
    window.addEventListener('focus', checkDateRollover);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', checkDateRollover);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Keep document theme, reduced motion, desktop frame mode, and lang synchronized (including lock screen!)
  const activeTheme =
    state?.settings.theme ?? uiPrefs?.theme ?? 'light';
  const activeReducedMotion =
    state?.settings.reducedMotion ?? uiPrefs?.reducedMotion ?? false;
  const activeFrameMode = state?.settings.desktopFrameMode ?? 'responsive';
  const activeLang =
    state?.settings.lang ?? uiPrefs?.lang ?? emergencySnapshot?.lang ?? 'hu';

  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme;
    document.documentElement.dataset.reducedMotion = String(activeReducedMotion);
    document.documentElement.dataset.frameMode = activeFrameMode;
    document.documentElement.lang = activeLang;
  }, [activeTheme, activeReducedMotion, activeFrameMode, activeLang]);

  // Debounced IndexedDB persistence + pagehide / hidden flush
  useEffect(() => {
    if (!state) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      pendingSaveRef.current = null;
      return;
    }

    pendingSaveRef.current = { state, key: encryptionKey };
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      const pending = pendingSaveRef.current;
      if (pending) {
        pendingSaveRef.current = null;
        void saveAppState(pending.state, pending.key);
      }
    }, 250);

    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [state, encryptionKey]);

  useEffect(() => {
    function flushPendingSave() {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const pending = pendingSaveRef.current;
      if (pending) {
        pendingSaveRef.current = null;
        void saveAppState(pending.state, pending.key);
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushPendingSave();
    };
    window.addEventListener('pagehide', flushPendingSave);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flushPendingSave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const todayLog = useMemo(() => {
    if (!state) return createEmptyDailyLog(todayKey);
    return (
      state.dailyLogs.find((l) => l.date === todayKey) ??
      createEmptyDailyLog(todayKey)
    );
  }, [state, todayKey]);

  const assessment = useMemo(() => {
    const meds = state?.medications ?? emergencySnapshot?.medications ?? [];
    const sym = state ? todayLog.symptomEntry : emergencySnapshot?.latestSymptom;
    return evaluateRiskAndSymptoms(meds, CURATED_SUBSTANCES, sym);
  }, [state, todayLog.symptomEntry, emergencySnapshot]);

  function updateStateWithPatterns(
    updater: (prev: SeroSafeState) => SeroSafeState,
  ) {
    setState((prev) => {
      if (!prev) return prev;
      const updated = updater(prev);
      return {
        ...updated,
        patterns: mergeRecomputedPatterns(updated),
      };
    });
  }

  function updateTodayLog(
    updater: (prevLog: DailyLogEntry) => DailyLogEntry,
    options?: { recomputePatterns?: boolean },
  ) {
    const shouldRecompute = options?.recomputePatterns ?? true;
    const apply = (prev: SeroSafeState): SeroSafeState => {
      const idx = prev.dailyLogs.findIndex((l) => l.date === todayKey);
      const current = idx >= 0 ? prev.dailyLogs[idx] : createEmptyDailyLog(todayKey);
      const nextLog = updater(current);
      const nextLogs = [...prev.dailyLogs];
      if (idx >= 0) nextLogs[idx] = nextLog;
      else nextLogs.push(nextLog);
      return { ...prev, dailyLogs: nextLogs };
    };

    if (shouldRecompute) {
      updateStateWithPatterns(apply);
    } else {
      setState((prev) => (prev ? apply(prev) : prev));
    }
  }

  function addHabit(
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
      const current = idx >= 0 ? prev.dailyLogs[idx] : createEmptyDailyLog(todayKey);
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

  function deleteHabit(habitId: string) {
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

  function setMedStatus(medId: string, status: MedicationStatus) {
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
      const current = idx >= 0 ? prev.dailyLogs[idx] : createEmptyDailyLog(todayKey);
      const nextLogs = [...prev.dailyLogs];
      const nextLog = { ...current, isGap: false, medsTakenPct: pct };
      if (idx >= 0) nextLogs[idx] = nextLog;
      else nextLogs.push(nextLog);

      return { ...prev, medications: nextMeds, dailyLogs: nextLogs };
    });
  }

  function toggleDiscontinued(medId: string) {
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
            scheduleTime: nextStopped ? '' : '08:00',
          };
        }),
      };
    });
  }

  function deleteMedication(medId: string) {
    setState((prev) =>
      prev
        ? {
            ...prev,
            medications: prev.medications.filter((m) => m.id !== medId),
          }
        : prev,
    );
  }

  function addMedication(med: UserMedication) {
    setState((prev) =>
      prev ? { ...prev, medications: [med, ...prev.medications] } : prev,
    );
  }

  function updateSettings(patch: Partial<AppSettings>) {
    setState((prev) =>
      prev ? { ...prev, settings: { ...prev.settings, ...patch } } : prev,
    );
  }

  function updateProfile(profile: CommunicationProfile) {
    setState((prev) =>
      prev ? { ...prev, communicationProfile: profile } : prev,
    );
  }

  function resetProfile() {
    updateProfile(structuredClone(DEFAULT_COMMUNICATION_PROFILE));
  }

  function selectDayPart(part: DayPart) {
    setState((prev) => (prev ? { ...prev, activeDayPart: part } : prev));
  }

  function setPatternStatus(id: string, status: PatternInsight['status']) {
    setState((prev) =>
      prev
        ? {
            ...prev,
            patterns: prev.patterns.map((p) =>
              p.id === id ? { ...p, status } : p,
            ),
          }
        : prev,
    );
  }

  function loadDemoScenario() {
    const pinActive = Boolean(pinConfig && encryptionKey);
    setState((prev) => {
      if (!prev) return prev;
      const demo = createDemoDataset(prev.settings.lang, prev.settings.theme);
      return {
        ...demo,
        settings: preserveUserSettings(demo.settings, prev.settings, pinActive, true),
      };
    });
  }

  function loadCrisisSimulation() {
    setState((prev) => {
      if (!prev) return prev;
      const updated = applyCrisisDemoPreset(prev);
      return {
        ...updated,
        patterns: mergeRecomputedPatterns(updated),
      };
    });
  }

  function loadCleanProfile() {
    const pinActive = Boolean(pinConfig && encryptionKey);
    setState((prev) => {
      if (!prev) return prev;
      const clean = createCleanDataset(prev.settings.lang, prev.settings.theme);
      return {
        ...clean,
        settings: preserveUserSettings(clean.settings, prev.settings, pinActive, true),
      };
    });
  }

  function importStateJson(imported: SeroSafeState) {
    const pinActive = Boolean(pinConfig && encryptionKey);
    setState((prev) => {
      const normalizedMeds = normalizeMedicationsForDate(
        imported.medications,
        todayKey,
        imported.selectedDate,
      );
      const nextSettings = prev
        ? {
            ...imported.settings,
            pinEnabled: pinActive,
          }
        : { ...imported.settings, pinEnabled: pinActive };
      const nextState: SeroSafeState = {
        ...imported,
        settings: nextSettings,
        selectedDate: todayKey,
        medications: normalizedMeds,
      };
      return {
        ...nextState,
        patterns:
          imported.patterns.length > 0
            ? imported.patterns
            : mergeRecomputedPatterns(nextState),
      };
    });
  }

  async function unlockPin(pin: string): Promise<boolean> {
    if (!pinConfig) return false;
    const key = await verifyPinAndDeriveKey(pin, pinConfig);
    if (!key) return false;
    try {
      const decrypted = await loadEncryptedState(key);
      if (decrypted) {
        const freshToday = formatLocalDateKey();
        setTodayKey(freshToday);
        setEncryptionKey(key);
        setState({
          ...decrypted,
          settings: { ...decrypted.settings, pinEnabled: true },
          selectedDate: freshToday,
          medications: normalizeMedicationsForDate(
            decrypted.medications,
            freshToday,
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

  async function enablePin(pin: string): Promise<void> {
    if (!state) return;
    const { config, key } = await createPinConfig(pin);
    const next: SeroSafeState = {
      ...state,
      settings: { ...state.settings, pinEnabled: true },
    };
    await enablePinProtection(next, config, key);
    pendingSaveRef.current = null;
    skipNextAutoSaveRef.current = true;
    setPinConfig(config);
    setEncryptionKey(key);
    setState(next);
  }

  async function disablePin(): Promise<void> {
    if (!state) return;
    const next: SeroSafeState = {
      ...state,
      settings: { ...state.settings, pinEnabled: false },
    };
    await disablePinProtection(next);
    pendingSaveRef.current = null;
    skipNextAutoSaveRef.current = true;
    setPinConfig(null);
    setEncryptionKey(null);
    setState(next);
  }

  async function resetAllData(): Promise<void> {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    pendingSaveRef.current = null;
    await wipeAllLocalData();
    setPinConfig(null);
    setEncryptionKey(null);
    setEmergencySnapshot(null);
    const clean = createCleanDataset(
      state?.settings.lang ?? 'hu',
      state?.settings.theme ?? 'light',
    );
    await saveAppState(clean, null);
    skipNextAutoSaveRef.current = true;
    setState(clean);
  }

  return {
    state,
    pinConfig,
    emergencySnapshot,
    loading,
    todayKey,
    todayLog,
    assessment,
    activeLang,
    updateTodayLog,
    addHabit,
    deleteHabit,
    setMedStatus,
    toggleDiscontinued,
    deleteMedication,
    addMedication,
    updateSettings,
    updateProfile,
    resetProfile,
    selectDayPart,
    setPatternStatus,
    loadDemoScenario,
    loadCrisisSimulation,
    loadCleanProfile,
    importStateJson,
    unlockPin,
    enablePin,
    disablePin,
    resetAllData,
  };
}
