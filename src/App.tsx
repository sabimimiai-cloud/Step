import { useEffect, useState, useMemo } from 'react';
import { getStepEngine } from './services/stepDetectionEngine';
import {
  getStoredProfile,
  saveProfile,
  getTodayRecord,
  updateTodaySteps,
  getHistoryStats,
} from './services/storage';
import { calculateEstimations } from './utils/calculations';
import { MotionSample, SensorStatus, StepEngineState, UserProfile } from './types';

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
import { Footprints, Play } from 'lucide-react';

export default function App() {
  // 1. User Profile & Settings
  const [profile, setProfile] = useState<UserProfile>(() => getStoredProfile());

  // 2. Engine and Sensor State
  const [engineState, setEngineState] = useState<StepEngineState>(() => {
    const today = getTodayRecord(profile);
    const engine = getStepEngine(today.steps);
    return engine.getState();
  });

  // 3. Today's Steps and Walking Session
  const [todaySteps, setTodaySteps] = useState<number>(() => {
    return getTodayRecord(profile).steps;
  });

  const [samples, setSamples] = useState<MotionSample[]>([]);

  // 4. Modals State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isActiveWalkOpen, setIsActiveWalkOpen] = useState(false);

  // Initialize engine subscription and persistence
  useEffect(() => {
    const engine = getStepEngine(todaySteps);

    // Subscribe to state changes (status, cadence, walking mode)
    const unsubState = engine.subscribeToStateChange((state) => {
      setEngineState(state);
    });

    // Subscribe to real-time step events
    const unsubSteps = engine.subscribeToSteps((newTotalSteps) => {
      setTodaySteps(newTotalSteps);
      // Persist to storage
      updateTodaySteps(newTotalSteps, 0, profile);
    });

    // Subscribe to live motion samples for the waveform monitor
    const unsubSamples = engine.subscribeToSamples((sample) => {
      setSamples((prev) => {
        const next = [...prev, sample];
        return next.length > 60 ? next.slice(-60) : next;
      });
    });

    // Automatically start listening if already granted or ready
    if (engineState.sensorStatus === 'listening_stationary' || engineState.sensorStatus === 'listening_walking') {
      engine.startListening();
    }

    return () => {
      unsubState();
      unsubSteps();
      unsubSamples();
    };
  }, [profile]);

  // Handle sensor permission request (vital for iOS 13+ Safari user gestures)
  const handleRequestPermission = async () => {
    const engine = getStepEngine();
    await engine.requestSensorPermission();
  };

  // Toggle desktop simulation testing mode
  const handleToggleSimulator = () => {
    const engine = getStepEngine();
    if (engineState.isSimulatedDesktop) {
      engine.stopSimulation();
    } else {
      engine.startDesktopMotionSimulator(105);
    }
  };

  // Save profile updates
  const handleSaveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    saveProfile(newProfile);
  };

  // Estimated metrics calculated from live steps
  const estimatedMetrics = useMemo(() => {
    return calculateEstimations(
      todaySteps,
      profile.strideLengthMeters,
      profile.weightKg
    );
  }, [todaySteps, profile.strideLengthMeters, profile.weightKg]);

  // Consolidated history statistics
  const historyStats = useMemo(() => {
    return getHistoryStats(profile);
  }, [todaySteps, profile]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {/* Top Navigation */}
      <Header
        status={engineState.sensorStatus as SensorStatus}
        cadenceSpm={engineState.cadenceSpm}
        isSimulated={Boolean(engineState.isSimulatedDesktop)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenInfo={() => setIsInfoOpen(true)}
        onRequestPermission={handleRequestPermission}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center py-2">
        {/* Contextual Sensor Banner (Permissions, Desktop Check, Limitations) */}
        <SensorStatusBanner
          status={engineState.sensorStatus as SensorStatus}
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
            <span>Start Active Walk (Screen Awake)</span>
          </button>

          <button
            onClick={() => setIsHistoryOpen(true)}
            aria-label="View history"
            className="p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-2xl flex items-center justify-center transition-colors"
          >
            <Footprints className="w-4 h-4" />
          </button>
        </div>

        {/* Subtle Architecture & Transparency Footer Tag */}
        <div className="mt-2.5 flex items-center justify-between text-[10px] text-zinc-600 px-1 font-mono">
          <span>StepFlow Sensor v2.4</span>
          <button
            onClick={() => setIsInfoOpen(true)}
            className="hover:text-zinc-400 underline decoration-zinc-800 underline-offset-2"
          >
            Web vs Native Specs
          </button>
        </div>
      </footer>

      {/* Modals & Slide-overs */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        stats={historyStats}
        profile={profile}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        onSaveProfile={handleSaveProfile}
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
      />
    </div>
  );
}
