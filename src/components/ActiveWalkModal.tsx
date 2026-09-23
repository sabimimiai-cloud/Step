import React, { useEffect, useState } from 'react';
import { EstimatedMetrics } from '../utils/calculations';
import { Play, Pause, X, Lock, Flame, Navigation, Clock, Zap } from 'lucide-react';

interface ActiveWalkModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionSteps: number;
  cadenceSpm: number;
  metrics: EstimatedMetrics;
  dailySteps: number;
  dailyGoal: number;
  isActivelyWalking: boolean;
}

export const ActiveWalkModal: React.FC<ActiveWalkModalProps> = ({
  isOpen,
  onClose,
  sessionSteps,
  cadenceSpm,
  metrics,
  dailySteps,
  dailyGoal,
  isActivelyWalking,
}) => {
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Request Screen WakeLock when active walk mode is opened
  useEffect(() => {
    let wakeLockSentinel: unknown = null;

    if (isOpen && !isPaused && 'wakeLock' in navigator) {
      try {
        (navigator as unknown as { wakeLock: { request: (type: string) => Promise<unknown> } })
          .wakeLock.request('screen')
          .then((lock) => {
            wakeLockSentinel = lock;
            setWakeLockActive(true);
          })
          .catch(() => {
            setWakeLockActive(false);
          });
      } catch {
        setWakeLockActive(false);
      }
    }

    return () => {
      if (wakeLockSentinel && typeof (wakeLockSentinel as { release?: () => void }).release === 'function') {
        (wakeLockSentinel as { release: () => void }).release();
        setWakeLockActive(false);
      }
    };
  }, [isOpen, isPaused]);

  // Session timer
  useEffect(() => {
    if (!isOpen || isPaused) return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isPaused]);

  if (!isOpen) return null;

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const goalPercent = Math.min(Math.round((dailySteps / dailyGoal) * 100), 100);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-6 select-none animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs uppercase tracking-widest font-semibold text-emerald-400">
            Active Walk Session
          </span>
        </div>

        <div className="flex items-center gap-2">
          {wakeLockActive && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 font-mono">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Screen Kept Awake</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Big Number Display (OLED Minimalist) */}
      <div className="flex flex-col items-center justify-center text-center my-auto">
        {/* Real-time walking cadence indicator */}
        <div className="mb-4">
          {isActivelyWalking ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-pulse">
              <Zap className="w-3.5 h-3.5" />
              <span>Gait Cadence: {cadenceSpm} steps/min</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs">
              <span>Stationary (idling sensors to preserve battery)</span>
            </span>
          )}
        </div>

        <span className="text-xs uppercase font-mono tracking-widest text-zinc-500">
          Session Steps
        </span>
        <div className="text-7xl font-extrabold font-mono tracking-tight text-white my-1 tabular-nums">
          {sessionSteps.toLocaleString()}
        </div>
        <span className="text-sm font-mono text-zinc-400">
          {dailySteps.toLocaleString()} of {dailyGoal.toLocaleString()} daily ({goalPercent}%)
        </span>

        {/* Big Timer */}
        <div className="mt-8 text-3xl font-mono text-zinc-400 font-light">
          {formattedTime}
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-3 gap-3 bg-zinc-950/80 border border-zinc-900 rounded-2xl p-4">
        <div className="text-center">
          <div className="flex items-center justify-center text-zinc-500 mb-1">
            <Navigation className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold font-mono text-white">
            {metrics.distanceKm.toFixed(2)}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">km est.</div>
        </div>

        <div className="text-center border-x border-zinc-900">
          <div className="flex items-center justify-center text-zinc-500 mb-1">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold font-mono text-white">
            {metrics.caloriesKcal}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">kcal est.</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center text-zinc-500 mb-1">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold font-mono text-white">
            {cadenceSpm}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">cadence spm</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
            isPaused
              ? 'bg-emerald-500 text-black hover:bg-emerald-400'
              : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
          }`}
        >
          {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
          <span>{isPaused ? 'Resume Walk' : 'Pause'}</span>
        </button>

        <button
          onClick={onClose}
          className="px-6 py-3 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold"
        >
          Finish Walk
        </button>
      </div>
    </div>
  );
};
