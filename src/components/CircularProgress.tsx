import React from 'react';
import { Flame } from 'lucide-react';

interface CircularProgressProps {
  steps: number;
  goal: number;
  isActivelyWalking: boolean;
  onGoalClick?: () => void;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  steps,
  goal,
  isActivelyWalking,
  onGoalClick,
}) => {
  const percentage = Math.min(Math.round((steps / goal) * 100), 100);
  const formattedSteps = steps.toLocaleString();
  const formattedGoal = goal.toLocaleString();

  // SVG circular dimensions
  const size = 260;
  const strokeWidth = 14;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center my-4">
      {/* Outer ambient glow during active walking */}
      <div
        className={`absolute w-56 h-56 rounded-full blur-3xl transition-opacity duration-700 pointer-events-none ${
          isActivelyWalking ? 'bg-emerald-500/15 opacity-100' : 'bg-emerald-500/5 opacity-50'
        }`}
      />

      <div className="relative w-[260px] h-[260px] flex items-center justify-center">
        {/* Background track circle */}
        <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-zinc-800/80"
          />

          {/* Active progress stroke */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-emerald-400 transition-all duration-500 ease-out"
            style={{
              filter: isActivelyWalking ? 'drop-shadow(0 0 8px rgba(52, 211, 153, 0.5))' : 'none',
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 select-none">
          {/* Label */}
          <span className="text-xs uppercase tracking-widest font-semibold text-zinc-400 mb-1">
            Today’s Steps
          </span>

          {/* Prominent Step Counter */}
          <div className="flex items-baseline justify-center gap-1 my-0.5">
            <span
              className={`text-5xl font-extrabold tracking-tight text-white font-mono tabular-nums transition-transform duration-150 ${
                isActivelyWalking ? 'scale-105 text-emerald-300' : ''
              }`}
            >
              {formattedSteps}
            </span>
          </div>

          {/* Goal denominator */}
          <button
            onClick={onGoalClick}
            type="button"
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors mt-0.5 group flex items-center gap-1"
            title="Click to edit daily goal"
          >
            <span>of {formattedGoal} steps</span>
            <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400">✎</span>
          </button>

          {/* Percentage badge */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/90 border border-zinc-700/60 text-xs font-medium text-emerald-400 shadow-sm">
            {percentage >= 100 ? (
              <>
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="font-semibold text-amber-300">Goal Complete!</span>
              </>
            ) : (
              <span>{percentage}% completed</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
