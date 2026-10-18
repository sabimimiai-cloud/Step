export type PedometerProviderType =
  | 'ios_coremotion' // Native iOS CMPedometer via Native Bridge
  | 'android_sensor' // Native Android TYPE_STEP_COUNTER via Native Bridge
  | 'web_accelerometer' // Web DeviceMotionEvent (Foreground Only)
  | 'unsupported'; // No sensor hardware or API

export type SensorStatus =
  | 'unsupported' // Device has no motion sensors
  | 'needs_permission' // User permission required
  | 'permission_denied' // User explicitly denied sensor access
  | 'listening_stationary' // Sensor active, device is currently at rest
  | 'listening_walking' // Sensor active, active walking cadence detected
  | 'error'; // Error accessing sensor

export interface PedometerCapabilities {
  supportsBackgroundTracking: boolean;
  supportsHardwarePedometer: boolean;
  supportsHistoricalCoprocessorQuery: boolean;
  sensorName: string;
  platformDescription: string;
  limitationNotice?: string;
}

export interface DayRecord {
  date: string; // ISO date string: YYYY-MM-DD
  steps: number;
  goal: number;
  distanceKm: number;
  caloriesKcal: number;
  walkingMinutes: number;
  updatedAt: number;
  isDemoData?: boolean; // Clearly marks sample/test data vs real measured sensor data
}

export interface HistoryStats {
  todaySteps: number;
  yesterdaySteps: number;
  sevenDayHistory: DayRecord[];
  thirtyDayHistory: DayRecord[];
  dailyAverage: number;
  bestDay: {
    date: string;
    steps: number;
    isDemoData?: boolean;
  } | null;
  hasOnlyDemoData: boolean;
  totalRealDaysRecorded: number;
}

export interface UserProfile {
  dailyGoal: number; // default 10,000
  strideLengthMeters: number; // default 0.762m
  weightKg: number; // default 70kg
  useMetric: boolean;
}

export interface MotionSample {
  timestamp: number;
  rawMagnitude: number;
  filteredMagnitude: number;
  threshold: number;
  isPeak: boolean;
}

export interface StepEngineState {
  sensorStatus: SensorStatus;
  providerType: PedometerProviderType;
  capabilities: PedometerCapabilities;
  isSupported: boolean;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unknown';
  isListening: boolean;
  cadenceSpm: number;
  lastStepTimestamp: number;
  totalStepsToday: number;
  currentSessionSteps: number;
  isActivelyWalking: boolean;
  errorMessage?: string;
  isSimulatedDesktop?: boolean;
}
