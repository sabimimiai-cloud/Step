/**
 * Calculations for estimating distance, calories, and duration
 * Clearly distinguishes measured values (sensor steps) from estimations.
 */

export interface EstimatedMetrics {
  distanceKm: number;
  distanceMiles: number;
  caloriesKcal: number;
  durationMinutes: number;
}

/**
 * Calculates estimated walking metrics based on detected steps
 * 
 * Formulas:
 * 1. Distance = steps * stride_length
 *    Average human stride length is approx 0.762m (approx 41.5% of height for men, 41.3% for women)
 * 2. Walking Duration:
 *    At standard brisk walking speed (~100 to 115 steps/min),
 *    duration (mins) = steps / ~108 steps per min
 * 3. Calories:
 *    Using MET (Metabolic Equivalent of Task) standard for walking (approx 3.5 METs):
 *    Calories/min = (MET * 3.5 * weightKg) / 200
 *    Or roughly 0.04 kcal per step for a 70 kg individual.
 */
export function calculateEstimations(
  steps: number,
  strideLengthMeters: number = 0.762,
  weightKg: number = 70,
  measuredWalkingMinutes?: number
): EstimatedMetrics {
  if (steps <= 0) {
    return {
      distanceKm: 0,
      distanceMiles: 0,
      caloriesKcal: 0,
      durationMinutes: measuredWalkingMinutes || 0,
    };
  }

  // Distance in kilometers and miles
  const distanceKm = Number(((steps * strideLengthMeters) / 1000).toFixed(2));
  const distanceMiles = Number((distanceKm * 0.621371).toFixed(2));

  // Walking duration (if not directly measured through real-time cadence tracking)
  // Average cadence is ~108 steps per minute
  const durationMinutes = measuredWalkingMinutes !== undefined && measuredWalkingMinutes > 0
    ? measuredWalkingMinutes
    : Math.round(steps / 108);

  // Calories: MET 3.3 for moderate walking (approx 4.8 km/h)
  // Calories = (MET * 3.5 * weightKg / 200) * minutes
  const caloriesPerMinute = (3.3 * 3.5 * weightKg) / 200;
  const calculatedCalories = Math.round(caloriesPerMinute * (durationMinutes || steps / 108));
  
  // Safeguard: minimum 0.038 kcal per step
  const minCalories = Math.round(steps * 0.038 * (weightKg / 70));
  const caloriesKcal = Math.max(calculatedCalories, minCalories);

  return {
    distanceKm,
    distanceMiles,
    caloriesKcal,
    durationMinutes,
  };
}

/**
 * Format date to YYYY-MM-DD local time string
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format dates for display (e.g., "Mon, Oct 12" or "Today")
 */
export function formatDisplayDate(dateKey: string): string {
  const todayKey = getLocalDateKey();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);

  if (dateKey === todayKey) return 'Today';
  if (dateKey === yesterdayKey) return 'Yesterday';

  const parts = dateKey.split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  return dateKey;
}
