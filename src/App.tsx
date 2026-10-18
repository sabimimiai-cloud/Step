import { useEffect, useState, useMemo } from 'react';
import { getPedometerManager } from './services/pedometer/PedometerManager';
import {
  getStoredProfile,
  saveProfile,
  getTodayRecord,
  updateTodaySteps,
  getHistoryStats,
  loadDemoBenchmarkData,
  purgeDemoData,
  resetAllHistory,
} from './services/storage';
import { calculateEstimations } from './utils/calculations';
import { MotionSample, PedometerProviderType, SensorStatus, StepEngineState, UserProfile } from './types';

// Components
import { Header } from './components/Header';
import { CircularProgress } from './components/CircularProgress';
import { MetricCards } from './components/MetricCards';
import { WeeklyChart } from './components/WeeklyChart';
import { SensorStatusBanner } from './components/SensorStatusBanner';
import { LiveSensorWaveform } from './components/LiveSensorWaveform';
import { HistoryModal } from './components/HistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { ActiveWalkModal } from './components/ActiveWalkModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { Footprints, Play, Smartphone } from 'lucide-react';

export default function App() {
  // 1. User Profile
  const [profile, setProfile] = useState<UserProfile>(() => getStoredProfile());

  // 2. Manager and State
  const [manager] = useState(() => {
    const today = getTodayRecord(profile);
    return getPedometerManager(today.steps);
  });

  const [engineState, setEngineState] = useState<StepEngineState>(() => manager.getState());
  const [todaySteps, setTodaySteps] = useState<number>(() => getTodayRecord(profile).steps);
  const [samples, setSamples] = useState<MotionSample[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);

  // 3. Modals State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isActiveWalkOpen, setIsActiveWalkOpen] = useState(false);

  // Initialize pedometer tracking and event subscriptions
  useEffect(() => {
    manager.initialize();

    const unsubState = manager.onState((state) => {
      setEngineState(state);
    });

    const unsubSteps = manager.onStep((update) => {
      setTodaySteps(update.totalStepsToday);
      updateTodaySteps(update.totalStepsToday, 0, profile);
      setHistoryVersion((v) => v + 1);
    });

    const unsubSamples = manager.onSample((sample) => {
      setSamples((prev) => {
        const next = [...prev, sample];
        return next.length > 60 ? next.slice(-60) : next;
      });
    });

    manager.startTracking();

    return () => {
      unsubState();
      unsubSteps();
      unsubSamples();
    };
  }, [manager, profile]);

  // Request sensor permissions
  const handleRequestPermission = async () => {
    await manager.requestPermission();
  };

  // Toggle desktop simulator
  const handleToggleSimulator = () => {
    if (engineState.isSimulatedDesktop) {
      manager.stopSimulator();
    } else {
      manager.startSimulator(105);
    }
  };

  // Switch active pedometer provider (iOS CoreMotion, Android Sensor, or Web Accelerometer)
  const handleSwitchProvider = async (type: PedometerProviderType) => {
    await manager.switchProvider(type);
    setEngineState(manager.getState());
  };

  // Demo Data handlers
  const handleLoadDemoData = () => {
    loadDemoBenchmarkData(profile);
    setHistoryVersion((v) => v + 1);
  };

  const handlePurgeDemoData = () => {
    purgeDemoData();
    setHistoryVersion((v) => v + 1);
  };

  const handleResetAllData = () => {
    resetAllHistory(profile);
    setTodaySteps(0);
    manager.setTodaySteps(0);
    setHistoryVersion((v) => v + 1);
  };

  // Profile save
  const handleSaveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    saveProfile(newProfile);
  };

  // Calculations
  const estimatedMetrics = useMemo(() => {
    return calculateEstimations(todaySteps, profile.strideLengthMeters, profile.weightKg);
  }, [todaySteps, profile.strideLengthMeters, profile.weightKg]);

  const historyStats = useMemo(() => {
    return getHistoryStats(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todaySteps, profile, historyVersion]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {/* Top Header */}
      <Header
        status={engineState.sensorStatus as SensorStatus}
        providerType={engineState.providerType}
        capabilities={engineState.capabilities}
        cadenceSpm={engineState.cadenceSpm}
        isSimulated={Boolean(engineState.isSimulatedDesktop)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenInfo={() => setIsInfoOpen(true)}
        onRequestPermission={handleRequestPermission}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center py-2">
        {/* Sensor Status & Background Limitation Banner */}
        <SensorStatusBanner
          status={engineState.sensorStatus as SensorStatus}
          providerType={engineState.providerType}
          capabilities={engineState.capabilities}
          isSimulated={Boolean(engineState.isSimulatedDesktop)}
          onRequestPermission={handleRequestPermission}
          onToggleSimulator={handleToggleSimulator}
          onOpenInfo={() => setIsInfoOpen(true)}
          onStartWalkMode={() => setIsActiveWalkOpen(true)}
        />

        {/* Circular Progress (Today's Steps & Goal) */}
        <CircularProgress
          steps={todaySteps}
          goal={profile.dailyGoal}
          isActivelyWalking={engineState.isActivelyWalking}
          onGoalClick={() => setIsSettingsOpen(true)}
        />

        {/* Metric Cards (Distance, Calories, Walking Time) */}
        <MetricCards metrics={estimatedMetrics} useMetric={profile.useMetric} />

        {/* 7-Day Progress Bar Chart */}
        <WeeklyChart
          days={historyStats.sevenDayHistory}
          dailyGoal={profile.dailyGoal}
          onOpenHistory={() => setIsHistoryOpen(true)}
        />

        {/* Live Accelerometer Kinematic Waveform Monitor */}
        <LiveSensorWaveform
          samples={samples}
          cadenceSpm={engineState.cadenceSpm}
          isActivelyWalking={engineState.isActivelyWalking}
        />
      </main>

      {/* Bottom Sticky Action Bar (Mobile-First) */}
      <footer className="w-full max-w-md mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsActiveWalkOpen(true)}
            className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Active Walk Mode (Screen Awake)</span>
          </button>

          <button
            onClick={() => setIsHistoryOpen(true)}
            aria-label="View history"
            className="p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-2xl flex items-center justify-center transition-colors"
          >
            <Footprints className="w-4 h-4" />
          </button>
        </div>

        {/* Footer Technical Attribution */}
        <div className="mt-2.5 flex items-center justify-between text-[10px] text-zinc-600 px-1 font-mono">
          <div className="flex items-center gap-1">
            <Smartphone className="w-3 h-3" />
            <span>{engineState.capabilities.sensorName.split(' ')[0]} Engine</span>
          </div>
          <button
            onClick={() => setIsInfoOpen(true)}
            className="hover:text-zinc-400 underline decoration-zinc-800 underline-offset-2"
          >
            Technical Audit &amp; Native Bridge
          </button>
        </div>
      </footer>

      {/* Modals & Slide-overs */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        stats={historyStats}
        profile={profile}
        onLoadDemoData={handleLoadDemoData}
        onPurgeDemoData={handlePurgeDemoData}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        onSaveProfile={handleSaveProfile}
        onResetAllData={handleResetAllData}
      />

      <ActiveWalkModal
        isOpen={isActiveWalkOpen}
        onClose={() => setIsActiveWalkOpen(false)}
        sessionSteps={engineState.currentSessionSteps}
        cadenceSpm={engineState.cadenceSpm}
        metrics={estimatedMetrics}
        dailySteps={todaySteps}
        dailyGoal={profile.dailyGoal}
        isActivelyWalking={engineState.isActivelyWalking}
      />

      <ArchitectureModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        activeProviderType={engineState.providerType}
        capabilities={engineState.capabilities}
        onSwitchProvider={handleSwitchProvider}
      />
    </div>
  );
}
