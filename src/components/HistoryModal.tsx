import React, { useState } from 'react';
import { HistoryStats, UserProfile } from '../types';
import { formatDisplayDate } from '../utils/calculations';
import { X, Award, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: HistoryStats;
  profile: UserProfile;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  stats,
  profile,
}) => {
  const [viewRange, setViewRange] = useState<'7days' | '30days'>('7days');

  if (!isOpen) return null;

  const currentList = viewRange === '7days' ? stats.sevenDayHistory : stats.thirtyDayHistory;
  const maxSteps = Math.max(profile.dailyGoal, ...currentList.map((d) => d.steps), 1000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Step History</h2>
            <p className="text-xs text-zinc-400">Activity records &amp; performance benchmarks</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 py-4 space-y-5 pr-1">
          {/* Key Benchmarks Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Today */}
            <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-3.5">
              <span className="text-[11px] text-zinc-400 font-medium">Steps Today</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {stats.todaySteps.toLocaleString()}
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">
                {Math.round((stats.todaySteps / profile.dailyGoal) * 100)}% of daily goal
              </span>
            </div>

            {/* Yesterday */}
            <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-3.5">
              <span className="text-[11px] text-zinc-400 font-medium">Steps Yesterday</span>
              <div className="text-2xl font-bold font-mono text-zinc-200 mt-1">
                {stats.yesterdaySteps.toLocaleString()}
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">
                {Math.round((stats.yesterdaySteps / profile.dailyGoal) * 100)}% of daily goal
              </span>
            </div>

            {/* Daily Average */}
            <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-3.5">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[11px] font-medium">Daily Average</span>
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {stats.dailyAverage.toLocaleString()}
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">All recorded days</span>
            </div>

            {/* Best Day */}
            <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-3.5">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-medium">Best Day</span>
              </div>
              <div className="text-2xl font-bold font-mono text-amber-300 mt-1">
                {stats.bestDay ? stats.bestDay.steps.toLocaleString() : '—'}
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">
                {stats.bestDay ? formatDisplayDate(stats.bestDay.date) : 'No data'}
              </span>
            </div>
          </div>

          {/* Interactive Range Selector */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Historical Trend</span>
            </span>
            <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
              <button
                type="button"
                onClick={() => setViewRange('7days')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  viewRange === '7days'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setViewRange('30days')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  viewRange === '30days'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                30 Days
              </button>
            </div>
          </div>

          {/* Graphical View */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4">
            <div className="flex items-end gap-1.5 h-36 pt-4 pb-1">
              {currentList.map((item, idx) => {
                const heightPercent = Math.max((item.steps / maxSteps) * 100, 4);
                const isGoalMet = item.steps >= item.goal;
                const isToday = idx === currentList.length - 1;

                return (
                  <div key={item.date} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-7 hidden group-hover:flex bg-zinc-800 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                      {item.steps.toLocaleString()}
                    </div>

                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-sm transition-all duration-200 ${
                        isToday
                          ? 'bg-emerald-400'
                          : isGoalMet
                          ? 'bg-emerald-500/70 group-hover:bg-emerald-500'
                          : 'bg-zinc-800 group-hover:bg-zinc-700'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center text-[10px] text-zinc-500 mt-2 font-mono">
              <span>{formatDisplayDate(currentList[0]?.date || '')}</span>
              <span>Goal: {profile.dailyGoal.toLocaleString()}</span>
              <span>Today</span>
            </div>
          </div>

          {/* Detailed Day-by-Day List */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 mb-2">Daily Breakdown</h4>
            <div className="space-y-1.5">
              {[...currentList].reverse().map((day) => {
                const isGoalMet = day.steps >= day.goal;
                return (
                  <div
                    key={day.date}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-zinc-200">{formatDisplayDate(day.date)}</span>
                        {isGoalMet && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {day.distanceKm} km · {day.caloriesKcal} kcal · {day.walkingMinutes} min
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-zinc-100 text-sm">
                        {day.steps.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">steps</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
