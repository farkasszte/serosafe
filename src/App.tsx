import { lazy, Suspense, useState } from 'react';
import { flushSync } from 'react-dom';
import { AppShell } from '@/components/layout/AppShell';
import { CrisisCardDialog } from '@/components/modals/CrisisCardDialog';
import { PinLockOverlay } from '@/components/modals/PinLockOverlay';
import { useSeroSafeStore } from '@/hooks/useSeroSafeStore';
import { TodayPage } from '@/pages/TodayPage';
import type { PageTab } from '@/types/serosafe';

const MedsPage = lazy(() =>
  import('@/pages/MedsPage').then((m) => ({ default: m.MedsPage })),
);
const CalendarPage = lazy(() =>
  import('@/pages/CalendarPage').then((m) => ({ default: m.CalendarPage })),
);
const InsightsPage = lazy(() =>
  import('@/pages/InsightsPage').then((m) => ({ default: m.InsightsPage })),
);
const SafetyPage = lazy(() =>
  import('@/pages/SafetyPage').then((m) => ({ default: m.SafetyPage })),
);
const LegalPage = lazy(() =>
  import('@/pages/LegalPage').then((m) => ({ default: m.LegalPage })),
);

const AddMedDialog = lazy(() =>
  import('@/components/modals/AddMedDialog').then((m) => ({
    default: m.AddMedDialog,
  })),
);
const SettingsDialog = lazy(() =>
  import('@/components/modals/SettingsDialog').then((m) => ({
    default: m.SettingsDialog,
  })),
);
const ClinicalReportDialog = lazy(() =>
  import('@/components/modals/ClinicalReportDialog').then((m) => ({
    default: m.ClinicalReportDialog,
  })),
);
const FocusModeDialog = lazy(() =>
  import('@/components/modals/FocusModeDialog').then((m) => ({
    default: m.FocusModeDialog,
  })),
);

export function App() {
  const store = useSeroSafeStore();
  const { state, pinConfig, emergencySnapshot, loading, todayLog, assessment } =
    store;

  const [activeTab, setActiveTab] = useState<PageTab>('today');
  const [crisisOpen, setCrisisOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [addMedOpen, setAddMedOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);

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
    return (
      <>
        <PinLockOverlay
          lang={store.activeLang}
          canBypassForCrisis={Boolean(emergencySnapshot)}
          onUnlock={store.unlockPin}
          onOpenCrisisWithoutPin={() => setCrisisOpen(true)}
        />
        {emergencySnapshot && (
          <CrisisCardDialog
            open={crisisOpen}
            onClose={() => setCrisisOpen(false)}
            lang={emergencySnapshot.lang}
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

  const lang = state.settings.lang;
  const pageFallback = (
    <div className="p-6 text-xs font-medium text-ink-muted">
      {lang === 'hu' ? 'Nézet betöltése...' : 'Loading view...'}
    </div>
  );

  return (
    <>
      <AppShell
        activeTab={activeTab}
        isLegalView={legalOpen}
        settings={state.settings}
        assessment={assessment}
        onSelectTab={handleSelectTab}
        onUpdateSettings={store.updateSettings}
        onOpenCrisisCard={() => setCrisisOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenLegal={handleOpenLegal}
      >
        {legalOpen ? (
          <Suspense fallback={pageFallback}>
            <LegalPage lang={lang} onBack={() => setLegalOpen(false)} />
          </Suspense>
        ) : (
          <Suspense fallback={pageFallback}>
            {activeTab === 'today' && (
              <TodayPage
                lang={lang}
                activeDayPart={state.activeDayPart}
                isDayPartAuto={store.isDayPartAuto}
                todayLog={todayLog}
                habits={state.habits}
                doctorNote={state.doctorNote}
                onSelectDayPart={store.selectDayPart}
                onResetDayPartAuto={store.resetDayPartAuto}
                onUpdateTodayLog={store.updateTodayLog}
                onAddHabit={store.addHabit}
                onDeleteHabit={store.deleteHabit}
              />
            )}

            {activeTab === 'meds' && (
              <MedsPage
                lang={lang}
                medications={state.medications}
                assessment={assessment}
                onSetStatus={store.setMedStatus}
                onToggleDiscontinued={store.toggleDiscontinued}
                onDeleteMedication={store.deleteMedication}
                onOpenFocusMode={() => setFocusOpen(true)}
                onOpenAddMed={() => setAddMedOpen(true)}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarPage
                lang={lang}
                logs={state.dailyLogs}
                hidePercentages={state.settings.hidePercentages}
                onToggleHidePercentages={() =>
                  store.updateSettings({
                    hidePercentages: !state.settings.hidePercentages,
                  })
                }
              />
            )}

            {activeTab === 'insights' && (
              <InsightsPage
                lang={lang}
                logs={state.dailyLogs}
                patterns={state.patterns}
                onSetPatternStatus={store.setPatternStatus}
              />
            )}

            {activeTab === 'safety' && (
              <SafetyPage
                lang={lang}
                state={state}
                todayLog={todayLog}
                medications={state.medications}
                profile={state.communicationProfile}
                baseAssessment={assessment}
                onUpdateTodayLog={store.updateTodayLog}
                onOpenCrisisCard={() => setCrisisOpen(true)}
                onOpenClinicalReport={() => setReportOpen(true)}
                onImportStateJson={store.importStateJson}
                onResetAllData={() => void store.resetAllData()}
              />
            )}
          </Suspense>
        )}
      </AppShell>

      {/* Eagerly mounted for 0-second Crisis Card access */}
      <CrisisCardDialog
        open={crisisOpen}
        onClose={() => setCrisisOpen(false)}
        lang={lang}
        profile={state.communicationProfile}
        meds={state.medications}
        assessment={assessment}
        symptom={todayLog.symptomEntry}
      />

      {/* Secondary Modals loaded & mounted on demand */}
      <Suspense fallback={null}>
        {focusOpen && (
          <FocusModeDialog
            open={focusOpen}
            onClose={() => setFocusOpen(false)}
            lang={lang}
            medications={state.medications}
            onSetStatus={store.setMedStatus}
          />
        )}

        {addMedOpen && (
          <AddMedDialog
            open={addMedOpen}
            onClose={() => setAddMedOpen(false)}
            lang={lang}
            onAddMedication={store.addMedication}
          />
        )}

        {settingsOpen && (
          <SettingsDialog
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            settings={state.settings}
            profile={state.communicationProfile}
            onUpdateSettings={store.updateSettings}
            onUpdateProfile={store.updateProfile}
            onResetProfile={store.resetProfile}
            onLoadDemoScenario={store.loadDemoScenario}
            onLoadCrisisSimulation={store.loadCrisisSimulation}
            onLoadCleanProfile={store.loadCleanProfile}
            onEnablePin={store.enablePin}
            onDisablePin={store.disablePin}
            onOpenLegal={handleOpenLegal}
          />
        )}

        {reportOpen && (
          <ClinicalReportDialog
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            lang={lang}
            medications={state.medications}
            assessment={assessment}
            logs={state.dailyLogs}
            patterns={state.patterns}
          />
        )}
      </Suspense>
    </>
  );
}

export default App;
