import React, { useState } from 'react';
import { DayRecord } from '../types';
import { formatDisplayDate } from '../utils/calculations';
import { Check, AlertCircle } from 'lucide-react';

interface WeeklyChartProps {
  days: DayRecord[];
  dailyGoal: number;
  onOpenHistory: () => void;
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ days, dailyGoal, onOpenHistory }) => {
  const [selectedDay, setSelectedDay] = useState<DayRecord | null>(null);

  const hasAnySteps = days.some((d) => d.steps > 0);
  const hasDemoData = days.some((d) => d.isDemoData);

  const maxSteps = Math.max(dailyGoal * 1.15, ...days.map((d) => d.steps), 1000);
  const weekTotal = days.reduce((sum, d) => sum + d.steps, 0);
  const activeDaysCount = days.filter((d) => d.steps > 0).length;
  const weekAvg = activeDaysCount > 0 ? Math.round(weekTotal / activeDaysCount) : 0;

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-6 mt-6">
      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-zinc-100">Past 7 Days</h3>
              {hasDemoData && (
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Demo Data
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {hasAnySteps ? (
                <>
                  Avg <span className="font-mono text-zinc-300 font-medium">{weekAvg.toLocaleString()}</span> steps/active day
                </>
              ) : (
                'No physical activity recorded yet this week'
              )}
            </p>
          </div>
          <button
            onClick={onOpenHistory}
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            History Details →
          </button>
        </div>

        {/* Selected day tooltip */}
        {selectedDay && (
          <div className="mb-3 py-1.5 px-3 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-300 font-medium">{formatDisplayDate(selectedDay.date)}</span>
              {selectedDay.isDemoData && (
                <span className="text-[9px] font-mono text-amber-400">[Demo]</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-white font-semibold">
                {selectedDay.steps.toLocaleString()} steps
              </span>
              <span className="text-zinc-400">
                ({Math.round((selectedDay.steps / selectedDay.goal) * 100)}%)
              </span>
            </div>
          </div>
        )}

        {/* Bar chart or empty state */}
        {!hasAnySteps ? (
          <div className="h-32 flex flex-col items-center justify-center text-center p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/60 my-2">
            <AlertCircle className="w-5 h-5 text-zinc-500 mb-1.5" />
            <p className="text-xs text-zinc-400 font-medium">No recorded walking strides yet</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">
              Move with your phone or start active walk mode to detect real steps.
            </p>
          </div>
        ) : (
          <div className="relative pt-6 pb-2">
            {/* Goal dashed line */}
            <div
              className="absolute left-0 right-0 border-b border-dashed border-zinc-700/80 flex items-center justify-end z-0 pointer-events-none"
              style={{
                bottom: `${(dailyGoal / maxSteps) * 100}%`,
              }}
            >
              <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1 -translate-y-1/2">
                Goal ({Math.round(dailyGoal / 1000)}k)
              </span>
            </div>

            {/* Day columns */}
            <div className="grid grid-cols-7 gap-2 items-end h-36 z-10 relative">
              {days.map((day, idx) => {
                const isToday = idx === days.length - 1;
                const heightPercent = day.steps > 0 ? Math.max(Math.min((day.steps / maxSteps) * 100, 100), 6) : 3;
                const reachedGoal = day.steps >= day.goal;
                const isSelected = selectedDay?.date === day.date;

                const dateObj = new Date(day.date + 'T00:00:00');
                const dayLabel = dateObj.toLocaleDateString(undefined, { weekday: 'narrow' });

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className="flex flex-col items-center h-full justify-end group focus:outline-none"
                  >
                    {reachedGoal && (
                      <div className="mb-1 text-emerald-400">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}

                    <div className="w-full max-w-[28px] h-full flex items-end">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          isToday
                            ? 'bg-emerald-400 shadow-sm shadow-emerald-500/20'
                            : reachedGoal
                            ? 'bg-emerald-500/70 group-hover:bg-emerald-500'
                            : day.steps > 0
                            ? 'bg-zinc-700 group-hover:bg-zinc-600'
                            : 'bg-zinc-800/40'
                        } ${isSelected ? 'ring-2 ring-white/60' : ''}`}
                      />
                    </div>

                    <span
                      className={`mt-2 text-xs font-medium ${
                        isToday
                          ? 'text-emerald-400 font-bold'
                          : isSelected
                          ? 'text-white'
                          : 'text-zinc-500'
                      }`}
                    >
                      {isToday ? 'Today' : dayLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
