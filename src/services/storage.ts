import { DayRecord, HistoryStats, UserProfile } from '../types';
import { calculateEstimations, getLocalDateKey } from '../utils/calculations';

const STORAGE_KEYS = {
  USER_PROFILE: 'stepflow_profile_v2',
  DAY_RECORDS: 'stepflow_history_v2',
};

const DEFAULT_PROFILE: UserProfile = {
  dailyGoal: 10000,
  strideLengthMeters: 0.762,
  weightKg: 70,
  useMetric: true,
};

/**
 * Retrieves user profile
 */
export function getStoredProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

/**
 * Saves user profile updates
 */
export function saveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save profile', err);
  }
}

/**
 * Retrieves all stored historical day records.
 * STRICTLY returns only authentic, measured records. Does NOT auto-seed fake records.
 */
export function getAllDayRecords(): Record<string, DayRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAY_RECORDS);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Gets or initializes today's record.
 * Starts strictly at 0 steps until physical sensor movements are detected.
 */
export function getTodayRecord(profile: UserProfile = DEFAULT_PROFILE): DayRecord {
  const todayKey = getLocalDateKey();
  const allRecords = getAllDayRecords();

  if (allRecords[todayKey]) {
    return allRecords[todayKey];
  }

  const newToday: DayRecord = {
    date: todayKey,
    steps: 0,
    goal: profile.dailyGoal,
    distanceKm: 0,
    caloriesKcal: 0,
    walkingMinutes: 0,
    updatedAt: Date.now(),
    isDemoData: false,
  };

  allRecords[todayKey] = newToday;
  saveAllDayRecords(allRecords);
  return newToday;
}

/**
 * Saves all records to localStorage
 */
function saveAllDayRecords(records: Record<string, DayRecord>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DAY_RECORDS, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save day records', err);
  }
}

/**
 * Updates today's authentic measured step count in persistent storage
 */
export function updateTodaySteps(
  steps: number,
  additionalMinutes: number = 0,
  profile: UserProfile = DEFAULT_PROFILE
): DayRecord {
  const todayKey = getLocalDateKey();
  const allRecords = getAllDayRecords();
  const existing = allRecords[todayKey] || {
    date: todayKey,
    steps: 0,
    goal: profile.dailyGoal,
    distanceKm: 0,
    caloriesKcal: 0,
    walkingMinutes: 0,
    updatedAt: Date.now(),
    isDemoData: false,
  };

  const newSteps = steps;
  const newWalkingMinutes = Math.max(existing.walkingMinutes + additionalMinutes, Math.round(newSteps / 108));
  const est = calculateEstimations(newSteps, profile.strideLengthMeters, profile.weightKg, newWalkingMinutes);

  const updated: DayRecord = {
    ...existing,
    steps: newSteps,
    goal: profile.dailyGoal,
    distanceKm: est.distanceKm,
    caloriesKcal: est.caloriesKcal,
    walkingMinutes: newWalkingMinutes,
    updatedAt: Date.now(),
    isDemoData: false, // Authentic measured sensor steps
  };

  allRecords[todayKey] = updated;
  saveAllDayRecords(allRecords);
  return updated;
}

/**
 * Explicitly loads demo benchmark data ONLY when requested by user for UI inspection.
 * Every record is explicitly tagged with `isDemoData: true`.
 */
export function loadDemoBenchmarkData(profile: UserProfile = DEFAULT_PROFILE): void {
  const records = getAllDayRecords();
  const now = new Date();

  // Seed previous 7 days with explicit demo tag
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateKey = getLocalDateKey(d);

    const steps = [8420, 10250, 7890, 11400, 9300, 6800, 10800][i - 1] || 8500;
    const est = calculateEstimations(steps, profile.strideLengthMeters, profile.weightKg);

    records[dateKey] = {
      date: dateKey,
      steps,
      goal: profile.dailyGoal,
      distanceKm: est.distanceKm,
      caloriesKcal: est.caloriesKcal,
      walkingMinutes: est.durationMinutes,
      updatedAt: d.getTime(),
      isDemoData: true, // EXPLICITLY LABELED AS DEMO DATA
    };
  }

  saveAllDayRecords(records);
}

