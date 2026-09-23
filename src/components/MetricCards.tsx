import React from 'react';
import { Navigation, Flame, Clock } from 'lucide-react';
import { EstimatedMetrics } from '../utils/calculations';

interface MetricCardsProps {
  metrics: EstimatedMetrics;
  useMetric?: boolean;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ metrics, useMetric = true }) => {
  const distanceValue = useMetric ? metrics.distanceKm : metrics.distanceMiles;
  const distanceUnit = useMetric ? 'km' : 'mi';

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-6">
      <div className="grid grid-cols-3 gap-2.5">
        {/* Distance Card */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-3 flex flex-col justify-between hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-1.5">
            <span className="text-[11px] font-medium tracking-tight">Distance</span>
            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono tracking-tight text-white tabular-nums">
                {distanceValue.toFixed(1)}
              </span>
              <span className="text-xs text-zinc-400 font-medium">{distanceUnit}</span>
            </div>
            <div className="mt-1 flex items-center">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">
                Est. (stride)
              </span>
            </div>
          </div>
        </div>

        {/* Calories Card */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-3 flex flex-col justify-between hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-1.5">
            <span className="text-[11px] font-medium tracking-tight">Calories</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono tracking-tight text-white tabular-nums">
                {metrics.caloriesKcal}
              </span>
              <span className="text-xs text-zinc-400 font-medium">kcal</span>
            </div>
            <div className="mt-1 flex items-center">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">
                Est. (MET)
              </span>
            </div>
          </div>
        </div>

        {/* Walking Time Card */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-3 flex flex-col justify-between hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-1.5">
            <span className="text-[11px] font-medium tracking-tight">Walking Time</span>
            <Clock className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono tracking-tight text-white tabular-nums">
                {metrics.durationMinutes}
              </span>
              <span className="text-xs text-zinc-400 font-medium">min</span>
            </div>
            <div className="mt-1 flex items-center">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">
                Active time
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
