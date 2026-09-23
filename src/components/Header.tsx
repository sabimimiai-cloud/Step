import React from 'react';
import { History, Settings, Info, Activity, Footprints, ShieldAlert } from 'lucide-react';
import { SensorStatus } from '../types';

interface HeaderProps {
  status: SensorStatus;
  cadenceSpm: number;
  isSimulated: boolean;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenInfo: () => void;
  onRequestPermission: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  cadenceSpm,
  isSimulated,
  onOpenHistory,
  onOpenSettings,
  onOpenInfo,
  onRequestPermission,
}) => {
  return (
    <header className="w-full flex items-center justify-between py-4 px-4 sm:px-6 max-w-md mx-auto">
      {/* Brand & Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm">
          <Footprints className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-base tracking-tight text-zinc-100">StepFlow</span>
            {isSimulated && (
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Simulated
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 font-medium">Motion Step Engine</p>
        </div>
      </div>

      {/* Sensor Status Pill & Action Buttons */}
      <div className="flex items-center gap-2">
        {status === 'listening_walking' ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Walking · {cadenceSpm} spm</span>
          </div>
        ) : status === 'listening_stationary' ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
            <span>Sensor Ready</span>
          </div>
        ) : status === 'needs_permission' ? (
          <button
            onClick={onRequestPermission}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium hover:bg-amber-500/30 transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Enable Sensor</span>
          </button>
        ) : status === 'unsupported' ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800/70 border border-zinc-700 text-zinc-400 text-xs">
            <Activity className="w-3.5 h-3.5 text-zinc-500" />
            <span>No Sensor</span>
          </div>
        ) : null}

        {/* Action icons */}
        <button
          onClick={onOpenHistory}
          aria-label="View history"
          className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <History className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenSettings}
          aria-label="Settings and daily goal"
          className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenInfo}
          aria-label="Technical architecture and limitations"
          className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
