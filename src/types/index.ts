export type SensorStatus =
  | 'unsupported' // Device has no motion sensors (e.g. desktop)
  | 'needs_permission' // iOS Safari or browser requires user permission prompt
  | 'permission_denied' // User explicitly denied sensor access
  | 'listening_stationary' // Sensor active, device is currently at rest
  | 'listening_walking' // Sensor active, active walking cadence detected
  | 'error'; // Error accessing sensor

export interface DayRecord {
  date: string; // ISO date string: YYYY-MM-DD
  steps: number;
  goal: number;
  distanceKm: number;
  caloriesKcal: number;
  walkingMinutes: number;
  updatedAt: number;
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
  } | null;
}

export interface UserProfile {
  dailyGoal: number; // default 10,000
  strideLengthMeters: number; // default 0.762m (approx 2.5 ft)
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
  isSupported: boolean;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unknown';
  isListening: boolean;
  cadenceSpm: number; // Steps per minute
  lastStepTimestamp: number;
  totalStepsToday: number;
  currentSessionSteps: number;
  isActivelyWalking: boolean;
  errorMessage?: string;
  isSimulatedDesktop?: boolean;
}