/**
 * Clears all demo data, leaving only real measurements
 */
export function purgeDemoData(): void {
  const records = getAllDayRecords();
  const cleaned: Record<string, DayRecord> = {};

  for (const [key, record] of Object.entries(records)) {
    if (!record.isDemoData) {
      cleaned[key] = record;
    }
  }

  saveAllDayRecords(cleaned);
}

/**
 * Resets all history to 0
 */
export function resetAllHistory(profile: UserProfile = DEFAULT_PROFILE): void {
  const todayKey = getLocalDateKey();
  const resetToday: DayRecord = {
    date: todayKey,
    steps: 0,
    goal: profile.dailyGoal,
    distanceKm: 0,
    caloriesKcal: 0,
    walkingMinutes: 0,
    updatedAt: Date.now(),
    isDemoData: false,
  };
  saveAllDayRecords({ [todayKey]: resetToday });
}

/**
 * Computes consolidated history statistics
 */
export function getHistoryStats(profile: UserProfile = DEFAULT_PROFILE): HistoryStats {
  const allRecords = getAllDayRecords();
  const todayKey = getLocalDateKey();

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterdayDate);

  const todayRecord = allRecords[todayKey] || getTodayRecord(profile);
  const yesterdayRecord = allRecords[yesterdayKey];

  // Build sequential 7 days
  const sevenDays: DayRecord[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = getLocalDateKey(d);
    if (allRecords[key]) {
      sevenDays.push(allRecords[key]);
    } else {
      sevenDays.push({
        date: key,
        steps: 0,
        goal: profile.dailyGoal,
        distanceKm: 0,
        caloriesKcal: 0,
        walkingMinutes: 0,
        updatedAt: d.getTime(),
        isDemoData: false,
      });
    }
  }

  // Build sequential 30 days
  const thirtyDays: DayRecord[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = getLocalDateKey(d);
    if (allRecords[key]) {
      thirtyDays.push(allRecords[key]);
    } else {
      thirtyDays.push({
        date: key,
        steps: 0,
        goal: profile.dailyGoal,
        distanceKm: 0,
        caloriesKcal: 0,
        walkingMinutes: 0,
        updatedAt: d.getTime(),
        isDemoData: false,
      });
    }
  }

  // Count real measured days
  const recordedDays = Object.values(allRecords).filter((r) => r.steps > 0);
  const realDays = recordedDays.filter((r) => !r.isDemoData);
  const hasOnlyDemoData = recordedDays.length > 0 && realDays.length === 0;

  // Daily average: calculated only from real days if real days exist, or recorded days
  const daysForAverage = realDays.length > 0 ? realDays : recordedDays;
  const totalSteps = daysForAverage.reduce((acc, curr) => acc + curr.steps, 0);
  const dailyAverage = daysForAverage.length > 0 ? Math.round(totalSteps / daysForAverage.length) : todayRecord.steps;

  // Best day
  let bestDay: { date: string; steps: number; isDemoData?: boolean } | null = null;
  for (const record of Object.values(allRecords)) {
    if (record.steps > 0 && (!bestDay || record.steps > bestDay.steps)) {
      bestDay = {
        date: record.date,
        steps: record.steps,
        isDemoData: record.isDemoData,
      };
    }
  }

  return {
    todaySteps: todayRecord.steps,
    yesterdaySteps: yesterdayRecord ? yesterdayRecord.steps : 0,
    sevenDayHistory: sevenDays,
    thirtyDayHistory: thirtyDays,
    dailyAverage,
    bestDay,
    hasOnlyDemoData,
    totalRealDaysRecorded: realDays.length,
  };
}
