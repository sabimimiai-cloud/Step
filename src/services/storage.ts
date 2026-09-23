import { DayRecord, HistoryStats, UserProfile } from '../types';
import { calculateEstimations, getLocalDateKey } from '../utils/calculations';

const STORAGE_KEYS = {
  USER_PROFILE: 'stepflow_profile_v1',
  DAY_RECORDS: 'stepflow_history_v1',
  CURRENT_DAY: 'stepflow_current_day_v1',
};

const DEFAULT_PROFILE: UserProfile = {
  dailyGoal: 10000,
  strideLengthMeters: 0.762,
  weightKg: 70,
  useMetric: true,
};

/**
 * Retrieves the stored user profile or defaults
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
 * Saves user profile updates (e.g. goal change)
 */
export function saveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save profile', err);
  }
}

/**
 * Retrieves all stored historical day records keyed by YYYY-MM-DD
 */
export function getAllDayRecords(): Record<string, DayRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAY_RECORDS);
    if (!raw) {
      // Seed with initial realistic baseline for previous days so graphs aren't barren
      // while keeping today strictly untouched
      return seedInitialHistory();
    }
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Seeds previous 14 days of realistic walking history on first launch,
 * leaving today's date strictly at 0 steps until user actually moves.
 */
function seedInitialHistory(): Record<string, DayRecord> {
  const records: Record<string, DayRecord> = {};
  const profile = DEFAULT_PROFILE;
  const now = new Date();

  // Seed previous 14 days (excluding today)
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateKey = getLocalDateKey(d);
    
    // Vary steps around goal realistically (e.g. 6,800 to 11,400)
    const baseVariance = Math.sin(i * 1.3) * 2200;
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const weekendBoost = isWeekend ? 1500 : 0;
    const steps = Math.max(3500, Math.round(8800 + baseVariance + weekendBoost));
    
    const est = calculateEstimations(steps, profile.strideLengthMeters, profile.weightKg);

    records[dateKey] = {
      date: dateKey,
      steps,
      goal: profile.dailyGoal,
      distanceKm: est.distanceKm,
      caloriesKcal: est.caloriesKcal,
      walkingMinutes: est.durationMinutes,
      updatedAt: d.getTime(),
    };
  }

  try {
    localStorage.setItem(STORAGE_KEYS.DAY_RECORDS, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to seed history', err);
  }

  return records;
}

/**
 * Gets or initializes the record for today
 */
export function getTodayRecord(profile: UserProfile = DEFAULT_PROFILE): DayRecord {
  const todayKey = getLocalDateKey();
  const allRecords = getAllDayRecords();

  if (allRecords[todayKey]) {
    return allRecords[todayKey];
  }

  // New day entry
  const newToday: DayRecord = {
    date: todayKey,
    steps: 0,
    goal: profile.dailyGoal,
    distanceKm: 0,
    caloriesKcal: 0,
    walkingMinutes: 0,
    updatedAt: Date.now(),
  };

  allRecords[todayKey] = newToday;
  try {
    localStorage.setItem(STORAGE_KEYS.DAY_RECORDS, JSON.stringify(allRecords));
  } catch (err) {
    console.error('Failed to save today record', err);
  }

  return newToday;
}

/**
 * Updates today's step count in persistent storage
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
  };

  allRecords[todayKey] = updated;
  try {
    localStorage.setItem(STORAGE_KEYS.DAY_RECORDS, JSON.stringify(allRecords));
  } catch (err) {
    console.error('Failed to update today steps', err);
  }

  return updated;
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

  // Build sequential 7 days (including today)
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
      });
    }
  }

  // Calculate daily average across all available days with recorded data
  const recordedDays = Object.values(allRecords).filter((r) => r.steps > 0);
  const totalRecordedSteps = recordedDays.reduce((acc, curr) => acc + curr.steps, 0);
  const dailyAverage = recordedDays.length > 0 ? Math.round(totalRecordedSteps / recordedDays.length) : todayRecord.steps;

  // Best day
  let bestDay: { date: string; steps: number } | null = null;
  for (const record of Object.values(allRecords)) {
    if (!bestDay || record.steps > bestDay.steps) {
      bestDay = {
        date: record.date,
        steps: record.steps,
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
  };
}
